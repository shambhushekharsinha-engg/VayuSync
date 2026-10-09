import React, { useState } from 'react';
import { Navigation, ShieldCheck, ArrowRight, Sparkles, MapPin, Wind, Bike, Car, Footprints } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface RouteOption {
  id: 'standard' | 'shielded';
  name: string;
  distanceKm: number;
  durationMin: number;
  avgPm25: number;
  totalInhaledUg: number;
  plumeExposurePct: number;
  healthRiskTier: 'HAZARDOUS' | 'MODERATE' | 'SAFE';
  corridorNotes: string;
  waypoints: string[];
}

export const CitizenExposureRouteOptimizer: React.FC = () => {
  const [startPoint, setStartPoint] = useState('Connaught Place (Central Delhi)');
  const [destination, setDestination] = useState('Dwarka Expressway / IGI Aerocity');
  const [commuteMode, setCommuteMode] = useState<'CAR' | 'TWO_WHEELER' | 'WALK'>('TWO_WHEELER');
  const [activeRoute, setActiveRoute] = useState<'shielded' | 'standard'>('shielded');

  const ROUTES: Record<'standard' | 'shielded', RouteOption> = {
    standard: {
      id: 'standard',
      name: 'Default Direct Arterial (Ring Road → NH-48)',
      distanceKm: 24.2,
      durationMin: 42,
      avgPm25: 415,
      totalInhaledUg: commuteMode === 'WALK' ? 1450 : commuteMode === 'TWO_WHEELER' ? 980 : 380,
      plumeExposurePct: 88,
      healthRiskTier: 'HAZARDOUS',
      corridorNotes: 'Intersects directly through the 1200 MW incoming Ludhiana stubble plume corridor. Heavy particle stagnation in Ring Road canyon.',
      waypoints: ['Connaught Place', 'Dhaula Kuan Arterial', 'Mahipalpur Underpass', 'Dwarka Expressway'],
    },
    shielded: {
      id: 'shielded',
      name: 'VayuSync Clean Wind Vector Shielded Corridor',
      distanceKm: 27.8,
      durationMin: 47,
      avgPm25: 142,
      totalInhaledUg: commuteMode === 'WALK' ? 490 : commuteMode === 'TWO_WHEELER' ? 330 : 120,
      plumeExposurePct: 14,
      healthRiskTier: 'SAFE',
      corridorNotes: 'Rerouted along the South-East aerodynamic lee corridor with ridge canopy tree buffering, bypassing peak inversion plume by 65%.',
      waypoints: ['Connaught Place', 'Chanakyapuri Green Belt', 'Vasant Kunj Ridge Parkway', 'Dwarka Sector 21'],
    },
  };

  const selected = ROUTES[activeRoute];
  const avertedPm25 = ROUTES.standard.totalInhaledUg - ROUTES.shielded.totalInhaledUg;
  const reductionPct = Math.round((1 - ROUTES.shielded.avgPm25 / ROUTES.standard.avgPm25) * 100);

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/80 border border-gray-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Navigation className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Citizen Exposure Route Optimizer (Aero-Routing)
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">
                AI-driven commute rerouting around dynamic dispersion cone plumes & local wind vector stagnation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-2xl border border-gray-800 text-xs text-gray-300">
          <Wind className="w-4 h-4 text-blue-400 animate-spin" />
          <span>Real-time Wind Vector Shielding: <strong>Active (315° NW)</strong></span>
        </div>
      </div>

      {/* Origin & Destination Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-900/60 border border-gray-800 p-4 rounded-3xl shadow-2xl">
        {/* Origin */}
        <div>
          <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1 block">Origin Starting Node</label>
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 px-3 py-2 rounded-2xl text-xs text-white">
            <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <select
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              className="bg-transparent text-white w-full focus:outline-none"
            >
              <option value="Connaught Place (Central Delhi)">Connaught Place (Central Delhi)</option>
              <option value="AIIMS / Safdarjung Hospital (South Delhi)">AIIMS / Safdarjung Hospital (South Delhi)</option>
              <option value="Model Town / Rohini (North Delhi)">Model Town / Rohini (North Delhi)</option>
              <option value="Noida Sector 62 (East NCR)">Noida Sector 62 (East NCR)</option>
            </select>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1 block">Destination Node</label>
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 px-3 py-2 rounded-2xl text-xs text-white">
            <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-transparent text-white w-full focus:outline-none"
            >
              <option value="Dwarka Expressway / IGI Aerocity">Dwarka Expressway / IGI Aerocity</option>
              <option value="Cyber City / Gurugram Hub">Cyber City / Gurugram Hub</option>
              <option value="DPS R.K. Puram Campus">DPS R.K. Puram Campus</option>
              <option value="Pragati Maidan Corridor">Pragati Maidan Corridor</option>
            </select>
          </div>
        </div>

        {/* Commute Mode */}
        <div>
          <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-1 block">Exposure Mode</label>
          <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 border border-gray-800 rounded-2xl">
            {[
              { id: 'TWO_WHEELER', label: 'Bike', icon: Bike },
              { id: 'CAR', label: 'AC Car', icon: Car },
              { id: 'WALK', label: 'Walk', icon: Footprints },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  soundEngine.playClick();
                  setCommuteMode(id as typeof commuteMode);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  commuteMode === id
                    ? 'bg-orange-500 text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Grid: Standard Route vs VayuSync Shielded Route */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route 1: Standard Arterial */}
        <div
          onClick={() => {
            soundEngine.playClick();
            setActiveRoute('standard');
          }}
          className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeRoute === 'standard'
              ? 'bg-gray-900 border-red-500 shadow-xl shadow-red-950/40 ring-1 ring-red-500/50'
              : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
              Direct Arterial Route
            </span>
            <span className="text-red-400 font-mono text-xs font-black">
              PLUME EXPOSURE: 88%
            </span>
          </div>

          <h3 className="font-black text-white text-base mb-1">{ROUTES.standard.name}</h3>
          <p className="text-gray-400 text-xs leading-relaxed mb-4">{ROUTES.standard.corridorNotes}</p>

          <div className="grid grid-cols-3 gap-2 bg-gray-950/80 p-3 rounded-2xl border border-gray-800 text-center">
            <div>
              <div className="text-[10px] text-gray-500">Commute Time</div>
              <div className="text-white font-mono font-bold text-sm mt-0.5">{ROUTES.standard.durationMin} mins</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Avg Corridor PM2.5</div>
              <div className="text-red-400 font-mono font-bold text-sm mt-0.5">{ROUTES.standard.avgPm25} µg/m³</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Est. Inhaled Mass</div>
              <div className="text-red-400 font-mono font-black text-sm mt-0.5">{ROUTES.standard.totalInhaledUg} µg</div>
            </div>
          </div>
        </div>

        {/* Route 2: VayuSync Shielded Corridor */}
        <div
          onClick={() => {
            soundEngine.playClick();
            setActiveRoute('shielded');
          }}
          className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
            activeRoute === 'shielded'
              ? 'bg-gray-900 border-green-500 shadow-xl shadow-green-950/40 ring-1 ring-green-500/50'
              : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-green-400" />
              VayuSync Recommended Shielded Path
            </span>
            <span className="text-green-400 font-mono text-xs font-black">
              -{reductionPct}% EXPOSURE CUT
            </span>
          </div>

          <h3 className="font-black text-white text-base mb-1">{ROUTES.shielded.name}</h3>
          <p className="text-gray-400 text-xs leading-relaxed mb-4">{ROUTES.shielded.corridorNotes}</p>

          <div className="grid grid-cols-3 gap-2 bg-gray-950/80 p-3 rounded-2xl border border-gray-800 text-center">
            <div>
              <div className="text-[10px] text-gray-500">Commute Time</div>
              <div className="text-white font-mono font-bold text-sm mt-0.5">
                {ROUTES.shielded.durationMin} mins <span className="text-gray-500 text-[10px]">(+5m)</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Avg Corridor PM2.5</div>
              <div className="text-green-400 font-mono font-bold text-sm mt-0.5">{ROUTES.shielded.avgPm25} µg/m³</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Est. Inhaled Mass</div>
              <div className="text-green-400 font-mono font-black text-sm mt-0.5">{ROUTES.shielded.totalInhaledUg} µg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Metric Strip */}
      <div className="bg-gradient-to-r from-green-950/40 via-cyan-950/40 to-gray-900 border border-green-500/30 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-green-500/20 text-green-400 border border-green-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Lung Protection Payoff for this Commute</div>
            <div className="text-[11px] text-gray-400">Taking the shielded route bypasses <strong>{avertedPm25.toLocaleString()} µg</strong> of direct microscopic lung deposition.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-green-300 font-mono font-black px-3 py-1 rounded-xl bg-green-500/10 border border-green-500/30">
            Equivalent to avoiding 4.2 cigarettes of toxic smoke inhalation
          </span>
        </div>
      </div>

      {/* Step Waypoint Breadcrumb */}
      <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-3xl">
        <div className="text-[10px] uppercase font-black tracking-wider text-gray-400 mb-2">Turn-by-Turn Safe Corridor Nodes</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
          {selected.waypoints.map((point, index) => (
            <React.Fragment key={point}>
              <span className="px-3 py-1 rounded-xl bg-gray-950 border border-gray-800 font-medium">
                {point}
              </span>
              {index < selected.waypoints.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
