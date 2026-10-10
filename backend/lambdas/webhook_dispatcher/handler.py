"""
vayusync.lambdas.webhook_dispatcher.handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Lambda handler for VayuSync-WebhookDispatcher.

Triggered by SNS AlertTopic subscription.

For each SNS message (alert):
1. Parse the alert payload from the SNS record.
2. Look up the institution in DynamoDB to get its webhook_url.
3. POST the structured alert JSON to the webhook endpoint.
4. Log success/failure (no retries at this layer -- SNS handles re-delivery).
"""

import logging
import os
from datetime import datetime, timezone

import boto3
import requests
from botocore.exceptions import ClientError

from mock_data import get_institution_by_id

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s -- %(message)s",
    level=getattr(logging, log_level, logging.INFO),
)
logger = logging.getLogger("vayusync.webhook_dispatcher")

# ── AWS Clients ───────────────────────────────────────────────────────────────
_region = os.environ.get("AWS_REGION", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=_region)

# ── Environment Variables ─────────────────────────────────────────────────────
INSTITUTIONS_TABLE = os.environ.get("INSTITUTIONS_TABLE", "VayuSync_Institutions")

# ── Webhook config ────────────────────────────────────────────────────────────
WEBHOOK_TIMEOUT_SEC = 10
WEBHOOK_USER_AGENT = "VayuSync-WebhookDispatcher/1.0"


def lambda_handler(event, context):
    """
    Process SNS alert messages and dispatch to institution webhooks.

    Parameters
    ----------
    event : dict
        SNS event with one or more Records.
    """
    dispatched = 0
    failed = 0

    for record in event.get("Records", []):
        try:
            sns_message = record.get("Sns", {})
            message_id = sns_message.get("MessageId", "unknown")
            message_body = sns_message.get("Message", "")
            message_attrs = sns_message.get("MessageAttributes", {})

            alert_id = message_attrs.get("alert_id", {}).get("Value", "")
            institution_id = message_attrs.get("institution_id", {}).get("Value", "")

            logger.info(
                "Processing SNS message %s (alert_id=%s, institution_id=%s)",
                message_id, alert_id, institution_id,
            )

            # Look up institution webhook URL
            webhook_url = _get_webhook_url(institution_id)
            if not webhook_url:
                logger.info(
                    "No webhook registered for institution %s -- skipping",
                    institution_id,
                )
                continue

            # Build webhook payload
            payload = {
                "source": "VayuSync",
                "alert_id": alert_id,
                "institution_id": institution_id,
                "sns_message_id": message_id,
                "dispatched_at": datetime.now(timezone.utc).isoformat(),
                "message": message_body,
                "raw_message_attributes": {
                    k: v.get("Value") for k, v in message_attrs.items()
                },
            }

            # POST to webhook
            success = _post_webhook(webhook_url, payload)
            if success:
                dispatched += 1
            else:
                failed += 1

        except Exception as exc:
            logger.error("Failed to process SNS record: %s", exc, exc_info=True)
            failed += 1

    logger.info(
        "WebhookDispatcher complete: %d dispatched, %d failed", dispatched, failed
    )
    return {"dispatched": dispatched, "failed": failed}


def _get_webhook_url(institution_id: str) -> str:
    """Look up the webhook URL for an institution from DynamoDB or mock data."""
    if not institution_id:
        return ""

    try:
        table = dynamodb.Table(INSTITUTIONS_TABLE)
        response = table.get_item(Key={"institution_id": institution_id})
        item = response.get("Item")
        if item:
            return item.get("webhook_url", "") or ""
    except ClientError as exc:
        logger.warning(
            "DynamoDB lookup failed for %s: %s -- trying mock data",
            institution_id, exc.response["Error"]["Message"],
        )

    # Fallback to mock data
    mock_inst = get_institution_by_id(institution_id)
    return (mock_inst or {}).get("webhook_url", "") or ""


def _post_webhook(url: str, payload: dict) -> bool:
    """POST the alert payload to a webhook URL. Returns True on success."""
    try:
        response = requests.post(
            url,
            json=payload,
            timeout=WEBHOOK_TIMEOUT_SEC,
            headers={
                "Content-Type": "application/json",
                "User-Agent": WEBHOOK_USER_AGENT,
                "X-VayuSync-Alert": payload.get("alert_id", ""),
            },
        )
        if response.status_code < 300:
            logger.info("Webhook POST success: %s -> %d", url, response.status_code)
            return True
        else:
            logger.warning(
                "Webhook POST returned %d for %s", response.status_code, url
            )
            return False
    except requests.exceptions.Timeout:
        logger.error("Webhook POST timeout after %ds: %s", WEBHOOK_TIMEOUT_SEC, url)
        return False
    except requests.exceptions.ConnectionError as exc:
        logger.error("Webhook POST connection error to %s: %s", url, exc)
        return False
    except Exception as exc:
        logger.error("Webhook POST unexpected error: %s", exc, exc_info=True)
        return False
