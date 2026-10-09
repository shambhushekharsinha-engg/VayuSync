import os
import zipfile
import boto3

AMPLIFY_APP_ID = "d38reumk2s9v29"
BRANCH_NAME = "main"
REGION = "ap-south-1"
DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
ZIP_PATH = os.path.join(os.path.dirname(__file__), "dist_python.zip")

print(f"Creating clean POSIX zip package from {DIST_DIR}...")
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)

with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(DIST_DIR):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, DIST_DIR).replace('\\', '/')
            z.write(full_path, rel_path)

print(f"Zip package created ({os.path.getsize(ZIP_PATH)} bytes).")

amplify = boto3.client('amplify', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)

print(f"Syncing files directly to S3 static website bucket (vayusync-dashboard-946877383361)...")
S3_BUCKET = "vayusync-dashboard-946877383361"
import mimetypes

for root, dirs, files in os.walk(DIST_DIR):
    for f in files:
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, DIST_DIR).replace('\\', '/')
        content_type, _ = mimetypes.guess_type(full_path)
        if not content_type:
            content_type = 'application/octet-stream'
        s3.upload_file(
            full_path,
            S3_BUCKET,
            rel_path,
            ExtraArgs={'ContentType': content_type}
        )
print("S3 website bucket synced successfully.")

print(f"Creating deployment on AWS Amplify ({AMPLIFY_APP_ID} / {BRANCH_NAME})...")
deploy_res = amplify.create_deployment(appId=AMPLIFY_APP_ID, branchName=BRANCH_NAME)
job_id = deploy_res['jobId']
upload_url = deploy_res['zipUploadUrl']
print(f"Deployment Job ID: {job_id}")

print("Uploading zip payload to Amplify upload URL...")
import urllib.request
with open(ZIP_PATH, 'rb') as f:
    zip_bytes = f.read()

req = urllib.request.Request(upload_url, data=zip_bytes, method='PUT')
req.add_header('Content-Type', 'application/zip')
with urllib.request.urlopen(req) as resp:
    print(f"Upload completed with HTTP status: {resp.status}")

print("Triggering Amplify deployment execution...")
start_res = amplify.start_deployment(
    appId=AMPLIFY_APP_ID,
    branchName=BRANCH_NAME,
    jobId=job_id
)
print("Amplify deployment started successfully!")
print("Live URL: https://main.d38reumk2s9v29.amplifyapp.com")
