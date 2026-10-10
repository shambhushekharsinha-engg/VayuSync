"""
Smoke test suite ensuring all Lambda handler modules can be imported cleanly
without missing dependencies, NameErrors, or syntax issues.
"""

import importlib
import os
import sys
import unittest
import io
from pyflakes.api import checkPath
from pyflakes.reporter import Reporter

# Stub AWS and external dependencies if running in minimal CI environment
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
os.environ["AWS_REGION"] = "ap-south-1"
os.environ["HOTSPOTS_TABLE"] = "VayuSync_Hotspots"
os.environ["INSTITUTIONS_TABLE"] = "VayuSync_Institutions"
os.environ["ALERT_LOGS_TABLE"] = "VayuSync_AlertLogs"
os.environ["SNS_TOPIC_ARN"] = "arn:aws:sns:ap-south-1:123456789012:VayuSync-AlertTopic"
os.environ["EVALUATOR_FUNCTION_NAME"] = "VayuSync-EvaluatorEngine"


class TestLambdaHandlersSmoke(unittest.TestCase):
    """Smoke test each handler module."""

    def setUp(self):
        self.root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.lambdas_dir = os.path.join(self.root, "lambdas")

    def test_import_dashboard_data_handler(self):
        sys.path.insert(0, os.path.join(self.lambdas_dir, "dashboard_data"))
        sys.path.insert(0, os.path.join(self.lambdas_dir, "shared"))
        try:
            mod = importlib.import_module("handler")
            self.assertTrue(hasattr(mod, "lambda_handler"))
            self.assertTrue(callable(getattr(mod, "lambda_handler")))
        finally:
            sys.modules.pop("handler", None)
            sys.path.pop(0)
            sys.path.pop(0)

    def test_import_evaluator_engine_handler(self):
        sys.path.insert(0, os.path.join(self.lambdas_dir, "evaluator_engine"))
        sys.path.insert(0, os.path.join(self.lambdas_dir, "shared"))
        try:
            mod = importlib.import_module("handler")
            self.assertTrue(hasattr(mod, "lambda_handler"))
            self.assertTrue(callable(getattr(mod, "lambda_handler")))
            # Verify math functions are available in the module namespace
            self.assertTrue(hasattr(mod, "math"))
        finally:
            sys.modules.pop("handler", None)
            sys.path.pop(0)
            sys.path.pop(0)

    def test_import_ingestion_engine_handler(self):
        sys.path.insert(0, os.path.join(self.lambdas_dir, "ingestion_engine"))
        sys.path.insert(0, os.path.join(self.lambdas_dir, "shared"))
        try:
            mod = importlib.import_module("handler")
            self.assertTrue(hasattr(mod, "lambda_handler"))
            self.assertTrue(callable(getattr(mod, "lambda_handler")))
        finally:
            sys.modules.pop("handler", None)
            sys.path.pop(0)
            sys.path.pop(0)

    def test_import_simulate_trigger_handler(self):
        sys.path.insert(0, os.path.join(self.lambdas_dir, "simulate_trigger"))
        sys.path.insert(0, os.path.join(self.lambdas_dir, "shared"))
        try:
            mod = importlib.import_module("handler")
            self.assertTrue(hasattr(mod, "lambda_handler"))
            self.assertTrue(callable(getattr(mod, "lambda_handler")))
        finally:
            sys.modules.pop("handler", None)
            sys.path.pop(0)
            sys.path.pop(0)

    def test_import_webhook_dispatcher_handler(self):
        sys.path.insert(0, os.path.join(self.lambdas_dir, "webhook_dispatcher"))
        sys.path.insert(0, os.path.join(self.lambdas_dir, "shared"))
        try:
            mod = importlib.import_module("handler")
            self.assertTrue(hasattr(mod, "lambda_handler"))
            self.assertTrue(callable(getattr(mod, "lambda_handler")))
        finally:
            sys.modules.pop("handler", None)
            sys.path.pop(0)
            sys.path.pop(0)

    def test_pyflakes_no_undefined_names(self):
        """Run pyflakes on all backend/lambdas files to verify 0 undefined names / syntax errors."""
        warnings_buf = io.StringIO()
        errors_buf = io.StringIO()
        reporter = Reporter(warnings_buf, errors_buf)

        undefined_or_syntax_errors = []
        for root, _, files in os.walk(self.lambdas_dir):
            for file in files:
                if file.endswith(".py"):
                    file_path = os.path.join(root, file)
                    w_buf = io.StringIO()
                    e_buf = io.StringIO()
                    rep = Reporter(w_buf, e_buf)
                    checkPath(file_path, reporter=rep)
                    
                    err_out = e_buf.getvalue()
                    warn_out = w_buf.getvalue()
                    for line in (err_out + warn_out).splitlines():
                        if "undefined name" in line.lower() or "syntaxerror" in line.lower():
                            undefined_or_syntax_errors.append(f"{file}: {line}")

        self.assertEqual(
            len(undefined_or_syntax_errors),
            0,
            f"Found undefined names or syntax errors in lambdas:\n" + "\n".join(undefined_or_syntax_errors),
        )


if __name__ == "__main__":
    unittest.main()
