import React, { useState } from 'react';
import { Search, Building2, Sparkles } from 'lucide-react';
import type { Institution, AlertLog } from '../types';
import { soundEngine } from '../utils/audio';

interface InstitutionalMatrixProps {
  institutions: Institution[];
  alerts: AlertLog[];
  onSelectAlert: (alert: AlertLog) => void;
}

export const InstitutionalMatrix: React.FC<InstitutionalMatrixProps> = ({
  institutions,
  alerts,
  onSelectAlert,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filtered = institutions.filter((inst) => {
    const matchesType = filterType === 'ALL' || inst.facility_type.toUpperCase() === filterType;
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.district.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-gray-950 p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden">
      {/* Top action bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gray-900/80 border border-gray-800 p-3.5 sm:p-4 rounded-2xl flex-shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <span>Institutional Readiness & Geofence Matrix</span>
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">
            Real-time exposure profiling & automated protocol compliance across Delhi NCR
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facility or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-52 bg-gray-950 border border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 border border-gray-800 rounded-xl text-xs overflow-x-auto no-scrollbar">
            {['ALL', 'SCHOOL', 'HOSPITAL', 'CONSTRUCTION'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  soundEngine.playClick();
                  setFilterType(type);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex-shrink-0 ${
                  filterType === type
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Card List (visible on < md) */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {filtered.map((inst) => {
          const activeAlert = alerts.find((a) => a.institution_id === inst.institution_id);
          const risk = inst.current_risk ?? (activeAlert ? activeAlert.impact_severity : 'SAFE');
          const icon =
            inst.facility_type === 'School' ? '🏫' :
            inst.facility_type === 'Hospital' ? '🏥' :
            inst.facility_type === 'Construction' ? '🏗️' : '🏛️';
          const count = (inst.student_count || inst.bed_count || inst.worker_count || inst.personnel_count || 500).toLocaleString();
          const unit =
            inst.facility_type === 'School' ? 'students' :
            inst.facility_type === 'Hospital' ? 'beds' :
            inst.facility_type === 'Construction' ? 'workers' : 'personnel';
          const pm25 = inst.predicted_pm25 ?? (activeAlert ? Math.round(activeAlert.predicted_pm25_ugm3) : 290);

          return (
            <div
              key={inst.institution_id}
              className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white leading-snug">{inst.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {inst.facility_type} · {inst.district}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                  risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' :
                  risk === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                  risk === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                  'bg-green-500/10 text-green-400 border-green-500/30'
                }`}>
                  {risk}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-950/70 p-2.5 rounded-xl border border-gray-800/80 text-center text-xs">
                <div>
                  <div className="text-[9px] text-gray-500">Capacity</div>
                  <div className="font-mono font-bold text-white text-[11px] mt-0.5">{count} {unit}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Est. PM2.5</div>
                  <div className="font-mono font-bold text-red-400 text-[11px] mt-0.5">{pm25} µg/m³</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Filtration</div>
                  <div className="font-bold text-green-400 text-[10px] mt-0.5">HEPA Active</div>
                </div>
              </div>

              {activeAlert ? (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectAlert(activeAlert);
                  }}
                  className="w-full py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>View AI Action Protocol</span>
                </button>
              ) : (
                <div className="text-center text-gray-500 text-[10px] py-1">Standby · No Active Alert</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Main Grid Table (visible on md+) */}
      <div className="hidden md:flex flex-1 bg-gray-900/60 border border-gray-800 rounded-3xl overflow-hidden flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/90 border-b border-gray-800 text-gray-400 text-[10px] uppercase tracking-wider sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="py-3 px-4">Facility Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">District</th>
                <th className="py-3 px-3">Capacity / Vulnerable Count</th>
                <th className="py-3 px-3">Threat Level</th>
                <th className="py-3 px-3">Est. PM2.5</th>
                <th className="py-3 px-3">HVAC / HEPA</th>
                <th className="py-3 px-4 text-right">Bedrock Action Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filtered.map((inst) => {
                const activeAlert = alerts.find((a) => a.institution_id === inst.institution_id);
                const risk = inst.current_risk ?? (activeAlert ? activeAlert.impact_severity : 'SAFE');

                return (
                  <tr
                    key={inst.institution_id}
                    className="hover:bg-gray-800/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-base">
                        {inst.facility_type === 'School' ? '🏫' :
                         inst.facility_type === 'Hospital' ? '🏥' :
                         inst.facility_type === 'Construction' ? '🏗️' : '🏛️'}
                      </span>
                      <div>
                        <div className="group-hover:text-orange-400 transition-colors">{inst.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{inst.institution_id}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                        {inst.facility_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-gray-400">{inst.district}</td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-white">
                        {(inst.student_count || inst.bed_count || inst.worker_count || inst.personnel_count || 500).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">
                        {inst.facility_type === 'School' ? 'students' :
                         inst.facility_type === 'Hospital' ? 'beds' :
                         inst.facility_type === 'Construction' ? 'workers' : 'personnel'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        risk === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' :
                        risk === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                        risk === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                        'bg-green-500/10 text-green-400 border-green-500/30'
                      }`}>
                        {risk}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-red-400">
                      {inst.predicted_pm25 ?? (activeAlert ? Math.round(activeAlert.predicted_pm25_ugm3) : 290)} µg/m³
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        HEPA Integrated
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {activeAlert ? (
                        <button
                          onClick={() => {
                            soundEngine.playClick();
                            onSelectAlert(activeAlert);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/40 text-[11px] font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 ml-auto"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>View Protocol</span>
                        </button>
                      ) : (
                        <span className="text-gray-500 text-[10px]">Standby · No Alert</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
