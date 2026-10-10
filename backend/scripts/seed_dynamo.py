"""
VayuSync — DynamoDB Seeder Script
Seeds VayuSync_Institutions table with real Delhi NCR institutions.
Seeds VayuSync_Hotspots with sample hotspot data for immediate demo readiness.

Usage:
    python scripts/seed_dynamo.py                    # Seed to us-east-1
    python scripts/seed_dynamo.py --region ap-south-1
    python scripts/seed_dynamo.py --dry-run          # Preview without writing
    python scripts/seed_dynamo.py --clear            # Clear tables first
"""
import argparse
import json
import sys
import os
import time

# Ensure UTF-8 output encoding on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from decimal import Decimal
from datetime import datetime, timezone

# ─── Path setup ───────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lambdas", "shared"))
from mock_data import MOCK_INSTITUTIONS, MOCK_HOTSPOTS, MOCK_WIND_PROFILES
from geo_utils import calculate_trajectory_cone, latlon_to_geohash, bounding_box_from_cone


def float_to_decimal(obj):
    """Recursively convert floats to Decimal for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [float_to_decimal(i) for i in obj]
    return obj


def seed_institutions(table, dry_run: bool) -> int:
    """Write all institution records to DynamoDB."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Seeding {len(MOCK_INSTITUTIONS)} institutions...")
    count = 0
    
    for inst in MOCK_INSTITUTIONS:
        item = float_to_decimal({**inst})
        # Add geohash for spatial queries
        item["geohash"] = latlon_to_geohash(inst["latitude"], inst["longitude"], precision=6)
        
        if dry_run:
            print(f"  Would write: {inst['institution_id']} — {inst['name']}")
        else:
            try:
                table.put_item(Item=item)
                print(f"  ✅ {inst['institution_id']} — {inst['name']}")
                count += 1
            except Exception as e:
                print(f"  ❌ FAILED {inst['institution_id']}: {e}")
    
    return count


def seed_hotspots(table, dry_run: bool) -> int:
    """Write sample hotspot records with trajectory cones to DynamoDB."""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Seeding {len(MOCK_HOTSPOTS)} hotspots...")
    count = 0
    
    u = MOCK_WIND_PROFILES["punjab"]["u_wind_ms"]
    v = MOCK_WIND_PROFILES["punjab"]["v_wind_ms"]
    
    for hs in MOCK_HOTSPOTS:
        lat, lon = hs["latitude"], hs["longitude"]
        frp = hs.get("frp", hs.get("fire_radiative_power_mw", 1000.0))
        
        # Calculate trajectory cones
        cone_6h = calculate_trajectory_cone(lat, lon, u, v, frp, hours=6)
        cone_12h = calculate_trajectory_cone(lat, lon, u, v, frp, hours=12)
        cone_6h["properties"]["hotspot_id"] = hs["hotspot_id"]
        cone_12h["properties"]["hotspot_id"] = hs["hotspot_id"]
        
        bbox_6h = bounding_box_from_cone(cone_6h)
        geohash = latlon_to_geohash(lat, lon, precision=6)
        
        item = float_to_decimal({
            "hotspot_id": hs["hotspot_id"],
            "timestamp": hs.get("scan_time_utc", datetime.now(timezone.utc).isoformat()),
            "latitude": str(lat),
            "longitude": str(lon),
            "geohash": geohash,
            "district": hs.get("district", "Unknown"),
            "state": hs.get("state", "Unknown"),
            "fire_radiative_power_mw": str(frp),
            "confidence": hs.get("confidence", "nominal"),
            "satellite": hs.get("satellite", "VIIRS_SNPP"),
            "trajectory_6h": json.dumps(cone_6h),
            "trajectory_12h": json.dumps(cone_12h),
            "bbox_6h": json.dumps(bbox_6h),
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE",
            "ttl": int(time.time()) + (48 * 3600),
        })
        
        if dry_run:
            print(f"  Would write: {hs['hotspot_id']} — {hs.get('district')}, {hs.get('state')} ({frp}MW)")
        else:
            try:
                table.put_item(Item=item)
                print(f"  ✅ {hs['hotspot_id']} — {hs.get('district')}, {hs.get('state')} ({frp}MW)")
                count += 1
            except Exception as e:
                print(f"  ❌ FAILED {hs['hotspot_id']}: {e}")
    
    return count


def clear_table(table, dry_run: bool):
    """Delete all items from a table (for reset before re-seeding)."""
    if dry_run:
        print(f"  [DRY RUN] Would clear table: {table.name}")
        return
    
    print(f"  Scanning {table.name} for items to delete...")
    scan = table.scan(ProjectionExpression="hotspot_id, #ts, institution_id, alert_id",
                      ExpressionAttributeNames={"#ts": "timestamp"})
    
    deleted = 0
    with table.batch_writer() as batch:
        for item in scan.get("Items", []):
            key = {}
            for k in ("hotspot_id", "institution_id", "alert_id"):
                if k in item:
                    key[k] = item[k]
                    break
            if "timestamp" in item:
                key["timestamp"] = item["timestamp"]
            if key:
                batch.delete_item(Key=key)
                deleted += 1
    
    print(f"  Deleted {deleted} items from {table.name}")


def main():
    parser = argparse.ArgumentParser(description="VayuSync DynamoDB Seeder")
    parser.add_argument("--region", default="us-east-1", help="AWS region")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--clear", action="store_true", help="Clear tables before seeding")
    args = parser.parse_args()

    print("=" * 60)
    print("🌬️  VayuSync DynamoDB Seeder")
    print(f"   Region: {args.region}")
    print(f"   Dry Run: {args.dry_run}")
    print(f"   Clear First: {args.clear}")
    print("=" * 60)

    import boto3
    dynamodb = boto3.resource("dynamodb", region_name=args.region)

    # Table references
    institutions_table = dynamodb.Table("VayuSync_Institutions")
    hotspots_table = dynamodb.Table("VayuSync_Hotspots")

    # Clear tables if requested
    if args.clear:
        print("\nClearing tables...")
        clear_table(institutions_table, args.dry_run)
        clear_table(hotspots_table, args.dry_run)

    # Seed institutions
    inst_count = seed_institutions(institutions_table, args.dry_run)

    # Seed hotspots
    hs_count = seed_hotspots(hotspots_table, args.dry_run)

    print("\n" + "=" * 60)
    if args.dry_run:
        print(f"[DRY RUN] Would seed: {len(MOCK_INSTITUTIONS)} institutions, {len(MOCK_HOTSPOTS)} hotspots")
    else:
        print(f"✅ Seeded: {inst_count} institutions, {hs_count} hotspots")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Start the frontend: cd frontend && npm run dev")
    print("  2. Test the simulate endpoint:")
    print('     curl -X POST $API_URL/simulate -H "Content-Type: application/json" -d "{}"')


if __name__ == "__main__":
    main()
