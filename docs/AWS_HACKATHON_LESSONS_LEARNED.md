# VayuSync: AWS Hackathon Lessons Learned & Architectural Post-Mortem

**Event**: Bharat Builds Hackathon 2026 (Track 1: Air Quality)  
**Score**: 24 / 30  
**Evaluator Verdict**:
> *"Excellent, very complete project that actually runs live on AWS, and the idea really matters for Delhi. The one weak spot is the AI part: Bedrock hasn’t produced any real advisories yet, but the screen still calls them 'AI'. The dashboard is very complex."*

---

## 1. Root Cause Analysis

| Feedback Dimension | Symptom Observed by Judges | Technical Root Cause | Architectural Solution Implemented |
|---|---|---|---|
| **AI / Bedrock Advisories** | Screen showed "AI Action Protocol" & "Claude 3 Advisory", but underlying data came from fallback rules. | Bedrock model ID in `template.yaml` and Lambda handlers was configured with an unsupported identifier (`us.anthropic.claude-haiku-4-5-20251001-v1:0`). Bedrock runtime invocations failed, triggering silent rule fallback. | 1. Configured valid cross-region inference profiles (`us.anthropic.claude-3-5-haiku-20241022-v1:0` & `us.anthropic.claude-3-haiku-20240307-v1:0`).<br>2. Implemented multi-model sequential failover.<br>3. Enforced honest dynamic engine badging (`🤖 Bedrock Claude` vs `⚡ Rule Matrix Fallback`).<br>4. Added an interactive Raw Payload & Prompt Inspector for complete evaluator transparency. |
| **Dashboard Complexity** | "The dashboard is very complex" — 7 tabs, multi-column sidebars, terminal logs, DEFCON triggers, and audio synthesizers caused evaluator cognitive fatigue. | All diagnostic tools and advanced modules were presented simultaneously on first page load without role segmentation. | Implemented a 1-click **Executive Summary Mode** (default):<br>• Clean 30-second triage view with Threat Status, focal map, top 3 facility directives, and 1-click demo button.<br>• Retained full **Tactical Ops Cockpit Mode** for deep technical diagnostics. |

---

## 2. The Core Engineering Principles Applied

### A. The "Never Fake AI" Rule
- **Zero Deception**: Never label deterministic heuristics as "AI". Evaluators inspect network payloads.
- **Dynamic Attribution**:
  - Bedrock active: `🤖 Amazon Bedrock (Claude 3.5 Haiku) · Latency: 380ms`
  - Fallback active: `⚡ Rule Matrix Fallback · Sub-50ms SLA`
- **Transparent Inspector**: The modal provides two tabs:
  1. *Facility Protocol & Notification Preview* (clean lockscreen view, TTS audio, test SMS dispatch).
  2. *Architecture & Raw Payloads* (exact prompt context, raw JSON response, latency, and failover trigger reasoning).

### B. The "30-Second Executive Rule"
- Evaluators judge prototypes within 30 to 60 seconds.
- Executive Mode distills the entire project into:
  1. **Delhi Threat Banner**: Peak PM2.5 forecast (`412 µg/m³`) and advance lead time (`5.8h – 6.5h`).
  2. **Focal Map Canvas**: Clean Lagrangian smoke cone with 1-click demo trigger.
  3. **Top 3 Targeted Facility Directives**: Hospitals, Schools, and Construction sites with direct protocol cards.
  4. Instant transition button to the **Tactical Ops Cockpit** (7 modules).

### C. Enterprise Dual-Tier Architecture
In critical public health defense, relying solely on third-party LLM endpoints is an anti-pattern. If an API rate limit or outage occurs, the system must not fail. VayuSync guarantees continuity through:
- **Primary Tier**: Amazon Bedrock Claude 3.5 Haiku for nuanced, context-aware emergency advisories.
- **Secondary Tier**: Sub-50ms deterministic facility protocol matrix for instantaneous emergency failover.
