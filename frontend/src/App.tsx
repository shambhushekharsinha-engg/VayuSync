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
import type {
  AlertLog, DashboardData, Institution,
  SimulationResult, SystemStatus as SystemStatusType,
  TrajectoryFeature, FireHotspot,
} from './types';
import { apiClient } from './utils/api';
import { soundEngine } from './utils/audio';
import {
  Wind, Github, Info, Map, Building2,
  ShieldCheck, TrendingUp, Volume2, VolumeX, AlertOctagon,
} from 'lucide-react';

type NavTab = 'MAP' | 'MATRIX' | 'IMPACT' | 'ANALYTICS';

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
  const [soundOn, setSoundOn] = useState(false);
  const [crisisMode, setCrisisMode] = useState(false);

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
  }, []);

  const handleReset = useCallback(() => {
    setSimulatedCone(null);
    setSimulatedHotspot(null);
    setIsSimulating(false);
    setTimelineHour(0);
  }, []);

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
          <div className="relative">
            <div className="text-2xl">🌬️</div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-white tracking-tight leading-none">
                Vayu<span className="text-orange-400">Sync</span>
              </h1>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                PROD
              </span>
            </div>
            <p className="text-gray-400 text-[9px] leading-none mt-0.5">
              Hyperlocal Stubble Action Engine · Indo-Gangetic Plain
            </p>
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
            { id: 'MATRIX', label: 'Facility Readiness', icon: Building2 },
            { id: 'IMPACT', label: 'Preemptive ROI', icon: ShieldCheck },
            { id: 'ANALYTICS', label: 'Atmospheric Analytics', icon: TrendingUp },
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

        {/* Right: Tactical Controls & Audio */}
        <div className="flex items-center gap-2.5">
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
              <span>{dashboard.wind.speed_kmh.toFixed(0)} km/h NW</span>
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
      <div className="lg:hidden flex items-center justify-around bg-gray-900 border-b border-gray-800 p-1 text-xs">
        {[
          { id: 'MAP', label: 'Radar', icon: Map },
          { id: 'MATRIX', label: 'Facilities', icon: Building2 },
          { id: 'IMPACT', label: 'ROI Calculator', icon: ShieldCheck },
          { id: 'ANALYTICS', label: 'Analytics', icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setNavTab(id as NavTab)}
            className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold ${
              navTab === id ? 'bg-orange-500 text-black' : 'text-gray-400'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </button>
        ))}
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
            <main className="flex-1 relative bg-gray-950 overflow-hidden">
              {/* Map takes full space */}
              <div className="absolute inset-0">
                <VayuSyncMap
                  simulatedCone={simulatedCone}
                  simulatedHotspot={simulatedHotspot}
                  timelineHour={timelineHour}
                  onInstitutionClick={setSelectedInstitution}
                />
              </div>

              {/* Interactive Timeline Scrubber (Bottom Floating Widget) */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl z-20 animate-fade-in-up">
                <TimelineScrubber
                  currentHour={timelineHour}
                  onHourChange={setTimelineHour}
                  isSimulating={isSimulating}
                />
              </div>

              {/* Map overlays: Legend */}
              <div className="absolute bottom-6 left-3 hidden md:block bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl p-3 text-xs space-y-2 z-10 shadow-2xl">
                <div className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mb-1">Radar Legend</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  <span className="text-gray-300 text-[11px]">Active Stubble Fire</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-2 rounded" style={{ background: 'rgba(239,68,68,0.25)', border: '1px dashed #ef4444' }} />
                  <span className="text-gray-300 text-[11px]">Dispersion Cone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏫</span>
                  <span className="text-gray-300 text-[11px]">Schools</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏥</span>
                  <span className="text-gray-300 text-[11px]">Hospitals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏗️</span>
                  <span className="text-gray-300 text-[11px]">Construction</span>
                </div>
              </div>

              {/* Simulation active overlay banner */}
              {simulatedCone && !isSimulating && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-orange-500/20 border border-orange-500/50 backdrop-blur-md rounded-2xl px-5 py-2 text-center shadow-2xl">
                    <div className="text-orange-300 font-black text-xs">🔴 1,200 MW SIMULATED HOTSPOT ACTIVE</div>
                    <div className="text-gray-300 text-[10px] mt-0.5">
                      Ludhiana → Delhi NCR · Trajectory vectoring live
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

        {/* VIEW 2: INSTITUTIONAL READINESS MATRIX */}
        {navTab === 'MATRIX' && (
          <div className="flex-1 overflow-hidden">
            <InstitutionalMatrix
              institutions={institutions}
              alerts={alerts}
              onSelectAlert={(a) => setInspectedAlert(a)}
            />
          </div>
        )}

        {/* VIEW 3: PREEMPTIVE ACTION ROI CALCULATOR */}
        {navTab === 'IMPACT' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
            <ImpactCalculator />
          </div>
        )}

        {/* VIEW 4: ATMOSPHERIC DISPERSION ANALYTICS */}
        {navTab === 'ANALYTICS' && (
          <div className="flex-1 overflow-hidden">
            <DispersionAnalytics />
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
    </div>
  );
};

export default App;
