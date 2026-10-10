import React, { useState } from 'react';
import { Users, HeartPulse, IndianRupee, Shield, Check, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { ShinyText, TrueFocus, WindWaveBackground } from './reactbits';

interface ActionItem {
  id: string;
  name: string;
  category: 'School' | 'Hospital' | 'Construction';
  people: number;
  pm25AvoidedGrams: number;
  costSavedInr: number; // in INR
  active: boolean;
}

const INITIAL_ACTIONS: ActionItem[] = [
  {
    id: 'act-1',
    name: 'DPS RK Puram & KV Dwarka: Cancel Morning Assembly & PE',
    category: 'School',
    people: 7300,
    pm25AvoidedGrams: 820,
    costSavedInr: 1850000,
    active: true,
  },
  {
    id: 'act-2',
    name: 'AIIMS & Medanta: Shift HVAC to 100% HEPA Recirculation',
    category: 'Hospital',
    people: 3728,
    pm25AvoidedGrams: 540,
    costSavedInr: 2150000,
    active: true,
  },
  {
    id: 'act-3',
    name: 'Dwarka Expressway: Suspend Heavy Earth Excavation',
    category: 'Construction',
    people: 850,
    pm25AvoidedGrams: 310,
    costSavedInr: 580000,
    active: true,
  },
  {
    id: 'act-4',
    name: 'Ryan International: Pre-issue N95 to Transport Drivers & Guards',
    category: 'School',
    people: 2800,
    pm25AvoidedGrams: 280,
    costSavedInr: 420000,
    active: false,
  },
  {
    id: 'act-5',
    name: 'Noida Metro Depot: Rotate Workers to Underground Shifts',
    category: 'Construction',
    people: 420,
    pm25AvoidedGrams: 150,
    costSavedInr: 260000,
    active: false,
  },
];

export const ImpactCalculator: React.FC = () => {
  const [actions, setActions] = useState<ActionItem[]>(INITIAL_ACTIONS);

  const toggleAction = (id: string) => {
    soundEngine.playClick();
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const activeActions = actions.filter((a) => a.active);
  const totalPeople = activeActions.reduce((sum, a) => sum + a.people, 0);
  const totalPm25Kg = activeActions.reduce((sum, a) => sum + a.pm25AvoidedGrams, 0) / 1000;
  const totalInrLakhs = (
    activeActions.reduce((sum, a) => sum + a.costSavedInr, 0) / 100000
  ).toFixed(1);

  return (
    <div className="relative overflow-hidden bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* React Bits WindWaveBackground laminar boundary effect */}
      <WindWaveBackground waveCount={3} speed={0.012} amplitude={20} className="opacity-40" />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between pb-3 border-b border-gray-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-xl">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-1.5">
              <span>Preemptive Action Impact Calculator</span>
              <ShinyText
                text="· Real-Time ROI"
                speed={4}
                className="text-[10px] text-green-400 font-bold"
              />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold">
                ROI SIMULATOR
              </span>
            </h3>
            <p className="text-gray-400 text-[10px] mt-0.5">
              Quantifying citizen protection & healthcare cost avoidance across Delhi NCR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* React Bits TrueFocus headline component */}
          <TrueFocus
            sentence="CITIZEN PROTECTION COST AVERTED"
            blurAmount={2}
            borderColor="#22c55e"
            glowColor="rgba(34, 197, 94, 0.3)"
            className="text-[9px] font-mono hidden xl:flex"
          />
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Interactive Matrix
          </div>
        </div>
      </div>

      {/* Big KPI Metrics Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Citizens Protected</span>
          </div>
          <div className="font-black text-2xl text-blue-400">
            {totalPeople.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Students, workers, patients</div>
        </div>

        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <HeartPulse className="w-3.5 h-3.5 text-red-400" />
            <span>PM2.5 Mass Averted</span>
          </div>
          <div className="font-black text-2xl text-red-400">
            {totalPm25Kg.toFixed(2)} <span className="text-xs font-normal text-gray-500">kg</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Cumulative lung particulate intake</div>
        </div>

        <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <IndianRupee className="w-3.5 h-3.5 text-green-400" />
            <span>Healthcare Savings</span>
          </div>
          <div className="font-black text-2xl text-green-400">
            ₹{totalInrLakhs} <span className="text-xs font-normal text-gray-500">Lakhs</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Estimated ER & OPD cost averted</div>
        </div>
      </div>

      {/* Interactive Action Checkbox List */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-1">
          Toggle Institutional Protocols:
        </div>

        {actions.map((act) => (
          <div
            key={act.id}
            onClick={() => toggleAction(act.id)}
            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
              act.active
                ? 'bg-gray-950/90 border-green-500/40 shadow-sm'
                : 'bg-gray-950/40 border-gray-800/60 opacity-60 hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                  act.active ? 'bg-green-500 text-black' : 'border border-gray-600'
                }`}
              >
                {act.active && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-200 truncate">{act.name}</div>
                <div className="text-[10px] text-gray-500">
                  {act.category} · Protecting {act.people.toLocaleString()} citizens
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-green-400">
                +₹{(act.costSavedInr / 100000).toFixed(1)}L
              </div>
              <div className="text-[9px] text-gray-500">avoidance</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
