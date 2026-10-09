"""
vayusync.lambdas.ingestion_engine.handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lambda handler for VayuSync-IngestionEngine.

Triggered every 6 hours by an EventBridge scheduled rule.

Pipeline
--------
1. Fetch NASA FIRMS satellite fire hotspot data (CSV -> dicts).
   Falls back to realistic mock data if the API is unavailable or rate-limited.
2. Fetch Open-Meteo wind vectors for a Punjab/Haryana/Delhi NCR bounding box.
3. For each hotspot, calculate a 6-hour downwind smoke trajectory cone polygon
   using Lagrangian dispersion math.
4. Store enriched hotspot records in DynamoDB (VayuSync_Hotspots).
5. Store the full GeoJSON FeatureCollection in S3
   (vayusync-raw-payloads-2026/<date>/<run_id>.geojson).
6. Invoke EvaluatorEngine asynchronously to match trajectories to institutions.
"""

import csv
import io
import json
import logging
import math
import os
import uuid
from datetime import datetime, timezone, timedelta

import boto3
import requests

# Import shared utilities from Lambda Layer
from geo_utils import calculate_trajectory_cone, latlon_to_geohash
from mock_data import MOCK_HOTSPOTS, get_wind_for_region

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=getattr(logging, log_level, logging.INFO),
)
logger = logging.getLogger("vayusync.ingestion_engine")

# ── AWS Clients (initialized once at module level for connection reuse) ────────
_region = os.environ.get("AWS_REGION", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=_region)
s3_client = boto3.client("s3", region_name=_region)
lambda_client = boto3.client("lambda", region_name=_region)

# ── Environment Variables ─────────────────────────────────────────────────────
HOTSPOTS_TABLE = os.environ.get("HOTSPOTS_TABLE", "VayuSync_Hotspots")
RAW_PAYLOAD_BUCKET = os.environ.get("RAW_PAYLOAD_BUCKET", "vayusync-raw-payloads-2026")
EVALUATOR_FUNCTION_NAME = os.environ.get("EVALUATOR_FUNCTION_NAME", "VayuSync-EvaluatorEngine")
NASA_FIRMS_API_KEY = os.environ.get("NASA_FIRMS_API_KEY", "")

# ── Constants ─────────────────────────────────────────────────────────────────
# Punjab + Haryana + Delhi NCR bounding box (W, S, E, N)
FIRMS_AREA = "73.5,27.5,78.5,32.5"
FIRMS_DAYS = 1  # Look back 1 day for near-real-time data

# Open-Meteo grid points covering the study area
OPEN_METEO_GRID = [
    {"lat": 30.92, "lon": 75.85, "label": "Ludhiana"},
    {"lat": 28.89, "lon": 76.59, "label": "Rohtak"},
    {"lat": 28.65, "lon": 77.22, "label": "Delhi"},
]

# Hotspot TTL: 7 days from ingestion
HOTSPOT_TTL_DAYS = 7

# FIRMS confidence filter -- only process high/nominal confidence detections
ALLOWED_CONFIDENCE = {"h", "n", "high", "nominal"}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN HANDLER
# ─────────────────────────────────────────────────────────────────────────────


def lambda_handler(event, context):
    """
    Main Lambda entry point.

    Accepts EventBridge schedule events and also direct invocations with
    an optional force_mock boolean field for testing.

    Returns
    -------
    dict
        Summary of hotspots processed, stored, and trajectory cones generated.
    """
    run_id = str(uuid.uuid4())
    run_ts = datetime.now(timezone.utc)

    logger.info("=== IngestionEngine run %s starting at %s ===", run_id, run_ts.isoformat())

    force_mock = event.get("force_mock", False) if isinstance(event, dict) else False

    # ── Step 1: Fetch fire hotspots ───────────────────────────────────────────
    hotspots = []
    source = "unknown"

    if not force_mock and NASA_FIRMS_API_KEY:
        hotspots, source = _fetch_firms_hotspots()

    if not hotspots:
        logger.warning("No live FIRMS data available -- using realistic mock hotspots")
        hotspots = MOCK_HOTSPOTS
        source = "mock"

    logger.info("Loaded %d hotspot(s) from source=%s", len(hotspots), source)

    # ── Step 2: Fetch wind data ───────────────────────────────────────────────
    wind_data = _fetch_wind_data()
    logger.info("Wind data fetched for %d grid points", len(wind_data))

    # ── Step 3: Enrich hotspots with trajectory cones ─────────────────────────
    geojson_features = []
    stored_count = 0
    failed_count = 0

    hotspots_table = dynamodb.Table(HOTSPOTS_TABLE)
    ttl_epoch = int((run_ts + timedelta(days=HOTSPOT_TTL_DAYS)).timestamp())

    for raw in hotspots:
        try:
            enriched = _enrich_hotspot(raw, wind_data, run_id, ttl_epoch)
            _store_hotspot(hotspots_table, enriched)
            geojson_features.append(_to_geojson_feature(enriched))
            stored_count += 1
            logger.info(
                "Stored hotspot %s (FRP=%.1f MW, bearing=%.1f deg, dist=%.1f km)",
                enriched["hotspot_id"],
                float(enriched["frp"]),
                float(enriched["cone_bearing_deg"]),
                float(enriched["cone_distance_km"]),
            )
        except Exception as exc:
            failed_count += 1
            logger.error(
                "Failed to process hotspot %s: %s",
                raw.get("hotspot_id", "?"),
                exc,
                exc_info=True,
            )

    # ── Step 4: Store GeoJSON payload in S3 ───────────────────────────────────
    s3_key = None
    if geojson_features:
        s3_key = _store_geojson_s3(geojson_features, run_id, run_ts)

    # ── Step 5: Async invoke EvaluatorEngine ──────────────────────────────────
    if stored_count > 0:
        _invoke_evaluator(run_id, stored_count)
    else:
        logger.warning("No hotspots stored -- skipping EvaluatorEngine invocation")

    result = {
        "run_id": run_id,
        "timestamp": run_ts.isoformat(),
        "source": source,
        "hotspots_fetched": len(hotspots),
        "hotspots_stored": stored_count,
        "hotspots_failed": failed_count,
        "s3_key": s3_key,
        "evaluator_triggered": stored_count > 0,
    }

    logger.info("=== IngestionEngine run %s complete: %s ===", run_id, result)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# FIRMS DATA FETCHING
# ─────────────────────────────────────────────────────────────────────────────


def _fetch_firms_hotspots() -> tuple:
    """
    Fetch near-real-time fire hotspot data from the NASA FIRMS API.

    Returns
    -------
    tuple
        (hotspot_list, source_string) where source is "firms_live" on success
        or "firms_empty/error" on failure.
    """
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv"
        f"/{NASA_FIRMS_API_KEY}/VIIRS_SNPP_NRT/{FIRMS_AREA}/{FIRMS_DAYS}"
    )
    logger.info("Fetching FIRMS data (API key redacted)")

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()

        raw_csv = resp.text.strip()
        if not raw_csv or "latitude" not in raw_csv:
            logger.warning("FIRMS response empty or malformed")
            return [], "firms_empty"

        hotspots = _parse_firms_csv(raw_csv)
        # Filter by confidence level
        hotspots = [h for h in hotspots if h.get("confidence", "").lower() in ALLOWED_CONFIDENCE]
        return hotspots, "firms_live"

    except requests.exceptions.Timeout:
        logger.error("FIRMS API request timed out after 15s")
        return [], "firms_timeout"
    except requests.exceptions.HTTPError as exc:
        logger.error("FIRMS API HTTP error: %s", exc)
        return [], "firms_http_error"
    except Exception as exc:
        logger.error("Unexpected FIRMS fetch error: %s", exc, exc_info=True)
        return [], "firms_error"


def _parse_firms_csv(csv_text: str) -> list:
    """
    Parse FIRMS CSV text into a list of hotspot dicts.

    Assigns a deterministic hotspot_id from the acquisition coordinates and time.
    """
    hotspots = []
    reader = csv.DictReader(io.StringIO(csv_text))

    for row in reader:
        try:
            lat = float(row.get("latitude", 0))
            lon = float(row.get("longitude", 0))
            frp = float(row.get("frp", 0) or 0)

            if frp <= 0:
                continue  # Skip invalid detections

            acq_date = row.get("acq_date", "").replace("-", "")
            acq_time = row.get("acq_time", "0000")
            hotspot_id = (
                f"HS-FIRMS-{acq_date}-{acq_time}"
                f"-{int(lat*100):+06d}-{int(lon*100):+07d}"
            )

            hotspots.append({
                "hotspot_id": hotspot_id,
                "latitude": lat,
                "longitude": lon,
                "brightness": float(row.get("brightness", 0) or 0),
                "frp": frp,
                "scan": float(row.get("scan", 0) or 0),
                "track": float(row.get("track", 0) or 0),
                "acq_date": row.get("acq_date", ""),
                "acq_time": row.get("acq_time", ""),
                "satellite": row.get("satellite", ""),
                "instrument": row.get("instrument", "VIIRS"),
                "confidence": row.get("confidence", "n"),
                "version": row.get("version", "2.0NRT"),
                "bright_t31": float(row.get("bright_t31", 0) or 0),
                "daynight": row.get("daynight", "D"),
            })
        except (ValueError, KeyError) as exc:
            logger.debug("Skipping malformed FIRMS row: %s -- %s", row, exc)

    return hotspots


# ─────────────────────────────────────────────────────────────────────────────
# WIND DATA FETCHING
# ─────────────────────────────────────────────────────────────────────────────


def _fetch_wind_data() -> list:
    """
    Fetch current wind vectors from Open-Meteo for all grid points.

    Open-Meteo is free, does not require an API key, and returns
    hourly wind speed and direction data.

    Returns
    -------
    list[dict]
        List of wind data dicts with lat, lon, u_wind_ms, v_wind_ms.
    """
    results = []

    for grid in OPEN_METEO_GRID:
        lat, lon, label = grid["lat"], grid["lon"], grid["label"]
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&hourly=windspeed_10m,winddirection_10m"
            f"&timezone=Asia%2FKolkata"
            f"&forecast_days=1"
        )
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            # Extract the most current hour's wind data
            wind_speed_kmh_list = data.get("hourly", {}).get("windspeed_10m", [])
            wind_dir_list = data.get("hourly", {}).get("winddirection_10m", [])

            if not wind_speed_kmh_list:
                raise ValueError("Empty wind data from Open-Meteo")

            # Use the current hour index
            current_hour = datetime.now(timezone.utc).hour
            idx = min(current_hour, len(wind_speed_kmh_list) - 1)
            wind_speed_kmh = wind_speed_kmh_list[idx] or 10.0
            wind_dir_deg = wind_dir_list[idx] or 315.0  # NW default

            # Convert meteorological direction to u/v components
            # Met direction: 0=from North, 90=from East, 270=from West
            # u = -speed * sin(direction) -- eastward component
            # v = -speed * cos(direction) -- northward component
            wind_speed_ms = wind_speed_kmh / 3.6
            u_wind = -wind_speed_ms * math.sin(math.radians(wind_dir_deg))
            v_wind = -wind_speed_ms * math.cos(math.radians(wind_dir_deg))

            results.append({
                "latitude": lat,
                "longitude": lon,
                "label": label,
                "u_wind_ms": round(u_wind, 3),
                "v_wind_ms": round(v_wind, 3),
                "wind_speed_kmh": round(wind_speed_kmh, 2),
                "wind_dir_deg": wind_dir_deg,
                "source": "open_meteo_live",
            })
            logger.info(
                "Wind at %s: %.1f km/h from %.0f deg (u=%.2f, v=%.2f m/s)",
                label,
                wind_speed_kmh,
                wind_dir_deg,
                u_wind,
                v_wind,
            )

        except Exception as exc:
            logger.warning(
                "Open-Meteo fetch failed for %s: %s -- using mock wind", label, exc
            )
            # Fall back to realistic mock wind for October stubble season
            mock_wind = get_wind_for_region(lat, lon)
            mock_wind["source"] = "mock_fallback"
            results.append(mock_wind)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# HOTSPOT ENRICHMENT
# ─────────────────────────────────────────────────────────────────────────────


def _enrich_hotspot(raw: dict, wind_data: list, run_id: str, ttl_epoch: int) -> dict:
    """
    Enrich a raw FIRMS hotspot with wind data, trajectory cone, and metadata.

    Selects the closest wind grid point by Euclidean distance in lat/lon space
    (sufficient precision for ~200 km scales).
    """
    lat = float(raw["latitude"])
    lon = float(raw["longitude"])
    frp = float(raw.get("frp", 1000.0))

    # ── Select closest wind grid point ────────────────────────────────────────
    best_wind = wind_data[0]
    min_dist = float("inf")
    for w in wind_data:
        d = math.hypot(lat - w["latitude"], lon - w["longitude"])
        if d < min_dist:
            min_dist = d
            best_wind = w

    u_wind = best_wind["u_wind_ms"]
    v_wind = best_wind["v_wind_ms"]

    # ── Calculate 6-hour and 12-hour trajectory cones ─────────────────────────
    cone_6h = calculate_trajectory_cone(lat, lon, u_wind, v_wind, frp, hours=6)
    cone_12h = calculate_trajectory_cone(lat, lon, u_wind, v_wind, frp, hours=12)

    cone_props = cone_6h["properties"]

    # ── Generate geohash for spatial indexing ─────────────────────────────────
    geohash = latlon_to_geohash(lat, lon, precision=6)

    ingestion_ts = datetime.now(timezone.utc).isoformat()

    enriched = {
        # Primary keys
        "hotspot_id": raw["hotspot_id"],
        "timestamp": ingestion_ts,
        # Core FIRMS fields (stored as strings for DynamoDB Decimal safety)
        "latitude": str(lat),
        "longitude": str(lon),
        "frp": str(round(frp, 2)),
        "brightness": str(round(float(raw.get("brightness", 0)), 2)),
        "confidence": raw.get("confidence", "n"),
        "satellite": raw.get("satellite", "N"),
        "instrument": raw.get("instrument", "VIIRS"),
        "acq_date": raw.get("acq_date", ingestion_ts[:10]),
        "acq_time": raw.get("acq_time", ingestion_ts[11:16].replace(":", "")),
        "daynight": raw.get("daynight", "D"),
        "region": raw.get("region", "Unknown"),
        # Spatial index
        "geohash": geohash,
        # Wind data used for trajectory
        "wind_grid_point": best_wind.get("label", "unknown"),
        "u_wind_ms": str(u_wind),
        "v_wind_ms": str(v_wind),
        "wind_speed_kmh": str(round(best_wind.get("wind_speed_kmh", 0), 2)),
        "wind_source": best_wind.get("source", "mock"),
        # Trajectory cone data (6-hour forecast)
        "cone_bearing_deg": str(round(cone_props["bearing_deg"], 2)),
        "cone_distance_km": str(round(cone_props["transport_distance_km"], 2)),
        "cone_half_angle_deg": str(cone_props["cone_half_angle_deg"]),
        "cone_bbox_min_lat": str(round(cone_props["bbox"]["min_lat"], 6)),
        "cone_bbox_max_lat": str(round(cone_props["bbox"]["max_lat"], 6)),
        "cone_bbox_min_lon": str(round(cone_props["bbox"]["min_lon"], 6)),
        "cone_bbox_max_lon": str(round(cone_props["bbox"]["max_lon"], 6)),
        # Full GeoJSON cones (stored as JSON string)
        "cone_geojson_6h": json.dumps(cone_6h["geometry"]),
        "cone_geojson_12h": json.dumps(cone_12h["geometry"]),
        # Metadata
        "run_id": run_id,
        "is_active": "true",
        "ttl_epoch": ttl_epoch,
    }

    # Carry through extra mock fields if present
    if "area_ha" in raw:
        enriched["area_ha"] = str(raw["area_ha"])

    return enriched


# ─────────────────────────────────────────────────────────────────────────────
# DYNAMODB STORAGE
# ─────────────────────────────────────────────────────────────────────────────


def _store_hotspot(table, enriched: dict) -> None:
    """
    Write an enriched hotspot record to DynamoDB.
    Conditional expression prevents overwriting a more recent record
    with the same hotspot_id (idempotent across retries).
    """
    from botocore.exceptions import ClientError

    try:
        table.put_item(
            Item=enriched,
            ConditionExpression=(
                "attribute_not_exists(hotspot_id) OR #ts < :new_ts"
            ),
            ExpressionAttributeNames={"#ts": "timestamp"},
            ExpressionAttributeValues={":new_ts": enriched["timestamp"]},
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.info(
                "Hotspot %s already has a newer record -- skipping overwrite",
                enriched["hotspot_id"],
            )
        else:
            raise


# ─────────────────────────────────────────────────────────────────────────────
# S3 STORAGE
# ─────────────────────────────────────────────────────────────────────────────


def _to_geojson_feature(enriched: dict) -> dict:
    """Convert an enriched hotspot dict to a GeoJSON Feature for S3 storage."""
    # Exclude large cone geometry blobs from the per-feature properties
    props = {
        k: v
        for k, v in enriched.items()
        if k not in ("cone_geojson_6h", "cone_geojson_12h")
    }
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [float(enriched["longitude"]), float(enriched["latitude"])],
        },
        "properties": props,
    }


def _store_geojson_s3(features: list, run_id: str, run_ts: datetime) -> str:
    """
    Store the full hotspot GeoJSON FeatureCollection in S3.

    Key format: raw-hotspots/<YYYY-MM-DD>/<run_id>.geojson
    """
    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "run_id": run_id,
            "generated_at": run_ts.isoformat(),
            "feature_count": len(features),
            "source": "VayuSync-IngestionEngine",
        },
        "features": features,
    }

    s3_key = f"raw-hotspots/{run_ts.strftime('%Y-%m-%d')}/{run_id}.geojson"
    body = json.dumps(geojson, indent=2)

    s3_client.put_object(
        Bucket=RAW_PAYLOAD_BUCKET,
        Key=s3_key,
        Body=body.encode("utf-8"),
        ContentType="application/geo+json",
        Metadata={
            "run_id": run_id,
            "feature_count": str(len(features)),
        },
    )
    logger.info(
        "Stored GeoJSON payload: s3://%s/%s (%d bytes)",
        RAW_PAYLOAD_BUCKET,
        s3_key,
        len(body),
    )
    return s3_key


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATOR ENGINE INVOCATION
# ─────────────────────────────────────────────────────────────────────────────


def _invoke_evaluator(run_id: str, hotspot_count: int) -> None:
    """
    Asynchronously invoke the EvaluatorEngine Lambda with the current run_id.
    Uses InvocationType=Event (fire-and-forget) to stay within ingestion timeout.
    """
    payload = {
        "run_id": run_id,
        "hotspot_count": hotspot_count,
        "source": "ingestion_engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        response = lambda_client.invoke(
            FunctionName=EVALUATOR_FUNCTION_NAME,
            InvocationType="Event",   # Async -- does not wait for response
            Payload=json.dumps(payload),
        )
        status_code = response.get("StatusCode", 0)
        if status_code == 202:
            logger.info("EvaluatorEngine invoked asynchronously (run_id=%s)", run_id)
        else:
            logger.warning("EvaluatorEngine invocation returned status %d", status_code)
    except Exception as exc:
        logger.error("Failed to invoke EvaluatorEngine: %s", exc, exc_info=True)
        # Do not raise -- ingestion success should not depend on evaluator invocation
