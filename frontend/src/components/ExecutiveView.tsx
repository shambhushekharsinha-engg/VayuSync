import React from 'react';
import { Flame, ShieldCheck, Clock, Sparkles, ChevronRight, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import type { AlertLog, DashboardData, FireHotspot, Institution, TrajectoryFeature } from '../types';
import type { GlobalRegion } from '../data/globalRegions';
import VayuSyncMap from './VayuSyncMap';
import { TimelineScrubber } from './TimelineScrubber';
import { soundEngine } from '../utils/audio';
import { formatArrivalCountdown } from '../utils/mapHelpers';

interface ExecutiveViewProps {
  activeRegion: GlobalRegion;
  simulatedCone: TrajectoryFeature | null;
  simulatedHotspot: FireHotspot | null;
  timelineHour: number;
  onHourChange: (hour: number) => void;
  alerts: AlertLog[];
  institutions: Institution[];
  dashboard: DashboardData | null;
  isSimulating: boolean;
  onSimulate: () => void;
  onReset: () => void;
  onSelectAlert: (alert: AlertLog) => void;
  onSwitchToTactical: () => void;
}

export const ExecutiveView: React.FC<ExecutiveViewProps> = ({
  activeRegion,
  simulatedCone,
  simulatedHotspot,
  timelineHour,
  onHourChange,
  alerts,
  institutions,
  dashboard,
  isSimulating,
  onSimulate,
  onReset,
  onSelectAlert,
  onSwitchToTactical,
}) => {
  // Extract top 3 active or benchmark alerts for immediate executive triage
  const topAlerts = alerts.slice(0, 3);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-950 p-2 sm:p-4 space-y-2.5 sm:space-y-3">
      {/* ─── EXECUTIVE THREAT & ACTION BANNER ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 flex-shrink-0">
        {/* Metric 1: Threat Level */}
        <div className="bg-gradient-to-br from-red-950/60 to-gray-900 border border-red-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-[10px] uppercase font-bold">
            <span>Threat Corridor</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-white font-black text-sm sm:text-base mt-1 flex items-center gap-1.5 truncate">
            <span className="text-red-400">CRITICAL</span>
            <span className="text-gray-400 text-xs truncate">· Punjab → Delhi</span>
          </div>
          <div className="text-gray-400 text-[10px] mt-0.5 truncate">
            {dashboard?.hotspot_states?.join(', ') || 'Punjab, Haryana'} plume trajectory
          </div>
        </div>

        {/* Metric 2: Peak PM2.5 Forecast */}
        <div className="bg-gradient-to-br from-orange-950/60 to-gray-900 border border-orange-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg">
          <div className="text-gray-400 text-[10px] uppercase font-bold">
            Forecast Peak Ingress
          </div>
          <div className="text-orange-400 font-mono font-black text-sm sm:text-base mt-1">
            {dashboard?.aqi_delhi_ncr?.pm25_ugm3 ? Math.round(dashboard.aqi_delhi_ncr.pm25_ugm3 * 1.3) : 412} <span className="text-xs font-normal text-gray-400">µg/m³</span>
          </div>
          <div className="text-gray-400 text-[10px] mt-0.5">
            Hazardous boundary layer inversion
          </div>
        </div>

        {/* Metric 3: Preemptive Lead Time */}
        <div className="bg-gradient-to-br from-blue-950/60 to-gray-900 border border-blue-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg">
          <div className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>Preemptive Window</span>
          </div>
          <div className="text-blue-300 font-black text-sm sm:text-base mt-1">
            5.8 – 6.5 Hours
          </div>
          <div className="text-gray-400 text-[10px] mt-0.5">
            Lead time prior to ground fumigation
          </div>
        </div>

        {/* Metric 4: Protected Vulnerable Footprint */}
        <div className="bg-gradient-to-br from-green-950/60 to-gray-900 border border-green-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg">
          <div className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <span>Institutional Protection</span>
          </div>
          <div className="text-green-300 font-black text-sm sm:text-base mt-1">
            {institutions.length} Facilities Active
          </div>
          <div className="text-gray-400 text-[10px] mt-0.5">
            Automated SMS & Webhook Protocols
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN EXECUTIVE COCKPIT ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 gap-2.5 sm:gap-3 overflow-hidden">
        {/* LEFT COLUMN: Clean Geospatial Threat Map with Quick Demo Trigger */}
        <div className="flex-1 relative bg-gray-900/80 border border-gray-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl min-h-[340px]">
          {/* Map Header Overlay */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
            <div className="bg-gray-950/90 backdrop-blur-md border border-gray-700/80 rounded-2xl px-3 py-1.5 shadow-xl pointer-events-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              <span className="text-xs font-black text-white">Live Dispersion Vector</span>
              <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">154° SSE corridor</span>
            </div>

            {/* Quick Demo Button for Evaluators */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onSimulate();
                }}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-xl shadow-red-950/80 active:scale-95 transition-all"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
                <span>{isSimulating ? 'EXECUTING PIPELINE...' : 'DEMO: SIMULATE STUBBLE SURGE'}</span>
              </button>

              {simulatedCone && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onReset();
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gray-800/90 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Map Canvas */}
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              <VayuSyncMap
                activeRegion={activeRegion}
                isGlobeView={false}
                simulatedCone={simulatedCone}
                simulatedHotspot={simulatedHotspot}
                timelineHour={timelineHour}
                onInstitutionClick={() => {}}
              />
            </div>

            {/* Scrubber at bottom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-xl z-20">
              <TimelineScrubber
                currentHour={timelineHour}
                onHourChange={onHourChange}
                isSimulating={isSimulating}
                trajectoryCone={simulatedCone || activeRegion.trajectoryCone}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Executive Facility Directives & Dual-Engine Verification */}
        <div className="w-full lg:w-96 flex flex-col bg-gray-900/80 border border-gray-800 rounded-3xl p-3 sm:p-4 shadow-2xl flex-shrink-0 overflow-hidden">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-800 flex-shrink-0">
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
                <span>High-Priority Directives</span>
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Preemptive actions for at-risk Delhi NCR facilities
              </p>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Cpu className="w-3 h-3 text-purple-400" />
              <span>Dual-Tier Engine</span>
            </div>
          </div>

          {/* Directive Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-2.5 pr-0.5">
            {topAlerts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                No active critical alerts. Trigger a simulation to view live directives.
              </div>
            ) : (
              topAlerts.map((alert) => {
                const isBedrock = alert.advisory_source === 'bedrock';
                const icon =
                  alert.facility_type === 'Hospital' ? '🏥' :
                  alert.facility_type === 'Construction' ? '🏗️' : '🏫';

                return (
                  <div
                    key={alert.alert_id}
                    className="bg-gray-950/80 border border-gray-800 hover:border-gray-700 rounded-2xl p-3 space-y-2 transition-all shadow-md group"
                  >
                    {/* Header: Facility & Arrival */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate group-hover:text-orange-300 transition-colors">
                            {alert.institution_name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {alert.facility_type} · Arriving in {formatArrivalCountdown(alert.predicted_arrival_utc)}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        alert.impact_severity === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      }`}>
                        {alert.impact_severity}
                      </span>
                    </div>

                    {/* Operational Directives Preview */}
                    <div className="bg-gray-900/70 rounded-xl p-2 border border-gray-800/80 text-[11px] text-gray-300 space-y-1">
                      <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider">
                        Mandatory Action Protocol:
                      </div>
                      <div className="text-gray-200 font-medium line-clamp-2">
                        {alert.recommended_actions?.[0] || 'Initiate preemptive indoor air filtration protocol.'}
                      </div>
                    </div>

                    {/* Footer: Honest Engine Badge & Inspection Trigger */}
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {/* Engine Badge */}
                      <span className={`px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 ${
                        isBedrock
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {isBedrock ? (
                          <>
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Bedrock Claude</span>
                          </>
                        ) : (
                          <>
                            <span className="text-amber-400 font-mono text-xs">⚡</span>
                            <span>Rule Matrix Failover</span>
                          </>
                        )}
                      </span>

                      {/* Inspect Button */}
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          onSelectAlert(alert);
                        }}
                        className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 hover:underline"
                      >
                        <span>Inspect Payload</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Switcher: Jump to Full Tactical Cockpit */}
          <div className="pt-2 border-t border-gray-800 flex-shrink-0">
            <button
              onClick={() => {
                soundEngine.playClick();
                onSwitchToTactical();
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-gray-700 shadow-md group"
            >
              <span>Explore Full Tactical Cockpit (7 In-Depth Modules)</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
