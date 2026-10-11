#!/usr/bin/env python3
"""
31-call latency benchmark against deployed POST /simulate endpoint (Row 15).
Records:
  - Request #1 separately as cold start
  - Requests #2..#31 (N=30 warm runs) paced at 1.2s intervals (well under 5 req/s throttle)
  - Client-side HTTP round-trip time (ms), server-side elapsed_ms returned in payload,
    and CloudWatch REPORT duration (ms) for VayuSync-SimulateTrigger and VayuSync-EvaluatorEngine.
"""
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
import boto3
import numpy as np

URL = "https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/simulate"
PAYLOAD = json.dumps({"hotspot_lat": 30.9, "hotspot_lon": 75.85, "scenario": "moderate"}).encode("utf-8")


def main():
    start_ts_ms = int(time.time() * 1000)
    rtt_ms = []
    srv_elapsed_ms = []
    advisory_sources = []

    print("Running 31 sequential POST /simulate calls (1 cold + 30 warm, 1.2s spacing)...")
    for i in range(31):
        req = urllib.request.Request(
            URL,
            data=PAYLOAD,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        dt = round((time.perf_counter() - t0) * 1000.0, 1)
        el = float(body.get("elapsed_ms", 0))
        alerts = body.get("alerts", [])
        src = alerts[0].get("advisory_source", "none") if alerts else "none"
        rtt_ms.append(dt)
        srv_elapsed_ms.append(el)
        advisory_sources.append(src)
        tag = "COLD_START" if i == 0 else f"WARM_{i:02d}"
        print(f"  [{tag}] HTTP {resp.status} | client_rtt={dt:.1f} ms | server_elapsed={el:.0f} ms | alerts={len(alerts)} | source={src}")
        if i < 30:
            time.sleep(1.2)

    # Wait 5 seconds for CloudWatch logs to flush
    time.sleep(5.0)
    end_ts_ms = int(time.time() * 1000) + 5000

    logs = boto3.client("logs", region_name="ap-south-1")
    cw_durations = {}
    for fn in ("VayuSync-SimulateTrigger", "VayuSync-EvaluatorEngine"):
        lg = f"/aws/lambda/{fn}"
        durations = []
        init_durations = []
        try:
            events = logs.filter_log_events(
                logGroupName=lg,
                startTime=start_ts_ms,
                endTime=end_ts_ms,
                filterPattern="REPORT RequestId",
            ).get("events", [])
            for ev in events:
                msg = ev.get("message", "")
                m_dur = re.search(r"Duration:\s*([\d.]+)\s*ms", msg)
                m_init = re.search(r"Init Duration:\s*([\d.]+)\s*ms", msg)
                if m_dur:
                    durations.append(float(m_dur.group(1)))
                if m_init:
                    init_durations.append(float(m_init.group(1)))
        except Exception as e:
            print(f"CloudWatch query error for {fn}: {e}")
        cw_durations[fn] = {
            "count": len(durations),
            "cold_inits": init_durations,
            "all_ms": durations,
            "warm_ms": durations[1:] if len(durations) > 30 else durations,
        }

    warm_rtt = rtt_ms[1:]
    warm_srv = srv_elapsed_ms[1:]

    summary = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "endpoint": URL,
        "total_calls": 31,
        "n_warm": len(warm_rtt),
        "advisory_source_observed": list(set(advisory_sources)),
        "cold_start_call_1": {
            "client_rtt_ms": rtt_ms[0],
            "server_elapsed_ms": srv_elapsed_ms[0],
        },
        "warm_client_rtt_ms": {
            "n": len(warm_rtt),
            "min": round(float(np.min(warm_rtt)), 1),
            "median": round(float(np.median(warm_rtt)), 1),
            "p95": round(float(np.percentile(warm_rtt, 95)), 1),
            "max": round(float(np.max(warm_rtt)), 1),
            "raw": warm_rtt,
        },
        "warm_server_elapsed_ms": {
            "n": len(warm_srv),
            "min": round(float(np.min(warm_srv)), 1),
            "median": round(float(np.median(warm_srv)), 1),
            "p95": round(float(np.percentile(warm_srv, 95)), 1),
            "max": round(float(np.max(warm_srv)), 1),
            "raw": warm_srv,
        },
        "cloudwatch_report": {},
    }

    for fn, d in cw_durations.items():
        w = d["warm_ms"]
        summary["cloudwatch_report"][fn] = {
            "n_reports": d["count"],
            "init_durations_ms": d["cold_inits"],
            "warm_n": len(w),
            "warm_min_ms": round(float(np.min(w)), 1) if w else None,
            "warm_median_ms": round(float(np.median(w)), 1) if w else None,
            "warm_p95_ms": round(float(np.percentile(w, 95)), 1) if w else None,
            "warm_max_ms": round(float(np.max(w)), 1) if w else None,
        }

    out_path = "backtest_data/latency_benchmark_n30.json"
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)
    print("\n=== BENCHMARK SUMMARY JSON ===")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
