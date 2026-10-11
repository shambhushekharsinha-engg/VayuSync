#!/usr/bin/env python3
"""Update deployed VayuSync Lambda functions (code + env vars) in ap-south-1."""
import os
import time
import zipfile
import boto3

lmb = boto3.client("lambda", region_name="ap-south-1")
mapping = {
    "VayuSync-DashboardData": "backend/lambdas/dashboard_data",
    "VayuSync-EvaluatorEngine": "backend/lambdas/evaluator_engine",
    "VayuSync-SimulateTrigger": "backend/lambdas/simulate_trigger",
    "VayuSync-IngestionEngine": "backend/lambdas/ingestion_engine",
}
shared_dir = "backend/lambdas/shared"
os.makedirs("backtest_data", exist_ok=True)

for fn_name, src_dir in mapping.items():
    zip_path = f"backtest_data/{fn_name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in os.listdir(src_dir):
            if f.endswith(".py"):
                zf.write(os.path.join(src_dir, f), arcname=f)
        for f in os.listdir(shared_dir):
            if f.endswith(".py"):
                zf.write(os.path.join(shared_dir, f), arcname=f)
    with open(zip_path, "rb") as f:
        res = lmb.update_function_code(FunctionName=fn_name, ZipFile=f.read())
        print(f"Updated code for {fn_name}: CodeSize={res['CodeSize']}")

    # Wait until update finishes before updating configuration
    waiter = lmb.get_waiter("function_updated")
    waiter.wait(FunctionName=fn_name)

    cfg = lmb.get_function_configuration(FunctionName=fn_name)
    env_vars = cfg.get("Environment", {}).get("Variables", {})
    env_vars["BEDROCK_MODEL_ID"] = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    env_vars["BEDROCK_REGION"] = "us-east-1"
    if fn_name == "VayuSync-IngestionEngine":
        env_vars["NASA_FIRMS_API_KEY"] = os.environ.get("NASA_FIRMS_API_KEY", "")

    lmb.update_function_configuration(
        FunctionName=fn_name,
        Environment={"Variables": env_vars},
    )
    waiter.wait(FunctionName=fn_name)
    print(f"Updated configuration for {fn_name}: BEDROCK_MODEL_ID={env_vars['BEDROCK_MODEL_ID']}, BEDROCK_REGION={env_vars['BEDROCK_REGION']}")
    os.remove(zip_path)
