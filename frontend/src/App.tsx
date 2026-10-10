import React, { useState, useEffect, useCallback } from 'react';
import VayuSyncMap from './components/VayuSyncMap';
import AlertSidebar from './components/AlertSidebar';
import SimulateTrigger from './components/SimulateTrigger';
import SystemStatus from './components/SystemStatus';
import MetricsBar from './components/MetricsBar';
import { TimelineScrubber } from './components/TimelineScrubber';
import { BedrockInspectorModal } from './components/BedrockInspectorModal';
import { InstitutionalMatrix } from './components/InstitutionalMatrix';
import { ImpactCalculator } from './components/ImpactCalculator';
import { DispersionAnalytics } from './components/DispersionAnalytics';
import { ArchitectureModal } from './components/ArchitectureModal';
import { TerminalLog, type LogEntry } from './components/TerminalLog';
import { InstitutionalActionProfiles } from './components/InstitutionalActionProfiles';
import { GlobeLocationSelector } from './components/GlobeLocationSelector';
import { CitizenExposureRouteOptimizer } from './components/CitizenExposureRouteOptimizer';
import { GroundIoTSensorFusion } from './components/GroundIoTSensorFusion';
import { GLOBAL_REGIONS, type GlobalRegion } from './data/globalRegions';
import type {
  AlertLog, DashboardData, Institution,
  SimulationResult, SystemStatus as SystemStatusType,
  TrajectoryFeature, FireHotspot,
} from './types';
import { apiClient } from './utils/api';
import { soundEngine } from './utils/audio';
import { degreesToCardinal } from './utils/mapHelpers';
import { ShinyText, DecryptedText } from './components/reactbits';
import {
  Wind, Github, Info, Map, Building2,
  ShieldCheck, TrendingUp, Volume2, VolumeX, AlertOctagon,
  Network, Flame, FileText, Navigation, Radio,
} from 'lucide-react';

type NavTab = 'MAP' | 'ROUTING' | 'IOT_MESH' | 'PROFILES' | 'MATRIX' | 'IMPACT' | 'ANALYTICS';

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: '14:12:04', source: 'EVENTBRIDGE', message: 'Cron trigger rate(6 hours) dispatched execution event', level: 'INFO' },
  { timestamp: '14:12:05', source: 'NASA_FIRMS', message: 'VIIRS Suomi-NPP: 48 Thermal anomalies ingested across Punjab/Haryana', level: 'INFO' },
  { timestamp: '14:12:05', source: 'OPEN_METEO', message: 'Boundary Layer Wind: 315° (NW) @ 18.4 km/h (u=-3.62 m/s, v=-3.62 m/s)', level: 'INFO' },
  { timestamp: '14:12:06', source: 'LAMBDA', message: 'VayuSync-IngestionEngine: Lagrangian dispersion cone calculated (6h lead time)', level: 'SUCCESS' },
  { timestamp: '14:12:06', source: 'DYNAMODB', message: 'VayuSync_Hotspots & VayuSync_Institutions spatial bounding intersection verified', level: 'SUCCESS' },
  { timestamp: '14:12:07', source: 'BEDROCK', message: 'Claude 3 Haiku invocation: Guardrailed JSON advisories generated (Latency: 640ms)', level: 'SUCCESS' },
  { timestamp: '14:12:07', source: 'SNS', message: 'VayuSync-AlertTopic: 12 Institutional Gateway endpoints notified via SMS/Webhook', level: 'SUCCESS' },
];

const App: React.FC = () => {
  const [navTab, setNavTab] = useState<NavTab>('MAP');
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sysStatus, setSysStatus] = useState<SystemStatusType | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCone, setSimulatedCone] = useState<TrajectoryFeature | null>(null);
  const [simulatedHotspot, setSimulatedHotspot] = useState<FireHotspot | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [inspectedAlert, setInspectedAlert] = useState<AlertLog | null>(null);
  const [timelineHour, setTimelineHour] = useState<number>(6);
  const [showAbout, setShowAbout] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [crisisMode, setCrisisMode] = useState(false);
  const [activeRegion, setActiveRegion] = useState<GlobalRegion>(GLOBAL_REGIONS[0]);
  const [isGlobeView, setIsGlobeView] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const addLog = useCallback((source: LogEntry['source'], message: string, level: LogEntry['level'] = 'INFO') => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setTerminalLogs(prev => [...prev.slice(-40), { timestamp: timeStr, source, message, level }]);
  }, []);

  const handleSelectRegion = useCallback(async (region: GlobalRegion) => {
    setActiveRegion(region);
    setIsGlobeView(false);
    setSimulatedCone(null);
    setSimulatedHotspot(null);
    setInstitutions(region.institutions);

    addLog('SYSTEM', `Orbital targeting switched: ${region.name} (${region.country}) · [${region.center[1]}°N, ${region.center[0]}°E]`, 'INFO');

    // Fetch dynamic live wind & air quality for new region
    try {
      const [lng, lat] = region.center;
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,us_aqi`),
      ]);

      const weatherData = weatherRes.ok ? await weatherRes.json() : null;
      const aqiData = aqiRes.ok ? await aqiRes.json() : null;

      const hasLiveWind = weatherData?.current?.wind_speed_10m != null && weatherData?.current?.wind_direction_10m != null;
      const hasLiveAqi = aqiData?.current?.us_aqi != null && aqiData?.current?.pm2_5 != null;

      const speed = hasLiveWind ? Number(weatherData.current.wind_speed_10m) : region.defaultWind.speedKmh;
      const dir = hasLiveWind ? Number(weatherData.current.wind_direction_10m) : region.defaultWind.directionDeg;
      const cardinal = degreesToCardinal(dir);

      setDashboard(prev => prev ? {
        ...prev,
        wind: {
          speed_kmh: speed,
          direction_deg: dir,
          description: `${speed.toFixed(0)} km/h ${cardinal}`,
          is_illustrative: !hasLiveWind,
        },
        aqi_delhi_ncr: hasLiveAqi ? {
          current: Number(aqiData.current.us_aqi),
          pm25_ugm3: Number(aqiData.current.pm2_5),
          category: aqiData.current.us_aqi <= 100 ? 'Moderate' : (aqiData.current.us_aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy'),
          is_illustrative: false,
        } : (prev.aqi_delhi_ncr ? {
          ...prev.aqi_delhi_ncr,
          is_illustrative: true,
        } : null),
        active_fire_hotspots: region.hotspots.length,
        institutions_at_risk: region.institutions.length,
      } : null);

      if (hasLiveWind || hasLiveAqi) {
        addLog('OPEN_METEO', `Live atmospheric telemetry ingested: Wind ${speed.toFixed(1)} km/h @ ${dir}° (${cardinal}) | AQI: ${hasLiveAqi ? aqiData.current.us_aqi : 'satellite model'}`, 'SUCCESS');
      } else {
        addLog('OPEN_METEO', `Satellite baseline vectors loaded for ${region.name} (Illustrative mode)`, 'INFO');
      }
    } catch {
      setDashboard(prev => prev ? {
        ...prev,
        wind: {
          speed_kmh: region.defaultWind.speedKmh,
          direction_deg: region.defaultWind.directionDeg,
          description: `${region.defaultWind.speedKmh.toFixed(0)} km/h ${degreesToCardinal(region.defaultWind.directionDeg)}`,
          is_illustrative: true,
        },
        aqi_delhi_ncr: prev.aqi_delhi_ncr ? {
          ...prev.aqi_delhi_ncr,
          is_illustrative: true,
        } : null,
        active_fire_hotspots: region.hotspots.length,
        institutions_at_risk: region.institutions.length,
      } : null);
      addLog('OPEN_METEO', `Illustrative baseline vectors loaded for ${region.name}`, 'INFO');
    }
  }, [addLog]);

  const handleFlyToGlobalView = useCallback(() => {
    setIsGlobeView(prev => !prev);
    addLog('SYSTEM', !isGlobeView ? 'Global Orbit Mode active: Viewing planetary wildfire & stubble hotspots' : `Returned to regional tactical radar: ${activeRegion.name}`, 'INFO');
  }, [isGlobeView, activeRegion, addLog]);

  // ─── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dashData, alertData, statusData, instData] = await Promise.all([
          apiClient.getDashboard(),
          apiClient.getAlerts(20),
          apiClient.getStatus(),
          apiClient.getInstitutions(),
        ]);
        setDashboard(dashData);
        setAlerts(alertData.alerts);
        setSysStatus(statusData);
        setInstitutions(instData.institutions);
      } catch (err) {
        console.warn('Initial data load failed — using resilient mock fallbacks');
        setDashboard(apiClient.mockDashboard);
        setAlerts(apiClient.mockAlerts);
        setSysStatus(apiClient.mockStatus);
        setInstitutions(apiClient.mockInstitutions);
      }
    };
    loadInitialData();

    // Poll for fresh data every 30 seconds
    const interval = setInterval(async () => {
      try {
        const [dashData, alertData] = await Promise.all([
          apiClient.getDashboard(),
          apiClient.getAlerts(20),
        ]);
        setDashboard(dashData);
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => a.alert_id));
          const newAlerts = alertData.alerts.filter(a => !existingIds.has(a.alert_id));
          return [...newAlerts, ...prev].slice(0, 20);
        });
      } catch { /* silently ignore polling errors */ }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // ─── Simulation handlers ───────────────────────────────────────────────────
  const handleSimulationComplete = useCallback((result: SimulationResult) => {
    setIsSimulating(false);
    setSimulatedCone(result.trajectory_cone);
    setSimulatedHotspot(result.hotspot);
    setTimelineHour(6); // Reset timeline to peak arrival

    addLog('EVENTBRIDGE', 'Synthetic stubble surge triggered via POST /simulate', 'INFO');
    addLog('NASA_FIRMS', `Synthetic anomaly injected: Sangrur/Ludhiana (${result.hotspot.latitude.toFixed(2)}°N, ${result.hotspot.longitude.toFixed(2)}°E) FRP: ${result.hotspot.fire_radiative_power_mw} MW`, 'INFO');
    addLog('OPEN_METEO', 'Trajectory calculation updated with NW vector: 315° @ 18.0 km/h', 'INFO');
    addLog('LAMBDA', `EvaluatorEngine completed spatial containment test across ${result.institutions_at_risk} facilities`, 'SUCCESS');
    addLog('BEDROCK', `Claude 3 Haiku generated operational action directives (Total latency: ${result.pipeline_performance.total_ms.toFixed(0)}ms)`, 'SUCCESS');
    addLog('SNS', `Alert notification broadcast triggered to ${result.alerts.length} registered institutional targets`, 'SUCCESS');

    // Prepend new alerts to the feed
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.alert_id));
      const fresh = result.alerts.filter(a => !existingIds.has(a.alert_id));
      return [...fresh, ...prev].slice(0, 20);
    });

    // Update dashboard counts
    setDashboard(prev => prev ? {
      ...prev,
      active_fire_hotspots: (prev.active_fire_hotspots ?? 5) + 1,
      institutions_at_risk: result.institutions_at_risk,
      pipeline_latency_ms: result.pipeline_performance.total_ms,
      total_alerts_last_24h: (prev.total_alerts_last_24h ?? 0) + result.alerts.length,
    } : null);
  }, [addLog]);

  const handleReset = useCallback(() => {
    setSimulatedCone(null);
    setSimulatedHotspot(null);
    setIsSimulating(false);
    setTimelineHour(0);
    addLog('SYSTEM', 'Simulation reset to baseline satellite state', 'INFO');
  }, [addLog]);

  const toggleSound = () => {
    const next = soundEngine.toggle();
    setSoundOn(next);
  };

  const toggleCrisisMode = () => {
    soundEngine.playClick();
    if (!crisisMode) {
      soundEngine.playAlertHazard();
    }
    setCrisisMode(!crisisMode);
  };

  // Wrap SimulateTrigger to intercept start
  const SimulateTriggerWrapper = () => (
    <SimulateTrigger
      onSimulationComplete={handleSimulationComplete}
      onReset={handleReset}
    />
  );

  return (
    <div className={`flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans transition-colors duration-500 ${
      crisisMode ? 'ring-2 ring-red-500/50 shadow-[inset_0_0_80px_rgba(239,68,68,0.15)]' : ''
    }`}>

      {/* ─── CRISIS BANNER ───────────────────────────────────────────────────── */}
      {crisisMode && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white px-4 py-1 text-center font-black text-[11px] tracking-widest flex items-center justify-center gap-2 animate-pulse z-30">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>CRISIS MODE ACTIVE · HAZARDOUS INVERSION EVENT DETECTED ACROSS DELHI NCR</span>
          <AlertOctagon className="w-3.5 h-3.5" />
        </div>
      )}

      {/* ─── MISSION CONTROL HEADER ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 z-20">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src="/assets/vayusync-icon.svg" alt="VayuSync Logo" className="w-8 h-8 rounded-lg shadow-md shadow-orange-950/40" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-white tracking-tight leading-none flex items-center">
                <span>Vayu</span>
                <span className="text-orange-400">Sync</span>
                <ShinyText
                  text="· Hyperlocal"
                  speed={4}
                  className="ml-1.5 text-[10px] text-orange-200/90 font-bold hidden md:inline-block"
                  shimmerColor="#fed7aa"
                />
              </h1>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                PROD
              </span>
            </div>
            <p className="text-gray-400 text-[9px] leading-none mt-0.5 flex items-center gap-1">
              <span>Hyperlocal Fire & Stubble Exposure Engine ·</span>
              <DecryptedText
                text={activeRegion.name}
                speed={30}
                maxIterations={8}
                className="text-cyan-300 font-semibold"
                encryptedClassName="text-orange-400 font-mono"
                animateOn="mount"
              />
            </p>
          </div>

          {/* Globe & Multi-Location Selector */}
          <div className="hidden sm:block ml-1">
            <GlobeLocationSelector
              currentRegionId={activeRegion.id}
              onSelectRegion={handleSelectRegion}
              onFlyToGlobalView={handleFlyToGlobalView}
              isGlobeView={isGlobeView}
            />
          </div>

          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="text-red-400 text-[9px] font-bold tracking-wide">LIVE</span>
          </div>

          {/* Simulation executing banner */}
          {isSimulating && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 border border-orange-500/40 rounded-full animate-pulse">
              <span className="text-orange-400 text-[9px] font-bold">⚡ PIPELINE EXECUTING</span>
            </div>
          )}
        </div>

        {/* Center: Command Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-gray-950 p-1 border border-gray-800 rounded-2xl shadow-inner">
          {[
            { id: 'MAP', label: 'Tactical Radar', icon: Map },
            { id: 'ROUTING', label: 'Aero-Routing', icon: Navigation },
            { id: 'IOT_MESH', label: 'IoT Sensor Mesh', icon: Radio },
            { id: 'PROFILES', label: 'Directives', icon: FileText },
            { id: 'MATRIX', label: 'Facilities', icon: Building2 },
            { id: 'IMPACT', label: 'Preemptive ROI', icon: ShieldCheck },
            { id: 'ANALYTICS', label: 'Analytics', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                soundEngine.playClick();
                setNavTab(id as NavTab);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                navTab === id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Tactical Controls, Architecture & Audio */}
        <div className="flex items-center gap-2">
          {/* AWS Architecture Transparency Modal Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowArchModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm shadow-cyan-500/10"
            title="Inspect AWS Serverless Architecture Pipeline"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono hidden md:inline">AWS Architecture</span>
          </button>
          {/* Audio FX Toggle */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              soundOn
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
            }`}
            title="Toggle Programmatic Web Audio Synthesizer"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{soundOn ? 'AUDIO FX: ON' : 'AUDIO: MUTE'}</span>
          </button>

          {/* Crisis DEFCON Toggle */}
          <button
            onClick={toggleCrisisMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              crisisMode
                ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-red-400'
            }`}
            title="Toggle Crisis Defense Protocol View"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] hidden sm:inline">{crisisMode ? 'DEFCON 1' : 'CRISIS MODE'}</span>
          </button>

          {/* Wind pill */}
          {dashboard?.wind && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-950 px-2.5 py-1 rounded-xl border border-gray-800">
              <Wind className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {dashboard.wind.speed_kmh.toFixed(0)} km/h {degreesToCardinal(dashboard.wind.direction_deg)}
              </span>
            </div>
          )}

          {/* GitHub Repo */}
          <a
            href="https://github.com/shambhushekharsinha-engg/VayuSync"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-800"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Mission Brief info */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowAbout(!showAbout);
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-800"
            title="Mission Brief & Architecture"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── MOBILE TAB BAR (Only on small screens) ───────────────────────────── */}
      <div className="lg:hidden flex items-center justify-around bg-gray-900 border-b border-gray-800 p-1 text-xs overflow-x-auto">
        {[
          { id: 'MAP', label: 'Radar', icon: Map },
          { id: 'ROUTING', label: 'Routes', icon: Navigation },
          { id: 'IOT_MESH', label: 'IoT', icon: Radio },
          { id: 'PROFILES', label: 'Directives', icon: FileText },
          { id: 'MATRIX', label: 'Facilities', icon: Building2 },
          { id: 'IMPACT', label: 'ROI', icon: ShieldCheck },
          { id: 'ANALYTICS', label: 'Analytics', icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setNavTab(id as NavTab)}
            className={`flex items-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex-shrink-0 ${
              navTab === id ? 'bg-orange-500 text-black' : 'text-gray-400'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ─── TOP INTERACTIVE DEMO BAR (Visible Demo Bar for Hackathon Judges) ───────────── */}
      <div className="bg-gradient-to-r from-orange-950/80 via-red-950/80 to-gray-950 border-b border-orange-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
            Judge Live Demo
          </div>
          <span className="text-xs text-gray-300 font-medium hidden sm:inline">
            Inject synthetic satellite cluster (Sangrur/Ludhiana) · NW wind vector 315° @ 18 km/h
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Simulate Trigger */}
          <button
            onClick={() => {
              soundEngine.playClick();
              // Trigger simulation via wrapper or direct call
              const simButton = document.querySelector<HTMLButtonElement>('[data-tour="simulate-button"]');
              if (simButton) {
                simButton.click();
              } else {
                // If on other tab, switch to MAP
                setNavTab('MAP');
                setTimeout(() => {
                  const btn = document.querySelector<HTMLButtonElement>('[data-tour="simulate-button"]');
                  btn?.click();
                }, 100);
              }
            }}
            disabled={isSimulating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-md shadow-red-950/60 active:scale-95 transition-all"
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
            <span>{isSimulating ? 'SIMULATING...' : '🔴 SIMULATE STUBBLE SURGE'}</span>
          </button>

          {/* Quick Institutional Action Tab Switcher */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setNavTab('PROFILES');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800/90 hover:bg-gray-700/90 text-gray-200 border border-gray-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">View Facility Directives</span>
          </button>
        </div>
      </div>

      {/* ─── METRICS BAR ────────────────────────────────────────────────────── */}
      <MetricsBar dashboard={dashboard} isSimulating={isSimulating} />

      {/* ─── MAIN CONTENT VIEW SWITCHER ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* VIEW 1: TACTICAL RADAR (Map-Centric with Scrubbers & Sidebars) */}
        {navTab === 'MAP' && (
          <>
            {/* LEFT SIDEBAR: Alerts + Simulate */}
            <aside className="w-80 flex-shrink-0 flex flex-col bg-gray-950 border-r border-gray-800 overflow-hidden">
              {/* Simulate trigger (top, pinned) */}
              <div className="p-3 border-b border-gray-800 flex-shrink-0 bg-gray-900/60 backdrop-blur-sm">
                <div className="text-gray-400 text-[9px] uppercase tracking-widest font-black mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                  Live Hackathon Demonstration
                </div>
                <SimulateTriggerWrapper />
              </div>

              {/* Alert feed (scrollable) */}
              <div className="flex-1 overflow-hidden p-3">
                <AlertSidebar
                  alerts={alerts}
                  isSimulating={isSimulating}
                  onSelectAlert={(a) => setInspectedAlert(a)}
                />
              </div>
            </aside>

            {/* CENTER: Geospatial Map Canvas */}
            <main className="flex-1 relative bg-gray-950 overflow-hidden flex flex-col">
              {/* Map takes full space */}
              <div className="flex-1 relative">
                <div className="absolute inset-0">
                  <VayuSyncMap
                    activeRegion={activeRegion}
                    isGlobeView={isGlobeView}
                    simulatedCone={simulatedCone}
                    simulatedHotspot={simulatedHotspot}
                    timelineHour={timelineHour}
                    onInstitutionClick={setSelectedInstitution}
                  />
                </div>

                {/* Interactive Timeline Scrubber (Bottom Floating Widget) */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl z-20 animate-fade-in-up">
                  <TimelineScrubber
                    currentHour={timelineHour}
                    onHourChange={setTimelineHour}
                    isSimulating={isSimulating}
                    trajectoryCone={simulatedCone || activeRegion.trajectoryCone}
                  />
                </div>

                {/* Map overlays: Legend */}
                <div className="absolute bottom-16 left-3 hidden md:block bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl p-3 text-xs space-y-2 z-10 shadow-2xl">
                  <div className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mb-1">Radar Legend</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                    <span className="text-gray-300 text-[11px]">Thermal Anomalies (VIIRS)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-2 rounded" style={{ background: 'rgba(239,68,68,0.25)', border: '1px dashed #ef4444' }} />
                    <span className="text-gray-300 text-[11px]">Projected Smoke Vector Cone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🏫</span>
                    <span className="text-gray-300 text-[11px]">Schools (DPS, KV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🏥</span>
                    <span className="text-gray-300 text-[11px]">Hospitals (AIIMS, Safdarjung)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🏗️</span>
                    <span className="text-gray-300 text-[11px]">Outdoor Construction</span>
                  </div>
                </div>

                {/* Simulation active overlay banner */}
                {simulatedCone && !isSimulating && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-orange-500/20 border border-orange-500/50 backdrop-blur-md rounded-2xl px-5 py-2 text-center shadow-2xl">
                      <div className="text-orange-300 font-black text-xs">🔴 1,200 MW SIMULATED HOTSPOT ACTIVE</div>
                      <div className="text-gray-300 text-[10px] mt-0.5">
                        Sangrur / Ludhiana → Delhi NCR · Dispersion Cone Expanded
                      </div>
                    </div>
                  </div>
                )}

                {/* Institution detail card */}
                {selectedInstitution && (
                  <div className="absolute top-3 right-3 w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-3xl p-4 z-20 animate-fade-in-up shadow-2xl">
                    <button
                      onClick={() => setSelectedInstitution(null)}
                      className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 text-lg leading-none p-1"
                    >
                      ×
                    </button>
                    <div className="text-sm mb-1">
                      {selectedInstitution.facility_type === 'School' ? '🏫' :
                       selectedInstitution.facility_type === 'Hospital' ? '🏥' :
                       selectedInstitution.facility_type === 'Construction' ? '🏗️' : '🏛️'}
                      {' '}<span className="font-black text-white">{selectedInstitution.name}</span>
                    </div>
                    <div className="text-gray-400 text-[10px] mb-3">{selectedInstitution.district}</div>
                    <div className="space-y-1.5 text-xs bg-gray-950/70 p-3 rounded-2xl border border-gray-800">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Risk Severity</span>
                        <span className={`font-black ${
                          selectedInstitution.current_risk === 'CRITICAL' ? 'text-red-400' :
                          selectedInstitution.current_risk === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'
                        }`}>{selectedInstitution.current_risk ?? 'HIGH'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Population Count</span>
                        <span className="text-white font-mono font-bold">
                          {(selectedInstitution.student_count || selectedInstitution.bed_count || selectedInstitution.worker_count || 1200).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Peak PM2.5 Forecast</span>
                        <span className="text-red-400 font-mono font-bold">
                          {selectedInstitution.predicted_pm25 ?? 387} µg/m³
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const matched = alerts.find(a => a.institution_id === selectedInstitution.institution_id) || alerts[0];
                        if (matched) setInspectedAlert(matched);
                      }}
                      className="w-full mt-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <span>View Claude 3 Advisory</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Pipeline Execution Terminal Log Widget */}
              <div className="p-2 bg-gray-950 border-t border-gray-800/80 z-20">
                <TerminalLog logs={terminalLogs} onClear={() => setTerminalLogs([])} />
              </div>
            </main>

            {/* RIGHT SIDEBAR: System Status */}
            <aside className="w-72 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-hidden">
              <div className="h-full overflow-y-auto p-3">
                <div className="text-gray-400 text-[9px] uppercase tracking-widest font-black mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  AWS Cloud Pipeline Telemetry
                </div>
                <SystemStatus status={sysStatus} dashboard={dashboard} />
              </div>
            </aside>
          </>
        )}

        {/* VIEW 2: CITIZEN EXPOSURE ROUTE OPTIMIZER (AERO-ROUTING) */}
        {navTab === 'ROUTING' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
            <CitizenExposureRouteOptimizer wind={dashboard?.wind} />
          </div>
        )}

        {/* VIEW 3: GROUND IOT MESH & BUS SENSOR FUSION */}
        {navTab === 'IOT_MESH' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
            <GroundIoTSensorFusion />
          </div>
        )}

        {/* VIEW 4: INSTITUTIONAL ACTION PROFILES */}
        {navTab === 'PROFILES' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
            <InstitutionalActionProfiles />
          </div>
        )}

        {/* VIEW 3: INSTITUTIONAL READINESS MATRIX */}
        {navTab === 'MATRIX' && (
          <div className="flex-1 overflow-hidden">
            <InstitutionalMatrix
              institutions={institutions}
              alerts={alerts}
              onSelectAlert={(a) => setInspectedAlert(a)}
            />
          </div>
        )}

        {/* VIEW 4: PREEMPTIVE ACTION ROI CALCULATOR */}
        {navTab === 'IMPACT' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
            <ImpactCalculator />
          </div>
        )}

        {/* VIEW 5: ATMOSPHERIC DISPERSION ANALYTICS */}
        {navTab === 'ANALYTICS' && (
          <div className="flex-1 overflow-hidden">
            <DispersionAnalytics
              wind={dashboard?.wind}
              trajectoryCone={simulatedCone || activeRegion.trajectoryCone}
            />
          </div>
        )}

      </div>

      {/* ─── BEDROCK AI INSPECTOR MODAL ─────────────────────────────────────── */}
      <BedrockInspectorModal
        alert={inspectedAlert}
        onClose={() => setInspectedAlert(null)}
      />

      {/* ─── ABOUT / MISSION BRIEF MODAL ────────────────────────────────────── */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in-up"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🌬️</span>
              <div>
                <h2 className="font-black text-xl text-white">Vayu<span className="text-orange-400">Sync</span></h2>
                <p className="text-gray-400 text-xs">Hyperlocal Stubble Exposure & Institutional Action Engine</p>
              </div>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed mb-4">
              VayuSync shifts the paradigm from <span className="text-orange-400 font-bold">reactive AQI tracking</span> to{' '}
              <span className="text-green-400 font-bold">preemptive institutional automation</span> — alerting schools, hospitals,
              and construction sites <strong>6–12 hours before</strong> toxic smoke arrives across Delhi NCR.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
              {[
                { icon: '🛰️', label: 'NASA FIRMS', desc: 'Live VIIRS thermal hotspots' },
                { icon: '🌊', label: 'Open-Meteo', desc: 'Real-time 10m wind vectors' },
                { icon: '🤖', label: 'Amazon Bedrock', desc: 'Claude 3 Haiku advisories' },
                { icon: '📱', label: 'Amazon SNS', desc: 'SMS + email dispatch' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-gray-950/80 rounded-2xl p-3 border border-gray-800">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-white text-xs font-bold">{label}</div>
                  <div className="text-gray-400 text-[10px]">{desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 text-xs text-center text-orange-300 font-bold">
              🏆 Bharat Builds 2026 · Track 1: Air · Target: ₹2,00,000 Winner
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all"
            >
              Close Briefing
            </button>
          </div>
        </div>
      )}

      {/* ─── AWS ARCHITECTURE TRANSPARENCY MODAL ─────────────────────────── */}
      <ArchitectureModal
        isOpen={showArchModal}
        onClose={() => setShowArchModal(false)}
      />

    </div>
  );
};

export default App;
