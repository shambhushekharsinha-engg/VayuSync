// TypeScript interfaces for VayuSync dashboard

export interface FireHotspot {
  hotspot_id: string;
  latitude: number;
  longitude: number;
  district: string;
  state: string;
  fire_radiative_power_mw: number;
  confidence: 'high' | 'nominal' | 'low';
  satellite: string;
  scan_time_utc: string;
  brightness_k?: number;
  is_simulation?: boolean;
  trajectory_6h?: TrajectoryFeature;
}

export interface TrajectoryFeature {
  type: 'Feature';
  properties: {
    hotspot_id: string;
    bearing_deg: number;
    wind_speed_ms: number;
    wind_speed_kmh: number;
    distance_km: number;
    hours: number;
    cone_half_angle_deg: number;
    thermal_power_mw: number;
    district?: string;
    severity?: Severity;
    arrival_hours?: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type FacilityType = 'School' | 'Hospital' | 'Construction' | 'Municipality';

export interface Institution {
  institution_id: string;
  name: string;
  facility_type: FacilityType;
  latitude: number;
  longitude: number;
  district: string;
  student_count?: number;
  worker_count?: number;
  bed_count?: number;
  personnel_count?: number;
  operational_hours?: string;
  hvac_integrated?: boolean;
  risk_sensitivity?: string;
  current_risk?: Severity;
  has_active_alert?: boolean;
  predicted_pm25?: number;
  alert_id?: string;
}

export interface AlertLog {
  alert_id: string;
  timestamp: string;
  institution_id: string;
  institution_name: string;
  facility_type: FacilityType;
  hotspot_source: string;
  impact_severity: Severity;
  predicted_arrival_utc: string;
  predicted_pm25_ugm3: number;
  recommended_actions: string[];
  confidence_score: number;
  advisory_source?: 'bedrock' | 'rule_fallback';
  bedrock_model?: string;
  dispatch_status?: string;
  sms_delivered?: boolean;
  email_delivered?: boolean;
}

export interface DashboardData {
  timestamp: string;
  system_status: string;
  active_fire_hotspots: number;
  hotspot_states: string[];
  institutions_at_risk: number;
  critical_alerts: number;
  high_alerts: number;
  total_alerts_last_24h: number;
  avg_lead_time_hours: number;
  last_ingestion_utc: string;
  pipeline_latency_ms: number;
  aws_cost_today_usd: number;
  aqi_delhi_ncr: {
    current: number;
    forecast_6h: number;
    category: string;
    pm25_ugm3: number;
  };
  wind: {
    speed_kmh: number;
    direction_deg: number;
    description: string;
  };
}

export interface SystemStatus {
  timestamp: string;
  overall: string;
  services: {
    lambda_ingestion: ServiceHealth;
    lambda_evaluator: ServiceHealth;
    amazon_bedrock: ServiceHealth;
    dynamodb: ServiceHealth;
    sns_topic: ServiceHealth;
    eventbridge: ServiceHealth;
    s3_archive: ServiceHealth;
  };
  kpis: {
    end_to_end_latency_ms: number;
    sla_target_ms: number;
    sla_status: string;
    aws_monthly_cost_usd: number;
    free_tier_status: string;
  };
}

export interface ServiceHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptime_percent?: number;
  last_run_utc?: string;
  model?: string;
  region?: string;
  tables?: string[];
  subscriptions?: number;
  schedule?: string;
  next_run_utc?: string;
  bucket?: string;
}

export interface SimulationStep {
  label: string;
  done: boolean;
  emoji: string;
}

export interface SimulationResult {
  simulation_id: string;
  timestamp: string;
  hotspot: FireHotspot;
  wind_data: {
    u_wind_ms: number;
    v_wind_ms: number;
    wind_speed_kmh: number;
    direction_degrees: number;
    source: string;
  };
  trajectory_cone: TrajectoryFeature;
  trajectory_cone_12h: TrajectoryFeature;
  institutions_at_risk: number;
  alerts: AlertLog[];
  pipeline_performance: {
    total_ms: number;
    sla_passed: boolean;
    steps: Array<{ step: string; duration_ms: number }>;
  };
}

// Static mock data for map display (pre-computed for demo)
export const MOCK_HOTSPOTS: FireHotspot[] = [
  { hotspot_id: 'HS001', latitude: 30.902, longitude: 75.852, district: 'Ludhiana', state: 'Punjab', fire_radiative_power_mw: 1247, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T03:24:00Z' },
  { hotspot_id: 'HS002', latitude: 31.634, longitude: 74.872, district: 'Amritsar', state: 'Punjab', fire_radiative_power_mw: 934, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T03:18:00Z' },
  { hotspot_id: 'HS003', latitude: 30.342, longitude: 76.391, district: 'Patiala', state: 'Punjab', fire_radiative_power_mw: 757, confidence: 'nominal', satellite: 'MODIS_Aqua', scan_time_utc: '2026-10-09T04:01:00Z' },
  { hotspot_id: 'HS004', latitude: 29.148, longitude: 75.721, district: 'Hisar', state: 'Haryana', fire_radiative_power_mw: 424, confidence: 'nominal', satellite: 'MODIS_Terra', scan_time_utc: '2026-10-09T05:12:00Z' },
  { hotspot_id: 'HS005', latitude: 28.892, longitude: 76.591, district: 'Rohtak', state: 'Haryana', fire_radiative_power_mw: 312, confidence: 'low', satellite: 'MODIS_Aqua', scan_time_utc: '2026-10-09T05:45:00Z' },
];

export const MOCK_INSTITUTIONS: Institution[] = [
  { institution_id: 'SCH-DEL-0492', name: 'DPS R.K. Puram', facility_type: 'School', latitude: 28.5634, longitude: 77.1854, district: 'South West Delhi', student_count: 4200, current_risk: 'CRITICAL', has_active_alert: true },
  { institution_id: 'SCH-DEL-0491', name: 'KV Dwarka Sector 8', facility_type: 'School', latitude: 28.5921, longitude: 77.0460, district: 'South West Delhi', student_count: 3100, current_risk: 'HIGH', has_active_alert: true },
  { institution_id: 'SCH-GGN-0021', name: 'Ryan International Gurugram', facility_type: 'School', latitude: 28.4595, longitude: 77.0266, district: 'Gurugram', student_count: 2800, current_risk: 'HIGH', has_active_alert: true },
  { institution_id: 'HSP-DEL-0031', name: 'AIIMS New Delhi', facility_type: 'Hospital', latitude: 28.5672, longitude: 77.2100, district: 'South Delhi', bed_count: 2478, current_risk: 'CRITICAL', has_active_alert: true },
  { institution_id: 'HSP-GGN-0012', name: 'Medanta Hospital', facility_type: 'Hospital', latitude: 28.4128, longitude: 77.0407, district: 'Gurugram', bed_count: 1250, current_risk: 'HIGH', has_active_alert: true },
  { institution_id: 'CON-DEL-0088', name: 'Dwarka Expressway Project', facility_type: 'Construction', latitude: 28.5355, longitude: 77.0674, district: 'South West Delhi', worker_count: 850, current_risk: 'CRITICAL', has_active_alert: true },
  { institution_id: 'CON-NOI-0044', name: 'Noida Metro Depot', facility_type: 'Construction', latitude: 28.5706, longitude: 77.3910, district: 'Noida', worker_count: 420, current_risk: 'MEDIUM', has_active_alert: true },
  { institution_id: 'MUN-DEL-0001', name: 'NDMC North Delhi HQ', facility_type: 'Municipality', latitude: 28.6692, longitude: 77.2090, district: 'North Delhi', personnel_count: 340, current_risk: 'HIGH', has_active_alert: true },
];

// Pre-computed trajectory cone from Ludhiana → Delhi (NW winds)
export const MAIN_TRAJECTORY_CONE: TrajectoryFeature = {
  type: 'Feature',
  properties: {
    hotspot_id: 'HS001',
    bearing_deg: 156,
    wind_speed_ms: 12.8,
    wind_speed_kmh: 46.1,
    distance_km: 276.6,
    hours: 6,
    cone_half_angle_deg: 18.7,
    thermal_power_mw: 1247,
    district: 'Ludhiana',
    severity: 'CRITICAL',
    arrival_hours: 6,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [75.852, 30.902],
      [75.3, 30.1], [74.9, 29.5], [74.7, 28.9], [75.1, 28.3], [75.9, 27.9], [76.4, 27.7],
      [77.0, 27.6],
      [77.6, 27.7], [78.1, 27.9], [78.4, 28.3], [78.2, 28.9], [77.8, 29.5], [77.4, 30.1],
      [75.852, 30.902]
    ]]
  }
};
