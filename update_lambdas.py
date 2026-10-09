import os
import zipfile
import boto3

REGION = "ap-south-1"
lambda_client = boto3.client("lambda", region_name=REGION)

MAPPINGS = {
    "VayuSync-DashboardData": "backend/lambdas/dashboard_data",
    "VayuSync-EvaluatorEngine": "backend/lambdas/evaluator_engine",
    "VayuSync-IngestionEngine": "backend/lambdas/ingestion_engine",
    "VayuSync-SimulateTrigger": "backend/lambdas/simulate_trigger",
}

for function_name, folder_path in MAPPINGS.items():
    print(f"Packaging {function_name} from {folder_path}...")
    zip_filename = f"{function_name}.zip"
    
    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(folder_path):
            if "__pycache__" in root:
                continue
            for f in files:
                if f.endswith(".pyc") or f.endswith(".zip"):
                    continue
                file_full = os.path.join(root, f)
                arcname = os.path.relpath(file_full, folder_path)
                z.write(file_full, arcname)
                
    with open(zip_filename, "rb") as f:
        zip_bytes = f.read()
        
    print(f"Deploying {function_name} ({len(zip_bytes)} bytes)...")
    res = lambda_client.update_function_code(
        FunctionName=function_name,
        ZipFile=zip_bytes,
        Publish=True
    )
    print(f"Successfully updated {function_name} -> Version {res['Version']} (State: {res.get('LastUpdateStatus', 'OK')})")
    
    if os.path.exists(zip_filename):
        os.remove(zip_filename)

print("All Lambdas deployed successfully with sign fix!")
