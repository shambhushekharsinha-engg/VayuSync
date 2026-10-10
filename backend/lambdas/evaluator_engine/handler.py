"""
vayusync.lambdas.evaluator_engine.handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lambda handler for VayuSync-EvaluatorEngine.

Invoked asynchronously by IngestionEngine (or synchronously by SimulateTrigger).

Pipeline
--------
1. Scan DynamoDB VayuSync_Hotspots for active hotspots from the current run.
2. For each hotspot's trajectory cone bounding box, query VayuSync_Institutions
   to find candidate institutions within the geographic extent.
3. Run point-in-polygon test to confirm the institution is truly inside the cone.
4. Estimate PM2.5 concentration at the institution using Gaussian plume model.
5. Call Amazon Bedrock (Claude 3 Haiku) for an actionable mitigation advisory
   in strict JSON format.
6. Write the alert record to VayuSync_AlertLogs DynamoDB table.
7. Publish alert summary to SNS topic (triggers SMS/email/webhook fan-out).

Bedrock output schema enforced via system prompt:
  {
    "institution_id": str,
    "facility_type": "School|Hospital|Construction|Municipality",
    "predicted_arrival_utc": ISO8601,
    "impact_severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "predicted_pm25_ugm3": float,
    "recommended_actions": [str, str, str],
    "confidence_score": float
  }
"""

import json
import logging
import math
import os
import uuid
from datetime import datetime, timezone, timedelta

import boto3
from botocore.exceptions import ClientError

from geo_utils import (
    point_in_polygon,
    haversine_distance,
    estimate_pm25_at_institution,
)
from mock_data import MOCK_INSTITUTIONS, get_wind_for_region

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=getattr(logging, log_level, logging.INFO),
)
logger = logging.getLogger("vayusync.evaluator_engine")

# ── AWS Clients ───────────────────────────────────────────────────────────────
_region = os.environ.get("AWS_REGION", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=_region)
sns_client = boto3.client("sns", region_name=_region)
bedrock_client = boto3.client("bedrock-runtime", region_name=_region)

# ── Environment Variables ─────────────────────────────────────────────────────
HOTSPOTS_TABLE = os.environ.get("HOTSPOTS_TABLE", "VayuSync_Hotspots")
INSTITUTIONS_TABLE = os.environ.get("INSTITUTIONS_TABLE", "VayuSync_Institutions")
ALERT_LOGS_TABLE = os.environ.get("ALERT_LOGS_TABLE", "VayuSync_AlertLogs")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")

# ── Bedrock Model ─────────────────────────────────────────────────────────────
BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
BEDROCK_MAX_TOKENS = 1024
BEDROCK_TEMPERATURE = 0.1  # Low temperature for deterministic, structured output

# ── Alert TTL: 30 days ────────────────────────────────────────────────────────
ALERT_TTL_DAYS = 30

# ── Severity thresholds (PM2.5 in ug/m3, based on WHO breakpoints) ─────────
SEVERITY_THRESHOLDS = {
    "CRITICAL": 300.0,   # PM2.5 > 300 ug/m3 -- Hazardous (AQI 500+)
    "HIGH": 150.0,       # PM2.5 > 150 ug/m3 -- Very Unhealthy (AQI 200-300)
    "MEDIUM": 75.0,      # PM2.5 > 75 ug/m3  -- Unhealthy (AQI 150-200)
    "LOW": 0.0,          # PM2.5 > 0 ug/m3   -- Baseline alert
}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN HANDLER
# ─────────────────────────────────────────────────────────────────────────────


def lambda_handler(event, context):
    """
    Main Lambda entry point.

    Parameters
    ----------
    event : dict
        Expected keys:
          - run_id (str): Ingestion run identifier for hotspot querying.
          - hotspot_count (int): Number of hotspots to evaluate.
          - hotspots (list, optional): Pre-loaded hotspot list for sync invocation
            (used by SimulateTrigger to bypass DynamoDB scan).

    Returns
    -------
    dict
        Evaluation summary with alert counts and individual results.
    """
    eval_id = str(uuid.uuid4())
    eval_ts = datetime.now(timezone.utc)
    run_id = event.get("run_id", "direct")

    logger.info("=== EvaluatorEngine %s starting (run_id=%s) ===", eval_id, run_id)

    # ── Step 1: Load active hotspots ──────────────────────────────────────────
    if "hotspots" in event and event["hotspots"]:
        # Hotspots passed directly (SimulateTrigger path -- avoids DynamoDB scan)
        hotspots = event["hotspots"]
        logger.info("Using %d pre-loaded hotspot(s) from event payload", len(hotspots))
    else:
        hotspots = _load_active_hotspots(run_id)
        logger.info("Loaded %d active hotspot(s) from DynamoDB", len(hotspots))

    if not hotspots:
        logger.warning("No active hotspots found -- nothing to evaluate")
        return {"eval_id": eval_id, "alerts_generated": 0, "hotspots_evaluated": 0, "alerts": []}

    # ── Step 2: Load institutions (DynamoDB scan or mock fallback) ────────────
    institutions = _load_institutions()
    logger.info("Loaded %d institution(s) for risk evaluation", len(institutions))

    # ── Step 3: Evaluate each hotspot against institutions ────────────────────
    all_alerts = []
    evaluation_details = []

    for hotspot in hotspots:
        try:
            alerts = _evaluate_hotspot_against_institutions(hotspot, institutions, eval_ts)
            all_alerts.extend(alerts)
            evaluation_details.append({
                "hotspot_id": hotspot.get("hotspot_id"),
                "institutions_at_risk": len(alerts),
            })
        except Exception as exc:
            logger.error(
                "Evaluation failed for hotspot %s: %s",
                hotspot.get("hotspot_id", "?"),
                exc,
                exc_info=True,
            )

    logger.info(
        "Evaluation complete: %d hotspot(s) evaluated, %d alert(s) generated",
        len(hotspots),
        len(all_alerts),
    )

    result = {
        "eval_id": eval_id,
        "run_id": run_id,
        "timestamp": eval_ts.isoformat(),
        "hotspots_evaluated": len(hotspots),
        "institutions_checked": len(institutions),
        "alerts_generated": len(all_alerts),
        "evaluation_details": evaluation_details,
        "alerts": all_alerts,  # Returned for SimulateTrigger to surface to frontend
    }

    return result


# ─────────────────────────────────────────────────────────────────────────────
# HOTSPOT LOADING
# ─────────────────────────────────────────────────────────────────────────────


def _load_active_hotspots(run_id: str) -> list:
    """
    Load active hotspots from DynamoDB for this run_id.
    Falls back to a full scan of active records if run_id is 'direct'.
    """
    table = dynamodb.Table(HOTSPOTS_TABLE)

    try:
        if run_id == "direct":
            # Scan for all active hotspots
            response = table.scan(
                FilterExpression="is_active = :active",
                ExpressionAttributeValues={":active": "true"},
                Limit=50,  # Safety cap -- avoids scanning unbounded data
            )
        else:
            response = table.scan(
                FilterExpression="run_id = :rid AND is_active = :active",
                ExpressionAttributeValues={":rid": run_id, ":active": "true"},
            )

        return response.get("Items", [])

    except ClientError as exc:
        logger.error("DynamoDB scan failed: %s", exc.response["Error"]["Message"])
        return []


# ─────────────────────────────────────────────────────────────────────────────
# INSTITUTION LOADING
# ─────────────────────────────────────────────────────────────────────────────


def _load_institutions() -> list:
    """
    Scan the VayuSync_Institutions DynamoDB table.
    Falls back to MOCK_INSTITUTIONS if the table is empty or unreachable.
    """
    table = dynamodb.Table(INSTITUTIONS_TABLE)

    try:
        response = table.scan()
        items = response.get("Items", [])

        # Paginate through all records
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        if items:
            return items

        logger.warning("Institutions table is empty -- using mock data")
        return MOCK_INSTITUTIONS

    except ClientError as exc:
        logger.warning(
            "Failed to load institutions from DynamoDB: %s -- using mock data",
            exc.response["Error"]["Message"],
        )
        return MOCK_INSTITUTIONS


# ─────────────────────────────────────────────────────────────────────────────
# CORE EVALUATION LOGIC
# ─────────────────────────────────────────────────────────────────────────────


def _evaluate_hotspot_against_institutions(
    hotspot: dict, institutions: list, eval_ts: datetime
) -> list:
    """
    Evaluate a single hotspot against all institutions and generate alerts.

    Steps:
    1. Parse hotspot cone geometry and bounding box.
    2. Filter institutions by bounding box (fast O(n) pre-filter).
    3. Run point-in-polygon test (precise filter).
    4. For each confirmed at-risk institution:
       a. Estimate PM2.5.
       b. Determine severity.
       c. Call Bedrock for actionable advisory.
       d. Store alert in DynamoDB.
       e. Publish to SNS.

    Returns
    -------
    list[dict]
        Alert records generated for this hotspot.
    """
    hotspot_id = hotspot.get("hotspot_id", "unknown")
    lat = float(hotspot.get("latitude", 0))
    lon = float(hotspot.get("longitude", 0))
    frp = float(hotspot.get("frp", 1000.0))

    # Parse cone geometry
    cone_geojson_str = hotspot.get("cone_geojson_6h", "")
    if not cone_geojson_str:
        logger.warning("Hotspot %s has no cone geometry -- skipping", hotspot_id)
        return []

    try:
        cone_geom = json.loads(cone_geojson_str)
        cone_ring = cone_geom["coordinates"][0]
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("Invalid cone geometry for %s: %s", hotspot_id, exc)
        return []

    # Parse bounding box for fast pre-filter
    try:
        bbox_min_lat = float(hotspot.get("cone_bbox_min_lat", lat - 5))
        bbox_max_lat = float(hotspot.get("cone_bbox_max_lat", lat + 5))
        bbox_min_lon = float(hotspot.get("cone_bbox_min_lon", lon - 5))
        bbox_max_lon = float(hotspot.get("cone_bbox_max_lon", lon + 5))
    except (ValueError, TypeError):
        bbox_min_lat, bbox_max_lat = lat - 5, lat + 5
        bbox_min_lon, bbox_max_lon = lon - 5, lon + 5

    # Wind profile for PM2.5 estimate
    wind_profile = get_wind_for_region(lat, lon)
    u_val = float(wind_profile.get("u_wind_ms", 4.0))
    v_val = float(wind_profile.get("v_wind_ms", -6.0))
    avg_wind_ms = max(math.sqrt(u_val**2 + v_val**2), 0.5)
    mixing_height = wind_profile.get("mixing_height_m", 700.0)

    alerts = []

    for institution in institutions:
        inst_id = institution.get("institution_id", "unknown")
        inst_lat = float(institution.get("latitude", 0))
        inst_lon = float(institution.get("longitude", 0))

        # ── Fast bounding-box pre-filter ──────────────────────────────────────
        if not (
            bbox_min_lat <= inst_lat <= bbox_max_lat
            and bbox_min_lon <= inst_lon <= bbox_max_lon
        ):
            continue

        # ── Precise point-in-polygon test ─────────────────────────────────────
        if not point_in_polygon(inst_lat, inst_lon, cone_ring):
            logger.debug(
                "Institution %s NOT inside cone of hotspot %s", inst_id, hotspot_id
            )
            continue

        logger.info(
            "Institution %s (%s) is INSIDE cone of hotspot %s (FRP=%.1f MW)",
            inst_id,
            institution.get("name", inst_id),
            hotspot_id,
            frp,
        )

        # ── Distance and ETA ──────────────────────────────────────────────────
        distance_km = haversine_distance(lat, lon, inst_lat, inst_lon)
        travel_time_hours = distance_km / max(avg_wind_ms * 3.6, 1.0)
        arrival_utc = eval_ts + timedelta(hours=travel_time_hours)

        # ── PM2.5 estimate ────────────────────────────────────────────────────
        pm25_estimate = estimate_pm25_at_institution(
            frp, distance_km, avg_wind_ms, mixing_height
        )

        # ── Severity classification ────────────────────────────────────────────
        severity = _classify_severity(pm25_estimate)

        # ── Bedrock advisory ──────────────────────────────────────────────────
        advisory = _call_bedrock_advisory(
            hotspot=hotspot,
            institution=institution,
            pm25_estimate=pm25_estimate,
            severity=severity,
            distance_km=distance_km,
            arrival_utc=arrival_utc,
        )

        # ── Build alert record ────────────────────────────────────────────────
        alert_id = f"ALT-{eval_ts.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
        ttl_epoch = int((eval_ts + timedelta(days=ALERT_TTL_DAYS)).timestamp())

        alert_record = {
            "alert_id": alert_id,
            "timestamp": eval_ts.isoformat(),
            "hotspot_id": hotspot_id,
            "institution_id": inst_id,
            "institution_name": institution.get("name", inst_id),
            "facility_type": institution.get("facility_type", "Unknown"),
            "hotspot_lat": str(lat),
            "hotspot_lon": str(lon),
            "institution_lat": str(inst_lat),
            "institution_lon": str(inst_lon),
            "distance_km": str(round(distance_km, 2)),
            "frp_mw": str(round(frp, 2)),
            "predicted_pm25_ugm3": str(pm25_estimate),
            "impact_severity": advisory.get("impact_severity", severity),
            "predicted_arrival_utc": advisory.get(
                "predicted_arrival_utc", arrival_utc.isoformat()
            ),
            "recommended_actions": json.dumps(advisory.get("recommended_actions", [])),
            "confidence_score": str(advisory.get("confidence_score", 0.75)),
            "advisory_source": advisory.get("advisory_source", "rule_fallback"),
            "bedrock_model": BEDROCK_MODEL_ID if advisory.get("advisory_source") == "bedrock" else "rule_fallback",
            "ttl_epoch": ttl_epoch,
        }

        # ── Store in DynamoDB ─────────────────────────────────────────────────
        _store_alert(alert_record)

        # ── Publish to SNS ────────────────────────────────────────────────────
        sns_message_id = _publish_alert_to_sns(alert_record, institution)
        alert_record["sns_message_id"] = sns_message_id

        alerts.append(alert_record)

    return alerts


# ─────────────────────────────────────────────────────────────────────────────
# SEVERITY CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────


def _classify_severity(pm25_ugm3: float) -> str:
    """
    Classify alert severity based on predicted PM2.5 concentration.

    Thresholds are based on WHO Air Quality Guidelines 2021 and
    India's National Ambient Air Quality Standards (NAAQS).
    """
    if pm25_ugm3 >= SEVERITY_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    elif pm25_ugm3 >= SEVERITY_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif pm25_ugm3 >= SEVERITY_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    else:
        return "LOW"


# ─────────────────────────────────────────────────────────────────────────────
# AMAZON BEDROCK -- CLAUDE 3 HAIKU
# ─────────────────────────────────────────────────────────────────────────────

BEDROCK_SYSTEM_PROMPT = """You are VayuSync's AI advisory engine for smoke pollution emergencies in India.

You will receive data about an active stubble-burning fire hotspot in Punjab/Haryana
and a vulnerable institution (school, hospital, construction site, or municipality)
that is in the downwind smoke trajectory cone.

Your task is to generate a precise, actionable mitigation advisory.

You MUST respond with ONLY a valid JSON object matching this EXACT schema -- no other text:

{
  "institution_id": "<string>",
  "facility_type": "<School|Hospital|Construction|Municipality>",
  "predicted_arrival_utc": "<ISO8601 datetime string>",
  "impact_severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "predicted_pm25_ugm3": <number>,
  "recommended_actions": [
    "<action 1: specific, immediate, measurable>",
    "<action 2: specific, immediate, measurable>",
    "<action 3: specific, immediate, measurable>"
  ],
  "confidence_score": <float between 0.0 and 1.0>
}

Advisory rules:
- Actions must be SPECIFIC to the facility type and current situation.
- For Schools: focus on student safety, indoor/outdoor activity changes, parent notifications.
- For Hospitals: focus on patient care preparation, equipment readiness, ventilation changes.
- For Construction Sites: focus on worker PPE, schedule changes, exposure reduction.
- For Municipalities: focus on public advisories, emergency coordination, resource deployment.
- confidence_score reflects the reliability of the PM2.5 estimate (0.7-0.95 typical range).
- All datetime strings must be valid ISO8601 with UTC timezone (Z suffix).
- Do NOT include any explanatory text outside the JSON object."""


def _call_bedrock_advisory(
    hotspot: dict,
    institution: dict,
    pm25_estimate: float,
    severity: str,
    distance_km: float,
    arrival_utc: datetime,
) -> dict:
    """
    Call Amazon Bedrock (Claude 3 Haiku) to generate a structured mitigation advisory.

    Returns the parsed JSON advisory dict, or a rule-based fallback if Bedrock fails.
    """
    user_prompt = f"""FIRE HOTSPOT ALERT -- ACTION REQUIRED

Fire Hotspot Data:
- Hotspot ID: {hotspot.get('hotspot_id')}
- Location: {hotspot.get('latitude')}, {hotspot.get('longitude')} ({hotspot.get('region', 'Punjab/Haryana')})
- Fire Radiative Power: {hotspot.get('frp', 0)} MW
- Instrument: {hotspot.get('instrument', 'VIIRS')} / Satellite: {hotspot.get('satellite', 'N')}
- Wind bearing: {hotspot.get('cone_bearing_deg', 135)} degrees
- Transport distance (6h): {hotspot.get('cone_distance_km', 50)} km

Institution at Risk:
- Institution ID: {institution.get('institution_id')}
- Name: {institution.get('name')}
- Type: {institution.get('facility_type')}
- Location: {institution.get('latitude')}, {institution.get('longitude')}
- District: {institution.get('district', 'Delhi NCR')}
- Vulnerable persons: {institution.get('vulnerable_count', institution.get('student_count', institution.get('worker_count', institution.get('bed_count', 100))))}
- Has outdoor activities: {institution.get('outdoor_activity', False)}
- Has air purifiers: {institution.get('has_air_purifiers', False)}

Dispersion Model Output:
- Distance from fire: {distance_km:.1f} km
- Predicted smoke arrival: {arrival_utc.isoformat()}
- Estimated PM2.5 at site: {pm25_estimate:.1f} ug/m3
- Impact severity: {severity}
- Context: October stubble burning season, Delhi NCR, post-monsoon NW winds

Generate the advisory JSON now."""

    bedrock_request = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": BEDROCK_MAX_TOKENS,
        "temperature": BEDROCK_TEMPERATURE,
        "system": BEDROCK_SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    try:
        response = bedrock_client.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps(bedrock_request),
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        content = response_body.get("content", [{}])[0].get("text", "").strip()

        advisory = json.loads(content)
        advisory["advisory_source"] = "bedrock"

        logger.info(
            "Bedrock advisory for %s: severity=%s, PM2.5=%.1f, confidence=%.2f",
            institution.get("institution_id"),
            advisory.get("impact_severity"),
            advisory.get("predicted_pm25_ugm3", 0),
            advisory.get("confidence_score", 0),
        )
        return advisory

    except ClientError as exc:
        error_code = exc.response["Error"]["Code"]
        logger.error("Bedrock invocation failed (%s): %s", error_code, exc)
        return _build_fallback_advisory(institution, pm25_estimate, severity, arrival_utc)

    except json.JSONDecodeError as exc:
        logger.error("Bedrock response not valid JSON: %s", exc)
        return _build_fallback_advisory(institution, pm25_estimate, severity, arrival_utc)

    except Exception as exc:
        logger.error("Unexpected Bedrock error: %s", exc, exc_info=True)
        return _build_fallback_advisory(institution, pm25_estimate, severity, arrival_utc)


def _build_fallback_advisory(
    institution: dict,
    pm25_estimate: float,
    severity: str,
    arrival_utc: datetime,
) -> dict:
    """
    Generate a rule-based fallback advisory when Bedrock is unavailable.
    Produces context-appropriate actions for each facility type.
    """
    facility_type = institution.get("facility_type", "Municipality")
    inst_id = institution.get("institution_id", "unknown")
    has_purifiers = institution.get("has_air_purifiers", False)

    actions_by_type = {
        "School": [
            "Immediately cancel all outdoor activities, PT classes, and recess periods",
            (
                "Deploy air purifiers in all classrooms and direct students indoors"
                if has_purifiers
                else "Close all windows and direct students to remain indoors"
            ),
            f"Send automated SMS notification to parents of all {institution.get('student_count', 'enrolled')} students advising early pickup option",
        ],
        "Hospital": [
            f"Alert Respiratory Medicine and Cardiology departments: PM2.5 spike of {pm25_estimate:.0f} ug/m3 expected at {arrival_utc.strftime('%H:%M UTC')}",
            "Switch all HVAC units to recirculation mode; seal external air intakes immediately",
            "Pre-position bronchodilators, nebulizers, and supplemental oxygen at emergency triage points",
        ],
        "Construction": [
            f"Issue mandatory N95/P2 respirators to all {institution.get('worker_count', 'outdoor')} workers -- no exceptions",
            "Reduce continuous outdoor exposure to 90-minute maximum intervals with 30-minute indoor breaks",
            "Halt concrete pouring, sandblasting, and other dust-generating activities until AQI improves",
        ],
        "Municipality": [
            f"Issue public health advisory for {institution.get('district', 'district')}: PM2.5 forecast {pm25_estimate:.0f} ug/m3 (Severity: {severity})",
            "Activate emergency response protocol: coordinate with CPCB monitoring stations for real-time AQI updates",
            "Deploy mobile health units to vulnerable clusters (elderly homes, slum settlements) within jurisdiction",
        ],
    }

    actions = actions_by_type.get(facility_type, actions_by_type["Municipality"])

    return {
        "institution_id": inst_id,
        "facility_type": facility_type,
        "predicted_arrival_utc": arrival_utc.isoformat(),
        "impact_severity": severity,
        "predicted_pm25_ugm3": pm25_estimate,
        "recommended_actions": actions,
        "confidence_score": 0.72,  # Lower confidence for rule-based fallback
        "advisory_source": "rule_fallback",
    }


# ─────────────────────────────────────────────────────────────────────────────
# DYNAMODB ALERT STORAGE
# ─────────────────────────────────────────────────────────────────────────────


def _store_alert(alert_record: dict) -> None:
    """Write the alert record to VayuSync_AlertLogs DynamoDB table."""
    table = dynamodb.Table(ALERT_LOGS_TABLE)
    try:
        table.put_item(Item=alert_record)
        logger.info("Alert %s stored in DynamoDB", alert_record["alert_id"])
    except ClientError as exc:
        logger.error(
            "Failed to store alert %s: %s",
            alert_record.get("alert_id"),
            exc.response["Error"]["Message"],
        )


# ─────────────────────────────────────────────────────────────────────────────
# SNS PUBLISHING
# ─────────────────────────────────────────────────────────────────────────────


def _publish_alert_to_sns(alert_record: dict, institution: dict) -> str:
    """
    Publish an alert to the VayuSync SNS topic.

    The message is formatted for human readability in SMS/email,
    with MessageAttributes for programmatic consumers (webhook dispatcher).

    Returns
    -------
    str
        SNS MessageId or empty string on failure.
    """
    if not SNS_TOPIC_ARN:
        logger.warning("SNS_TOPIC_ARN not set -- skipping SNS publish")
        return ""

    severity = alert_record.get("impact_severity", "UNKNOWN")
    inst_name = alert_record.get("institution_name", alert_record.get("institution_id"))
    pm25 = alert_record.get("predicted_pm25_ugm3", "?")
    arrival = alert_record.get("predicted_arrival_utc", "?")
    actions = json.loads(alert_record.get("recommended_actions", "[]"))

    message_body = (
        f"VAYUSYNC SMOKE ALERT [{severity}]\n"
        f"Facility: {inst_name}\n"
        f"Type: {alert_record.get('facility_type', '?')}\n"
        f"Predicted PM2.5: {pm25} ug/m3\n"
        f"Smoke arrival: {arrival}\n"
        f"\nRequired Actions:\n"
        + "\n".join(f"{i+1}. {a}" for i, a in enumerate(actions[:3]))
        + f"\n\nAlert ID: {alert_record.get('alert_id')}\n"
        "-- VayuSync Automated Alert System"
    )

    subject = (
        f"[{severity}] VayuSync Alert: {inst_name} -- Smoke Exposure {arrival[:10]}"
    )[:100]

    try:
        response = sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=message_body,
            Subject=subject,
            MessageAttributes={
                "severity": {"DataType": "String", "StringValue": severity},
                "facility_type": {
                    "DataType": "String",
                    "StringValue": alert_record.get("facility_type", "Unknown"),
                },
                "alert_id": {
                    "DataType": "String",
                    "StringValue": alert_record.get("alert_id", ""),
                },
            },
        )
        message_id = response.get("MessageId", "")
        logger.info(
            "SNS published alert %s (MessageId=%s)",
            alert_record.get("alert_id"),
            message_id,
        )
        return message_id

    except ClientError as exc:
        logger.error("SNS publish failed: %s", exc.response["Error"]["Message"])
        return ""
