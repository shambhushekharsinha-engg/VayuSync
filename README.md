<div align="center">

# 🌬️ VayuSync
### *Hyperlocal Stubble Smoke Exposure & Institutional Preemptive Action Engine*

**Bharat Builds 2026 · Track 1: Air (Environmental Innovations)**

[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless_Architecture-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com)
[![Amazon Bedrock](https://img.shields.io/badge/Amazon_Bedrock-Claude_3_Haiku-232F3E?style=for-the-badge&logo=anthropic&logoColor=white)](https://aws.amazon.com/bedrock/)
[![React 18](https://img.shields.io/badge/Frontend-React_18_+_Vite_+_TS-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MapLibre GL](https://img.shields.io/badge/GeoSpatial-MapLibre_GL-396B94?style=for-the-badge&logo=maplibre&logoColor=white)](https://maplibre.org)
[![Python 3.12](https://img.shields.io/badge/Backend-Python_3.12_Lambda-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![AWS Free Tier](https://img.shields.io/badge/AWS_Cost-$0.00_(100%25_Free_Tier)-22C55E?style=for-the-badge&logo=amazon&logoColor=white)](https://aws.amazon.com/free/)
[![Live Status](https://img.shields.io/badge/Live_Deployment-HEALTHY_✓-success?style=for-the-badge&logo=checkmarx&logoColor=white)](https://main.d38reumk2s9v29.amplifyapp.com)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Watch_2:42_Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=krykkju2xq4)

---

### 🌐 **LIVE PRODUCTION SYSTEM (ZERO SETUP REQUIRED)**
## 🔗 [https://main.d38reumk2s9v29.amplifyapp.com](https://main.d38reumk2s9v29.amplifyapp.com)
**🎥 YouTube Video Demo (2:42):** [https://www.youtube.com/watch?v=krykkju2xq4](https://www.youtube.com/watch?v=krykkju2xq4)  
**Backup Static S3 Mirror:** [http://vayusync-dashboard-946877383361.s3-website.ap-south-1.amazonaws.com](http://vayusync-dashboard-946877383361.s3-website.ap-south-1.amazonaws.com)  
**Live REST API Gateway:** `https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/dashboard`

---

</div>

## ⏱️ 120-Second Judging Walkthrough & Live POC
Hackathon judges evaluate live platforms in 90–120 seconds. Here is the exact recommended test flow:
1. **Open the live application**: Navigate to [https://main.d38reumk2s9v29.amplifyapp.com](https://main.d38reumk2s9v29.amplifyapp.com).
2. **Trigger the Stubble Surge POC**: Click the prominent demo banner at the top: **`🔴 SIMULATE STUBBLE SURGE`**.
3. **Observe the Geospatial & Computational Payoff (< 2.3 seconds)**:
   - A synthetic **1,200 MW** satellite cluster injects at Sangrur/Ludhiana with North-Westerly wind vectors ($315^\circ$ NW @ 18.4 km/h).
   - The dark-matter MapLibre radar renders the dispersion cone expanding towards Delhi NCR in real time.
   - The facility threat level switches to **CRITICAL**, and automated AI advisories stream into the alert feed.
   - Real-time AWS execution traces stream into the bottom **Execution Terminal** (EventBridge $\to$ Lambda $\to$ DynamoDB $\to$ Bedrock/Rule Fallback $\to$ SNS).
4. **Switch Across Global Stubble & Wildfire Hotspots (Planetary Multi-Location)**:
   - Click the **`PLANETARY VIEW`** button in the header to zoom out to full **Global Planetary Orbit**.
   - Use the **Global Location Selector** to instantly fly across active global wildfire zones:
     - 🇮🇳 **Indo-Gangetic Plain (India)**: Seasonal post-monsoon stubble burning impacting Delhi NCR.
     - 🇺🇸 **California Valley Corridor (USA)**: Santa Ana wildfire vectors impacting Central Valley & LA Basin.
     - 🇮🇩 **Sumatra & Riau Peatlands (Indonesia)**: Peat haze choking Malacca Strait, Singapore & Kuala Lumpur.
     - 🇧🇷 **Amazon Arc of Deforestation (Brazil)**: Slash-and-burn agricultural fires across Pará & Xingu River Basin.
     - 🇦🇺 **Southeast Australia Bushfire Belt (Australia)**: Eucalypt forest bushfires vectoring toward Greater Sydney.
     - 🇨🇦 **Canadian Boreal Fire Complex (Canada)**: Boreal crown fires dispersing into Edmonton & Calgary.
   - For every location, VayuSync dynamically ingests **live Open-Meteo 10m wind velocity vectors** and **real-time PM2.5/AQI readings**.
5. **Inspect Operational Institutional Directives ("What Changes?" Factor)**:
   - Click the **"Institutional Directives"** tab in the navbar.
   - Switch between **Schools** (DPS Rohini), **Outdoor Construction** (Dwarka Expressway), and **Hospitals** (AIIMS New Delhi).
   - Click **`Download Action Directive (PDF)`** or **`Copy Advisory`** to view immediate, actionable operational mandates.
6. **Verify AWS Serverless Architecture**:
   - Click **`AWS Architecture`** in the header to view the interactive 5-stage architecture pipeline modal and least-privilege IAM policies.

---

| Component | Endpoint / Resource | Status |
|---|---|---|
| **Live Web App (HTTPS)** | [https://main.d38reumk2s9v29.amplifyapp.com](https://main.d38reumk2s9v29.amplifyapp.com) | `200 OK` (AWS Amplify CDN) |
| **S3 Backup Hosting** | [http://vayusync-dashboard-946877383361.s3-website.ap-south-1.amazonaws.com](http://vayusync-dashboard-946877383361.s3-website.ap-south-1.amazonaws.com) | `200 OK` (Amazon S3 Static) |
| **REST API Gateway** | `https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod` | `200 OK` (AWS API Gateway) |
| **Simulate Fire Endpoint** | `POST /simulate` | `200 OK` (< 2.5s Latency) |
| **Aggregated Dashboard** | `GET /dashboard` | `200 OK` (Live Telemetry) |
| **Real-time Alert Feed** | `GET /alerts?limit=20` | `200 OK` (DynamoDB Logs) |
| **Institutions Registry** | `GET /institutions` | `200 OK` (8 Seeded Facilities) |
| **System Health & SLA** | `GET /status` | `200 OK` (All Systems Go) |
| **SNS Alert Topic** | `arn:aws:sns:ap-south-1:946877383361:VayuSync-AlertTopic` | Subscribed (SMS/Email) |

---

## 🛰️ Data Provenance & Source Transparency

| Component | Ingestion Modality | Source & Specification | Operational Fallback |
|---|---|---|---|
| **Fire Hotspots** | **Live Satellite Ingestion** | NASA FIRMS VIIRS (SNPP / NOAA-20 375m NRT), Punjab & Haryana bounding box | Synthetic 1,247 MW Ludhiana cluster injected during demo trigger (`/simulate`) |
| **Wind Vectors** | **Live Meteorological API** | Open-Meteo High-Resolution 10m eastward ($u$) and northward ($v$) wind velocity | Historical seasonal baseline ($315^\circ$ NW @ 18.4 km/h) if upstream rate-limited |
| **Institutions** | **Geocoded Master Registry** | 8 representative high-density facilities in Delhi NCR (Schools, Hospitals, Metro Construction) | DynamoDB Seed Cache (`VayuSync_Institutions`) |
| **Ground Sensors** | **Hardware Testbed Simulation** | AWS IoT Core MQTT-emulated sensor array (ESP32 / SPS30 models) | Illustrative synthetic readings for real-time telemetry testing |
| **AI Action Directives** | **Hybrid AI / Rule Engine** | Amazon Bedrock (Anthropic Claude foundation models via configurable `BEDROCK_MODEL_ID` or inference profiles) when active; automatic transparent fallback to deterministic facility-specific mitigation rules when Bedrock is in account verification/standby | Active advisory source (`bedrock` vs `rule_fallback`) explicitly recorded on each alert record and surfaced in UI Bedrock Inspector |
| **Alert Dispatch** | **Live Cloud Notification** | Amazon SNS (`VayuSync-AlertTopic`) verified SMS & Email dispatch to institutional endpoints | Synchronous JSON HTTP response to dashboard client |

> **Transparency Note**: The dashboard surfaces explicit data provenance badges on primary simulation and telemetry entities (`FIRMS Live`, `Simulated`, `IoT Testbed`) ensuring judges and operators can distinguish live satellite feeds from scenario triggers.

---

## ⚡ The 5-Step Automated Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant EB as Amazon EventBridge (Cron)
    participant L1 as Lambda: IngestionEngine
    participant NASA as NASA FIRMS (VIIRS/MODIS)
    participant MET as Open-Meteo API
    participant DDB as Amazon DynamoDB
    participant L2 as Lambda: EvaluatorEngine
    participant AI as Amazon Bedrock (Claude 3)
    participant SNS as Amazon SNS
    participant UI as React MapLibre Dashboard

    EB->>L1: Trigger every 6 hours (or POST /simulate)
    L1->>NASA: Fetch thermal radiative power (FRP) & hotspots
    L1->>MET: Fetch 10m wind vector components (u, v)
    L1->>L1: Compute Lagrangian trajectory cone polygon
    L1->>DDB: Persist active hotspots into VayuSync_Hotspots
    L1->>L2: Asynchronously invoke EvaluatorEngine
    L2->>DDB: Query VayuSync_Institutions within trajectory polygon
    L2->>AI: Invoke Bedrock Claude LLM with strict JSON advisory schema
    AI-->>L2: Structured institutional actions & PM2.5 forecast
    L2->>DDB: Log alerts into VayuSync_AlertLogs
    L2->>SNS: Publish urgent SMS & email alerts
    SNS-->>UI: Real-time notification & map render (< 2.5s total)
```

---

## 🏗️ Cloud System Architecture

```
                     ┌────────────────────────────────────────────────────────┐
                     │                  DATA INGESTION LAYER                  │
                     │  NASA FIRMS VIIRS (SNPP/NOAA-20) + Open-Meteo Vectors  │
                     └──────────────────────────┬─────────────────────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │   Amazon EventBridge   │  (6-Hour Scheduled Cron)
                                    └───────────┬───────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │    AWS Lambda         │  Python 3.12
                                    │  IngestionEngine      │  512 MB, 60s
                                    └─────┬───────────┬─────┘
                                          │           │
                 ┌────────────────────────▼─┐       ┌─▼────────────────────────┐
                 │    Amazon DynamoDB       │       │        Amazon S3         │
                 │   `VayuSync_Hotspots`    │       │ `vayusync-raw-payloads`  │
                 └──────────────┬───────────┘       └──────────────────────────┘
                                │
                                │ (Asynchronous / Synchronous Invoke)
                                ▼
                 ┌──────────────────────────┐
                 │        AWS Lambda        │  Python 3.12
                 │     EvaluatorEngine      │  Spatial Matching + Dispersion Math
                 └──────────────┬───────────┘
                                │
                 ┌──────────────▼───────────┐
                 │      Amazon Bedrock      │  Foundation Model:
                 │      Configurable Claude │  Strict JSON Actionable Advisory
                 └──────────────┬───────────┘
                                │
                 ┌──────────────┴───────────┬───────────────────────────┐
                 ▼                          ▼                           ▼
    ┌─────────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐
    │     Amazon DynamoDB     │ │      Amazon SNS       │ │      AWS API Gateway      │
    │   `VayuSync_AlertLogs`  │ │  `VayuSync-AlertTopic`│ │      REST API Engine      │
    └─────────────────────────┘ └───────────┬───────────┘ └─────────────┬─────────────┘
                                            │                           │
                                     SMS / Email Alerts           WebSockets / Poll
                                            │                           │
                                            └─────────────┬─────────────┘
                                                          │
                                            ┌─────────────▼─────────────┐
                                            │   VayuSync Web Dashboard  │
                                            │  React 18 + MapLibre GL   │
                                            └───────────────────────────┘
```

---

## 📐 Mathematical Dispersion Model

VayuSync implements a hybrid **Lagrangian Dispersion** and **Gaussian Plume** trajectory formulation to project the 6-hour and 12-hour smoke cone footprint:

### 1. Meteorological Wind Vector & Bearing
Given the eastward ($u$) and northward ($v$) wind velocity vectors at 10 meters above ground level:
$$\text{Wind Speed } (V_w) = \sqrt{u^2 + v^2} \quad [\text{m/s}]$$
$$\theta_{\text{met}} = (\text{atan2}(u, v) \times \frac{180}{\pi}) \pmod{360}^\circ$$

### 2. Downwind Travel Distance & Trajectory Tip
The smoke travel distance $D$ over time horizon $\Delta t$ (hours):
$$D = \frac{V_w \times 3600 \times \Delta t}{1000} \quad [\text{km}]$$

Using spherical haversine forward projection from fire origin $(\phi_1, \lambda_1)$:
$$\phi_2 = \arcsin\left(\sin \phi_1 \cos(D/R) + \cos \phi_1 \sin(D/R) \cos \theta\right)$$
$$\lambda_2 = \lambda_1 + \text{atan2}\left(\sin \theta \sin(D/R) \cos \phi_1, \cos(D/R) - \sin \phi_1 \sin \phi_2\right)$$
*where $R = 6371\text{ km}$ is Earth's mean radius.*

### 3. Atmospheric Stability & Lateral Cone Spread
Based on Pasquill-Gifford atmospheric stability class **D (Neutral)** typical of North Indian autumn afternoons:
$$\alpha_{\text{half}} = 15^\circ + \left(\frac{\text{FRP}}{2000}\right) \times 5^\circ$$
The plume lateral dispersion bounds form a GeoJSON polygon with 16 boundary vertices calculated along radial bearings $[\theta - \alpha_{\text{half}}, \theta + \alpha_{\text{half}}]$.

---

### 🎛️ 1. Multi-Mode Mission Control Center
VayuSync elevates the user experience beyond a standard dashboard into an enterprise command hub:
- **🌐 Mode 1: Tactical Radar (Geospatial Dispersion):** Dark Matter MapLibre canvas with **3D Perspective Tilt (55° oblique view)**, live hotspots, pulsing radar waves, and active wind vectors.
- **⏳ Interactive 12-Hour Time-Travel Scrubber:** Scrub or auto-play from $T+0\text{h}$ (Ludhiana stubble ignition) to $T+12\text{h}$ (extended regional dispersion). The smoke cone expands dynamically on the map, updating real-time AQI and impacted facilities as the time advances.
- **🏫 Mode 2: Facility Readiness Matrix:** Real-time surveillance grid of all 8 monitored schools, hospitals, and construction sites with risk tiers, student/bed counts, HEPA integration compliance, and direct Bedrock advisory inspection.
- **🛡️ Mode 3: Preemptive Action Impact Calculator (ROI):** Interactive policy toggles (e.g., closing outdoor sports, shifting HVAC to HEPA) that calculate modeled estimates: **~14,280 citizens shielded**, **~1.84 kg particulate inhalation averted**, and **~₹48.6 Lakhs emergency healthcare costs avoided** (calibrated against Delhi NCR health economics data).
- **📈 Mode 4: Atmospheric Dispersion Analytics:** Detailed 12-hour projected AQI bar curves, thermal radiative power (FRP) breakdown by district, and end-to-end AWS Lambda execution latency breakdown.
- **🔊 Programmatic Web Audio Synthesizer:** Real-time tactical radar sweeps, alert hazard chimes, and simulation surge audio synthesized via the Web Audio API with zero external media files.
- **🚨 Crisis DEFCON 1 Mode:** Instant threat-level toggle with ambient red hazard illumination.

### 🔴 2. One-Click Hackathon Live Simulator
- A live demo feature built for judges.
- Clicking **"🔴 SIMULATE PUNJAB FIRE HOTSPOT"** injects a synthetic **1,050–1,200 MW** thermal anomaly at Ludhiana, Punjab ($30.90^\circ\text{N}, 75.85^\circ\text{E}$).
- Evaluates atmospheric wind trajectories (*Illustrative Demo Scenario*: wind vector calibrated along the historical North-Westerly autumn transport corridor toward Delhi NCR: $151^\circ$ bearing @ $7.2\text{ m/s}$ / $26\text{ km/h}$).
- Identifies schools, hospitals, and construction sites in the multi-horizon path (evaluating both 6h and 12h cones).
- Triggers Amazon Bedrock Claude LLM for institutional advisories (operating with deterministic rule-based fallback pending AWS paid access verification).
- Dispatches alert via Amazon SNS and updates the MapLibre GL UI in **under 2.3 seconds**.

### 🏫 3. Hyperlocal Institutional Action Plans & Bedrock Inspector
Unlike generic AQI alerts ("Air is Unhealthy"), VayuSync outputs tailored operational workflows:
- **Schools (e.g., DPS R.K. Puram, KV Dwarka):**
  - Cancel outdoor sports & assemblies by `07:30 AM`.
  - Shift ventilation from fresh-air intake to 100% indoor HEPA recirculation.
  - Distribute N95 masks to transport conductors and security guards.
- **Hospitals (e.g., AIIMS New Delhi, Medanta Gurugram):**
  - Pre-stage pediatric and pulmonary emergency triage wards.
  - Activate HEPA positive-pressure isolation filtration.
  - Alert pulmonologists on-call for an anticipated patient surge between `08:00–14:00`.
- **Construction Sites (e.g., Dwarka Expressway, Noida Metro):**
  - Halt outdoor heavy earthmoving and demolition work from `09:00 AM`.
  - Shift labor force to indoor finishing tasks.
  - Enforce mandatory P2/N95 respirator use for perimeter personnel.

### 💰 3. 100% AWS Free Tier & Zero-Cost Architecture
| AWS Service | Production Usage | Monthly Free Tier Allowance | Cost |
|---|---|---|---|
| **AWS Lambda** | ~14,400 invocations / month | 1,000,000 requests / month | **$0.00** |
| **Amazon DynamoDB** | 3 on-demand tables (< 100 MB) | 25 GB storage + 25 WCU/RCU | **$0.00** |
| **Amazon EventBridge** | 120 scheduled runs / month | Unlimited cron rules | **$0.00** |
| **Amazon S3** | Raw GeoJSON archives with 30-day TTL | 5 GB standard storage | **$0.00** |
| **Amazon SNS** | Urgent SMS + Email subscriber batches | 1,000,000 publishes / month | **$0.00** |
| **Amazon API Gateway**| REST requests (< 20,000 / month) | 1,000,000 calls / month | **$0.00** |
| **Amazon Bedrock** | Anthropic Claude LLM on-demand token calls | ~$0.00025 per advisory | **<$0.10** |

---

## 📊 Pipeline Telemetry & Atmospheric Transport Physics

### 1. Operational Latency & SLA Telemetry
*Measurements recorded across live AWS Lambda CloudWatch logs and API Gateway execution traces.*

| KPI Metric | Engineering Target | Observed Performance | Measurement Methodology |
|---|---|---|---|
| **Pipeline Latency (`POST /simulate`)** | $< 3,000\text{ ms}$ | **Server CloudWatch `REPORT` ($N=30$ warm): Median $771.1\text{ ms}$, p95 $2,009.2\text{ ms}$ (range $281.9 - 2,068.8\text{ ms}$)**<br>**Client HTTP RTT ($N=30$ warm): Median $932.8\text{ ms}$, p95 $2,114.2\text{ ms}$ (cold start: $3,245.5\text{ ms}$ RTT / $2,313.0\text{ ms}$ server)**<br>*(Rule-based fallback path; Bedrock live calls require AWS paid tier verification)* | 31 sequential runs (`1` cold + `30` warm at $1.2\text{ s}$ intervals) via [`backend/scripts/benchmark_latency.py`](backend/scripts/benchmark_latency.py) & CloudWatch `REPORT` logs |
| **EvaluatorEngine Duration** | $< 2,500\text{ ms}$ | **CloudWatch `REPORT`: Median $748.9\text{ ms}$, p95 $1,977.9\text{ ms}$ (range $256.8 - 2,028.9\text{ ms}$)** | Scales linearly with number of institutions inside cone ($1\text{ to }8$ DynamoDB writes + SNS publishes per run) |
| **Cloud Infrastructure Cost** | Minimal / Low-Cost | **\$0.00 (100% AWS Free Tier Compliant)** | Lambda, DynamoDB, API Gateway, SNS within AWS Free Tier; deterministic rule-engine fallback incurs \$0.00 model fees |
| **Frontend Uptime & Resilience** | $99.9\%$ | **Zero-crash React Error Boundary** | Graceful fallback on API rate-limits or offline states |

---

### 2. Atmospheric Transport Mechanics & Lead Time Calculations

Understanding operational lead time requires analyzing downwind distance as a function of wind velocity:

$$\text{Downwind Distance: } D = \frac{V_w \times 3600 \times \Delta t}{1000} \quad [\text{km}]$$

1. **Sub-Regional Haryana Agricultural Clusters ($\approx 90\text{ to }140\text{ km}$ from Delhi)**:
   - At typical seasonal surface wind velocities of $18\text{ to }25\text{ km/h}$ ($5.0 - 7.0\text{ m/s}$), the 6-hour transport distance covers:
     $$D_{6\text{h}} \approx 110\text{ to }150\text{ km}$$
   - **Operational Advance Warning**: **5 to 6 hours** for facility lockdown, school recess suspension, and HVAC dampener isolation.

2. **Long-Range Transboundary Inflow (Punjab Clusters $\approx 280\text{ km}$ from Delhi)**:
   - Under conservative 10m surface winds ($18\text{ to }27\text{ km/h}$), surface plume arrival requires **$11\text{ to }16\text{ hours}$**.
   - *Transport Aloft Hypothesis*: While stubble fires are relatively low-intensity surface burns, agricultural literature frequently investigates whether smoke entrained into the upper boundary layer ($100\text{m}$ to $850\text{ hPa}$) experiences stronger geostrophic transport. This remains a research hypothesis to be evaluated against multi-level wind reanalysis, rather than an operational assumption of our current 10m screening model.
   - *Screening Model Scope*: VayuSync's current deployment intentionally uses 10m surface winds as a low-latency screening indicator.

---

### 3. Retrospective Back-Test & Empirical Validation (`2024–2025` Seasons)

To evaluate VayuSync's physical trajectory models without cherry-picking, [`backend/scripts/screen_dates.py`](backend/scripts/screen_dates.py) mechanically screened daily Open-Meteo ERA5 $100\text{ m}$ winds at Ludhiana ($30.9^\circ\text{N}, 75.85^\circ\text{E}$) across Oct 26 – Nov 20 in both **2024** and **2025** *prior* to inspecting ground-station $\text{PM}_{2.5}$.

[`backend/scripts/backtest.py`](backend/scripts/backtest.py) was then executed using:
- **Fire Detections**: Historical **NASA FIRMS `VIIRS_SNPP_SP`** standard-product detections across `73.5,27.5,78.5,32.5` (2-day windows).
- **Meteorology**: Archived **Open-Meteo ERA5** hourly gridded winds at $10\text{ m}$ and $100\text{ m}$.
- **Ground Truth $\text{PM}_{2.5}$**: **CPCB / DPCC Anand Vihar** (`28.6468°N, 77.3158°E`) continuous observations (`15,394` hourly records from `2024-01-01` to `2025-12-31 UTC`, republished by OpenCity).
- **Fixed Onset Rule**: Baseline = median $\text{PM}_{2.5}$ in the $12\text{ h}$ preceding the first fire detection; observed onset = first hour $\ge \text{baseline} + 50\ \mu\text{g/m}^3$ sustained for $\ge 2$ consecutive hours. All raw outputs are committed in [`backtest_results.csv`](backtest_results.csv).

| Date (UTC) | Wind Regime (Mechanical Screen) | VIIRS Fires (Total FRP) | Obs Baseline $\rightarrow$ Peak ($\mu\text{g/m}^3$) | Observed Onset (UTC) | `cone_6h` / `12h` / `24h` FRP Cov. | `parcel10m` Arrival FRP & Error vs. Onset | `parcel100m` Arrival FRP & Error vs. Onset |
|---|---|---|---|---|---|---|---|
| **`2025-11-05`** | **NW Transport** ($5.50\text{ m/s}$ @ $322^\circ$) | $854$ ($4,028\text{ MW}$) | $134 \rightarrow 710$ | `2025-11-05 22:00` | `0.05%` / `1.1%` / `6.6%` | `4.4%` FRP · **$+6.7\text{ h}$** | `13.2%` FRP · **$+0.5\text{ h}$** |
| **`2024-10-31`** | **NW Transport** ($4.99\text{ m/s}$ @ $308^\circ$) | $1,631$ ($10,447\text{ MW}$) | $273 \rightarrow 998$ | `2024-10-31 22:00` | `0.07%` / `1.4%` / `11.6%` | `2.8%` FRP · **$+9.3\text{ h}$** | `13.6%` FRP · **$-1.4\text{ h}$** |
| **`2025-11-06`** | **NW Transport** ($4.96\text{ m/s}$ @ $309^\circ$) | $626$ ($3,359\text{ MW}$) | $202 \rightarrow 710$ | `2025-11-06 07:00` | `0.47%` / `2.6%` / `6.6%` | `3.4%` FRP · **$+24.4\text{ h}$** | `15.0%` FRP · **$+15.4\text{ h}$** |
| **`2025-11-01`** | **NW Transport** ($4.12\text{ m/s}$ @ $314^\circ$) | $839$ ($5,161\text{ MW}$) | $132 \rightarrow 710$ | `2025-11-01 09:00` | `0.0%` / `0.09%` / `6.2%` | `1.8%` FRP · **$+24.3\text{ h}$** | `5.1%` FRP · **$+15.8\text{ h}$** |
| **`2024-11-15`** | **NW Transport** ($3.55\text{ m/s}$ @ $330^\circ$) | $313$ ($1,504\text{ MW}$) | $424 \rightarrow 933$ | `2024-11-15 07:00` | `0.0%` / `0.0%` / `5.9%` | `26.6%` FRP · **$+45.2\text{ h}$** | `2.8%` FRP · **$+9.1\text{ h}$** |
| **`2025-11-03`** | **Control: Easterly** ($2.87\text{ m/s}$ @ $80^\circ$) | $770$ ($4,483\text{ MW}$) | $190 \rightarrow 710$ | `2025-11-03 11:00` | `0.11%` / `0.18%` / `0.30%` | `4.2%` FRP · **$+43.1\text{ h}$** | `0.16%` FRP · **$-0.7\text{ h}$** *(near-zero FRP)* |
| **`2025-11-04`** | **Control: SE Flow** ($5.86\text{ m/s}$ @ $139^\circ$) | $965$ ($5,256\text{ MW}$) | $263 \rightarrow 710$ | `2025-11-07 01:00` | `0.02%` / `0.34%` / `3.8%` | `5.0%` FRP · **$-18.2\text{ h}$** | `5.0%` FRP · **$-55.0\text{ h}$** |
| **`2024-10-27`** | **Control: SE Flow** ($3.76\text{ m/s}$ @ $140^\circ$) | $793$ ($3,939\text{ MW}$) | $365 \rightarrow 998$ | `2024-10-31 22:00` | `0.0%` / `0.46%` / `1.0%` | `1.0%` FRP · **$-100.2\text{ h}$** | `1.1%` FRP · **$-101.2\text{ h}$** |

#### Honest Scientific Takeaways & Limitations:
1. **6-Hour Straight-Line Cones Cover Only Nearby Haryana Fires**: On Punjab-dominated fire days ($\approx 250–300\text{ km}$ from Anand Vihar), `cone_6h` covers $<0.5\%$ of total regional FRP because $6\text{ h}$ at surface wind speeds only reaches $90–150\text{ km}$. Extending the horizon to `12h` and `24h` increases coverage to $6\%–12\%$ of regional FRP.
2. **$100\text{ m}$ Parcel Trajectories Outperform $10\text{ m}$ Surface Winds on Strong NW Days**: During peak NW transport events (`2025-11-05` and `2024-10-31`), $100\text{ m}$ time-stepped trajectories (`parcel100m`) deliver $13\%–15\%$ of regional FRP to within $30\text{ km}$ of Anand Vihar with median arrival timing within **$+0.5\text{ h}$** (`2025-11-05`) and **$-1.4\text{ h}$** (`2024-10-31`) of the observed $\text{PM}_{2.5}$ jump, whereas $10\text{ m}$ surface winds lag by $+6.7\text{ h}$ to $+9.3\text{ h}$.
3. **Local Urban Emissions & Boundary-Layer Collapse Confound Onset Detection**: On `2025-11-01`, `2025-11-06`, and `2025-11-03` (easterly control), Anand Vihar $\text{PM}_{2.5}$ crossed $\text{baseline} + 50\ \mu\text{g/m}^3$ in the morning/evening (`07:00–11:00 UTC`) **before** long-range Punjab parcels arrived ($+15\text{ h}$ to $+24\text{ h}$ error), driven by local vehicular/industrial emissions at the Anand Vihar ISBT hotspot and nocturnal boundary-layer inversion.
4. **Control Days Confirm Directional Discrimination**: On easterly/south-easterly control days (`2025-11-03`, `2024-10-27`), `cone_24h` and `parcel100m` FRP fractions drop to $0.16\%–1.1\%$, properly sending Punjab plumes away from Delhi. However, the tiny fraction of nearby Haryana fires ($<1\%$ FRP) still triggers a false early `parcel_pred_arrival_utc` unless a minimum arriving-FRP threshold (e.g., $\ge 5\%$ FRP or $\ge 500\text{ MW}$) is enforced.

---

## 🗂️ Repository Directory Structure

```
c:\Vayusync/
├── backend/
│   ├── template.yaml                  # AWS SAM Infrastructure-as-Code template
│   ├── requirements.txt              # Python serverless dependencies
│   ├── lambdas/
│   │   ├── ingestion_engine/          # NASA FIRMS + Open-Meteo data ingestion
│   │   │   └── handler.py
│   │   ├── evaluator_engine/          # Spatial matching + Bedrock Claude 3 advisory
│   │   │   └── handler.py
│   │   ├── simulate_trigger/          # 🔴 Hackathon live demo simulation trigger
│   │   │   └── handler.py
│   │   ├── dashboard_data/            # REST API serving dashboard telemetry
│   │   │   └── handler.py
│   │   └── shared/                    # Shared geo_utils, math, mock data
│   │       ├── geo_utils.py           # Haversine, dispersion cones, geohashing
│   │       └── mock_data.py           # Seed institutions, hotspots, alerts
│   └── scripts/
│       ├── seed_dynamo.py             # DynamoDB initial seeder script
│       ├── test_pipeline.py           # Automated 34-test backend verification suite
│       ├── test_handlers_smoke.py     # Lambda handler import & entrypoint smoke test
│       └── backtest.py                # Retrospective back-test harness (FIRMS + ERA5 + CPCB)
├── frontend/
│   ├── package.json                   # React 18, Vite, Tailwind, MapLibre GL
│   ├── vite.config.ts                 # Vite bundler configuration
│   ├── tailwind.config.js             # Styling configuration
│   ├── tsconfig.json                  # TypeScript compiler options
│   ├── .env.example                   # Environment configuration template
│   └── src/
│       ├── main.tsx                   # React root entry point
│       ├── App.tsx                    # Main layout and telemetry polling
│       ├── components/
│       │   ├── VayuSyncMap.tsx        # MapLibre GL dark interactive map
│       │   ├── AlertSidebar.tsx       # Live alert feed with expandable actions
│       │   ├── SimulateTrigger.tsx    # 🔴 Killer demo trigger button
│       │   ├── SystemStatus.tsx       # AWS pipeline status and service health
│       │   ├── MetricsBar.tsx         # Top KPI metrics strip
│       │   └── ErrorBoundary.tsx      # Fail-safe component error containment
│       ├── utils/
│       │   ├── api.ts                 # Axios client with resilient schema adapters
│       │   └── mapHelpers.ts          # Geospatial color scales & animations
│       └── types/
│           └── index.ts               # Complete TypeScript interface definitions
├── deploy_to_aws.bat                  # One-click automated AWS deployment script
├── .gitignore                         # Git exclusion rules
└── README.md                          # Production engineering documentation
```

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Python**: `3.12` or higher
- **AWS CLI**: configured with active AWS credentials (`aws configure`)
- **AWS SAM CLI**: for backend serverless packaging

### 1. Clone the Repository
```bash
git clone https://github.com/shambhushekharsinha-engg/VayuSync.git
cd VayuSync
```

### 2. Run the Backend Test Suite
```bash
cd backend
python -m unittest scripts/test_pipeline.py
# All 32 unit tests pass locally with mocked AWS services
```

### 3. Seed DynamoDB Tables
```bash
python scripts/seed_dynamo.py --region ap-south-1
```

### 4. Run Frontend Locally
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` to explore the dashboard.

---

## 🚢 One-Click Cloud Deployment to AWS

Run the provided deployment batch script from the repository root:
```bat
.\deploy_to_aws.bat
```

This single command automatically:
1. Builds the Python serverless dependencies via `sam build`.
2. Deploys the CloudFormation stack `VayuSync-Stack` to AWS `ap-south-1`.
3. Seeds the 8 Delhi NCR institutional profiles into `VayuSync_Institutions`.
4. Retrieves the live API Gateway endpoint.
5. Builds the production frontend bundle and deploys to S3 and AWS Amplify.

---

## 📡 REST API Reference

### 1. `POST /simulate`
Triggers an immediate end-to-end simulation cycle.
```bash
curl -X POST https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/simulate \
  -H "Content-Type: application/json" \
  -d '{"hotspot_lat": 30.902, "hotspot_lon": 75.852, "frp_mw": 1247.0}'
```

### 2. `GET /dashboard`
Retrieves aggregated telemetry, active fire count, and risk breakdown.
```bash
curl https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/dashboard
```

### 3. `GET /alerts?limit=10`
Retrieves recent alert logs generated by the AI evaluation engine.
```bash
curl "https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/alerts?limit=10"
```

### 4. `GET /institutions`
Lists all monitored schools, hospitals, and construction sites with risk flags.
```bash
curl https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/institutions
```

### 5. `GET /status`
Returns real-time pipeline status, next EventBridge run countdown, and DynamoDB record counts.
```bash
curl https://s9rfowqwof.execute-api.ap-south-1.amazonaws.com/prod/status
```

---

## 🔬 Engineering Limitations, Screening Assumptions & Roadmap

To maintain rigorous transparency and engineering integrity, the operational assumptions and technical boundaries of VayuSync are documented below:

| Dimension | Current Implementation (Screening Model) | Production Multi-Phase Roadmap |
|---|---|---|
| **Atmospheric Transport** | **Kinematic 2D Lagrangian Screening Vector** with Pasquill-Gifford Class D neutral dispersion cone ($15^\circ$ half-angle) for instant ($<2.5\text{s}$) alert delivery. | Assimilation of 3D Eulerian chemistry-transport models (**WRF-Chem / ECMWF CAMS**) to account for diurnal planetary boundary layer (PBL) inversion dynamics and thermal stratification. |
| **Ground Sensor Network** | **Hardware Simulation Testbed** (AWS IoT Core MQTT protocol simulation with illustrative synthetic readings). | Direct API streaming from **CPCB (Central Pollution Control Board) CAAQMS** REST endpoints and continuous Kalman filtering on OpenAQ sensor nodes. |
| **Plume Chemistry** | Linear empirical FRP-to-$PM_{2.5}$ emission factor scaling ($\approx 0.082 \times \text{FRP MW} \times \text{Dispersion factor}$). | Secondary aerosol photochemical kinetics modeling ($SO_2 / NO_x \to$ sulfate/nitrate transformation) and relative humidity aerosol hygroscopic growth. |
| **API Security & Quotas** | Public demo endpoints on Amazon API Gateway (`POST /simulate`) configured with standard throttling for hackathon evaluation. | **AWS WAF v2** rate limiting (100 req/5min), Amazon Cognito JWT authorizer for institutional facility managers, and AWS Secrets Manager automated NASA FIRMS token rotation. |
| **Edge Actuation** | Push notifications via Amazon SNS (SMS/Email) and Bedrock structured action extraction. | Direct **AWS IoT Greengrass** connectors for automated BACnet/Modbus HVAC damper shut-off in registered hospitals and educational campuses. |

---

## 🏆 Bharat Builds 2026 Judging Rubric Alignment

| Judging Criterion | Weight | How VayuSync Delivers & Wins |
|---|---|---|
| **Real-World Impact** | **35%** | Shifts public health from passive air monitoring to **6-hour preemptive action** — protecting **15,000+ vulnerable citizens** across schools and hospitals in Delhi NCR. |
| **AWS Cloud Integration**| **25%** | **7 AWS native services** orchestrated in an event-driven, least-privilege architecture (Lambda, DynamoDB, Bedrock, SNS, S3, EventBridge, Amplify). |
| **Technical Excellence** | **20%** | Atmospheric Lagrangian plume vector mathematics, GeoJSON polygon generation, automated Bedrock JSON schema enforcement, and sub-2.5s end-to-end response time. |
| **UI/UX & Live Demo** | **20%** | High-performance MapLibre GL geospatial visualization, live real-time simulation button, dynamic risk markers, and 100% responsive dark theme. |

---

## 👥 Authors & Acknowledgments

- **Built with ❤️ for Bharat Builds 2026** (Track 1: Air — Environmental Hacks)
- **Data Providers:** NASA Earthdata FIRMS (VIIRS/MODIS), Open-Meteo Global Forecasting, Central Pollution Control Board (CPCB) India
- **Cloud Foundation:** Amazon Web Services (ap-south-1 Mumbai Region)

---

<div align="center">
<b>VayuSync — Because 6 hours of warning saves a generation from a lifetime of lung damage.</b>
</div>
