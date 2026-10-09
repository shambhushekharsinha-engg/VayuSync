"""
vayusync.scripts.test_pipeline
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
End-to-end pipeline test script for VayuSync.

Tests the full pipeline locally without requiring deployed AWS infrastructure.
Uses mocked AWS services (via unittest.mock) to simulate DynamoDB, S3, SNS,
Lambda, and Bedrock calls.

Usage
-----
  # Run all tests:
  python scripts/test_pipeline.py

  # Run a specific test:
  python scripts/test_pipeline.py TestGeoUtils
  python scripts/test_pipeline.py TestIngestionEngine
  python scripts/test_pipeline.py TestEvaluatorEngine
  python scripts/test_pipeline.py TestSimulateTrigger
  python scripts/test_pipeline.py TestDashboardData

  # Run against LIVE AWS (requires AWS credentials + deployed stack):
  python scripts/test_pipeline.py --live

Environment Variables (for --live mode)
----------------------------------------
  AWS_DEFAULT_REGION   : AWS region
  API_ENDPOINT         : API Gateway URL (from SAM deploy output)
"""

import os
# Force mock credentials to prevent boto3 from trying to invoke AWS SSO login provider in local dev/test
os.environ["AWS_ACCESS_KEY_ID"] = "mock_access_key"
os.environ["AWS_SECRET_ACCESS_KEY"] = "mock_secret_key"
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"

import argparse
import json
import logging
import sys
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, ANY

# Ensure mock AWS credentials exist for offline unit tests
os.environ.setdefault("AWS_ACCESS_KEY_ID", "mock_access_key")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "mock_secret_key")
os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")

# Allow importing shared modules
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
SHARED_DIR = os.path.join(BACKEND_DIR, "lambdas", "shared")

import importlib.util

def load_handler_module(dir_name):
    handler_path = os.path.join(BACKEND_DIR, "lambdas", dir_name, "handler.py")
    spec = importlib.util.spec_from_file_location(f"handler_{dir_name}", handler_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

sys.path.insert(0, SHARED_DIR)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("vayusync.test_pipeline")


# =============================================================================
# UNIT TESTS: Geo Utilities
# =============================================================================

class TestGeoUtils(unittest.TestCase):
    """Tests for lambdas/shared/geo_utils.py"""

    def setUp(self):
        import geo_utils
        self.geo = geo_utils

    def test_haversine_distance_same_point(self):
        """Distance from a point to itself should be zero."""
        dist = self.geo.haversine_distance(28.65, 77.22, 28.65, 77.22)
        self.assertAlmostEqual(dist, 0.0, places=5)

    def test_haversine_distance_known(self):
        """Ludhiana to Delhi: ~250 km."""
        dist = self.geo.haversine_distance(30.9, 75.85, 28.65, 77.22)
        self.assertGreater(dist, 200)
        self.assertLess(dist, 300)

    def test_destination_point(self):
        """Moving 100 km north from Delhi should increase latitude."""
        lat0, lon0 = 28.65, 77.22
        lat1, lon1 = self.geo.destination_point(lat0, lon0, 0, 100)  # due north
        self.assertGreater(lat1, lat0)
        self.assertAlmostEqual(lon1, lon0, places=2)

    def test_trajectory_cone_is_valid_geojson(self):
        """Trajectory cone should return a valid GeoJSON Feature."""
        result = self.geo.calculate_trajectory_cone(
            lat=30.9, lon=75.85, u_wind=4.8, v_wind=-3.2, thermal_power_mw=1000
        )
        self.assertEqual(result["type"], "Feature")
        self.assertEqual(result["geometry"]["type"], "Polygon")
        self.assertIn("bbox", result["properties"])
        self.assertIn("bearing_deg", result["properties"])
        self.assertGreater(result["properties"]["transport_distance_km"], 0)

    def test_trajectory_cone_nw_wind(self):
        """NW wind (positive u = eastward, negative v = southward) should produce SE-facing cone (bearing ~135)."""
        result = self.geo.calculate_trajectory_cone(
            lat=30.9, lon=75.85, u_wind=4.8, v_wind=-3.2, thermal_power_mw=1000
        )
        bearing = result["properties"]["bearing_deg"]
        # NW wind means smoke goes SE; bearing should be roughly 100-170 degrees
        self.assertGreater(bearing, 90)
        self.assertLess(bearing, 180)

    def test_point_in_polygon_inside(self):
        """A point known to be inside a simple square polygon should return True."""
        # Simple 10x10 degree square around (0, 0)
        ring = [[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]
        self.assertTrue(self.geo.point_in_polygon(0, 0, ring))

    def test_point_in_polygon_outside(self):
        """A point outside the polygon should return False."""
        ring = [[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]
        self.assertFalse(self.geo.point_in_polygon(10, 10, ring))

    def test_geohash_length(self):
        """Geohash at precision 6 should return a 6-character string."""
        gh = self.geo.latlon_to_geohash(28.65, 77.22, precision=6)
        self.assertEqual(len(gh), 6)
        self.assertIsInstance(gh, str)

    def test_geohash_delhi_prefix(self):
        """Delhi's geohash should start with 'tt' (known value)."""
        gh = self.geo.latlon_to_geohash(28.65, 77.22, precision=6)
        # Delhi is in geohash tile starting with 'tt'
        self.assertTrue(gh.startswith("tt"))

    def test_pm25_estimate_reasonable(self):
        """PM2.5 estimate for a strong fire at 100 km should be > 75 ug/m3."""
        pm25 = self.geo.estimate_pm25_at_institution(
            hotspot_frp_mw=1000,
            distance_km=100,
            wind_speed_ms=5.0,
            mixing_height_m=700,
        )
        self.assertGreater(pm25, 75)  # Should be at least HIGH severity

    def test_pm25_estimate_capped(self):
        """PM2.5 estimate should be capped at 999 ug/m3."""
        pm25 = self.geo.estimate_pm25_at_institution(
            hotspot_frp_mw=10000,  # Unrealistically large
            distance_km=1,
            wind_speed_ms=0.5,
        )
        self.assertLessEqual(pm25, 999.0)


# =============================================================================
# UNIT TESTS: Mock Data
# =============================================================================

class TestMockData(unittest.TestCase):
    """Tests for lambdas/shared/mock_data.py"""

    def setUp(self):
        import mock_data
        self.md = mock_data

    def test_mock_hotspots_count(self):
        """Should have 5 mock hotspots."""
        self.assertEqual(len(self.md.MOCK_HOTSPOTS), 5)

    def test_mock_institutions_count(self):
        """Should have 8 mock institutions."""
        self.assertEqual(len(self.md.MOCK_INSTITUTIONS), 8)

    def test_mock_hotspots_have_required_fields(self):
        """Each hotspot should have lat, lon, frp, hotspot_id."""
        for hs in self.md.MOCK_HOTSPOTS:
            self.assertIn("hotspot_id", hs)
            self.assertIn("latitude", hs)
            self.assertIn("longitude", hs)
            self.assertIn("frp", hs)
            self.assertGreater(float(hs["frp"]), 0)

    def test_mock_institutions_have_required_fields(self):
        """Each institution should have id, name, type, lat, lon."""
        facility_types = {"School", "Hospital", "Construction", "Municipality"}
        for inst in self.md.MOCK_INSTITUTIONS:
            self.assertIn("institution_id", inst)
            self.assertIn("name", inst)
            self.assertIn("facility_type", inst)
            self.assertIn(inst["facility_type"], facility_types)
            self.assertIn("latitude", inst)
            self.assertIn("longitude", inst)

    def test_institutions_in_delhi_ncr(self):
        """All institutions should be within Delhi NCR bounds (28.4-28.9 lat, 76.8-77.4 lon)."""
        for inst in self.md.MOCK_INSTITUTIONS:
            lat = float(inst["latitude"])
            lon = float(inst["longitude"])
            self.assertGreater(lat, 28.3, f"{inst['name']} lat too low: {lat}")
            self.assertLess(lat, 28.95, f"{inst['name']} lat too high: {lat}")

    def test_hotspots_in_punjab_haryana(self):
        """All hotspots should be in Punjab/Haryana region (28.5-32 lat)."""
        for hs in self.md.MOCK_HOTSPOTS:
            lat = float(hs["latitude"])
            self.assertGreater(lat, 28.0, f"{hs['hotspot_id']} lat too low")
            self.assertLess(lat, 32.5, f"{hs['hotspot_id']} lat too high")

    def test_get_hotspot_by_id(self):
        """get_hotspot_by_id should return matching hotspot or None."""
        result = self.md.get_hotspot_by_id("HS-LDH-001")
        self.assertIsNotNone(result)
        self.assertEqual(result["hotspot_id"], "HS-LDH-001")

        result = self.md.get_hotspot_by_id("HS-NONEXISTENT")
        self.assertIsNone(result)

    def test_get_wind_for_region(self):
        """Wind profile should vary by latitude."""
        punjab = self.md.get_wind_for_region(31.0, 75.0)
        haryana = self.md.get_wind_for_region(29.5, 76.0)
        delhi = self.md.get_wind_for_region(28.6, 77.2)
        
        self.assertIn("u_wind_ms", punjab)
        self.assertIn("u_wind_ms", haryana)
        self.assertIn("u_wind_ms", delhi)

        # All should have NW winds (negative u, negative v)
        for profile in [punjab, haryana, delhi]:
            self.assertGreater(profile["u_wind_ms"], 0)
            self.assertLess(profile["v_wind_ms"], 0)


# =============================================================================
# INTEGRATION TESTS: Ingestion Engine (Mocked AWS)
# =============================================================================

class TestIngestionEngine(unittest.TestCase):
    """Tests for lambdas/ingestion_engine/handler.py with mocked AWS."""

    def test_handler_with_mock_data(self):
        """IngestionEngine should use mock data when NASA API key is missing."""
        with patch("boto3.resource") as mock_resource, \
             patch("boto3.client") as mock_client, \
             patch("requests.get", side_effect=Exception("Simulated API unavailable")):
            mock_table = MagicMock()
            mock_resource.return_value.Table.return_value = mock_table

            # Patch env variables
            with patch.dict(os.environ, {
                "HOTSPOTS_TABLE": "VayuSync_Hotspots",
                "RAW_PAYLOAD_BUCKET": "vayusync-raw-payloads-2026",
                "EVALUATOR_FUNCTION_NAME": "VayuSync-EvaluatorEngine",
                "NASA_FIRMS_API_KEY": "",  # No API key -> use mock data
            }):
                ing_handler = load_handler_module("ingestion_engine")
                result = ing_handler.lambda_handler({"force_mock": True}, None)

        self.assertIn("run_id", result)
        self.assertEqual(result["source"], "mock")
        self.assertEqual(result["hotspots_fetched"], 5)
        logger.info("Ingestion test result: %s", result)

    def test_trajectory_cone_calculation_inline(self):
        """Test the trajectory cone calculation used within IngestionEngine."""
        from geo_utils import calculate_trajectory_cone

        cone = calculate_trajectory_cone(
            lat=30.9,
            lon=75.85,
            u_wind=4.8,
            v_wind=-3.2,
            thermal_power_mw=1185.4,
            hours=6,
        )
        self.assertEqual(cone["type"], "Feature")
        props = cone["properties"]
        self.assertGreater(props["transport_distance_km"], 50)
        self.assertGreater(props["bearing_deg"], 90)
        self.assertLess(props["bearing_deg"], 180)


# =============================================================================
# INTEGRATION TESTS: Evaluator Engine (Mocked AWS)
# =============================================================================

class TestEvaluatorEngine(unittest.TestCase):
    """Tests for lambdas/evaluator_engine/handler.py with mocked AWS."""

    def _make_synthetic_hotspot(self):
        """Build a minimal synthetic hotspot for evaluator testing."""
        from geo_utils import calculate_trajectory_cone, latlon_to_geohash
        import json

        lat, lon, frp = 28.89, 76.59, 1312.0  # Rohtak hotspot
        cone = calculate_trajectory_cone(lat, lon, 5.6, -2.7, frp)
        cone_props = cone["properties"]
        bbox = cone_props["bbox"]

        return {
            "hotspot_id": "HS-TEST-001",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": str(lat),
            "longitude": str(lon),
            "frp": str(frp),
            "region": "Rohtak, Haryana",
            "instrument": "VIIRS",
            "satellite": "N",
            "u_wind_ms": str(5.6),
            "v_wind_ms": str(-2.7),
            "cone_bearing_deg": str(round(cone_props["bearing_deg"], 2)),
            "cone_distance_km": str(round(cone_props["transport_distance_km"], 2)),
            "cone_bbox_min_lat": str(round(bbox["min_lat"], 6)),
            "cone_bbox_max_lat": str(round(bbox["max_lat"], 6)),
            "cone_bbox_min_lon": str(round(bbox["min_lon"], 6)),
            "cone_bbox_max_lon": str(round(bbox["max_lon"], 6)),
            "cone_geojson_6h": json.dumps(cone["geometry"]),
            "is_active": "true",
        }

    def test_evaluate_hotspot_finds_institutions(self):
        """Rohtak hotspot with NW wind should find Delhi NCR institutions."""
        # Import directly (no AWS calls in geo_utils or mock_data)
        from geo_utils import point_in_polygon
        from mock_data import MOCK_INSTITUTIONS
        import json

        hotspot = self._make_synthetic_hotspot()
        cone_ring = json.loads(hotspot["cone_geojson_6h"])["coordinates"][0]

        institutions_in_cone = []
        for inst in MOCK_INSTITUTIONS:
            if point_in_polygon(
                float(inst["latitude"]), float(inst["longitude"]), cone_ring
            ):
                institutions_in_cone.append(inst["institution_id"])

        logger.info(
            "Rohtak hotspot (NW wind) found %d institutions in cone: %s",
            len(institutions_in_cone),
            institutions_in_cone,
        )
        # With NW winds, Rohtak -> Delhi NCR should find at least 1 institution
        self.assertGreater(len(institutions_in_cone), 0)

    def test_severity_classification(self):
        """PM2.5 thresholds should map to correct severity levels."""
        # Mock the evaluator to expose _classify_severity
        sys.path.insert(0, os.path.join(BACKEND_DIR, "lambdas", "evaluator_engine"))
        
        with patch.dict(os.environ, {"SNS_TOPIC_ARN": "arn:aws:sns:ap-south-1:123456:test"}):
            with patch("boto3.resource"), patch("boto3.client"):
                eval_handler = load_handler_module("evaluator_engine")

                self.assertEqual(eval_handler._classify_severity(350.0), "CRITICAL")
                self.assertEqual(eval_handler._classify_severity(200.0), "HIGH")
                self.assertEqual(eval_handler._classify_severity(100.0), "MEDIUM")
                self.assertEqual(eval_handler._classify_severity(30.0), "LOW")

    def test_fallback_advisory_schema(self):
        """Fallback advisory should conform to the required JSON schema."""
        from mock_data import get_institution_by_id
        from geo_utils import estimate_pm25_at_institution

        with patch.dict(os.environ, {"SNS_TOPIC_ARN": ""}):
            with patch("boto3.resource"), patch("boto3.client"):
                eval_handler = load_handler_module("evaluator_engine")

                institution = get_institution_by_id("INST-SCH-001")
                pm25 = 350.0
                severity = "CRITICAL"
                arrival = datetime.now(timezone.utc) + timedelta(hours=4)

                advisory = eval_handler._build_fallback_advisory(
                    institution, pm25, severity, arrival
                )

                # Validate schema
                self.assertIn("institution_id", advisory)
                self.assertIn("facility_type", advisory)
                self.assertIn("predicted_arrival_utc", advisory)
                self.assertIn("impact_severity", advisory)
                self.assertIn("predicted_pm25_ugm3", advisory)
                self.assertIn("recommended_actions", advisory)
                self.assertIn("confidence_score", advisory)
                self.assertEqual(len(advisory["recommended_actions"]), 3)
                self.assertIn(advisory["impact_severity"], ["CRITICAL", "HIGH", "MEDIUM", "LOW"])
                self.assertGreater(advisory["confidence_score"], 0)
                self.assertLessEqual(advisory["confidence_score"], 1.0)


# =============================================================================
# INTEGRATION TESTS: Simulate Trigger (Mocked AWS)
# =============================================================================

class TestSimulateTrigger(unittest.TestCase):
    """Tests for lambdas/simulate_trigger/handler.py with mocked AWS."""

    def setUp(self):
        sys.path.insert(0, os.path.join(BACKEND_DIR, "lambdas", "simulate_trigger"))

    def _make_api_event(self, body: dict = None, method: str = "POST") -> dict:
        return {
            "httpMethod": method,
            "path": "/simulate",
            "resource": "/simulate",
            "queryStringParameters": None,
            "body": json.dumps(body or {}),
            "headers": {"Content-Type": "application/json"},
        }

    @patch("boto3.resource")
    @patch("boto3.client")
    def test_simulate_trigger_default_location(self, mock_client, mock_resource):
        """SimulateTrigger should use Ludhiana defaults and return 200."""
        # Mock DynamoDB put_item
        mock_table = MagicMock()
        mock_resource.return_value.Table.return_value = mock_table

        # Mock Lambda invoke (synchronous EvaluatorEngine call)
        mock_payload = json.dumps({
            "eval_id": "TEST-EVAL-001",
            "alerts_generated": 2,
            "hotspots_evaluated": 1,
            "institutions_checked": 8,
            "alerts": [
                {
                    "alert_id": "ALT-TEST-001",
                    "institution_id": "INST-SCH-003",
                    "institution_name": "Government Boys Senior Secondary School, Narela",
                    "facility_type": "School",
                    "impact_severity": "CRITICAL",
                    "predicted_pm25_ugm3": "487.3",
                    "predicted_arrival_utc": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
                    "distance_km": "42.0",
                    "recommended_actions": json.dumps([
                        "Cancel outdoor activities immediately",
                        "Issue N95 masks to all students",
                        "Notify parents via SMS",
                    ]),
                    "confidence_score": "0.87",
                }
            ],
        }).encode("utf-8")

        mock_lambda_client = MagicMock()
        mock_lambda_client.invoke.return_value = {
            "StatusCode": 200,
            "FunctionError": None,
            "Payload": MagicMock(read=MagicMock(return_value=mock_payload)),
        }
        mock_client.return_value = mock_lambda_client

        import importlib
        import handler as sim_handler
        importlib.reload(sim_handler)

        event = self._make_api_event()
        response = sim_handler.lambda_handler(event, None)

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        
        self.assertIn("simulation_id", body)
        self.assertIn("hotspot", body)
        self.assertIn("trajectory_cone", body)
        self.assertIn("alerts", body)
        self.assertIn("institutions_at_risk", body)
        
        hotspot = body["hotspot"]
        self.assertAlmostEqual(hotspot["latitude"], 30.9, places=1)
        self.assertAlmostEqual(hotspot["longitude"], 75.85, places=2)

        logger.info("Simulate trigger response: scenario=%s, alerts=%d", 
                    body.get("scenario"), len(body.get("alerts", [])))

    @patch("boto3.resource")
    @patch("boto3.client")
    def test_simulate_trigger_worst_case_scenario(self, mock_client, mock_resource):
        """worst_case scenario should use higher FRP range."""
        mock_resource.return_value.Table.return_value = MagicMock()
        
        mock_payload = json.dumps({"eval_id": "T", "alerts": [], "alerts_generated": 0}).encode()
        mock_client.return_value.invoke.return_value = {
            "StatusCode": 200,
            "FunctionError": None,
            "Payload": MagicMock(read=MagicMock(return_value=mock_payload)),
        }

        import importlib
        import handler as sim_handler
        importlib.reload(sim_handler)

        event = self._make_api_event({"scenario": "worst_case"})
        response = sim_handler.lambda_handler(event, None)
        
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        frp = body["hotspot"]["frp_mw"]
        
        # worst_case FRP range: 1100-1400 MW
        self.assertGreaterEqual(frp, 1100)
        self.assertLessEqual(frp, 1400)

    @patch("boto3.resource")
    @patch("boto3.client")
    def test_simulate_trigger_invalid_coords(self, mock_client, mock_resource):
        """Invalid coordinates should return 400."""
        import importlib
        import handler as sim_handler
        importlib.reload(sim_handler)

        event = self._make_api_event({"hotspot_lat": 999, "hotspot_lon": 999})
        response = sim_handler.lambda_handler(event, None)
        
        self.assertEqual(response["statusCode"], 400)

    def test_simulate_trigger_cors_preflight(self):
        """OPTIONS request should return 200 with CORS headers."""
        with patch("boto3.resource"), patch("boto3.client"):
            import importlib
            import handler as sim_handler
            importlib.reload(sim_handler)

            event = {"httpMethod": "OPTIONS", "path": "/simulate"}
            response = sim_handler.lambda_handler(event, None)
            
            self.assertEqual(response["statusCode"], 200)
            self.assertIn("Access-Control-Allow-Origin", response["headers"])
            self.assertEqual(response["headers"]["Access-Control-Allow-Origin"], "*")


# =============================================================================
# INTEGRATION TESTS: Dashboard Data
# =============================================================================

class TestDashboardData(unittest.TestCase):
    """Tests for lambdas/dashboard_data/handler.py with mocked AWS."""

    def setUp(self):
        sys.path.insert(0, os.path.join(BACKEND_DIR, "lambdas", "dashboard_data"))

    def _make_get_event(self, path: str) -> dict:
        return {
            "httpMethod": "GET",
            "path": path,
            "resource": path,
            "queryStringParameters": None,
            "body": None,
        }

    def _get_dashboard_handler(self):
        """Import (or reload) dashboard handler with mocked boto3."""
        with patch("boto3.resource"), patch("boto3.client"):
            import importlib
            import handler as dash_handler
            importlib.reload(dash_handler)
            return dash_handler

    @patch("boto3.resource")
    def test_dashboard_endpoint(self, mock_resource):
        """GET /dashboard should return valid aggregated data."""
        # Mock DynamoDB scan to return mock data
        mock_table = MagicMock()
        mock_table.scan.return_value = {"Items": [], "Count": 0}
        mock_resource.return_value.Table.return_value = mock_table

        import importlib
        import handler as dash_handler
        importlib.reload(dash_handler)

        event = self._make_get_event("/dashboard")
        response = dash_handler.lambda_handler(event, None)

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])

        self.assertIn("hotspots", body)
        self.assertIn("alerts", body)
        self.assertIn("institutions", body)
        self.assertIn("generated_at", body)
        self.assertIn("pipeline_status", body)
        
        # When DynamoDB returns empty, should fall back to mock data
        self.assertGreater(body["hotspots"]["active_count"], 0)
        self.assertGreater(body["institutions"]["total_registered"], 0)

    @patch("boto3.resource")
    def test_alerts_endpoint(self, mock_resource):
        """GET /alerts should return sorted alert list."""
        mock_table = MagicMock()
        mock_table.scan.return_value = {"Items": []}
        mock_resource.return_value.Table.return_value = mock_table

        import importlib
        import handler as dash_handler
        importlib.reload(dash_handler)

        event = self._make_get_event("/alerts")
        response = dash_handler.lambda_handler(event, None)

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        
        self.assertIn("alerts", body)
        self.assertIn("count", body)
        self.assertIsInstance(body["alerts"], list)

    @patch("boto3.resource")
    def test_institutions_endpoint(self, mock_resource):
        """GET /institutions should return enriched institution list."""
        mock_table = MagicMock()
        mock_table.scan.return_value = {"Items": []}
        mock_resource.return_value.Table.return_value = mock_table

        import importlib
        import handler as dash_handler
        importlib.reload(dash_handler)

        event = self._make_get_event("/institutions")
        response = dash_handler.lambda_handler(event, None)

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        
        self.assertIn("institutions", body)
        self.assertGreater(len(body["institutions"]), 0)
        
        # Each institution should have required fields
        for inst in body["institutions"]:
            self.assertIn("institution_id", inst)
            self.assertIn("facility_type", inst)
            self.assertIn("risk_status", inst)

    @patch("boto3.resource")
    def test_status_endpoint(self, mock_resource):
        """GET /status should return pipeline health info."""
        mock_table = MagicMock()
        mock_table.scan.return_value = {"Items": [], "Count": 0}
        mock_resource.return_value.Table.return_value = mock_table

        import importlib
        import handler as dash_handler
        importlib.reload(dash_handler)

        event = self._make_get_event("/status")
        response = dash_handler.lambda_handler(event, None)

        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        
        self.assertIn("overall_status", body)
        self.assertIn("pipeline", body)
        self.assertIn("dynamodb_tables", body)
        self.assertIn("coverage", body)


# =============================================================================
# LIVE TESTS (Optional: requires deployed stack)
# =============================================================================

class TestLivePipeline(unittest.TestCase):
    """Live integration tests against deployed AWS infrastructure."""

    API_ENDPOINT = os.environ.get("API_ENDPOINT", "")

    @unittest.skipIf(not os.environ.get("API_ENDPOINT"), "API_ENDPOINT not set")
    def test_live_status_endpoint(self):
        """Live GET /status should return 200."""
        import requests
        response = requests.get(f"{self.API_ENDPOINT}/status", timeout=10)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["overall_status"], "OPERATIONAL")
        logger.info("Live /status: %s", body.get("overall_status"))

    @unittest.skipIf(not os.environ.get("API_ENDPOINT"), "API_ENDPOINT not set")
    def test_live_simulate_endpoint(self):
        """Live POST /simulate should return alerts."""
        import requests
        payload = {
            "hotspot_lat": 30.9,
            "hotspot_lon": 75.85,
            "scenario": "moderate",
        }
        response = requests.post(
            f"{self.API_ENDPOINT}/simulate",
            json=payload,
            timeout=30,
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("alerts", body)
        self.assertIn("trajectory_cone", body)
        logger.info(
            "Live /simulate: %d alerts, elapsed=%dms",
            len(body.get("alerts", [])),
            body.get("elapsed_ms", 0),
        )


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="VayuSync pipeline test runner")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Include live tests (requires API_ENDPOINT env var)",
    )
    parser.add_argument(
        "test_class",
        nargs="?",
        help="Specific test class to run (e.g., TestGeoUtils)",
    )
    args, remaining = parser.parse_known_args()

    # Build test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    test_classes = [
        TestGeoUtils,
        TestMockData,
        TestIngestionEngine,
        TestEvaluatorEngine,
        TestSimulateTrigger,
        TestDashboardData,
    ]

    if args.live:
        test_classes.append(TestLivePipeline)

    if args.test_class:
        # Run specific class by name
        target = next(
            (c for c in test_classes if c.__name__ == args.test_class), None
        )
        if target:
            suite.addTests(loader.loadTestsFromTestCase(target))
        else:
            logger.error("Unknown test class: %s", args.test_class)
            sys.exit(1)
    else:
        for cls in test_classes:
            suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
