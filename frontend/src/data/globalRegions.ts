import type { FireHotspot, Institution, TrajectoryFeature } from '../types';

export interface GlobalRegion {
  id: string;
  name: string;
  country: string;
  flag: string;
  category: 'Agricultural Fire' | 'Wildfire' | 'Industrial Smoke' | 'Urban Smog';
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  description: string;
  sourceHotspotName: string;
  targetImpactArea: string;
  hotspots: FireHotspot[];
  institutions: Institution[];
  trajectoryCone: TrajectoryFeature;
  defaultWind: {
    speedKmh: number;
    directionDeg: number;
    cardinal: string;
  };
}

export const GLOBAL_REGIONS: GlobalRegion[] = [
  {
    id: 'IN-DELHI',
    name: 'Indo-Gangetic Plain',
    country: 'India',
    flag: '🇮🇳',
    category: 'Agricultural Fire',
    center: [76.5, 29.8],
    zoom: 6.2,
    pitch: 50,
    bearing: -15,
    description: 'Post-monsoon seasonal paddy residue stubble combustion vectoring into Delhi NCR.',
    sourceHotspotName: 'Punjab & Haryana Agricultural Belt',
    targetImpactArea: 'Delhi NCR Metropolitan Area',
    defaultWind: { speedKmh: 18.4, directionDeg: 315, cardinal: 'NW' },
    hotspots: [
      { hotspot_id: 'HS001', latitude: 30.902, longitude: 75.852, district: 'Ludhiana', state: 'Punjab', fire_radiative_power_mw: 1247, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T03:24:00Z' },
      { hotspot_id: 'HS002', latitude: 31.634, longitude: 74.872, district: 'Amritsar', state: 'Punjab', fire_radiative_power_mw: 934, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T03:18:00Z' },
      { hotspot_id: 'HS003', latitude: 30.342, longitude: 76.391, district: 'Patiala', state: 'Punjab', fire_radiative_power_mw: 757, confidence: 'nominal', satellite: 'MODIS_Aqua', scan_time_utc: '2026-10-09T04:01:00Z' },
      { hotspot_id: 'HS004', latitude: 29.148, longitude: 75.721, district: 'Hisar', state: 'Haryana', fire_radiative_power_mw: 424, confidence: 'nominal', satellite: 'MODIS_Terra', scan_time_utc: '2026-10-09T05:12:00Z' },
      { hotspot_id: 'HS005', latitude: 28.892, longitude: 76.591, district: 'Rohtak', state: 'Haryana', fire_radiative_power_mw: 312, confidence: 'low', satellite: 'MODIS_Aqua', scan_time_utc: '2026-10-09T05:45:00Z' },
    ],
    institutions: [
      { institution_id: 'SCH-DEL-0492', name: 'DPS R.K. Puram', facility_type: 'School', latitude: 28.5634, longitude: 77.1854, district: 'South West Delhi', student_count: 4200, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 485 },
      { institution_id: 'SCH-DEL-0491', name: 'KV Dwarka Sector 8', facility_type: 'School', latitude: 28.5921, longitude: 77.0460, district: 'South West Delhi', student_count: 3100, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 390 },
      { institution_id: 'SCH-GGN-0021', name: 'Ryan International Gurugram', facility_type: 'School', latitude: 28.4595, longitude: 77.0266, district: 'Gurugram', student_count: 2800, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 360 },
      { institution_id: 'HSP-DEL-0031', name: 'AIIMS New Delhi', facility_type: 'Hospital', latitude: 28.5672, longitude: 77.2100, district: 'South Delhi', bed_count: 2478, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 440 },
      { institution_id: 'HSP-GGN-0012', name: 'Medanta Hospital', facility_type: 'Hospital', latitude: 28.4128, longitude: 77.0407, district: 'Gurugram', bed_count: 1250, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 375 },
      { institution_id: 'CON-DEL-0088', name: 'Dwarka Expressway Project', facility_type: 'Construction', latitude: 28.5355, longitude: 77.0674, district: 'South West Delhi', worker_count: 850, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 520 },
      { institution_id: 'CON-NOI-0044', name: 'Noida Metro Extension Site', facility_type: 'Construction', latitude: 28.5706, longitude: 77.3910, district: 'Noida', worker_count: 420, current_risk: 'MEDIUM', has_active_alert: true, predicted_pm25: 295 },
      { institution_id: 'MUN-DEL-0001', name: 'NDMC North Delhi HQ', facility_type: 'Municipality', latitude: 28.6692, longitude: 77.2090, district: 'North Delhi', personnel_count: 340, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 340 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'HS001',
        origin_lat: 30.9,
        origin_lon: 75.85,
        bearing_deg: 154.3,
        wind_speed_ms: 6.0,
        wind_speed_kmh: 21.6,
        distance_km: 139.7,
        transport_distance_km: 139.7,
        hours: 6,
        cone_half_angle_deg: 15.0,
        thermal_power_mw: 950,
        district: 'Ludhiana',
        severity: 'HIGH',
        arrival_hours: 6,
        is_illustrative: true,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.85, 30.9],
          [76.795, 29.945],
          [76.721, 29.894],
          [76.643, 29.847],
          [76.562, 29.805],
          [76.478, 29.767],
          [76.391, 29.734],
          [76.302, 29.706],
          [76.211, 29.683],
          [76.119, 29.666],
          [75.85, 30.9],
        ]]
      }
    }
  },
  {
    id: 'US-CALIFORNIA',
    name: 'California Valley Corridor',
    country: 'United States',
    flag: '🇺🇸',
    category: 'Wildfire',
    center: [-119.5, 36.8],
    zoom: 6.5,
    pitch: 50,
    bearing: -10,
    description: 'Santa Ana & Diablo offshore dry gusts fanning chaparral wildfires toward Central Valley and LA Basin.',
    sourceHotspotName: 'Sierra Foothills & Angeles National Forest',
    targetImpactArea: 'Central Valley & Los Angeles Basin',
    defaultWind: { speedKmh: 32.5, directionDeg: 60, cardinal: 'ENE' },
    hotspots: [
      { hotspot_id: 'US-CAL-01', latitude: 37.45, longitude: -119.82, district: 'Mariposa Foothills', state: 'California', fire_radiative_power_mw: 2150, confidence: 'high', satellite: 'VIIRS_NOAA20', scan_time_utc: '2026-10-09T02:15:00Z' },
      { hotspot_id: 'US-CAL-02', latitude: 36.88, longitude: -119.12, district: 'Kings Canyon Perimeter', state: 'California', fire_radiative_power_mw: 1680, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T03:00:00Z' },
      { hotspot_id: 'US-CAL-03', latitude: 34.32, longitude: -118.05, district: 'Angeles Crest Forest', state: 'California', fire_radiative_power_mw: 1940, confidence: 'high', satellite: 'GOES-18', scan_time_utc: '2026-10-09T04:10:00Z' },
    ],
    institutions: [
      { institution_id: 'SCH-CAL-010', name: 'Fresno Unified High Campus', facility_type: 'School', latitude: 36.7468, longitude: -119.7726, district: 'Fresno County', student_count: 3200, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 390 },
      { institution_id: 'HSP-CAL-020', name: 'Community Regional Medical Center', facility_type: 'Hospital', latitude: 36.7412, longitude: -119.7891, district: 'Fresno', bed_count: 685, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 410 },
      { institution_id: 'CON-CAL-030', name: 'California High-Speed Rail Segment 4', facility_type: 'Construction', latitude: 36.4215, longitude: -119.5840, district: 'Kings County', worker_count: 650, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 340 },
      { institution_id: 'HSP-CAL-040', name: 'Bakersfield Memorial Hospital', facility_type: 'Hospital', latitude: 35.3733, longitude: -119.0187, district: 'Kern County', bed_count: 426, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 310 },
      { institution_id: 'SCH-CAL-050', name: 'Bakersfield High School', facility_type: 'School', latitude: 35.3745, longitude: -119.0298, district: 'Kern County', student_count: 2850, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 295 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'US-CAL-01',
        bearing_deg: 225,
        wind_speed_ms: 9.0,
        wind_speed_kmh: 32.5,
        distance_km: 195.0,
        hours: 6,
        cone_half_angle_deg: 16.5,
        thermal_power_mw: 2150,
        district: 'Mariposa Foothills',
        severity: 'CRITICAL',
        arrival_hours: 5.5,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-119.82, 37.45],
          [-119.95, 37.15], [-120.15, 36.85], [-120.40, 36.50], [-120.10, 36.20],
          [-119.70, 36.15], [-119.35, 36.40], [-119.20, 36.85], [-119.50, 37.20],
          [-119.82, 37.45]
        ]]
      }
    }
  },
  {
    id: 'ID-SUMATRA',
    name: 'Sumatra & Riau Peatlands',
    country: 'Indonesia',
    flag: '🇮🇩',
    category: 'Agricultural Fire',
    center: [102.8, 0.8],
    zoom: 6.8,
    pitch: 45,
    bearing: 5,
    description: 'Sub-surface smoldering peatland fires emitting ultra-dense PM2.5 haze across Malacca Strait to Singapore & KL.',
    sourceHotspotName: 'Riau & Jambi Peat Concessions',
    targetImpactArea: 'Pekanbaru, Dumai & Singapore Strait',
    defaultWind: { speedKmh: 14.8, directionDeg: 210, cardinal: 'SSW' },
    hotspots: [
      { hotspot_id: 'ID-RIAU-01', latitude: 1.25, longitude: 101.45, district: 'Rokan Hilir Peat Dome', state: 'Riau', fire_radiative_power_mw: 1850, confidence: 'high', satellite: 'Himawari-9', scan_time_utc: '2026-10-09T03:30:00Z' },
      { hotspot_id: 'ID-RIAU-02', latitude: 0.72, longitude: 101.88, district: 'Siak Peat Forest', state: 'Riau', fire_radiative_power_mw: 1420, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T04:15:00Z' },
      { hotspot_id: 'ID-RIAU-03', latitude: 0.15, longitude: 102.62, district: 'Pelalawan Deep Peat', state: 'Riau', fire_radiative_power_mw: 1100, confidence: 'nominal', satellite: 'MODIS_Terra', scan_time_utc: '2026-10-09T05:00:00Z' },
    ],
    institutions: [
      { institution_id: 'SCH-RIAU-01', name: 'SMA Negeri 1 Pekanbaru', facility_type: 'School', latitude: 0.5333, longitude: 101.4500, district: 'Pekanbaru City', student_count: 1400, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 460 },
      { institution_id: 'HSP-RIAU-02', name: 'RSUD Arifin Achmad General Hospital', facility_type: 'Hospital', latitude: 0.5280, longitude: 101.4465, district: 'Pekanbaru', bed_count: 650, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 480 },
      { institution_id: 'CON-RIAU-03', name: 'Trans-Sumatra Toll Highway Dumai Segment', facility_type: 'Construction', latitude: 1.4500, longitude: 101.3800, district: 'Dumai', worker_count: 520, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 395 },
      { institution_id: 'SCH-RIAU-04', name: 'Sekolah Cendana Duri', facility_type: 'School', latitude: 1.2700, longitude: 101.2100, district: 'Bengkalis', student_count: 1100, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 370 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'ID-RIAU-01',
        bearing_deg: 35,
        wind_speed_ms: 4.1,
        wind_speed_kmh: 14.8,
        distance_km: 125.0,
        hours: 6,
        cone_half_angle_deg: 20.0,
        thermal_power_mw: 1850,
        district: 'Rokan Hilir',
        severity: 'CRITICAL',
        arrival_hours: 6.2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [101.45, 1.25],
          [101.55, 1.55], [101.80, 1.85], [102.10, 2.10], [102.40, 1.95],
          [102.30, 1.60], [102.05, 1.35], [101.75, 1.20],
          [101.45, 1.25]
        ]]
      }
    }
  },
  {
    id: 'BR-AMAZON',
    name: 'Amazon Arc of Deforestation',
    country: 'Brazil',
    flag: '🇧🇷',
    category: 'Agricultural Fire',
    center: [-55.2, -9.8],
    zoom: 6.0,
    pitch: 45,
    bearing: 0,
    description: 'Dry season slash-and-burn agricultural clearing along BR-163 corridor spreading toxic haze across southern Pará.',
    sourceHotspotName: 'Novo Progresso & São Félix do Xingu',
    targetImpactArea: 'Xingu River Basin Municipalities',
    defaultWind: { speedKmh: 16.2, directionDeg: 120, cardinal: 'ESE' },
    hotspots: [
      { hotspot_id: 'BR-AMZ-01', latitude: -9.15, longitude: -54.95, district: 'Novo Progresso Corridor', state: 'Pará', fire_radiative_power_mw: 2400, confidence: 'high', satellite: 'NOAA-20', scan_time_utc: '2026-10-09T03:10:00Z' },
      { hotspot_id: 'BR-AMZ-02', latitude: -9.85, longitude: -54.25, district: 'Altamira Forest Reserve', state: 'Pará', fire_radiative_power_mw: 1950, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T04:00:00Z' },
      { hotspot_id: 'BR-AMZ-03', latitude: -10.45, longitude: -53.85, district: 'São Félix do Xingu Grazing Edge', state: 'Pará', fire_radiative_power_mw: 1720, confidence: 'nominal', satellite: 'MODIS_Aqua', scan_time_utc: '2026-10-09T04:45:00Z' },
    ],
    institutions: [
      { institution_id: 'HSP-AMZ-01', name: 'Hospital Municipal de Novo Progresso', facility_type: 'Hospital', latitude: -7.1450, longitude: -55.3850, district: 'Novo Progresso', bed_count: 120, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 420 },
      { institution_id: 'SCH-AMZ-02', name: 'Escola Estadual Tancredo Neves', facility_type: 'School', latitude: -7.1520, longitude: -55.3780, district: 'Novo Progresso', student_count: 850, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 395 },
      { institution_id: 'CON-AMZ-03', name: 'BR-163 Federal Highway Paving Works', facility_type: 'Construction', latitude: -8.1000, longitude: -55.1500, district: 'Castelo dos Sonhos', worker_count: 380, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 360 },
      { institution_id: 'MUN-AMZ-04', name: 'Prefeitura Municipal de Altamira Base Sul', facility_type: 'Municipality', latitude: -9.1200, longitude: -54.8900, district: 'Altamira', personnel_count: 140, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 340 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'BR-AMZ-01',
        bearing_deg: 300,
        wind_speed_ms: 4.5,
        wind_speed_kmh: 16.2,
        distance_km: 145.0,
        hours: 6,
        cone_half_angle_deg: 17.5,
        thermal_power_mw: 2400,
        district: 'Novo Progresso',
        severity: 'CRITICAL',
        arrival_hours: 6.0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-54.95, -9.15],
          [-55.20, -8.90], [-55.50, -8.50], [-55.85, -8.15], [-55.70, -7.80],
          [-55.35, -7.90], [-55.05, -8.30], [-54.85, -8.75],
          [-54.95, -9.15]
        ]]
      }
    }
  },
  {
    id: 'AU-NSW',
    name: 'Southeast Australia Bushfire Belt',
    country: 'Australia',
    flag: '🇦🇺',
    category: 'Wildfire',
    center: [149.8, -34.8],
    zoom: 6.5,
    pitch: 45,
    bearing: -10,
    description: 'Eucalypt mega-fires propelled by scorching desert westerly winds into Greater Sydney & Wollongong.',
    sourceHotspotName: 'Blue Mountains & Southern Highlands',
    targetImpactArea: 'Greater Sydney Metropolitan Basin',
    defaultWind: { speedKmh: 38.0, directionDeg: 275, cardinal: 'W' },
    hotspots: [
      { hotspot_id: 'AU-NSW-01', latitude: -33.65, longitude: 150.25, district: 'Grose Valley Canyon', state: 'New South Wales', fire_radiative_power_mw: 2800, confidence: 'high', satellite: 'Himawari-9', scan_time_utc: '2026-10-09T01:50:00Z' },
      { hotspot_id: 'AU-NSW-02', latitude: -34.20, longitude: 150.35, district: 'Warragamba Catchment Area', state: 'New South Wales', fire_radiative_power_mw: 1950, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T02:40:00Z' },
    ],
    institutions: [
      { institution_id: 'SCH-SYD-01', name: 'Penrith High School', facility_type: 'School', latitude: -33.7511, longitude: 150.6942, district: 'Western Sydney', student_count: 1250, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 410 },
      { institution_id: 'HSP-SYD-02', name: 'Westmead Hospital Health Hub', facility_type: 'Hospital', latitude: -33.8055, longitude: 150.9880, district: 'Parramatta', bed_count: 975, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 435 },
      { institution_id: 'CON-SYD-03', name: 'Western Sydney International Airport Site', facility_type: 'Construction', latitude: -33.8850, longitude: 150.7100, district: 'Badgerys Creek', worker_count: 1400, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 360 },
      { institution_id: 'SCH-SYD-04', name: 'Liverpool Girls High School', facility_type: 'School', latitude: -33.9212, longitude: 150.9255, district: 'South West Sydney', student_count: 920, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 330 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'AU-NSW-01',
        bearing_deg: 95,
        wind_speed_ms: 10.5,
        wind_speed_kmh: 38.0,
        distance_km: 175.0,
        hours: 6,
        cone_half_angle_deg: 15.0,
        thermal_power_mw: 2800,
        district: 'Grose Valley',
        severity: 'CRITICAL',
        arrival_hours: 4.5,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [150.25, -33.65],
          [150.55, -33.55], [150.95, -33.50], [151.35, -33.60], [151.40, -33.95],
          [151.05, -34.05], [150.65, -33.90], [150.35, -33.75],
          [150.25, -33.65]
        ]]
      }
    }
  },
  {
    id: 'CA-ALBERTA',
    name: 'Canadian Boreal Fire Complex',
    country: 'Canada',
    flag: '🇨🇦',
    category: 'Wildfire',
    center: [-113.5, 55.5],
    zoom: 6.2,
    pitch: 45,
    bearing: 15,
    description: 'Lightning-ignited extreme boreal conifer crown fires sending intercontinental smoke across Edmonton & Calgary.',
    sourceHotspotName: 'Fort McMurray & Slave Lake Taiga',
    targetImpactArea: 'Edmonton Capital Region & North Saskatchewan River',
    defaultWind: { speedKmh: 24.6, directionDeg: 350, cardinal: 'N' },
    hotspots: [
      { hotspot_id: 'CA-ALB-01', latitude: 56.72, longitude: -111.38, district: 'Wood Buffalo South', state: 'Alberta', fire_radiative_power_mw: 3200, confidence: 'high', satellite: 'VIIRS_NOAA20', scan_time_utc: '2026-10-09T00:30:00Z' },
      { hotspot_id: 'CA-ALB-02', latitude: 55.28, longitude: -114.76, district: 'Lesser Slave Lake East', state: 'Alberta', fire_radiative_power_mw: 2100, confidence: 'high', satellite: 'VIIRS_SNPP', scan_time_utc: '2026-10-09T01:45:00Z' },
    ],
    institutions: [
      { institution_id: 'HSP-EDM-01', name: 'University of Alberta Hospital', facility_type: 'Hospital', latitude: 53.5228, longitude: -113.5255, district: 'Edmonton', bed_count: 885, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 440 },
      { institution_id: 'SCH-EDM-02', name: 'Old Scona Academic School', facility_type: 'School', latitude: 53.5185, longitude: -113.4980, district: 'Edmonton', student_count: 400, current_risk: 'CRITICAL', has_active_alert: true, predicted_pm25: 410 },
      { institution_id: 'CON-EDM-03', name: 'Valley Line West LRT Construction', facility_type: 'Construction', latitude: 53.5350, longitude: -113.5500, district: 'Edmonton West', worker_count: 580, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 375 },
      { institution_id: 'MUN-EDM-04', name: 'City of Edmonton Emergency Operations HQ', facility_type: 'Municipality', latitude: 53.5461, longitude: -113.4938, district: 'Edmonton Downtown', personnel_count: 260, current_risk: 'HIGH', has_active_alert: true, predicted_pm25: 350 },
    ],
    trajectoryCone: {
      type: 'Feature',
      properties: {
        hotspot_id: 'CA-ALB-01',
        bearing_deg: 185,
        wind_speed_ms: 6.8,
        wind_speed_kmh: 24.6,
        distance_km: 260.0,
        hours: 6,
        cone_half_angle_deg: 14.5,
        thermal_power_mw: 3200,
        district: 'Wood Buffalo',
        severity: 'CRITICAL',
        arrival_hours: 6.5,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-111.38, 56.72],
          [-111.85, 55.80], [-112.45, 54.90], [-113.35, 54.10], [-113.95, 53.50],
          [-113.20, 53.60], [-112.50, 54.30], [-111.70, 55.20], [-111.20, 56.10],
          [-111.38, 56.72]
        ]]
      }
    }
  }
];
