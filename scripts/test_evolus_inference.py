#!/usr/bin/env python3
"""
scripts/test_evolus_inference.py

Verification script for Evolus AI Platform (https://app.evolus.ai/).
Validates authenticated inference using:
  - Header: X-ApiKey
  - Header: X-Application-Id
  - Model: gemma4 31B-it
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error

# Default credentials from project configuration
DEFAULT_BASE_URL = "https://app.evolus.ai"
DEFAULT_API_KEY = "evo_zYDd77Do1fEMhMlvqGb9532m9x8BFFZJ6ugwbgVD"
DEFAULT_APP_ID = "1367d57b-6200-4565-bb7f-255056523368"
DEFAULT_MODEL = "gemma4 31B-it"

def load_env_file():
    """Simple parser for .env file if python-dotenv is not installed."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())

def main():
    load_env_file()

    base_url = os.environ.get("EVOLUS_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    api_key = os.environ.get("EVOLUS_API_KEY", DEFAULT_API_KEY)
    app_id = os.environ.get("EVOLUS_APPLICATION_ID", DEFAULT_APP_ID)
    model = os.environ.get("EVOLUS_MODEL", DEFAULT_MODEL)

    print("=" * 60)
    print("Evolus AI Platform Verification Runbook")
    print("=" * 60)
    print(f"Base URL        : {base_url}")
    print(f"Application ID  : {app_id}")
    print(f"API Key         : {api_key[:6]}...{api_key[-4:]}")
    print(f"Model Checkpoint: {model}")
    print("-" * 60)

    headers = {
        "X-ApiKey": api_key,
        "X-Application-Id": app_id,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    test_prompt = (
        "Analyze shipment SHP-101. Milestone WH_DISPATCH is overdue by 3.5 hours. "
        "Packing list indicates 310kg, invoice indicates 250kg. "
        "Diagnose the root cause and provide structured output with issue_type, root_cause, risk_level."
    )

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the Lead Logistics Exception Diagnosis Agent running on Evolus AI. "
                    "Respond in valid JSON with fields: issue_type, root_cause, evidence, risk_level, recommended_action."
                )
            },
            {
                "role": "user",
                "content": test_prompt
            }
        ],
        "temperature": 0.1,
        "max_tokens": 512,
        "response_format": {"type": "json_object"}
    }

    endpoint_candidates = [
        f"{base_url}/api/v1/chat/completions",
        f"{base_url}/v1/chat/completions",
        f"{base_url}/api/chat/completions"
    ]

    success = False
    for endpoint in endpoint_candidates:
        print(f"\nAttempting inference via endpoint: {endpoint}")
        start_time = time.time()
        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(endpoint, data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as resp:
                elapsed = time.time() - start_time
                status_code = resp.status
                body = resp.read().decode("utf-8")
                print(f"[SUCCESS] HTTP {status_code} in {elapsed:.2f} seconds")
                try:
                    parsed = json.loads(body)
                    print("\nResponse Body:")
                    print(json.dumps(parsed, indent=2))
                except Exception:
                    print(f"Raw Response: {body[:300]}")
                success = True
                break
        except urllib.error.HTTPError as e:
            elapsed = time.time() - start_time
            print(f"[HTTP {e.code}] Error: {e.reason} (in {elapsed:.2f}s)")
            error_body = e.read().decode("utf-8", errors="replace")
            print(f"Error Details: {error_body[:300]}")
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"[ERROR] Connection failed: {e} (in {elapsed:.2f}s)")

    print("-" * 60)
    if success:
        print("Status: Evolus AI endpoint verified successfully.")
    else:
        print("Status: Endpoint connection attempted. Confirm specific route mapping in Evolus project settings.")
    print("=" * 60)

if __name__ == "__main__":
    main()
