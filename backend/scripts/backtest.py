#!/usr/bin/env python3
"""
VayuSync retrospective back-test  (place at backend/scripts/backtest.py)

Question answered: for a past stubble-smoke event, when did the model say smoke
would reach a ground station, and when did the station's PM2.5 actually rise?

Inputs (all real, all archived; nothing here is simulated except --selftest):
  * NASA FIRMS fire detections   (API key via NASA_FIRMS_API_KEY, or --fires-csv)
  * Open-Meteo ERA5 archive winds (10 m and 100 m, no key needed)
  * Hourly PM2.5 observations     (--obs-csv you download; CPCB CCR portal or OpenAQ)

Predictors compared against the observed PM2.5 onset:
  A. cone      : ingestion's u/v -> geo_utils.calculate_trajectory_cone (the production code path)
  B. parcel10m : time-stepped parcel trajectories using hourly 10 m winds
  C. parcel100m: same, using hourly 100 m winds

Rules are fixed in code BEFORE you look at results (see observed_onset). Do not
tune them per event. Run several dates, including ones with no stubble signal,
and report all of them. Results are appended to backtest_results.csv.

Usage:
  python backtest.py --selftest
  export NASA_FIRMS_API_KEY=...
  python backtest.py --date 2025-11-03 --obs-csv data/anand_vihar_2025-11.csv
"""
import argparse
import hashlib
import io
import json
import math
import os
import sys
import urllib.parse
import urllib.request
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
for cand in (Path(os.environ.get("GEO_UTILS_DIR", "")), HERE.parent / "lambdas" / "shared", HERE):
    if (cand / "geo_utils.py").exists():
        sys.path.insert(0, str(cand))
        break
from geo_utils import (  # noqa: E402  (production code under test)
    calculate_trajectory_cone,
    destination_point,
    haversine_distance,
    point_in_polygon,
)

# Approximate; verify against CPCB station metadata before reporting.
DEFAULT_STATION = ("Anand Vihar", 28.6476, 77.3158)
DEFAULT_BBOX = "73.5,27.5,78.5,32.5"  # west,south,east,north (same as ingestion FIRMS_AREA)
OM_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
HOURLY_VARS = "wind_speed_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m"


# ───────────────────────────── winds ─────────────────────────────
class Winds:
    """Gridded hourly winds; nearest-grid-point lookup. wd is the 'from' direction (deg)."""

    def __init__(self, lats, lons, times, ws10, wd10, ws100, wd100):
        self.lats, self.lons = np.asarray(lats), np.asarray(lons)
        self.times = pd.DatetimeIndex(times)
        self.arr = {10: (np.asarray(ws10), np.asarray(wd10)), 100: (np.asarray(ws100), np.asarray(wd100))}

    def wind_at(self, lat, lon, t, level):
        k = np.argmin((self.lats - lat) ** 2 + ((self.lons - lon) * math.cos(math.radians(lat))) ** 2)
        i = int(round((t - self.times[0]).total_seconds() / 3600))
        i = min(max(i, 0), len(self.times) - 1)
        ws, wd = self.arr[level]
        return float(ws[k, i]), float(wd[k, i])


def make_grid(bbox, step=1.0):
    w, s, e, n = bbox
    lats = np.arange(s, n + 1e-9, step)
    lons = np.arange(w, e + 1e-9, step)
    return [(float(a), float(b)) for a in lats for b in lons]


def fetch_winds(grid, start, end, cache_dir):
    cache_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for c in range(0, len(grid), 20):
        chunk = grid[c:c + 20]
        q = {
            "latitude": ",".join(f"{a:.3f}" for a, _ in chunk),
            "longitude": ",".join(f"{b:.3f}" for _, b in chunk),
            "start_date": start, "end_date": end,
            "hourly": HOURLY_VARS, "wind_speed_unit": "ms", "timezone": "GMT",
        }
        url = OM_ARCHIVE + "?" + urllib.parse.urlencode(q)
        f = cache_dir / ("openmeteo_" + hashlib.md5(url.encode()).hexdigest()[:12] + ".json")
        if f.exists():
            data = json.loads(f.read_text())
        else:
            with urllib.request.urlopen(url, timeout=60) as r:
                data = json.loads(r.read())
            f.write_text(json.dumps(data))
        rows.extend(data if isinstance(data, list) else [data])
    h0 = rows[0]["hourly"]["time"]
    g = lambda key: [[np.nan if v is None else v for v in r["hourly"][key]] for r in rows]  # noqa: E731
    return Winds([r["latitude"] for r in rows], [r["longitude"] for r in rows], pd.to_datetime(h0),
                 g("wind_speed_10m"), g("wind_direction_10m"), g("wind_speed_100m"), g("wind_direction_100m"))


# ───────────────────────────── fires ─────────────────────────────
def load_fires(args, bbox_s):
    if args.fires_csv:
        raw = Path(args.fires_csv).read_text()
    else:
        key = os.environ.get("NASA_FIRMS_API_KEY")
        if not key:
            sys.exit("Set NASA_FIRMS_API_KEY or pass --fires-csv")
        url = (f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{args.firms_source}/"
               f"{bbox_s}/{args.fire_days}/{args.date}")
        with urllib.request.urlopen(url, timeout=60) as r:
            raw = r.read().decode()
        cache = Path(args.cache_dir)
        cache.mkdir(parents=True, exist_ok=True)
        (cache / f"firms_{args.date}.csv").write_text(raw)  # key is not in the file
    df = pd.read_csv(io.StringIO(raw))
    df["t"] = pd.to_datetime(df["acq_date"].astype(str) + " " + df["acq_time"].astype(int).astype(str).str.zfill(4),
                             format="%Y-%m-%d %H%M")
    df = df[(df["frp"] > 0) & (df["confidence"].astype(str).str.lower() != "l")]
    return df.rename(columns={"latitude": "lat", "longitude": "lon"})[["lat", "lon", "frp", "t"]].reset_index(drop=True)


# ───────────────────────── observations ──────────────────────────
def load_obs(path, tz, dayfirst="auto"):
    """Read an hourly PM2.5 CSV. CPCB exports use day-first dates (03-11-2025 14:00 = 3 Nov); ISO dates are year-first.
    dayfirst: 'auto' (ISO -> year-first, anything else -> day-first), 'yes' or 'no'."""
    df = pd.read_csv(path)
    tcol = next((c for c in df.columns if c.lower() in ("timestamp", "datetime", "date", "time", "from date", "datetimelocal", "datetime_local")), df.columns[0])
    pcol = next((c for c in df.columns if "pm2" in c.lower().replace(" ", "").replace("_", "")), None)
    if pcol is None:
        sys.exit(f"No PM2.5 column found. Columns are: {list(df.columns)}")
    raw = df[tcol].astype(str)
    if dayfirst == "auto":
        dayfirst = "no" if raw.str.match(r"^\s*\d{4}-\d{2}-\d{2}").mean() > 0.5 else "yes"
    ts = pd.to_datetime(raw, dayfirst=(dayfirst == "yes"), errors="coerce")
    if ts.isna().mean() > 0.2:
        sys.exit(f"Could not parse {ts.isna().mean():.0%} of the timestamps in column '{tcol}'. Try --obs-dayfirst yes|no.")
    if getattr(ts.dt, "tz", None) is None:
        ts = ts.dt.tz_localize(tz, ambiguous="NaT", nonexistent="NaT")
    vals = pd.to_numeric(df[pcol], errors="coerce")
    s = pd.Series(vals.values, index=ts.dt.tz_convert("UTC").dt.tz_localize(None))
    s = s[~s.index.isna()].dropna().sort_index().resample("1h").mean()
    print(f"Observations: {s.dropna().shape[0]} hourly values, {s.index.min()} to {s.index.max()} UTC "
          f"(date order read as {'day-first' if dayfirst == 'yes' else 'year-first'}); PM2.5 min/median/max = "
          f"{s.min():.0f}/{s.median():.0f}/{s.max():.0f}. Check units are ug/m3.")
    if s.max() > 2000 or s.min() < 0:
        sys.exit("PM2.5 values look wrong for ug/m3 (negative or > 2000). Check the column and units.")
    return s


def observed_onset(obs, first_release, jump=50.0, consecutive=2, baseline_h=12):
    """FIXED RULE: baseline = median PM2.5 in the 12 h before the first fire detection.
    Onset = first hour at/after first_release where PM2.5 >= baseline + 50 ug/m3 for 2 consecutive hours."""
    base = obs[first_release - timedelta(hours=baseline_h):first_release - timedelta(hours=1)].dropna()
    if len(base) < 6:
        sys.exit("Need >= 6 hourly PM2.5 values in the 12 h before the first fire detection (extend --obs-csv).")
    thr = base.median() + jump
    after = obs[first_release:]
    hit = (after >= thr).astype(int)
    run = hit.rolling(consecutive).sum()
    idx = run[run >= consecutive].index
    if len(idx) == 0:
        return {"baseline": float(base.median()), "threshold": float(thr), "onset": None, "peak_time": None, "peak": float(after.max())}
    onset = idx[0] - timedelta(hours=consecutive - 1)
    return {"baseline": float(base.median()), "threshold": float(thr), "onset": onset,
            "peak_time": after.idxmax(), "peak": float(after.max())}


# ───────────────────────────── models ────────────────────────────
def parcel_arrival(w, lat, lon, t0, station, radius_km, level, max_h=48.0, dt_h=0.25):
    la, lo, t = lat, lon, t0
    for _ in range(int(max_h / dt_h)):
        ws, wd = w.wind_at(la, lo, t, level)
        if math.isnan(ws) or math.isnan(wd):
            return None
        la, lo = destination_point(la, lo, (wd + 180.0) % 360.0, ws * 3.6 * dt_h)
        t = t + timedelta(hours=dt_h)
        if haversine_distance(la, lo, station[0], station[1]) <= radius_km:
            return (t - t0).total_seconds() / 3600.0, t
    return None


def cone_covers(w, row, station, hours):
    ws, wd = w.wind_at(row.lat, row.lon, row.t.floor("h"), 10)
    u = -ws * math.sin(math.radians(wd))   # exactly what ingestion_engine/handler.py computes
    v = -ws * math.cos(math.radians(wd))
    cone = calculate_trajectory_cone(row.lat, row.lon, u, v, float(row.frp), hours=hours)
    return point_in_polygon(station[0], station[1], cone["geometry"]["coordinates"][0])


def wquantile(x, w, q):
    o = np.argsort(x)
    x, w = np.asarray(x)[o], np.asarray(w)[o]
    c = np.cumsum(w) / w.sum()
    return x[np.searchsorted(c, q)]


def run(fires, w, station, radius_km, obs):
    name, slat, slon = station
    st = (slat, slon)
    first_rel = fires["t"].min().floor("h")
    out = {"station": name, "n_fires": int(len(fires)), "total_frp_mw": float(fires["frp"].sum())}
    on = observed_onset(obs, first_rel)
    out.update({"obs_baseline": on["baseline"], "obs_threshold": on["threshold"],
                "obs_onset_utc": str(on["onset"]), "obs_peak_utc": str(on["peak_time"]), "obs_peak": on["peak"]})

    for hrs in (6, 12, 24):
        hit = np.array([cone_covers(w, r, st, hrs) for r in fires.itertuples()])
        out[f"cone_{hrs}h_frp_covering_station"] = float(fires["frp"][hit].sum() / fires["frp"].sum())

    for level in (10, 100):
        arr = []
        for r in fires.itertuples():
            res = parcel_arrival(w, r.lat, r.lon, r.t.floor("h"), st, radius_km, level)
            if res:
                arr.append((res[0], res[1], r.frp, r.t))
        key = f"parcel{level}m"
        out[f"{key}_frp_arriving"] = float(sum(a[2] for a in arr) / fires["frp"].sum())
        if arr:
            hrs_ = [a[0] for a in arr]
            fr = [a[2] for a in arr]
            med_h = wquantile(hrs_, fr, 0.5)
            med_rel = min(a[3] for a in arr)
            pred = med_rel + timedelta(hours=float(med_h))
            out[f"{key}_travel_h_p10_p50_p90"] = [round(float(wquantile(hrs_, fr, q)), 1) for q in (0.1, 0.5, 0.9)]
            out[f"{key}_pred_arrival_utc"] = str(pred)
            if on["onset"] is not None:
                out[f"{key}_error_h_vs_onset"] = round((pred - on["onset"]).total_seconds() / 3600.0, 1)
    return out


def markdown(res, args):
    lines = [f"### Back-test: {args.date}, {res['station']} (generated by backtest.py; inputs: FIRMS {args.firms_source}, "
             f"ERA5 via Open-Meteo, PM2.5 from {Path(args.obs_csv).name})", "",
             f"- Observed onset (rule: baseline+50 µg/m³ for 2 h; baseline {res['obs_baseline']:.0f}): **{res['obs_onset_utc']} UTC**, peak {res['obs_peak']:.0f} µg/m³",
             f"- Fires used: {res['n_fires']} detections, {res['total_frp_mw']:.0f} MW total FRP", "",
             "| Predictor | Result |", "|---|---|"]
    for k, v in res.items():
        if k.startswith(("cone_", "parcel")):
            lines.append(f"| `{k}` | {v} |")
    lines += ["", "> One event is an illustration, not proof of skill. Station onset may also reflect local sources; see Limitations."]
    return "\n".join(lines)


# ───────────────────────────── self-test ─────────────────────────
def selftest():
    """Synthetic data only. Verifies the code paths and the sign convention; NOT a validation."""
    print("SELFTEST (synthetic data; this is not validation)")
    src = (30.9, 75.85)
    st = DEFAULT_STATION
    brg = math.degrees(math.atan2(math.sin(math.radians(st[2] - src[1])) * math.cos(math.radians(st[1])),
                                  math.cos(math.radians(src[0])) * math.sin(math.radians(st[1]))
                                  - math.sin(math.radians(src[0])) * math.cos(math.radians(st[1])) * math.cos(math.radians(st[2] - src[1])))) % 360
    wd_from = (brg + 180) % 360
    grid = make_grid(tuple(float(x) for x in DEFAULT_BBOX.split(",")))
    times = pd.date_range("2025-11-03", periods=96, freq="h")
    full = lambda v: np.full((len(grid), len(times)), v)  # noqa: E731
    w = Winds([g[0] for g in grid], [g[1] for g in grid], times, full(5.0), full(wd_from), full(5.0), full(wd_from))
    t0 = pd.Timestamp("2025-11-03 08:00")
    fires = pd.DataFrame({"lat": [30.9, 30.95, 30.85], "lon": [75.85, 75.8, 75.9], "frp": [100., 80., 60.], "t": [t0] * 3})
    dist = haversine_distance(src[0], src[1], st[1], st[2])
    expect_h = (dist - 30) / 18.0
    res = parcel_arrival(w, 30.9, 75.85, t0, (st[1], st[2]), 30, 10)
    print(f"  distance {dist:.0f} km at 18 km/h -> expected ~{expect_h:.1f} h, parcel model {res[0]:.1f} h")
    assert res and abs(res[0] - expect_h) < 1.0
    row = fires.iloc[0]
    row = type("R", (), {"lat": row.lat, "lon": row.lon, "t": row.t, "frp": row.frp})()
    c18 = cone_covers(w, row, (st[1], st[2]), 18)
    c12 = cone_covers(w, row, (st[1], st[2]), 12)
    print(f"  wind aimed exactly at station: cone covers station @18h={c18}  @12h={c12}  (18 km/h x 12 h x buoyancy ~ 233 km < {dist:.0f} km)")
    assert c18 and not c12
    # direction regression test: a NW wind (from 315 deg) must send smoke SE, never SW
    wnw = Winds(w.lats, w.lons, w.times, full(5.0), full(315.0), full(5.0), full(315.0))
    _ws, _wd = wnw.wind_at(30.9, 75.85, t0, 10)
    cone = calculate_trajectory_cone(30.9, 75.85, -_ws * math.sin(math.radians(_wd)), -_ws * math.cos(math.radians(_wd)), 100.0, hours=6)
    print(f"  NW wind bearing = {cone['properties']['bearing_deg']} deg (expect 135)")
    assert abs(cone["properties"]["bearing_deg"] - 135.0) < 1.0
    obs_idx = pd.date_range("2025-11-02 20:00", periods=70, freq="h")
    arrive = t0 + timedelta(hours=res[0])
    vals = np.where(obs_idx >= arrive.floor("h"), 220.0, 60.0)
    obs = pd.Series(vals, index=obs_idx)
    on = observed_onset(obs, t0.floor("h"))
    print(f"  synthetic onset detected {on['onset']} vs parcel arrival {arrive:%Y-%m-%d %H:%M}")
    assert abs((on["onset"] - arrive).total_seconds()) < 2 * 3600
    out = run(fires, w, DEFAULT_STATION, 30, obs)
    assert out["parcel10m_frp_arriving"] > 0.99
    print("SELFTEST PASSED")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--date", help="first fire day (UTC), YYYY-MM-DD")
    ap.add_argument("--fire-days", type=int, default=2, help="days of detections from --date (FIRMS max 5)")
    ap.add_argument("--firms-source", default="VIIRS_SNPP_SP", help="SP = archived standard product; NRT for recent days")
    ap.add_argument("--fires-csv", help="pre-downloaded FIRMS CSV instead of API")
    ap.add_argument("--obs-csv", help="hourly PM2.5 CSV with a timestamp column and a column containing 'pm2'")
    ap.add_argument("--obs-tz", default="Asia/Kolkata", help="timezone of timestamps in --obs-csv")
    ap.add_argument("--obs-dayfirst", choices=("auto", "yes", "no"), default="auto", help="date order in --obs-csv (CPCB: day-first)")
    ap.add_argument("--station", nargs=3, metavar=("NAME", "LAT", "LON"))
    ap.add_argument("--bbox", default=DEFAULT_BBOX)
    ap.add_argument("--radius-km", type=float, default=30.0, help="parcel 'arrival' radius around the station")
    ap.add_argument("--cache-dir", default="backtest_data")
    ap.add_argument("--results-csv", default="backtest_results.csv")
    args = ap.parse_args()
    if args.selftest:
        return selftest()
    if not (args.date and args.obs_csv):
        ap.error("--date and --obs-csv are required (or use --selftest)")
    station = (args.station[0], float(args.station[1]), float(args.station[2])) if args.station else DEFAULT_STATION
    bbox = tuple(float(x) for x in args.bbox.split(","))
    fires = load_fires(args, args.bbox)
    if fires.empty:
        sys.exit("No usable fire detections for that window.")
    start = pd.Timestamp(args.date)
    end = start + timedelta(days=args.fire_days + 2)
    w = fetch_winds(make_grid(bbox), str(start.date()), str(end.date()), Path(args.cache_dir))
    obs = load_obs(args.obs_csv, args.obs_tz, args.obs_dayfirst)
    res = run(fires, w, station, args.radius_km, obs)
    res["date"] = args.date
    print(json.dumps(res, indent=2, default=str))
    pd.DataFrame([res]).to_csv(args.results_csv, mode="a", header=not Path(args.results_csv).exists(), index=False)
    md = markdown(res, args)
    Path(args.cache_dir, f"readme_snippet_{args.date}.md").write_text(md)
    print("\n" + md)


if __name__ == "__main__":
    main()
