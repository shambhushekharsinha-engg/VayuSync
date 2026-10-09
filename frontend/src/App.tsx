import React, { useState, useEffect, useCallback } from 'react';
import VayuSyncMap from './components/VayuSyncMap';
import AlertSidebar from './components/AlertSidebar';
import SimulateTrigger from './components/SimulateTrigger';
import SystemStatus from './components/SystemStatus';
import MetricsBar from './components/MetricsBar';
import type {
  AlertLog, DashboardData, Institution,
  SimulationResult, SystemStatus as SystemStatusType,
  TrajectoryFeature, FireHotspot,
} from './types';
import { apiClient } from './utils/api';
import { Wind, Satellite, Github, Info } from 'lucide-react';

const App: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sysStatus, setSysStatus] = useState<SystemStatusType | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCone, setSimulatedCone] = useState<TrajectoryFeature | null>(null);
  const [simulatedHotspot, setSimulatedHotspot] = useState<FireHotspot | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  // ─── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dashData, alertData, statusData] = await Promise.all([
          apiClient.getDashboard(),
          apiClient.getAlerts(20),
          apiClient.getStatus(),
        ]);
        setDashboard(dashData);
        setAlerts(alertData.alerts);
        setSysStatus(statusData);
      } catch (err) {
        console.warn('Initial data load failed — using mock data');
        setDashboard(apiClient.mockDashboard);
        setAlerts(apiClient.mockAlerts);
        setSysStatus(apiClient.mockStatus);
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
          // Merge new alerts, dedup by alert_id
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
  }, []);

  // Wrap SimulateTrigger to intercept start
  const SimulateTriggerWrapper = () => (
    <SimulateTrigger
      onSimulationComplete={(result) => {
        handleSimulationComplete(result);
      }}
      onReset={handleReset}
    />
  );

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 z-10">
        {/* Logo + title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="text-2xl">🌬️</div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="font-black text-base text-white tracking-tight leading-none">
              Vayu<span className="text-orange-400">Sync</span>
            </h1>
            <p className="text-gray-500 text-[9px] leading-none mt-0.5">
              Hyperlocal Air Safety Engine · Delhi NCR
            </p>
          </div>
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span className="text-red-400 text-[9px] font-bold tracking-wide">LIVE</span>
          </div>
          {/* Simulation active badge */}
          {isSimulating && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 border border-orange-500/40 rounded-full animate-pulse">
              <span className="text-orange-400 text-[9px] font-bold">⚡ PIPELINE EXECUTING</span>
            </div>
          )}
        </div>

        {/* Center: Event banner */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-800/60 border border-gray-700 rounded-lg">
          <Satellite className="w-3 h-3 text-blue-400" />
          <span className="text-gray-400 text-[10px]">
            Bharat Builds 2026 · Track 1: Air · <span className="text-yellow-400 font-semibold">₹2,00,000 Target</span>
          </span>
        </div>

        {/* Right: Wind + links */}
        <div className="flex items-center gap-3">
          {dashboard?.wind && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Wind className="w-3.5 h-3.5 text-blue-400" />
              <span>{dashboard.wind.speed_kmh.toFixed(0)} km/h NW</span>
            </div>
          )}
          <a
            href="https://github.com/shambhushekharsinha-engg/VayuSync"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── METRICS BAR ────────────────────────────────────────────────────── */}
      <MetricsBar dashboard={dashboard} isSimulating={isSimulating} />

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR: Alerts + Simulate */}
        <aside className="w-72 flex-shrink-0 flex flex-col bg-gray-950 border-r border-gray-800 overflow-hidden">
          {/* Simulate trigger (top, pinned) */}
          <div className="p-3 border-b border-gray-800 flex-shrink-0 bg-gray-900/50">
            <div className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-orange-400" />
              Live Demo — Hackathon Trigger
            </div>
            <SimulateTriggerWrapper />
          </div>

          {/* Alert feed (scrollable) */}
          <div className="flex-1 overflow-hidden p-3">
            <AlertSidebar alerts={alerts} isSimulating={isSimulating} />
          </div>
        </aside>

        {/* CENTER: Map (hero element) */}
        <main className="flex-1 relative bg-gray-950 overflow-hidden">
          {/* Map takes full space */}
          <div className="absolute inset-0">
            <VayuSyncMap
              simulatedCone={simulatedCone}
              simulatedHotspot={simulatedHotspot}
              onInstitutionClick={setSelectedInstitution}
            />
          </div>

          {/* Map overlays */}
          {/* Legend */}
          <div className="absolute bottom-8 left-3 bg-gray-900/85 backdrop-blur-sm border border-gray-700 rounded-xl p-3 text-xs space-y-2 z-10">
            <div className="text-gray-400 text-[9px] uppercase tracking-widest font-semibold mb-1">Legend</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <span className="text-gray-300">Fire Hotspot (VIIRS)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-2 rounded" style={{ background: 'rgba(239,68,68,0.2)', border: '1px dashed #ef4444' }} />
              <span className="text-gray-300">6-hr Smoke Trajectory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🏫</span>
              <span className="text-gray-300">School (alerted)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🏥</span>
              <span className="text-gray-300">Hospital (alerted)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🏗️</span>
              <span className="text-gray-300">Construction (alerted)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">➤</span>
              <span className="text-gray-300">Wind vector (NW → SE)</span>
            </div>
          </div>

          {/* Simulation active overlay */}
          {simulatedCone && !isSimulating && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-orange-500/20 border border-orange-500/50 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <div className="text-orange-300 font-bold text-xs">🔴 SIMULATED HOTSPOT ACTIVE</div>
                <div className="text-gray-400 text-[10px] mt-0.5">
                  Ludhiana, Punjab → Delhi NCR · 6h trajectory displayed
                </div>
              </div>
            </div>
          )}

          {/* Institution detail panel */}
          {selectedInstitution && (
            <div className="absolute top-3 right-3 w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 z-10 animate-fade-in-up">
              <button
                onClick={() => setSelectedInstitution(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-400 text-lg leading-none"
              >
                ×
              </button>
              <div className="text-sm mb-1">
                {selectedInstitution.facility_type === 'School' ? '🏫' :
                 selectedInstitution.facility_type === 'Hospital' ? '🏥' :
                 selectedInstitution.facility_type === 'Construction' ? '🏗️' : '🏛️'}
                {' '}<span className="font-bold text-white">{selectedInstitution.name}</span>
              </div>
              <div className="text-gray-400 text-[10px] mb-3">{selectedInstitution.district}</div>
              <div className="space-y-1.5">
                {selectedInstitution.current_risk && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Risk Status</span>
                    <span className={`font-bold ${
                      selectedInstitution.current_risk === 'CRITICAL' ? 'text-red-400' :
                      selectedInstitution.current_risk === 'HIGH' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>{selectedInstitution.current_risk}</span>
                  </div>
                )}
                {selectedInstitution.student_count && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Students</span>
                    <span className="text-white">{selectedInstitution.student_count.toLocaleString()}</span>
                  </div>
                )}
                {selectedInstitution.bed_count && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Beds</span>
                    <span className="text-white">{selectedInstitution.bed_count.toLocaleString()}</span>
                  </div>
                )}
                {selectedInstitution.worker_count && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Workers</span>
                    <span className="text-white">{selectedInstitution.worker_count.toLocaleString()}</span>
                  </div>
                )}
                {selectedInstitution.predicted_pm25 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Est. PM2.5</span>
                    <span className="text-red-400 font-bold">{selectedInstitution.predicted_pm25} µg/m³</span>
                  </div>
                )}
              </div>
              {selectedInstitution.has_active_alert && (
                <div className="mt-3 text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Alert dispatched via SNS
                </div>
              )}
            </div>
          )}

          {/* Data source attribution */}
          <div className="absolute bottom-2 right-3 text-[9px] text-gray-700 z-10">
            NASA FIRMS VIIRS · Open-Meteo · AWS Bedrock
          </div>
        </main>

        {/* RIGHT SIDEBAR: System status */}
        <aside className="w-64 flex-shrink-0 bg-gray-950 border-l border-gray-800 overflow-hidden">
          <div className="h-full overflow-y-auto p-3">
            <div className="text-gray-500 text-[9px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-green-400" />
              System Status
            </div>
            <SystemStatus status={sysStatus} dashboard={dashboard} />
          </div>
        </aside>
      </div>

      {/* ─── ABOUT MODAL ────────────────────────────────────────────────────── */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🌬️</span>
              <div>
                <h2 className="font-black text-xl">Vayu<span className="text-orange-400">Sync</span></h2>
                <p className="text-gray-400 text-sm">Hyperlocal Stubble Exposure & Institutional Action Engine</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              VayuSync shifts the paradigm from <span className="text-orange-400">reactive AQI tracking</span> to{' '}
              <span className="text-green-400">preemptive institutional automation</span> — alerting schools, hospitals,
              and construction sites <strong>6–12 hours before</strong> toxic smoke arrives.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { icon: '🛰️', label: 'NASA FIRMS', desc: 'Live VIIRS thermal hotspots' },
                { icon: '🌊', label: 'Open-Meteo', desc: 'Real-time 10m wind vectors' },
                { icon: '🤖', label: 'Amazon Bedrock', desc: 'Claude 3 Haiku advisories' },
                { icon: '📱', label: 'Amazon SNS', desc: 'SMS + email dispatch' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="bg-gray-800/60 rounded-xl p-3">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-white text-xs font-bold">{label}</div>
                  <div className="text-gray-400 text-[10px]">{desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-xs text-center text-orange-300">
              🏆 Bharat Builds 2026 · Track 1: Air · Target: ₹2,00,000
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="mt-4 w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── CSS for scrollbar ───────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #030712; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #374151 #030712; }
      `}</style>
    </div>
  );
};

export default App;
