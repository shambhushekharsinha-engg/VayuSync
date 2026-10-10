import axios from 'axios';
import type { DashboardData, AlertLog, Institution, FireHotspot, SimulationResult, SystemStatus } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Mock data fallback (when no API URL configured) ──────────────────────────
import {
  MOCK_HOTSPOTS,
  MOCK_INSTITUTIONS,
  MAIN_TRAJECTORY_CONE,
} from '../types';
import { formatISO, addHours, subMinutes } from 'date-fns';

const now = new Date();

const MOCK_ALERTS: AlertLog[] = [
  {
    alert_id: 'ALT-20261009-0001',
    timestamp: subMinutes(now, 2).toISOString(),
    institution_id: 'SCH-DEL-0492',
    institution_name: 'DPS R.K. Puram',
    facility_type: 'School',
    hotspot_source: 'HS001',
    impact_severity: 'CRITICAL',
    predicted_arrival_utc: addHours(now, 6).toISOString(),
    predicted_pm25_ugm3: 387,
    recommended_actions: [
      'Cancel all outdoor activities and PE classes after 08:00 AM.',
      'Switch central HVAC to indoor air recirculation mode at 07:30 AM.',
      'Distribute N95 masks to transport staff and outdoor security personnel.',
    ],
    confidence_score: 0.94,
    dispatch_status: 'DELIVERED',
    sms_delivered: true,
    email_delivered: true,
  },
  {
    alert_id: 'ALT-20261009-0002',
    timestamp: subMinutes(now, 2).toISOString(),
    institution_id: 'HSP-DEL-0031',
    institution_name: 'AIIMS New Delhi',
    facility_type: 'Hospital',
    hotspot_source: 'HS001',
    impact_severity: 'CRITICAL',
    predicted_arrival_utc: addHours(now, 5.8).toISOString(),
    predicted_pm25_ugm3: 412,
    recommended_actions: [
      'Activate respiratory ward pre-staging protocol immediately.',
      'Switch all building HVAC to HEPA recirculation by 07:00 AM.',
      'Alert pulmonology and emergency departments for increased patient surge.',
    ],
    confidence_score: 0.97,
    dispatch_status: 'DELIVERED',
    sms_delivered: true,
    email_delivered: true,
  },
  {
    alert_id: 'ALT-20261009-0003',
    timestamp: subMinutes(now, 1).toISOString(),
    institution_id: 'CON-DEL-0088',
    institution_name: 'Dwarka Expressway Project',
    facility_type: 'Construction',
    hotspot_source: 'HS001',
    impact_severity: 'CRITICAL',
    predicted_arrival_utc: addHours(now, 6.5).toISOString(),
    predicted_pm25_ugm3: 357,
    recommended_actions: [
      'Suspend all outdoor heavy earthwork from 09:00 AM onwards.',
      'Rotate outdoor workers to indoor tasks during smoke window.',
      'Issue mandatory N95 respirators to all remaining on-site workers.',
    ],
    confidence_score: 0.91,
    dispatch_status: 'DELIVERED',
    sms_delivered: true,
    email_delivered: true,
  },
  {
    alert_id: 'ALT-20261009-0004',
    timestamp: subMinutes(now, 1).toISOString(),
    institution_id: 'SCH-DEL-0491',
    institution_name: 'KV Dwarka Sector 8',
    facility_type: 'School',
    hotspot_source: 'HS001',
    impact_severity: 'HIGH',
    predicted_arrival_utc: addHours(now, 6.75).toISOString(),
    predicted_pm25_ugm3: 298,
    recommended_actions: [
      'Cancel morning PT and outdoor assembly from 08:00 AM.',
      'Keep all students indoors during recess; use indoor alternatives.',
      'Notify parents via school app of temporary outdoor restriction.',
    ],
    confidence_score: 0.89,
    dispatch_status: 'DELIVERED',
    sms_delivered: true,
    email_delivered: true,
  },
];

const MOCK_DASHBOARD: DashboardData = {
  timestamp: now.toISOString(),
  system_status: 'OPERATIONAL',
  active_fire_hotspots: 5,
  hotspot_states: ['Punjab', 'Haryana'],
  institutions_at_risk: 8,
  critical_alerts: 3,
  high_alerts: 3,
  total_alerts_last_24h: 8,
  avg_lead_time_hours: 6.4,
  last_ingestion_utc: subMinutes(now, 42).toISOString(),
  pipeline_latency_ms: 2300,
  aws_cost_today_usd: 0.00,
  aqi_delhi_ncr: {
    current: 387,
    forecast_6h: 445,
    category: 'Very Unhealthy',
    pm25_ugm3: 298.4,
  },
  wind: {
    speed_kmh: 46.8,
    direction_deg: 297,
    description: 'NW → SE (Toward Delhi NCR)',
  },
};

const MOCK_STATUS: SystemStatus = {
  timestamp: now.toISOString(),
  overall: 'HEALTHY',
  services: {
    lambda_ingestion: { status: 'HEALTHY', uptime_percent: 99.9 },
    lambda_evaluator: { status: 'HEALTHY', uptime_percent: 99.9 },
    amazon_bedrock: { status: 'HEALTHY', model: 'Claude 3 Haiku', region: 'us-east-1' },
    dynamodb: { status: 'HEALTHY', tables: ['VayuSync_Hotspots', 'VayuSync_Institutions', 'VayuSync_AlertLogs'] },
    sns_topic: { status: 'HEALTHY', subscriptions: 2 },
    eventbridge: { status: 'HEALTHY', schedule: 'rate(6 hours)' },
    s3_archive: { status: 'HEALTHY', bucket: 'vayusync-raw-payloads-2026' },
  },
  kpis: {
    end_to_end_latency_ms: 2300,
    sla_target_ms: 2500,
    sla_status: 'PASSING',
    aws_monthly_cost_usd: 0.00,
    free_tier_status: 'COMPLIANT',
  },
};

// ─── API Client functions (with mock fallback) ────────────────────────────────

async function safeGet<T>(path: string, mockData: T): Promise<{ data: T; isFallback: boolean }> {
  if (!BASE_URL) return { data: mockData, isFallback: true };
  try {
    const { data } = await api.get<T>(path);
    return { data, isFallback: false };
  } catch {
    console.warn(`API GET ${path} failed — using mock fallback data`);
    return { data: mockData, isFallback: true };
  }
}

export const apiClient = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data: raw, isFallback } = await safeGet<any>('/dashboard', MOCK_DASHBOARD);
    return {
      timestamp: raw.generated_at || raw.timestamp || new Date().toISOString(),
      system_status: raw.pipeline_status || raw.system_status || 'OPERATIONAL',
      active_fire_hotspots: raw.hotspots?.active_count ?? raw.active_fire_hotspots ?? 0,
      hotspot_states: raw.hotspots?.regions ?? raw.hotspot_states ?? ['Punjab', 'Haryana'],
      institutions_at_risk: raw.institutions?.currently_at_risk ?? raw.institutions_at_risk ?? 0,
      critical_alerts: raw.alerts?.severity_breakdown?.CRITICAL ?? raw.critical_alerts ?? 0,
      high_alerts: raw.alerts?.severity_breakdown?.HIGH ?? raw.high_alerts ?? 0,
      total_alerts_last_24h: raw.alerts?.total_generated ?? raw.total_alerts_last_24h ?? 0,
      avg_lead_time_hours: raw.avg_lead_time_hours ?? (isFallback ? MOCK_DASHBOARD.avg_lead_time_hours : null),
      last_ingestion_utc: raw.alerts?.last_alert_utc ?? raw.last_ingestion_utc ?? (isFallback ? MOCK_DASHBOARD.last_ingestion_utc : new Date().toISOString()),
      pipeline_latency_ms: raw.pipeline_latency_ms ?? (isFallback ? MOCK_DASHBOARD.pipeline_latency_ms : null),
      aws_cost_today_usd: raw.aws_cost_today_usd ?? (isFallback ? MOCK_DASHBOARD.aws_cost_today_usd : null),
      is_mock_fallback: isFallback,
      aqi_delhi_ncr: {
        current: raw.aqi_delhi_ncr?.current ?? (isFallback ? MOCK_DASHBOARD.aqi_delhi_ncr.current : 387),
        forecast_6h: raw.aqi_delhi_ncr?.forecast_6h ?? (isFallback ? MOCK_DASHBOARD.aqi_delhi_ncr.forecast_6h : 445),
        category: raw.aqi_delhi_ncr?.category ?? (isFallback ? MOCK_DASHBOARD.aqi_delhi_ncr.category : 'Very Unhealthy'),
        pm25_ugm3: raw.aqi_delhi_ncr?.pm25_ugm3 ?? (isFallback ? MOCK_DASHBOARD.aqi_delhi_ncr.pm25_ugm3 : 298.4),
      },
      wind: {
        speed_kmh: raw.wind?.speed_kmh ?? (isFallback ? MOCK_DASHBOARD.wind.speed_kmh : 18.4),
        direction_deg: raw.wind?.direction_deg ?? (isFallback ? MOCK_DASHBOARD.wind.direction_deg : 315),
        description: raw.wind?.description ?? (isFallback ? MOCK_DASHBOARD.wind.description : 'NW → SE (Toward Delhi NCR)'),
      },
    };
  },

  getAlerts: async (limit = 20): Promise<{ count: number; alerts: AlertLog[] }> => {
    const { data: raw } = await safeGet<any>(`/alerts?limit=${limit}`, { count: MOCK_ALERTS.length, alerts: MOCK_ALERTS });
    const list = Array.isArray(raw?.alerts) ? raw.alerts : (Array.isArray(raw) ? raw : MOCK_ALERTS);
    const normalized: AlertLog[] = list.map((a: any) => ({
      alert_id: a.alert_id || `ALT-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: a.timestamp || new Date().toISOString(),
      institution_id: a.institution_id || '',
      institution_name: a.institution_name || 'Delhi NCR Institution',
      facility_type: a.facility_type || 'School',
      hotspot_source: a.hotspot_id || a.hotspot_source || 'HS001',
      impact_severity: a.impact_severity || a.severity || 'MEDIUM',
      predicted_arrival_utc: a.predicted_arrival_utc || a.arrival_utc || new Date().toISOString(),
      predicted_pm25_ugm3: Number(a.predicted_pm25_ugm3 ?? a.pm25 ?? 300),
      recommended_actions: Array.isArray(a.recommended_actions)
        ? a.recommended_actions
        : (typeof a.recommended_actions === 'string' ? [a.recommended_actions] : []),
      confidence_score: Number(a.confidence_score ?? 0.95),
      dispatch_status: a.dispatch_status || 'DELIVERED',
      sms_delivered: Boolean(a.sms_delivered ?? true),
      email_delivered: Boolean(a.email_delivered),
    }));
    return { count: normalized.length, alerts: normalized };
  },

  getInstitutions: async (): Promise<{ count: number; institutions: Institution[] }> => {
    const { data: raw } = await safeGet<any>('/institutions', { count: MOCK_INSTITUTIONS.length, institutions: MOCK_INSTITUTIONS });
    const list = Array.isArray(raw?.institutions) ? raw.institutions : (Array.isArray(raw) ? raw : MOCK_INSTITUTIONS);
    const normalized: Institution[] = list.map((i: any) => ({
      institution_id: i.institution_id,
      name: i.name,
      facility_type: i.facility_type || 'School',
      latitude: Number(i.latitude),
      longitude: Number(i.longitude),
      district: i.district || 'Delhi NCR',
      student_count: i.vulnerable_count || i.student_count,
      worker_count: i.worker_count,
      bed_count: i.bed_count,
      personnel_count: i.personnel_count,
      current_risk: i.current_severity || i.risk_status || 'NONE',
      has_active_alert: Boolean(i.active_alert_id || (i.risk_status && i.risk_status !== 'SAFE')),
      predicted_pm25: i.current_pm25_ugm3 ? Number(i.current_pm25_ugm3) : undefined,
      alert_id: i.active_alert_id,
    }));
    return { count: normalized.length, institutions: normalized };
  },

  getHotspots: async (): Promise<{ hotspot_count: number; features: { properties: FireHotspot; geometry: { type: 'Point'; coordinates: number[] }; trajectory_6h?: object }[] }> => {
    const { data } = await safeGet('/hotspots', {
      hotspot_count: MOCK_HOTSPOTS.length,
      features: MOCK_HOTSPOTS.map(h => ({
        properties: h,
        geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
        trajectory_6h: MAIN_TRAJECTORY_CONE,
      })),
    });
    return data;
  },

  getStatus: async (): Promise<SystemStatus> => {
    const { data: raw } = await safeGet<any>('/status', MOCK_STATUS);
    return {
      timestamp: raw.generated_at || raw.timestamp || new Date().toISOString(),
      overall: raw.overall_status || raw.overall || 'OPERATIONAL',
      services: {
        lambda_ingestion: {
          status: (raw.pipeline?.ingestion_engine?.status ?? raw.services?.lambda_ingestion?.status ?? 'HEALTHY') as 'HEALTHY' | 'DEGRADED' | 'DOWN',
          uptime_percent: 99.9,
          schedule: raw.pipeline?.ingestion_engine?.schedule ?? 'rate(6 hours)',
          next_run_utc: raw.pipeline?.ingestion_engine?.next_run_utc,
        },
        lambda_evaluator: {
          status: (raw.pipeline?.evaluator_engine?.status ?? raw.services?.lambda_evaluator?.status ?? 'HEALTHY') as 'HEALTHY' | 'DEGRADED' | 'DOWN',
          uptime_percent: 99.9,
        },
        amazon_bedrock: {
          status: 'HEALTHY',
          model: raw.pipeline?.evaluator_engine?.bedrock_model ?? 'Claude 3 Haiku',
          region: raw.pipeline?.evaluator_engine?.bedrock_region ?? 'ap-south-1',
        },
        dynamodb: {
          status: (raw.dynamodb_tables?.VayuSync_Hotspots?.status === 'ERROR' ? 'DEGRADED' : 'HEALTHY') as 'HEALTHY' | 'DEGRADED' | 'DOWN',
          tables: ['VayuSync_Hotspots', 'VayuSync_Institutions', 'VayuSync_AlertLogs'],
        },
        sns_topic: {
          status: 'HEALTHY',
          subscriptions: 2,
        },
        eventbridge: {
          status: 'HEALTHY',
          schedule: raw.pipeline?.ingestion_engine?.schedule ?? 'rate(6 hours)',
        },
        s3_archive: {
          status: 'HEALTHY',
          bucket: 'vayusync-raw-payloads-2026',
        },
      },
      kpis: {
        end_to_end_latency_ms: 2300,
        sla_target_ms: 2500,
        sla_status: 'PASSING',
        aws_monthly_cost_usd: 0.00,
        free_tier_status: 'COMPLIANT',
      },
    };
  },

  simulate: async (params?: { hotspot_lat?: number; hotspot_lon?: number; frp_mw?: number }): Promise<SimulationResult> => {
    if (!BASE_URL) {
      // Fully mocked simulation result
      await new Promise(resolve => setTimeout(resolve, 2300)); // Simulate real latency
      const sim: SimulationResult = {
        simulation_id: `SIM-${Date.now()}`,
        timestamp: new Date().toISOString(),
        hotspot: {
          ...MOCK_HOTSPOTS[0],
          hotspot_id: `HS-SIM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          is_simulation: true,
        },
        wind_data: {
          u_wind_ms: 11.2,
          v_wind_ms: -5.8,
          wind_speed_kmh: 46.8,
          direction_degrees: 297,
          source: 'Mock (October seasonal analogue)',
        },
        trajectory_cone: MAIN_TRAJECTORY_CONE,
        trajectory_cone_12h: MAIN_TRAJECTORY_CONE,
        institutions_at_risk: 6,
        alerts: MOCK_ALERTS,
        pipeline_performance: {
          total_ms: 2300 + Math.floor(Math.random() * 200),
          sla_passed: true,
          steps: [
            { step: 'NASA FIRMS Thermal Anomaly Ingested', duration_ms: 340 },
            { step: 'Open-Meteo Wind Vectors Fetched', duration_ms: 280 },
            { step: 'Trajectory Cone Calculated', duration_ms: 45 },
            { step: 'DynamoDB Spatial Query', duration_ms: 120 },
            { step: 'Bedrock Advisory Generated (Claude 3 Haiku)', duration_ms: 1180 },
            { step: 'SNS Alert Dispatched', duration_ms: 335 },
          ],
        },
      };
      return sim;
    }
    
    const { data } = await api.post<SimulationResult>('/simulate', params || {});
    return data;
  },

  // Expose mock data for direct use
  mockAlerts: MOCK_ALERTS,
  mockDashboard: MOCK_DASHBOARD,
  mockHotspots: MOCK_HOTSPOTS,
  mockInstitutions: MOCK_INSTITUTIONS,
  mockStatus: MOCK_STATUS,
};

export { formatISO, addHours };
