# Master AWS Hackathon & Production Architecture Rules
## VayuSync Post-Mortem & Unified Engineering Blueprint

This document synthesizes the lessons learned, judge evaluation scorecards (Bharat Builds 2026), and technical code audits across project trackers (`VayuSync_review_tracker_v1` through `v7`). These rules are permanently applied to all upcoming AWS projects.

---

## 1. Hackathon Scoring Rubric Mastery (Target: 30 / 30)

| Rubric Area | Max | Typical Pitfalls Observed | Non-Negotiable Requirements for 100% Score |
|---|---|---|---|
| **AWS Usage** | 10 | Superficial service usage, fictitious model IDs, failing to explain serverless choices, or claiming Bedrock when it's offline. | • Architect deeply integrated serverless pipelines (Lambda, EventBridge, DynamoDB, Bedrock, SNS, S3, Amplify).<br>• Provide an interactive "AWS Architecture & Pipeline Inspector" modal directly in the UI.<br>• Never fake service executions or hardcode latency breakdowns. |
| **Idea & Impact** | 8 | Reactive tools (e.g. standard AQI trackers) rather than preemptive automation. | • Shift paradigms from *reactive reporting* to *preemptive automation* (e.g. automated institutional warnings 6–12h in advance).<br>• Provide real quantifiable ROI figures (avoided hospitalizations, school closures, workforce hours saved). |
| **Execution** | 4 | Silent exceptions (e.g. missing `import math` hidden by broad try-catch), demo presets missing target geofences. | • Automated linting (`pyflakes` / `tsc`) in test pipelines.<br>• Mathematically verified presets: ensure simulated vectors physically intersect targets within the evaluation window. |
| **Demo Video & Flow** | 4 | Long-winded setup, waiting > 10 seconds for results, or failed demo clicks. | • Implement a sub-3-second synchronous demo endpoint (`/simulate`).<br>• Prominent 1-click "Run Live Demo" button directly on the primary canvas. |
| **Design & Usability** | 4 | Cognitive overload from 7+ tabs, terminal traces, and dense sidebars ("The dashboard is very complex"). | • **Dual-Mode UX**: Executive Summary Mode by default, Tactical Ops Cockpit for deep technical drill-downs.<br>• 100% responsive across mobile (375px+) and desktop (1080p+). |

---

## 2. The "Never Fake AI" Rule (Honest Attribution & Zero Deception)
- **Zero Deception Guarantee**: Never label deterministic heuristics, rule matrices, or fallback mocks as "AI Generated", "Claude 3 Advisory", or "Bedrock Intelligence". Judges inspect network logs, code branches, and Lambda traces.
- **Dynamic Attribution Badging**: Every recommendation, advisory, or inference must carry an explicit dynamic engine badge:
  - When Bedrock executes: `🤖 Amazon Bedrock (Claude 3.5 Haiku) · Latency: XXX ms`
  - When Fallback executes: `⚡ Deterministic Rule Matrix Failover · Sub-50ms SLA`
- **The Raw Inspector Pattern**: Always provide an interactive "Inspect Engine & Raw Payloads" modal with two tabs:
  1. *Action Protocol & Smartphone Preview* (Lockscreen preview, text-to-speech, test SNS dispatch).
  2. *Engine Architecture & Raw Payloads* (Input prompt context, raw JSON completion, latency, and failover trigger reasoning).
- **Dual-Tier Resiliency Pattern**: Turn fallback into an architectural highlight: *"In high-consequence public health/emergency alerting, relying solely on an external LLM is an anti-pattern (cold starts, throttling, regional outages). VayuSync pairs Amazon Bedrock with a sub-50ms deterministic safety net to guarantee 100% dispatch continuity."*

---

## 3. The "30-Second Executive Rule" (Dual-Mode UX Architecture)
- **The Problem**: Evaluators spend 30–60 seconds on initial inspection. A dashboard with 7+ tabs, DEFCON triggers, and terminal logs causes cognitive overload ("The dashboard is very complex").
- **The Solution: Dual-Mode Architecture**:
  - **Executive Summary Mode (Default)**:
    - 1 prominent threat/status banner with top 3 key figures (e.g. Peak PM2.5, advance lead time, facilities protected).
    - Clean geospatial or focal visual canvas.
    - Top 3 prioritized actionable facility cards with immediate directives.
    - Single, prominent "Run Live Demo (< 3s)" action button.
  - **Tactical Ops Cockpit Mode (Deep Dive)**:
    - Complete multi-module engineering cockpit (routing, IoT sensor mesh, dispersion analytics, live logs, audio synthesizers).
    - Clear 1-click toggle in the top header to transition between Executive and Tactical modes.

---

## 4. Frontend Honesty & Data Integrity (Action Items from Review Trackers)
- **`is_illustrative` Badging**: When live feeds (Open-Meteo, NASA FIRMS, sensor APIs) are unreachable or in demo mode, explicitly badge data as `ILLUSTRATIVE` or `ESTIMATED`. Never display static mock constants as live data.
- **No Hardcoded Magic Constants**: Never hardcode wind vectors (`315° NW`), speeds (`46.8 km/h`), or timestamps. Always derive values dynamically from props or telemetry (`degreesToCardinal(directionDeg)`).
- **Physical Calibration**: Ensure physical consistency across simulation models, API mocks, and UI displays (e.g. boundary layer wind transport speeds calibrated to realistic 15–26 km/h).
- **Latency Claims**: Never publish unverified latency figures or fabricated p95/median values in READMEs or presentations. Specify the exact test sample size (e.g. `N=30`) or explicitly label as benchmark estimates.

---

## 5. Bedrock Model Hygiene & Cross-Region Inference
- Never use fictitious, unsupported, or retired model IDs. Verify against AWS Bedrock documentation:
  - `us.anthropic.claude-3-5-haiku-20241022-v1:0` (Cross-Region Profile)
  - `us.anthropic.claude-3-haiku-20240307-v1:0` (Cross-Region Profile)
  - `anthropic.claude-3-haiku-20240307-v1:0` (Direct Regional Model)
  - `amazon.nova-micro-v1:0` (Ultra-low latency alternative)
- Implement sequential model retry loops with exponential backoff before triggering deterministic failover.
- Always configure Bedrock model IDs and regions via environment variables (`BEDROCK_MODEL_ID`, `BEDROCK_REGION`) rather than hardcoding in Lambda handlers.

---

## 6. AWS Security, IAM & CI/CD Discipline
- **Zero Root Credential Usage**: Never run CLI commands, Lambda deployments, or agents with AWS root credentials. Use least-privilege IAM roles.
- **Pre-Packaging Verification**: Always run linter/syntax checks (`pyflakes`, `flake8`, `tsc`) before bundling Lambda layers or deploying frontend builds to catch subtle missing imports (e.g. `import math`).
- **Clean Git Repository**: Never commit AWS secret keys, access tokens, temporary zip artifacts, or raw credentials to git.
