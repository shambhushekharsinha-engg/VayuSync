"""
vayusync.lambdas.simulate_trigger.handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lambda handler for VayuSync-SimulateTrigger.

This is the hackathon demo endpoint -- POST /simulate.

It creates a synthetic NASA FIRMS-format thermal anomaly, injects it into
DynamoDB, runs the full EvaluatorEngine pipeline SYNCHRONOUSLY (not async),
and returns the complete result in < 3 seconds.

Request body (JSON, all fields optional):
  {
    "hotspot_lat": 30.9,     // defaults to Ludhiana, Punjab
    "hotspot_lon": 75.85,
    "frp_mw": 1000,          // Fire Radiative Power (MW), range 800-1200
    "hours": 6,              // trajectory window (hours)
    "scenario": "worst_case" // "worst_case" | "moderate" | "light"
  }

Response (JSON):
  {
    "hotspot": { ... },
    "trajectory_cone": { ... GeoJSON Feature ... },
    "institutions_at_risk": [ ... ],
    "alerts": [ ... ]
  }
"""

import json
import logging
import math
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

from geo_utils import calculate_trajectory_cone, latlon_to_geohash, haversine_distance
from geo_utils import point_in_polygon, estimate_pm25_at_institution
from mock_data import MOCK_INSTITUTIONS, get_wind_for_region

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=getattr(logging, log_level, logging.INFO),
)
logger = logging.getLogger("vayusync.simulate_trigger")

# ── AWS Clients ───────────────────────────────────────────────────────────────
_region = os.environ.get("AWS_REGION", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=_region)
lambda_client = boto3.client("lambda", region_name=_region)

# ── Environment Variables ─────────────────────────────────────────────────────
HOTSPOTS_TABLE = os.environ.get("HOTSPOTS_TABLE", "VayuSync_Hotspots")
EVALUATOR_FUNCTION_NAME = os.environ.get(
    "EVALUATOR_FUNCTION_NAME", "VayuSync-EvaluatorEngine"
)

# ── Default location: Ludhiana, Punjab (dense paddy stubble region, transboundary corridor to Delhi) ──
DEFAULT_LAT = 30.9
DEFAULT_LON = 75.85

# ── Scenario presets (calibrated along the 151°-155° NW-to-Delhi transport vector) ────────────
SCENARIOS = {
    "worst_case": {
        "frp_range": (1100, 1400),
        "u_wind_ms": 3.5,           # Eastward vector component
        "v_wind_ms": -6.2,          # Southward vector component -> Bearing 150.6° directly toward Delhi NCR
        "mixing_height_m": 450,     # Low boundary layer inversion -> severe trapping
        "description": "Peak burning period with strong NW winds funneling smoke directly into Delhi NCR corridor",
    },
    "moderate": {
        "frp_range": (800, 1100),
        "u_wind_ms": 2.6,
        "v_wind_ms": -5.4,          # Bearing 154.3° directly toward Delhi NCR
        "mixing_height_m": 680,
        "description": "Typical seasonal NW stubble plume corridor directed toward Delhi NCR",
    },
    "light": {
        "frp_range": (400, 800),
        "u_wind_ms": 1.8,
        "v_wind_ms": -3.8,          # Bearing 154.7°
        "mixing_height_m": 950,
        "description": "Moderate agricultural burning with steady NW transport vector",
    },
}

# ── CORS Headers ──────────────────────────────────────────────────────────────
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN HANDLER
# ─────────────────────────────────────────────────────────────────────────────


def lambda_handler(event, context):
    """
    Main Lambda entry point -- handles POST /simulate API Gateway requests.

    Returns an API Gateway proxy response with full CORS headers.
    """
    start_time_ms = _now_ms()

    # ── Handle CORS preflight ─────────────────────────────────────────────────
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    logger.info("=== SimulateTrigger invoked ===")

    # ── Parse request body ────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _error_response(400, "Invalid JSON in request body")

    hotspot_lat = float(body.get("hotspot_lat", DEFAULT_LAT))
    hotspot_lon = float(body.get("hotspot_lon", DEFAULT_LON))
    scenario_name = body.get("scenario", "moderate")
    hours = int(body.get("hours", 6))

    # Validate inputs
    if not (-90 <= hotspot_lat <= 90) or not (-180 <= hotspot_lon <= 180):
        return _error_response(
            400,
            "Invalid coordinates: latitude must be -90..90, longitude -180..180",
        )

    if scenario_name not in SCENARIOS:
        scenario_name = "moderate"

    scenario = SCENARIOS[scenario_name]

    # ── Build synthetic hotspot ───────────────────────────────────────────────
    hotspot = _create_synthetic_hotspot(hotspot_lat, hotspot_lon, scenario, body)
    logger.info(
        "Synthetic hotspot: id=%s, lat=%.4f, lon=%.4f, frp=%.1f MW, scenario=%s",
        hotspot["hotspot_id"],
        hotspot_lat,
        hotspot_lon,
        float(hotspot["frp"]),
        scenario_name,
    )

    # ── Store hotspot in DynamoDB ─────────────────────────────────────────────
    _store_hotspot(hotspot)

    # ── Compute trajectory cone (for response) ────────────────────────────────
    u_wind = float(hotspot["u_wind_ms"])
    v_wind = float(hotspot["v_wind_ms"])
    frp = float(hotspot["frp"])

    cone_feature = calculate_trajectory_cone(
        hotspot_lat, hotspot_lon, u_wind, v_wind, frp, hours=hours
    )

    # ── Invoke EvaluatorEngine SYNCHRONOUSLY ──────────────────────────────────
    eval_result = _invoke_evaluator_sync(hotspot)

    # ── Build response payload ────────────────────────────────────────────────
    elapsed_ms = _now_ms() - start_time_ms
    alerts = eval_result.get("alerts", [])

    # Sanitize alert records for JSON serialization
    serializable_alerts = [_serialize_alert(a) for a in alerts]

    # Build institutions-at-risk summary
    institutions_at_risk = _build_institutions_at_risk(alerts)

    response_body = {
        "simulation_id": hotspot["hotspot_id"],
        "scenario": scenario_name,
        "scenario_description": scenario["description"],
        "timestamp": hotspot["timestamp"],
        "elapsed_ms": elapsed_ms,
        "hotspot": {
            "hotspot_id": hotspot["hotspot_id"],
            "latitude": hotspot_lat,
            "longitude": hotspot_lon,
            "frp_mw": float(hotspot["frp"]),
            "region": hotspot.get("region", "Punjab, India"),
            "wind_bearing_deg": float(hotspot["cone_bearing_deg"]),
            "wind_speed_kmh": float(hotspot["wind_speed_kmh"]),
        },
        "trajectory_cone": cone_feature,
        "institutions_at_risk": institutions_at_risk,
        "alerts": serializable_alerts,
        "pipeline_summary": {
            "hotspots_evaluated": eval_result.get("hotspots_evaluated", 1),
            "institutions_checked": eval_result.get("institutions_checked", 0),
            "alerts_generated": len(alerts),
            "eval_id": eval_result.get("eval_id", ""),
        },
    }

    logger.info(
        "Simulation complete: %d alert(s) generated in %d ms",
        len(alerts),
        elapsed_ms,
    )

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_body, default=str),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SYNTHETIC HOTSPOT CREATION
# ─────────────────────────────────────────────────────────────────────────────


def _create_synthetic_hotspot(
    lat: float, lon: float, scenario: dict, body: dict
) -> dict:
    """
    Build a synthetic NASA FIRMS-format hotspot enriched with trajectory data.

    Mirrors the format produced by the real IngestionEngine so the EvaluatorEngine
    can process it without modification.
    """
    now_utc = datetime.now(timezone.utc)
    run_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
    hotspot_id = f"HS-SIM-{now_utc.strftime('%Y%m%d%H%M%S')}"

    # FRP from scenario range (or user override, clamped to valid range)
    frp_min, frp_max = scenario["frp_range"]
    if "frp_mw" in body:
        frp = max(frp_min, min(frp_max, float(body["frp_mw"])))
    else:
        frp = round(random.uniform(frp_min, frp_max), 1)

    # Add realistic jitter to wind components (+/- 10%)
    u_wind = round(scenario["u_wind_ms"] * random.uniform(0.9, 1.1), 3)
    v_wind = round(scenario["v_wind_ms"] * random.uniform(0.9, 1.1), 3)
    mixing_height = scenario["mixing_height_m"]

    wind_speed_ms = math.sqrt(u_wind ** 2 + v_wind ** 2)
    wind_speed_kmh = round(wind_speed_ms * 3.6, 2)

    geohash = latlon_to_geohash(lat, lon, precision=6)
    ttl_epoch = int((now_utc + timedelta(days=7)).timestamp())

    # Calculate cone geometry for storage and response
    cone_feature = calculate_trajectory_cone(lat, lon, u_wind, v_wind, frp, hours=6)
    cone_props = cone_feature["properties"]
    cone_6h_geom = cone_feature["geometry"]
    cone_12h_geom = calculate_trajectory_cone(
        lat, lon, u_wind, v_wind, frp, hours=12
    )["geometry"]

    bbox = cone_props["bbox"]
    region = _region_from_coords(lat, lon)

    return {
        "hotspot_id": hotspot_id,
        "timestamp": now_utc.isoformat(),
        # FIRMS-format fields
        "latitude": str(lat),
        "longitude": str(lon),
        "frp": str(round(frp, 2)),
        "brightness": str(round(330.0 + frp / 50, 1)),   # Approximate brightness (K)
        "confidence": "h",
        "satellite": "N",
        "instrument": "VIIRS",
        "acq_date": now_utc.strftime("%Y-%m-%d"),
        "acq_time": now_utc.strftime("%H%M"),
        "daynight": "D" if 6 <= now_utc.hour < 18 else "N",
        "region": region,
        # Wind data
        "u_wind_ms": str(u_wind),
        "v_wind_ms": str(v_wind),
        "wind_speed_kmh": str(wind_speed_kmh),
        "wind_grid_point": region,
        "wind_source": "simulated",
        "mixing_height_m": str(mixing_height),
        # Trajectory cone
        "cone_bearing_deg": str(round(cone_props["bearing_deg"], 2)),
        "cone_distance_km": str(round(cone_props["transport_distance_km"], 2)),
        "cone_half_angle_deg": str(cone_props["cone_half_angle_deg"]),
        "cone_bbox_min_lat": str(round(bbox["min_lat"], 6)),
        "cone_bbox_max_lat": str(round(bbox["max_lat"], 6)),
        "cone_bbox_min_lon": str(round(bbox["min_lon"], 6)),
        "cone_bbox_max_lon": str(round(bbox["max_lon"], 6)),
        "cone_geojson_6h": json.dumps(cone_6h_geom),
        "cone_geojson_12h": json.dumps(cone_12h_geom),
        # Metadata
        "geohash": geohash,
        "run_id": run_id,
        "is_active": "true",
        "is_simulated": "true",   # Flag so dashboards can distinguish simulations
        "ttl_epoch": ttl_epoch,
    }


def _region_from_coords(lat: float, lon: float) -> str:
    """Infer a human-readable region string from coordinates."""
    if lat > 31.0:
        return "Amritsar, Punjab"
    elif lat > 30.5:
        return "Ludhiana, Punjab"
    elif lat > 30.0:
        return "Patiala, Punjab"
    elif lat > 29.5:
        return "Karnal, Haryana"
    elif lat > 29.0:
        return "Panipat, Haryana"
    elif lat > 28.5:
        return "Rohtak, Haryana"
    else:
        return "Delhi NCR"


# ─────────────────────────────────────────────────────────────────────────────
# DYNAMODB STORAGE
# ─────────────────────────────────────────────────────────────────────────────


def _store_hotspot(hotspot: dict) -> None:
    """Store the synthetic hotspot in DynamoDB."""
    table = dynamodb.Table(HOTSPOTS_TABLE)
    try:
        table.put_item(Item=hotspot)
        logger.info(
            "Synthetic hotspot %s stored in DynamoDB", hotspot["hotspot_id"]
        )
    except ClientError as exc:
        # Log but don't fail -- evaluator can still use the in-memory hotspot
        logger.error(
            "Failed to store hotspot in DynamoDB: %s",
            exc.response["Error"]["Message"],
        )


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATOR ENGINE INVOCATION (SYNCHRONOUS)
# ─────────────────────────────────────────────────────────────────────────────


def _invoke_evaluator_sync(hotspot: dict) -> dict:
    """
    Invoke EvaluatorEngine SYNCHRONOUSLY (InvocationType=RequestResponse).

    Passes the hotspot directly in the payload to avoid a DynamoDB round-trip
    and ensure sub-3-second total response times for the hackathon demo.
    """
    payload = {
        "run_id": hotspot.get("run_id", "simulate"),
        "hotspot_count": 1,
        "source": "simulate_trigger",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hotspots": [hotspot],  # Passed directly to skip DynamoDB scan
    }

    try:
        response = lambda_client.invoke(
            FunctionName=EVALUATOR_FUNCTION_NAME,
            InvocationType="RequestResponse",   # SYNCHRONOUS
            Payload=json.dumps(payload, default=str),
        )

        status_code = response.get("StatusCode", 0)
        if status_code != 200:
            logger.error("EvaluatorEngine returned HTTP %d", status_code)
            return {
                "alerts": [],
                "alerts_generated": 0,
                "error": f"Evaluator HTTP {status_code}",
            }

        # Check for Lambda-level function errors
        if response.get("FunctionError"):
            error_payload = json.loads(response["Payload"].read())
            logger.error("EvaluatorEngine function error: %s", error_payload)
            return {
                "alerts": [],
                "alerts_generated": 0,
                "error": error_payload.get("errorMessage"),
            }

        result = json.loads(response["Payload"].read())
        logger.info(
            "EvaluatorEngine completed synchronously: %d alert(s) generated",
            result.get("alerts_generated", 0),
        )
        return result

    except ClientError as exc:
        logger.error("Failed to invoke EvaluatorEngine: %s", exc)
        # Fallback: run simplified inline evaluation using mock data
        return _inline_evaluation_fallback(hotspot)

    except Exception as exc:
        logger.error("Unexpected error invoking EvaluatorEngine: %s", exc, exc_info=True)
        return _inline_evaluation_fallback(hotspot)


def _inline_evaluation_fallback(hotspot: dict) -> dict:
    """
    Lightweight inline fallback evaluator when EvaluatorEngine Lambda is unavailable.

    Uses MOCK_INSTITUTIONS and simplified rule-based advisories.
    Only invoked when the Lambda-to-Lambda invoke fails (e.g., cold start timeouts
    or local testing without a deployed evaluator).
    """
    alerts = []
    cone_geojson_str = hotspot.get("cone_geojson_6h", "")

    if not cone_geojson_str:
        return {"alerts": [], "alerts_generated": 0, "source": "inline_fallback"}

    try:
        cone_ring = json.loads(cone_geojson_str)["coordinates"][0]
    except Exception as exc:
        logger.error("Fallback: failed to parse cone geometry: %s", exc)
        return {"alerts": [], "alerts_generated": 0, "source": "inline_fallback"}

    now = datetime.now(timezone.utc)
    frp = float(hotspot.get("frp", 1000.0))
    lat = float(hotspot.get("latitude", DEFAULT_LAT))
    lon = float(hotspot.get("longitude", DEFAULT_LON))
    wind_ms = max(abs(float(hotspot.get("u_wind_ms", -4.8))), 0.5)
    mixing_height = float(hotspot.get("mixing_height_m", 700.0))

    for inst in MOCK_INSTITUTIONS:
        inst_lat = float(inst.get("latitude", 0))
        inst_lon = float(inst.get("longitude", 0))

        if not point_in_polygon(inst_lat, inst_lon, cone_ring):
            continue

        distance_km = haversine_distance(lat, lon, inst_lat, inst_lon)
        pm25 = estimate_pm25_at_institution(frp, distance_km, wind_ms, mixing_height)
        arrival_hours = distance_km / max(wind_ms * 3.6, 1.0)
        arrival_utc = now + timedelta(hours=arrival_hours)

        if pm25 >= 300:
            severity = "CRITICAL"
        elif pm25 >= 150:
            severity = "HIGH"
        elif pm25 >= 75:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        alert_id = f"ALT-FB-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        alerts.append({
            "alert_id": alert_id,
            "institution_id": inst["institution_id"],
            "institution_name": inst["name"],
            "facility_type": inst["facility_type"],
            "impact_severity": severity,
            "predicted_pm25_ugm3": str(pm25),
            "predicted_arrival_utc": arrival_utc.isoformat(),
            "distance_km": str(round(distance_km, 2)),
            "recommended_actions": json.dumps([
                "Suspend outdoor activities immediately",
                "Issue N95 masks to all personnel",
                "Monitor AQI and update stakeholders every hour",
            ]),
            "confidence_score": "0.65",
            "source": "inline_fallback",
        })

    return {
        "alerts": alerts,
        "alerts_generated": len(alerts),
        "hotspots_evaluated": 1,
        "institutions_checked": len(MOCK_INSTITUTIONS),
        "source": "inline_fallback",
    }


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE FORMATTING
# ─────────────────────────────────────────────────────────────────────────────


def _serialize_alert(alert: dict) -> dict:
    """Convert an alert DynamoDB record to a clean JSON-serializable dict."""
    return {
        "alert_id": alert.get("alert_id"),
        "institution_id": alert.get("institution_id"),
        "institution_name": alert.get("institution_name"),
        "facility_type": alert.get("facility_type"),
        "impact_severity": alert.get("impact_severity"),
        "predicted_pm25_ugm3": float(alert.get("predicted_pm25_ugm3", 0)),
        "predicted_arrival_utc": alert.get("predicted_arrival_utc"),
        "distance_km": float(alert.get("distance_km", 0)),
        "recommended_actions": (
            json.loads(alert["recommended_actions"])
            if isinstance(alert.get("recommended_actions"), str)
            else alert.get("recommended_actions", [])
        ),
        "confidence_score": float(alert.get("confidence_score", 0)),
        "advisory_source": alert.get("advisory_source", "rule_fallback"),
        "bedrock_model": alert.get("bedrock_model", "rule_fallback"),
        "impact_horizon": alert.get("impact_horizon", "6H_IMMINENT"),
    }


def _build_institutions_at_risk(alerts: list) -> list:
    """Build a concise deduplicated list of institutions at risk with key details."""
    seen = set()
    result = []
    for alert in alerts:
        inst_id = alert.get("institution_id")
        if inst_id and inst_id not in seen:
            seen.add(inst_id)
            result.append({
                "institution_id": inst_id,
                "name": alert.get("institution_name"),
                "facility_type": alert.get("facility_type"),
                "severity": alert.get("impact_severity"),
                "predicted_pm25_ugm3": float(alert.get("predicted_pm25_ugm3", 0)),
                "distance_km": float(alert.get("distance_km", 0)),
                "arrival_utc": alert.get("predicted_arrival_utc"),
            })

    # Sort by severity (CRITICAL first) then by distance from source
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    result.sort(
        key=lambda x: (severity_order.get(x["severity"], 9), x["distance_km"])
    )
    return result


def _error_response(status_code: int, message: str) -> dict:
    """Build a standard API Gateway error response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": message, "statusCode": status_code}),
    }


def _now_ms() -> int:
    """Return current epoch time in milliseconds."""
    return int(datetime.now(timezone.utc).timestamp() * 1000)
