"""
vayusync.lambdas.shared.mock_data
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Realistic simulation data for the VayuSync pipeline.

All geographic coordinates, wind values, and institutional details are
calibrated to the October–November stubble-burning season in Punjab, Haryana,
and Delhi NCR.  This module is imported by:
  • ingestion_engine  — as a FIRMS fallback when the NASA API is unavailable
  • simulate_trigger  — to build demo payloads on demand
  • evaluator_engine  — to seed institution queries in offline mode
  • seed_dynamo.py    — to pre-populate DynamoDB for the demo
"""

from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────────────────────────────────────
# FIRE HOTSPOTS  (NASA FIRMS / VIIRS_SNPP_NRT format)
# ─────────────────────────────────────────────────────────────────────────────
# Fields mirror the FIRMS CSV columns:
#   latitude, longitude, brightness, scan, track, acq_date, acq_time,
#   satellite, instrument, confidence, version, bright_t31, frp, daynight

_NOW = datetime.now(timezone.utc)
_DATE = _NOW.strftime("%Y-%m-%d")
_TIME = _NOW.strftime("%H%M")

MOCK_HOTSPOTS = [
    {
        # Ludhiana district — dense paddy stubble belt
        "hotspot_id": "HS-LDH-001",
        "latitude": 30.92,
        "longitude": 75.85,
        "brightness": 342.6,        # Kelvin, MODIS Band 21
        "frp": 1185.4,              # Fire Radiative Power (MW) — large burn event
        "scan": 0.39,
        "track": 0.36,
        "acq_date": _DATE,
        "acq_time": _TIME,
        "satellite": "N",           # Suomi NPP
        "instrument": "VIIRS",
        "confidence": "h",          # high confidence
        "version": "2.0NRT",
        "bright_t31": 295.1,
        "daynight": "D",
        "region": "Ludhiana, Punjab",
        "area_ha": 48.7,
    },
    {
        # Amritsar district — near Attari border
        "hotspot_id": "HS-ASR-002",
        "latitude": 31.63,
        "longitude": 74.87,
        "brightness": 318.9,
        "frp": 892.1,
        "scan": 0.41,
        "track": 0.38,
        "acq_date": _DATE,
        "acq_time": _TIME,
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "h",
        "version": "2.0NRT",
        "bright_t31": 293.4,
        "daynight": "D",
        "region": "Amritsar, Punjab",
        "area_ha": 32.1,
    },
    {
        # Patiala district — transitional zone toward Haryana
        "hotspot_id": "HS-PTA-003",
        "latitude": 30.34,
        "longitude": 76.38,
        "brightness": 355.2,
        "frp": 1047.8,
        "scan": 0.37,
        "track": 0.35,
        "acq_date": _DATE,
        "acq_time": _TIME,
        "satellite": "1",           # NOAA-20
        "instrument": "VIIRS",
        "confidence": "n",          # nominal confidence
        "version": "2.0NRT",
        "bright_t31": 296.7,
        "daynight": "D",
        "region": "Patiala, Punjab",
        "area_ha": 41.3,
    },
    {
        # Hisar district, Haryana — large agricultural belt
        "hotspot_id": "HS-HIS-004",
        "latitude": 29.15,
        "longitude": 75.72,
        "brightness": 328.4,
        "frp": 763.5,
        "scan": 0.43,
        "track": 0.40,
        "acq_date": _DATE,
        "acq_time": _TIME,
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "h",
        "version": "2.0NRT",
        "bright_t31": 291.8,
        "daynight": "D",
        "region": "Hisar, Haryana",
        "area_ha": 28.9,
    },
    {
        # Rohtak district, Haryana — upwind of Delhi NCR
        "hotspot_id": "HS-ROH-005",
        "latitude": 28.89,
        "longitude": 76.59,
        "brightness": 361.7,
        "frp": 1312.0,              # Highest FRP — most intense burn
        "scan": 0.38,
        "track": 0.36,
        "acq_date": _DATE,
        "acq_time": _TIME,
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "h",
        "version": "2.0NRT",
        "bright_t31": 298.2,
        "daynight": "D",
        "region": "Rohtak, Haryana",
        "area_ha": 55.4,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# DELHI NCR INSTITUTIONS
# ─────────────────────────────────────────────────────────────────────────────
# Coordinates are realistic Delhi NCR locations (schools, hospitals, etc.)
# webhook_url would be populated from a real registration system in production.

MOCK_INSTITUTIONS = [
    # ── SCHOOLS ──────────────────────────────────────────────────────────────
    {
        "institution_id": "INST-SCH-001",
        "name": "Kendriya Vidyalaya, Rohini",
        "facility_type": "School",
        "latitude": 28.7395,
        "longitude": 77.0680,
        "district": "North West Delhi",
        "state": "Delhi",
        "contact_name": "Principal Meena Sharma",
        "contact_phone": "+919810001001",
        "contact_email": "principal@kvrohini.edu.in",
        "student_count": 1840,
        "vulnerable_count": 1840,   # All students are vulnerable during pollution events
        "outdoor_activity": True,   # Has large playground
        "has_air_purifiers": False,
        "webhook_url": "https://hooks.kvrohini.edu.in/vayusync",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    {
        "institution_id": "INST-SCH-002",
        "name": "DPS RK Puram",
        "facility_type": "School",
        "latitude": 28.5672,
        "longitude": 77.1887,
        "district": "South West Delhi",
        "state": "Delhi",
        "contact_name": "Vice Principal Rajesh Gupta",
        "contact_phone": "+919810002002",
        "contact_email": "admin@dpsrkp.net",
        "student_count": 4500,
        "vulnerable_count": 4500,
        "outdoor_activity": True,
        "has_air_purifiers": True,
        "webhook_url": "https://api.dpsrkp.net/alerts/vayu",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    {
        "institution_id": "INST-SCH-003",
        "name": "Government Boys Senior Secondary School, Narela",
        "facility_type": "School",
        "latitude": 28.8554,
        "longitude": 77.0955,
        "district": "North Delhi",
        "state": "Delhi",
        "contact_name": "Headmaster Surender Pal",
        "contact_phone": "+919810003003",
        "contact_email": "narela.gbsss@delhi.gov.in",
        "student_count": 720,
        "vulnerable_count": 720,
        "outdoor_activity": True,
        "has_air_purifiers": False,
        "webhook_url": None,        # No webhook — alert via SMS only
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    # ── HOSPITALS ─────────────────────────────────────────────────────────────
    {
        "institution_id": "INST-HSP-001",
        "name": "Safdarjung Hospital",
        "facility_type": "Hospital",
        "latitude": 28.5681,
        "longitude": 77.2040,
        "district": "South West Delhi",
        "state": "Delhi",
        "contact_name": "RMO Dr. Priya Nair",
        "contact_phone": "+911126165060",
        "contact_email": "rmo@safdarjung.nic.in",
        "bed_count": 1531,
        "icu_beds": 120,
        "vulnerable_count": 1531,   # All patients at risk from PM2.5 spike
        "outdoor_activity": False,
        "has_air_purifiers": True,
        "webhook_url": "https://emr.safdarjung.nic.in/api/env-alerts",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    {
        "institution_id": "INST-HSP-002",
        "name": "GTB Hospital, Dilshad Garden",
        "facility_type": "Hospital",
        "latitude": 28.6851,
        "longitude": 77.3017,
        "district": "East Delhi",
        "state": "Delhi",
        "contact_name": "RMO Dr. Amit Chauhan",
        "contact_phone": "+911122386858",
        "contact_email": "rmo@gtbhospital.delhi.gov.in",
        "bed_count": 1028,
        "icu_beds": 85,
        "vulnerable_count": 1028,
        "outdoor_activity": False,
        "has_air_purifiers": True,
        "webhook_url": "https://gtbhospital.delhi.gov.in/api/vayu-alerts",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    # ── CONSTRUCTION SITES ────────────────────────────────────────────────────
    {
        "institution_id": "INST-CON-001",
        "name": "Delhi Metro Phase IV — Janakpuri West Depot",
        "facility_type": "Construction",
        "latitude": 28.6295,
        "longitude": 77.0583,
        "district": "West Delhi",
        "state": "Delhi",
        "contact_name": "Site Safety Officer Ramesh Kumar",
        "contact_phone": "+919810004004",
        "contact_email": "safety@dmrcph4jw.in",
        "worker_count": 1200,
        "vulnerable_count": 1200,   # All outdoor workers highly vulnerable
        "outdoor_activity": True,
        "has_air_purifiers": False,
        "webhook_url": "https://dmrc.safety.in/vayu-webhook",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    {
        "institution_id": "INST-CON-002",
        "name": "DDA Housing Project, Narela Sector G7",
        "facility_type": "Construction",
        "latitude": 28.8620,
        "longitude": 77.1180,
        "district": "North Delhi",
        "state": "Delhi",
        "contact_name": "Project Manager Deepak Yadav",
        "contact_phone": "+919810005005",
        "contact_email": "pm@ddanarela.in",
        "worker_count": 650,
        "vulnerable_count": 650,
        "outdoor_activity": True,
        "has_air_purifiers": False,
        "webhook_url": None,
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
    # ── MUNICIPALITY ──────────────────────────────────────────────────────────
    {
        "institution_id": "INST-MUN-001",
        "name": "MCD Zone Office, Civil Lines",
        "facility_type": "Municipality",
        "latitude": 28.6807,
        "longitude": 77.2224,
        "district": "North Delhi",
        "state": "Delhi",
        "contact_name": "Zonal Commissioner Sunita Rawat",
        "contact_phone": "+911123814282",
        "contact_email": "zco.civillines@mcd.gov.in",
        "staff_count": 380,
        "vulnerable_count": 380,
        "outdoor_activity": False,
        "has_air_purifiers": False,
        "webhook_url": "https://mcd.gov.in/api/env-webhook",
        "risk_status": "SAFE",
        "last_alert_id": None,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# WIND DATA  (October stubble season profile — realistic NW winds)
# ─────────────────────────────────────────────────────────────────────────────
# October in Punjab/Haryana is characterized by:
#   - Post-monsoon NW/WNW flow (bearing ~300-330 degrees)
#   - Surface winds 12-28 km/h (3.3-7.8 m/s)
#   - Low atmospheric mixing height (500-900 m) trapping smoke near surface
#   - u_wind: westerly component (negative = from west)
#   - v_wind: northerly component (negative = from north)

MOCK_WIND_PROFILES = {
    # Ludhiana region (representative of Punjab)
    "punjab": {
        "latitude": 30.92,
        "longitude": 75.85,
        # u (eastward): negative -> wind blowing from the west (WNW)
        # v (northward): negative -> wind blowing from the north (NNW)
        "u_wind_ms": -6.0,          # westerly component
        "v_wind_ms": -10.4,         # northerly component
        "wind_speed_kmh": 43.2,
        "wind_bearing_deg": 330.0,  # From NNW (carrying smoke to SSE/Delhi)
        "mixing_height_m": 680,
        "temperature_c": 28.4,
        "relative_humidity_pct": 55.0,
    },
    # Rohtak region (representative of Haryana, upwind of Delhi)
    "haryana": {
        "latitude": 28.89,
        "longitude": 76.59,
        "u_wind_ms": -5.2,
        "v_wind_ms": -8.8,
        "wind_speed_kmh": 36.8,
        "wind_bearing_deg": 330.0,
        "mixing_height_m": 590,
        "temperature_c": 29.1,
        "relative_humidity_pct": 52.3,
    },
    # Delhi NCR (downwind receptor)
    "delhi": {
        "latitude": 28.65,
        "longitude": 77.22,
        "u_wind_ms": -4.1,
        "v_wind_ms": -6.5,
        "wind_speed_kmh": 27.7,
        "wind_bearing_deg": 330.0,
        "mixing_height_m": 510,     # Very low -> severe trapping
        "temperature_c": 30.2,
        "relative_humidity_pct": 60.7,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# SAMPLE ALERT LOG ENTRIES  (showing realistic progression over a burning day)
# ─────────────────────────────────────────────────────────────────────────────

_T0 = datetime.now(timezone.utc).replace(hour=4, minute=30, second=0, microsecond=0)

MOCK_ALERT_LOGS = [
    {
        "alert_id": "ALT-20261009-0001",
        "timestamp": (_T0 + timedelta(hours=0)).isoformat(),
        "hotspot_id": "HS-ROH-005",
        "institution_id": "INST-SCH-003",
        "institution_name": "Government Boys Senior Secondary School, Narela",
        "facility_type": "School",
        "impact_severity": "CRITICAL",
        "predicted_pm25_ugm3": 487.3,
        "predicted_arrival_utc": (_T0 + timedelta(hours=3, minutes=15)).isoformat(),
        "recommended_actions": [
            "Immediately suspend all outdoor activities and PT classes",
            "Activate indoor HVAC systems and close all windows/doors",
            "Issue N95 masks to all 720 students and staff",
        ],
        "confidence_score": 0.91,
        "sns_message_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "sms_delivered": True,
        "email_delivered": True,
        "webhook_delivered": False,  # No webhook registered
        "ttl_epoch": int((_T0 + timedelta(days=30)).timestamp()),
    },
    {
        "alert_id": "ALT-20261009-0002",
        "timestamp": (_T0 + timedelta(hours=1)).isoformat(),
        "hotspot_id": "HS-ROH-005",
        "institution_id": "INST-CON-002",
        "institution_name": "DDA Housing Project, Narela Sector G7",
        "facility_type": "Construction",
        "impact_severity": "CRITICAL",
        "predicted_pm25_ugm3": 521.8,
        "predicted_arrival_utc": (_T0 + timedelta(hours=2, minutes=45)).isoformat(),
        "recommended_actions": [
            "Halt all outdoor construction activities immediately",
            "Distribute N95 respirators to all 650 outdoor workers",
            "Establish a rest area with air filtration inside enclosed structures",
        ],
        "confidence_score": 0.88,
        "sns_message_id": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
        "sms_delivered": True,
        "email_delivered": True,
        "webhook_delivered": False,
        "ttl_epoch": int((_T0 + timedelta(days=30)).timestamp()),
    },
    {
        "alert_id": "ALT-20261009-0003",
        "timestamp": (_T0 + timedelta(hours=2)).isoformat(),
        "hotspot_id": "HS-LDH-001",
        "institution_id": "INST-HSP-001",
        "institution_name": "Safdarjung Hospital",
        "facility_type": "Hospital",
        "impact_severity": "HIGH",
        "predicted_pm25_ugm3": 298.6,
        "predicted_arrival_utc": (_T0 + timedelta(hours=8, minutes=20)).isoformat(),
        "recommended_actions": [
            "Alert Respiratory and Cardiology departments of incoming PM2.5 surge",
            "Pre-position nebulizers and bronchodilators in emergency ward",
            "Seal all ventilation intakes and switch to recirculated air mode",
        ],
        "confidence_score": 0.79,
        "sns_message_id": "c3d4e5f6-a7b8-9012-cdef-012345678902",
        "sms_delivered": True,
        "email_delivered": True,
        "webhook_delivered": True,
        "ttl_epoch": int((_T0 + timedelta(days=30)).timestamp()),
    },
    {
        "alert_id": "ALT-20261009-0004",
        "timestamp": (_T0 + timedelta(hours=3)).isoformat(),
        "hotspot_id": "HS-PTA-003",
        "institution_id": "INST-SCH-001",
        "institution_name": "Kendriya Vidyalaya, Rohini",
        "facility_type": "School",
        "impact_severity": "HIGH",
        "predicted_pm25_ugm3": 274.1,
        "predicted_arrival_utc": (_T0 + timedelta(hours=6, minutes=50)).isoformat(),
        "recommended_actions": [
            "Cancel morning assembly and shift to indoor-only schedule",
            "Notify parents via SMS to arrange early pickup if possible",
            "Deploy available air purifiers in classrooms for grades 1-5",
        ],
        "confidence_score": 0.83,
        "sns_message_id": "d4e5f6a7-b8c9-0123-def0-123456789013",
        "sms_delivered": True,
        "email_delivered": True,
        "webhook_delivered": True,
        "ttl_epoch": int((_T0 + timedelta(days=30)).timestamp()),
    },
    {
        "alert_id": "ALT-20261009-0005",
        "timestamp": (_T0 + timedelta(hours=4)).isoformat(),
        "hotspot_id": "HS-HIS-004",
        "institution_id": "INST-CON-001",
        "institution_name": "Delhi Metro Phase IV -- Janakpuri West Depot",
        "facility_type": "Construction",
        "impact_severity": "MEDIUM",
        "predicted_pm25_ugm3": 162.4,
        "predicted_arrival_utc": (_T0 + timedelta(hours=9, minutes=30)).isoformat(),
        "recommended_actions": [
            "Issue P2/N95 masks to workers in exposed tunnel sections",
            "Reduce shift duration for outdoor workers to 4-hour rotations",
            "Monitor AQI sensors on site every 30 minutes",
        ],
        "confidence_score": 0.74,
        "sns_message_id": "e5f6a7b8-c9d0-1234-ef01-234567890124",
        "sms_delivered": True,
        "email_delivered": False,   # Email bounce (simulated)
        "webhook_delivered": True,
        "ttl_epoch": int((_T0 + timedelta(days=30)).timestamp()),
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def get_hotspot_by_id(hotspot_id: str):
    """Return the mock hotspot dict matching hotspot_id, or None."""
    return next((h for h in MOCK_HOTSPOTS if h["hotspot_id"] == hotspot_id), None)


def get_institution_by_id(institution_id: str):
    """Return the mock institution dict matching institution_id, or None."""
    return next(
        (i for i in MOCK_INSTITUTIONS if i["institution_id"] == institution_id), None
    )


def get_wind_for_region(hotspot_lat: float, hotspot_lon: float) -> dict:
    """
    Return the best-matching wind profile for a given hotspot location.
    Uses simple latitude thresholding to select Punjab vs Haryana vs Delhi.
    """
    if hotspot_lat > 30.0:
        return MOCK_WIND_PROFILES["punjab"]
    elif hotspot_lat > 29.0:
        return MOCK_WIND_PROFILES["haryana"]
    else:
        return MOCK_WIND_PROFILES["delhi"]
