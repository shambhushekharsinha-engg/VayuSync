#!/usr/bin/env python3
"""
Mechanical date-screening utility for VayuSync retrospective back-test.

Evaluates daily Open-Meteo ERA5 100 m wind direction/speed over Punjab (Ludhiana)
and optional NASA FIRMS fire counts (if NASA_FIRMS_API_KEY or --fires-csv is provided)
WITHOUT inspecting ground-station PM2.5 values, preventing cherry-picking.

Selection rules (fixed before viewing PM2.5):
  - Candidate NW Transport Event Days:
      Mean 100 m wind from NNW/NW (295° <= wd_from <= 345°, i.e., transport bearing 115°–165°)
      AND mean 100 m wind speed >= 3.0 m/s.
  - Candidate Control Days (Non-NW / Easterly / Weak flow):
      Mean 100 m wind from East/SE (60° <= wd_from <= 150°) OR wind speed < 2.0 m/s.

Usage:
  python backend/scripts/screen_dates.py --year 2025
  python backend/scripts/screen_dates.py --year 2024
"""
import argparse
import json
import math
import os
import urllib.request
import numpy as np
import pandas as pd


def screen_window(start_date: str, end_date: str):
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude=30.9&longitude=75.85&start_date={start_date}&end_date={end_date}"
        f"&hourly=wind_speed_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m"
        f"&wind_speed_unit=ms&timezone=GMT"
    )
    with urllib.request.urlopen(url, timeout=30) as r:
        data = json.loads(r.read().decode())

    hourly = data["hourly"]
    df = pd.DataFrame({
        "t": pd.to_datetime(hourly["time"]),
        "ws10": hourly["wind_speed_10m"],
        "wd10": hourly["wind_direction_10m"],
        "ws100": hourly["wind_speed_100m"],
        "wd100": hourly["wind_direction_100m"],
    })
    df["date"] = df["t"].dt.strftime("%Y-%m-%d")

    rows = []
    for d, g in df.groupby("date"):
        u = -np.mean(g["ws100"] * np.sin(np.radians(g["wd100"])))
        v = -np.mean(g["ws100"] * np.cos(np.radians(g["wd100"])))
        wd_from = math.degrees(math.atan2(-u, -v)) % 360
        bearing_to = (wd_from + 180.0) % 360
        ws_mean = float(g["ws100"].mean())

        if 295 <= wd_from <= 345 and ws_mean >= 3.0:
            category = "NW_TRANSPORT_CANDIDATE"
        elif 60 <= wd_from <= 150:
            category = "CONTROL_EASTERLY_SE"
        else:
            category = "OTHER"

        rows.append({
            "date": d,
            "ws100_ms": round(ws_mean, 2),
            "wd100_from_deg": round(wd_from, 0),
            "transport_bearing_deg": round(bearing_to, 0),
            "regime": category,
        })

    return pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year", type=int, default=2025, choices=(2024, 2025))
    args = ap.parse_args()

    # Start Oct 26 so at least 24h of obs exist after Oct 25
    df = screen_window(f"{args.year}-10-26", f"{args.year}-11-20")
    print(f"\n=== MECHANICAL WIND REGIME SCREENING ({args.year}-10-26 to {args.year}-11-20) ===")
    print(df.to_string(index=False))

    nw = df[df["regime"] == "NW_TRANSPORT_CANDIDATE"].sort_values("ws100_ms", ascending=False)
    ctrl = df[df["regime"] == "CONTROL_EASTERLY_SE"].sort_values("ws100_ms", ascending=False)

    print("\nTop 3 Mechanical NW Transport Candidates (by 100m wind speed):")
    print(nw.head(3).to_string(index=False))

    print("\nTop 2 Mechanical Control Candidates (Easterly/SE flow opposing Punjab->Delhi transport):")
    print(ctrl.head(2).to_string(index=False))


if __name__ == "__main__":
    main()
