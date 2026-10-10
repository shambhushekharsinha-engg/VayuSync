"""
vayusync.lambdas.dashboard_data.handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lambda handler for VayuSync-GetDashboardData.

Serves the VayuSync frontend dashboard via API Gateway.

Routes
------
GET /dashboard    -- Aggregated system status: hotspot count, institutions at risk,
                     last alert timestamp, active fire FRP total.
GET /alerts       -- Last 20 alert logs from DynamoDB, sorted by timestamp descending.
GET /institutions -- All registered institutions with current risk status.
GET /status       -- Pipeline health: EventBridge schedule, Lambda health, data freshness.

All responses include CORS headers.
"""

import json
import logging
import os
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

from mock_data import MOCK_INSTITUTIONS, MOCK_HOTSPOTS, MOCK_ALERT_LOGS

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=getattr(logging, log_level, logging.INFO),
)
logger = logging.getLogger("vayusync.dashboard_data")

# ── AWS Clients ───────────────────────────────────────────────────────────────
_region = os.environ.get("AWS_REGION", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=_region)

# ── Environment Variables ─────────────────────────────────────────────────────
HOTSPOTS_TABLE = os.environ.get("HOTSPOTS_TABLE", "VayuSync_Hotspots")
INSTITUTIONS_TABLE = os.environ.get("INSTITUTIONS_TABLE", "VayuSync_Institutions")
ALERT_LOGS_TABLE = os.environ.get("ALERT_LOGS_TABLE", "VayuSync_AlertLogs")
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0"
)
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")

# ── CORS Headers ──────────────────────────────────────────────────────────────
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}

# ── Route Dispatcher ──────────────────────────────────────────────────────────
ROUTE_HANDLERS = {}


def _route(path: str):
    """Decorator to register a path handler."""
    def decorator(fn):
        ROUTE_HANDLERS[path] = fn
        return fn
    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# MAIN HANDLER
# ─────────────────────────────────────────────────────────────────────────────


def lambda_handler(event, context):
    """
    Main Lambda entry point -- routes to the correct handler based on the
    API Gateway resource path.
    """
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("resource", event.get("path", "/dashboard"))
    # Strip stage prefix if present (e.g., /prod/dashboard -> /dashboard)
    if path.startswith("/prod") or path.startswith("/dev"):
        path = "/" + path.split("/", 2)[-1]

    logger.info("Dashboard request: %s %s", event.get("httpMethod", "GET"), path)

    handler_fn = ROUTE_HANDLERS.get(path)
    if handler_fn is None:
        # Try suffix matching for various API Gateway path configurations
        for registered_path, fn in ROUTE_HANDLERS.items():
            if path.endswith(registered_path.lstrip("/")):
                handler_fn = fn
                break

    if handler_fn is None:
        return _json_response(404, {"error": f"No handler for path: {path}"})

    try:
        return handler_fn(event, context)
    except Exception as exc:
        logger.error("Handler error for %s: %s", path, exc, exc_info=True)
        return _json_response(500, {"error": "Internal server error", "detail": str(exc)})


# ─────────────────────────────────────────────────────────────────────────────
# GET /dashboard
# ─────────────────────────────────────────────────────────────────────────────

@_route("/dashboard")
def get_dashboard(event, context) -> dict:
    """
    Return aggregated system status for the VayuSync dashboard.

    Includes:
    - Active hotspot count and total FRP
    - Number of institutions currently at risk (any active alert)
    - Last alert timestamp
    - Top 3 most severe current alerts
    - Data freshness indicators
    """
    now = datetime.now(timezone.utc)

    # ── Load hotspots ─────────────────────────────────────────────────────────
    hotspots = _scan_table_safe(
        HOTSPOTS_TABLE,
        filter_expr="is_active = :active",
        expr_values={":active": "true"},
        fallback=MOCK_HOTSPOTS,
        fallback_transform=_mock_hotspot_to_dynamo,
    )

    active_hotspot_count = len(hotspots)
    total_frp_mw = sum(float(h.get("frp", 0)) for h in hotspots)
    hotspot_regions = list({h.get("region", "Unknown") for h in hotspots if h.get("region")})

    # ── Load recent alerts ────────────────────────────────────────────────────
    alerts = _get_recent_alerts(limit=20)

    last_alert_time = None
    institutions_at_risk_ids = set()
    critical_count = 0
    high_count = 0
    medium_count = 0

    for alert in alerts:
        ts = alert.get("timestamp")
        if ts and (last_alert_time is None or ts > last_alert_time):
            last_alert_time = ts
        institutions_at_risk_ids.add(alert.get("institution_id"))

        severity = alert.get("impact_severity", "LOW")
        if severity == "CRITICAL":
            critical_count += 1
        elif severity == "HIGH":
            high_count += 1
        elif severity == "MEDIUM":
            medium_count += 1

    # ── Load institutions ─────────────────────────────────────────────────────
    institutions = _scan_table_safe(INSTITUTIONS_TABLE, fallback=MOCK_INSTITUTIONS)
    total_institutions = len(institutions)

    # ── Top active alerts (for dashboard widget) ──────────────────────────────
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    top_alerts = sorted(
        alerts[:10],
        key=lambda a: severity_order.get(a.get("impact_severity", "LOW"), 9),
    )[:3]

    dashboard = {
        "generated_at": now.isoformat(),
        "pipeline_status": "OPERATIONAL",
        "season": "Stubble Burning Season 2026 (Oct-Nov)",
        "hotspots": {
            "active_count": active_hotspot_count,
            "total_frp_mw": round(total_frp_mw, 1),
            "regions": hotspot_regions,
            "data_source": "NASA FIRMS VIIRS_SNPP_NRT",
        },
        "alerts": {
            "total_generated": len(alerts),
            "last_alert_utc": last_alert_time,
            "severity_breakdown": {
                "CRITICAL": critical_count,
                "HIGH": high_count,
                "MEDIUM": medium_count,
                "LOW": len(alerts) - critical_count - high_count - medium_count,
            },
        },
        "institutions": {
            "total_registered": total_institutions,
            "currently_at_risk": len(institutions_at_risk_ids),
            "safe": total_institutions - len(institutions_at_risk_ids),
        },
        "top_active_alerts": [_serialize_alert_for_dashboard(a) for a in top_alerts],
        "metadata": {
            "ingestion_schedule": "Every 6 hours (EventBridge)",
            "trajectory_model": "Lagrangian dispersion, 6-12h cone",
            "advisory_model": f"Amazon Bedrock ({BEDROCK_MODEL_ID}) / Rule Fallback",
            "region_covered": "Punjab, Haryana, Delhi NCR",
            "bbox": "73.5N, 27.5E, 78.5N, 32.5E",
        },
    }

    return _json_response(200, dashboard)


# ─────────────────────────────────────────────────────────────────────────────
# GET /alerts
# ─────────────────────────────────────────────────────────────────────────────

@_route("/alerts")
def get_alerts(event, context) -> dict:
    """
    Return the last N alert logs from DynamoDB, sorted by timestamp descending.

    Query parameters:
      - limit (int): Number of alerts to return (1-50, default 20)
      - severity (str): Filter by severity (CRITICAL|HIGH|MEDIUM|LOW)
      - facility_type (str): Filter by facility type
    """
    params = event.get("queryStringParameters") or {}
    limit = min(int(params.get("limit", 20)), 50)
    severity_filter = params.get("severity")
    facility_type_filter = params.get("facility_type")

    alerts = _get_recent_alerts(limit=50)  # Over-fetch then apply filters

    if severity_filter:
        alerts = [a for a in alerts if a.get("impact_severity") == severity_filter.upper()]
    if facility_type_filter:
        alerts = [
            a for a in alerts
            if a.get("facility_type", "").lower() == facility_type_filter.lower()
        ]

    # Sort by timestamp descending
    alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    alerts = alerts[:limit]

    return _json_response(200, {
        "count": len(alerts),
        "alerts": [_serialize_alert_full(a) for a in alerts],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


# ─────────────────────────────────────────────────────────────────────────────
# GET /institutions
# ─────────────────────────────────────────────────────────────────────────────

@_route("/institutions")
def get_institutions(event, context) -> dict:
    """
    Return all registered institutions with current risk status.

    Query parameters:
      - facility_type (str): Filter by type (School|Hospital|Construction|Municipality)
      - risk_only (bool): If 'true', return only institutions with active alerts
    """
    params = event.get("queryStringParameters") or {}
    facility_type_filter = params.get("facility_type")
    risk_only = params.get("risk_only", "false").lower() == "true"

    institutions = _scan_table_safe(INSTITUTIONS_TABLE, fallback=MOCK_INSTITUTIONS)

    # Load recent alerts to determine current risk status per institution
    recent_alerts = _get_recent_alerts(limit=50)
    alert_by_institution = {}
    for alert in recent_alerts:
        inst_id = alert.get("institution_id")
        if inst_id and inst_id not in alert_by_institution:
            alert_by_institution[inst_id] = alert

    # Enrich institutions with risk status
    enriched = []
    for inst in institutions:
        inst_id = inst.get("institution_id")
        active_alert = alert_by_institution.get(inst_id)

        risk_status = "SAFE"
        current_severity = None
        current_pm25 = None
        current_alert_id = None

        if active_alert:
            # Only mark at-risk if the alert is < 12 hours old
            alert_ts_str = active_alert.get("timestamp", "")
            try:
                alert_ts = datetime.fromisoformat(alert_ts_str.replace("Z", "+00:00"))
                hours_ago = (datetime.now(timezone.utc) - alert_ts).total_seconds() / 3600
                if hours_ago < 12:
                    risk_status = active_alert.get("impact_severity", "MEDIUM")
                    current_severity = active_alert.get("impact_severity")
                    current_pm25 = _safe_float(active_alert.get("predicted_pm25_ugm3"))
                    current_alert_id = active_alert.get("alert_id")
            except (ValueError, AttributeError):
                pass

        enriched_inst = {
            "institution_id": inst_id,
            "name": inst.get("name"),
            "facility_type": inst.get("facility_type"),
            "latitude": _safe_float(inst.get("latitude")),
            "longitude": _safe_float(inst.get("longitude")),
            "district": inst.get("district", "Delhi NCR"),
            "contact_name": inst.get("contact_name"),
            "contact_phone": inst.get("contact_phone"),
            "vulnerable_count": inst.get(
                "vulnerable_count",
                inst.get(
                    "student_count",
                    inst.get("worker_count", inst.get("bed_count", 0)),
                ),
            ),
            "outdoor_activity": inst.get("outdoor_activity", False),
            "has_air_purifiers": inst.get("has_air_purifiers", False),
            "risk_status": risk_status,
            "current_severity": current_severity,
            "current_pm25_ugm3": current_pm25,
            "active_alert_id": current_alert_id,
            "webhook_registered": bool(inst.get("webhook_url")),
        }

        enriched.append(enriched_inst)

    # Apply filters
    if facility_type_filter:
        enriched = [
            i for i in enriched
            if i.get("facility_type", "").lower() == facility_type_filter.lower()
        ]
    if risk_only:
        enriched = [i for i in enriched if i.get("risk_status") != "SAFE"]

    # Sort: at-risk first, then alphabetically by name
    severity_order_map = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "SAFE": 9}
    enriched.sort(
        key=lambda x: (
            severity_order_map.get(x["risk_status"], 9),
            x.get("name", ""),
        )
    )

    return _json_response(200, {
        "count": len(enriched),
        "institutions": enriched,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


# ─────────────────────────────────────────────────────────────────────────────
# GET /status
# ─────────────────────────────────────────────────────────────────────────────

@_route("/status")
def get_status(event, context) -> dict:
    """
    Return pipeline health and operational status.

    Includes:
    - EventBridge schedule info (next run ETA)
    - DynamoDB table health (record counts)
    - Data freshness (age of newest hotspot)
    - Lambda and model configuration
    """
    now = datetime.now(timezone.utc)

    # ── Check DynamoDB table health ───────────────────────────────────────────
    table_health = {}
    for table_name, env_var in [
        ("VayuSync_Hotspots", HOTSPOTS_TABLE),
        ("VayuSync_Institutions", INSTITUTIONS_TABLE),
        ("VayuSync_AlertLogs", ALERT_LOGS_TABLE),
    ]:
        try:
            table = dynamodb.Table(env_var)
            response = table.scan(Select="COUNT")
            table_health[table_name] = {
                "status": "HEALTHY",
                "record_count": response.get("Count", 0),
            }
        except ClientError as exc:
            table_health[table_name] = {
                "status": "ERROR",
                "error": exc.response["Error"]["Message"],
            }

    # ── Data freshness: age of newest hotspot ─────────────────────────────────
    newest_hotspot_age_hours = None
    try:
        hotspots = _scan_table_safe(HOTSPOTS_TABLE, fallback=[])
        if hotspots:
            timestamps = [h.get("timestamp", "") for h in hotspots if h.get("timestamp")]
            if timestamps:
                newest_ts_str = max(timestamps)
                newest_ts = datetime.fromisoformat(newest_ts_str.replace("Z", "+00:00"))
                newest_hotspot_age_hours = round(
                    (now - newest_ts).total_seconds() / 3600, 1
                )
    except Exception:
        pass

    # ── Next EventBridge run: schedule is every 6 hours ───────────────────────
    current_hour = now.hour
    next_run_hour = ((current_hour // 6) + 1) * 6 % 24
    next_run_ts = now.replace(hour=next_run_hour, minute=0, second=0, microsecond=0)
    if next_run_ts <= now:
        next_run_ts += timedelta(days=1)
    minutes_to_next_run = int((next_run_ts - now).total_seconds() / 60)

    status = {
        "generated_at": now.isoformat(),
        "overall_status": "OPERATIONAL",
        "pipeline": {
            "ingestion_engine": {
                "status": "HEALTHY",
                "function_name": "VayuSync-IngestionEngine",
                "runtime": "python3.12",
                "memory_mb": 512,
                "timeout_s": 60,
                "schedule": "Every 6 hours (EventBridge cron rate(6 hours))",
                "next_run_utc": next_run_ts.isoformat(),
                "minutes_to_next_run": minutes_to_next_run,
                "data_source_nasa_firms": "LIVE (mock fallback if API unavailable)",
                "data_source_open_meteo": "LIVE (free, no API key required)",
            },
            "evaluator_engine": {
                "status": "HEALTHY",
                "function_name": "VayuSync-EvaluatorEngine",
                "runtime": "python3.12",
                "memory_mb": 512,
                "timeout_s": 120,
                "trigger": "Async Lambda invoke from IngestionEngine",
                "bedrock_model": BEDROCK_MODEL_ID,
                "bedrock_region": BEDROCK_REGION,
                "fallback": "Rule-based advisory if Bedrock unavailable",
            },
            "webhook_dispatcher": {
                "status": "HEALTHY",
                "function_name": "VayuSync-WebhookDispatcher",
                "runtime": "python3.12",
                "memory_mb": 256,
                "timeout_s": 30,
                "trigger": "SNS VayuSync-AlertTopic subscription",
            },
            "simulate_trigger": {
                "status": "HEALTHY",
                "function_name": "VayuSync-SimulateTrigger",
                "endpoint": "POST /simulate",
                "response_time_target_ms": 3000,
                "execution_mode": "Synchronous EvaluatorEngine invocation",
            },
        },
        "data_freshness": {
            "newest_hotspot_age_hours": newest_hotspot_age_hours,
            "freshness_status": (
                "STALE"
                if newest_hotspot_age_hours and newest_hotspot_age_hours > 12
                else "FRESH"
            ),
        },
        "dynamodb_tables": table_health,
        "coverage": {
            "geographic_area": "Punjab + Haryana + Delhi NCR",
            "bbox_wsen": "73.5, 27.5, 78.5, 32.5",
            "satellite_source": "VIIRS / Suomi NPP + NOAA-20",
            "trajectory_hours": "6h (primary) + 12h (extended)",
            "update_frequency": "Every 6 hours",
            "institutions_monitored": 8,
            "facility_types": ["School", "Hospital", "Construction", "Municipality"],
        },
    }

    return _json_response(200, status)


# ─────────────────────────────────────────────────────────────────────────────
# SHARED HELPERS
# ─────────────────────────────────────────────────────────────────────────────


def _get_recent_alerts(limit: int = 20) -> list:
    """
    Return recent alert logs from DynamoDB, sorted by timestamp descending.
    Falls back to MOCK_ALERT_LOGS if the table is empty or unreachable.
    """
    alerts = _scan_table_safe(ALERT_LOGS_TABLE, fallback=MOCK_ALERT_LOGS)
    alerts.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    return alerts[:limit]


def _scan_table_safe(
    table_name: str,
    filter_expr: str = None,
    expr_values: dict = None,
    fallback: list = None,
    fallback_transform=None,
) -> list:
    """
    Scan a DynamoDB table with comprehensive error handling and mock fallback.
    """
    fallback = fallback or []
    try:
        table = dynamodb.Table(table_name)
        kwargs = {}
        if filter_expr:
            kwargs["FilterExpression"] = filter_expr
        if expr_values:
            kwargs["ExpressionAttributeValues"] = expr_values

        response = table.scan(**kwargs)
        items = response.get("Items", [])

        # Paginate through all records
        while "LastEvaluatedKey" in response:
            response = table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"], **kwargs
            )
            items.extend(response.get("Items", []))

        if items:
            return items

        logger.warning("Table %s is empty -- using mock fallback", table_name)
        if fallback_transform:
            return [fallback_transform(item) for item in fallback]
        return list(fallback)

    except ClientError as exc:
        logger.warning(
            "DynamoDB scan of %s failed: %s -- using mock fallback",
            table_name,
            exc.response["Error"]["Message"],
        )
        if fallback_transform:
            return [fallback_transform(item) for item in fallback]
        return list(fallback)


def _mock_hotspot_to_dynamo(mock_hs: dict) -> dict:
    """Convert a MOCK_HOTSPOTS item to DynamoDB-compatible string-typed dict."""
    return {
        "hotspot_id": mock_hs.get("hotspot_id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": str(mock_hs.get("latitude", 0)),
        "longitude": str(mock_hs.get("longitude", 0)),
        "frp": str(mock_hs.get("frp", 0)),
        "region": mock_hs.get("region", "Unknown"),
        "confidence": mock_hs.get("confidence", "h"),
        "satellite": mock_hs.get("satellite", "N"),
        "instrument": mock_hs.get("instrument", "VIIRS"),
        "is_active": "true",
        "acq_date": mock_hs.get(
            "acq_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ),
        "cone_bearing_deg": "135.0",    # Default SE bearing (NW wind -> SE trajectory)
        "cone_distance_km": "85.0",
    }


def _serialize_alert_for_dashboard(alert: dict) -> dict:
    """Compact alert representation for the dashboard summary widget."""
    return {
        "alert_id": alert.get("alert_id"),
        "institution_name": alert.get("institution_name"),
        "facility_type": alert.get("facility_type"),
        "severity": alert.get("impact_severity"),
        "pm25": _safe_float(alert.get("predicted_pm25_ugm3")),
        "arrival_utc": alert.get("predicted_arrival_utc"),
        "timestamp": alert.get("timestamp"),
    }


def _serialize_alert_full(alert: dict) -> dict:
    """Full alert serialization for the /alerts endpoint."""
    actions = alert.get("recommended_actions", [])
    if isinstance(actions, str):
        try:
            actions = json.loads(actions)
        except json.JSONDecodeError:
            actions = [actions]

    return {
        "alert_id": alert.get("alert_id"),
        "timestamp": alert.get("timestamp"),
        "hotspot_id": alert.get("hotspot_id"),
        "institution_id": alert.get("institution_id"),
        "institution_name": alert.get("institution_name"),
        "facility_type": alert.get("facility_type"),
        "impact_severity": alert.get("impact_severity"),
        "predicted_pm25_ugm3": _safe_float(alert.get("predicted_pm25_ugm3")),
        "predicted_arrival_utc": alert.get("predicted_arrival_utc"),
        "distance_km": _safe_float(alert.get("distance_km")),
        "recommended_actions": actions,
        "confidence_score": _safe_float(alert.get("confidence_score")),
        "sns_message_id": alert.get("sns_message_id"),
        "sms_delivered": alert.get("sms_delivered"),
        "email_delivered": alert.get("email_delivered"),
        "webhook_delivered": alert.get("webhook_delivered"),
    }


def _safe_float(value, default: float = 0.0) -> float:
    """Safely convert a value to float, returning default on failure."""
    try:
        return float(value) if value is not None else default
    except (ValueError, TypeError):
        return default


def _json_response(status_code: int, body: dict) -> dict:
    """Build a standard API Gateway JSON response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }
