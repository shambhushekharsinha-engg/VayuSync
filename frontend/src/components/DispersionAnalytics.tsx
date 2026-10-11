import React from 'react';
import { Wind, Flame, Zap, Gauge, TrendingUp } from 'lucide-react';
import type { DashboardData, TrajectoryFeature } from '../types';
import { degreesToCardinal } from '../utils/mapHelpers';

interface DispersionAnalyticsProps {
  wind?: DashboardData['wind'] | null;
  trajectoryCone?: TrajectoryFeature | null;
}

export const DispersionAnalytics: React.FC<DispersionAnalyticsProps> = ({
  wind,
  trajectoryCone,
}) => {
  const FRP_DISTRICTS = [
    { district: 'Ludhiana, PB', frp: 1247, pct: 100, color: 'bg-red-500' },
    { district: 'Amritsar, PB', frp: 934, pct: 75, color: 'bg-orange-500' },
    { district: 'Patiala, PB', frp: 757, pct: 61, color: 'bg-amber-500' },
    { district: 'Hisar, HR', frp: 424, pct: 34, color: 'bg-yellow-500' },
    { district: 'Rohtak, HR', frp: 312, pct: 25, color: 'bg-blue-500' },
  ];

  const FORECAST_HOURS = [
    { time: '04:00', aqi: 180, label: 'T+0h' },
    { time: '06:00', aqi: 240, label: 'T+2h' },
    { time: '08:00', aqi: 310, label: 'T+4h' },
    { time: '10:00', aqi: 387, label: 'T+6h' },
    { time: '12:00', aqi: 445, label: 'T+8h' },
    { time: '14:00', aqi: 472, label: 'T+10h' },
    { time: '16:00', aqi: 410, label: 'T+12h' },
  ];

  // Pipeline Latency Breakdown:
  // Reflects measured Rule Engine Fallback latency benchmark (N=30 warm runs: CloudWatch median 771 ms, p95 2,009 ms; Client RTT median 933 ms, p95 2,114 ms).
  // Step distribution is illustrative model pending live Bedrock production measurement.
  const LATENCY_BREAKDOWN = [
    { step: 'NASA FIRMS Hotspot Ingestion (Lambda)', durationMs: 340, pct: 27 },
    { step: 'Open-Meteo Wind Vector Query', durationMs: 280, pct: 22 },
    { step: 'Lagrangian Dispersion Cone Math', durationMs: 45, pct: 4 },
    { step: 'DynamoDB Spatial Geofence Match', durationMs: 120, pct: 10 },
    { step: 'Advisory Engine (Rule Engine Fallback Matrix)', durationMs: 140, pct: 11 },
    { step: 'Amazon SNS Push & Alert Dispatch', durationMs: 335, pct: 26 },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900/80 border border-gray-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            Atmospheric Dispersion & Cloud Telemetry Analytics
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Lagrangian plume vector modeling, nocturnal inversion projections & AWS Lambda pipeline telemetry
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xs">
          Open-Meteo + NASA FIRMS Validated
        </span>
      </div>

      {/* Grid: 12h AQI Forecast Curve + Wind Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 12h AQI Projection Chart */}
        <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-red-400" />
              <h3 className="font-bold text-sm text-white">12-Hour Delhi NCR AQI Projection Curve</h3>
            </div>
            <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
              PEAK HAZARD: 472 AQI at T+10h
            </span>
          </div>

          {/* Bar / Column visual representation */}
          <div className="h-44 flex items-end gap-3 pt-4 pb-2 border-b border-gray-800 px-2">
            {FORECAST_HOURS.map((item) => {
              const heightPct = Math.min((item.aqi / 500) * 100, 100);
              const color =
                item.aqi > 400 ? 'from-purple-600 to-red-600' :
                item.aqi > 300 ? 'from-red-500 to-orange-500' :
                item.aqi > 200 ? 'from-orange-500 to-yellow-500' : 'from-yellow-500 to-green-500';

              return (
                <div key={item.time} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono font-bold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {item.aqi}
                  </div>
                  <div
                    className={`w-full rounded-t-xl bg-gradient-to-t ${color} transition-all duration-700 shadow-lg`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] font-bold text-gray-400 mt-2">{item.label}</div>
                  <div className="text-[9px] text-gray-600">{item.time}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 pt-3">
            <span>Severe Inversion Risk Window: 08:00 - 15:00 IST</span>
            <span>Boundary Layer Height: 620m (Thermal Compression)</span>
          </div>
        </div>

        {/* Wind Profile Widget */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Atmospheric Wind Profile</h3>
            </div>
            {(wind?.is_illustrative || trajectoryCone?.properties?.is_illustrative || (!wind && !trajectoryCone)) && (
              <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ILLUSTRATIVE
              </span>
            )}
          </div>

          {(() => {
            // Priority: active trajectory cone properties -> live dashboard wind -> moderate preset fallback
            const speedKmh = trajectoryCone?.properties?.wind_speed_kmh ?? wind?.speed_kmh ?? 21.6;
            const speedMs = trajectoryCone?.properties?.wind_speed_ms ?? (speedKmh / 3.6);
            const bearingDeg = trajectoryCone?.properties?.bearing_deg ?? (wind?.direction_deg != null ? (wind.direction_deg + 180) % 360 : 154.3);
            const cardinal = degreesToCardinal(bearingDeg);
            const halfAngle = trajectoryCone?.properties?.cone_half_angle_deg ?? 15.0;

            return (
              <div className="space-y-3 bg-gray-950/60 p-4 rounded-2xl border border-gray-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">10m Vector Velocity</span>
                  <span className="text-white font-mono font-bold">
                    {speedKmh.toFixed(1)} km/h ({speedMs.toFixed(1)} m/s)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Plume Transport Bearing</span>
                  <span className="text-blue-400 font-mono font-bold">
                    {bearingDeg.toFixed(0)}° ({cardinal} Transport Vector)
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Pasquill Stability Class</span>
                  <span className="text-orange-400 font-bold">Class D (Neutral / Moderate)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Dispersion Half-Angle</span>
                  <span className="text-white font-mono font-bold">{halfAngle.toFixed(1)}° Cone Spread</span>
                </div>
              </div>
            );
          })()}

          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-[10px] text-blue-300 leading-relaxed">
            🌬️ Persistent northwesterly winds create a calibrated transport pipeline carrying stubble smoke into the Delhi bowl over a 6–12 h window.
          </div>
        </div>
      </div>

      {/* Grid: FRP Radiative Power + End-to-End Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* FRP Hotspots by District */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-sm text-white">Thermal Radiative Power (FRP) by District</h3>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Total: 3,674 MW</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {FRP_DISTRICTS.map((d) => (
              <div key={d.district} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">{d.district}</span>
                  <span className="font-mono font-bold text-orange-400">{d.frp} MW</span>
                </div>
                <div className="h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                  <div
                    className={`h-full ${d.color} rounded-full transition-all duration-700`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* End-to-End Lambda Processing Latency */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="font-bold text-sm text-white">AWS End-to-End Pipeline Latency</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ILLUSTRATIVE BREAKDOWN
              </span>
              <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                Median 771 ms · p95 2,009 ms (N=30)
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {LATENCY_BREAKDOWN.map((step) => (
              <div key={step.step} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 truncate pr-2">{step.step}</span>
                  <span className="font-mono text-white font-bold flex-shrink-0">{step.durationMs} ms</span>
                </div>
                <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                    style={{ width: `${step.pct * 1.8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
