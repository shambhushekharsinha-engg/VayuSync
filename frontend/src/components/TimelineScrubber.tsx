import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Wind, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface TimelineScrubberProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  isSimulating?: boolean;
}

const MILESTONES = [
  { hour: 0, label: 'T+0h', title: 'Ignition', desc: 'Ludhiana Active Fire', aqi: 180 },
  { hour: 3, label: 'T+3h', title: 'Plume Transport', desc: 'Entering Haryana Belt', aqi: 260 },
  { hour: 6, label: 'T+6h', title: 'Delhi Ingress', desc: 'North & West NCR Engulfed', aqi: 387 },
  { hour: 9, label: 'T+9h', title: 'Peak Inversion', desc: 'Severe NCR Stagnation', aqi: 472 },
  { hour: 12, label: 'T+12h', title: 'Dispersion', desc: 'Extended Plume Boundary', aqi: 320 },
];

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentHour,
  onHourChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const next = Math.round((currentHour + 0.5) * 10) / 10;
      if (next > 12) {
        setIsPlaying(false);
        onHourChange(12);
      } else {
        onHourChange(next);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, currentHour, onHourChange]);

  const togglePlay = () => {
    soundEngine.playClick();
    if (currentHour >= 12 && !isPlaying) {
      onHourChange(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    soundEngine.playClick();
    setIsPlaying(false);
    onHourChange(0);
  };

  const activeMilestone = MILESTONES.reduce((prev, curr) =>
    currentHour >= curr.hour ? curr : prev
  );

  return (
    <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl p-3 shadow-2xl space-y-2">
      {/* Top row: controls + status readout */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'PAUSE TIMELINE' : 'SIMULATE DISPERSION (12H)'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Reset to T+0h"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current status badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-950/70 border border-gray-800 px-2.5 py-1 rounded-lg">
            <Clock className="w-3 h-3 text-orange-400" />
            <span className="font-mono text-white font-bold">T+{currentHour.toFixed(1)}h</span>
            <span className="text-gray-500 text-[10px]">projection</span>
          </div>

          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-red-400 font-bold">{activeMilestone.title}</span>
            <span className="text-gray-400 text-[10px]">· Est. AQI {activeMilestone.aqi}</span>
          </div>
        </div>
      </div>

      {/* Scrubber slider track */}
      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min="0"
          max="12"
          step="0.2"
          value={currentHour}
          onChange={(e) => {
            onHourChange(parseFloat(e.target.value));
            soundEngine.playClick();
          }}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
        />

        {/* Timeline markers */}
        <div className="flex justify-between items-center text-[10px] mt-1 text-gray-500 px-0.5">
          {MILESTONES.map((m) => (
            <button
              key={m.hour}
              onClick={() => {
                onHourChange(m.hour);
                soundEngine.playClick();
              }}
              className={`flex flex-col items-center transition-colors hover:text-orange-300 ${
                Math.abs(currentHour - m.hour) < 1.0 ? 'text-orange-400 font-bold' : 'text-gray-500'
              }`}
            >
              <span className="font-mono">{m.label}</span>
              <span className="text-[8px] opacity-75">{m.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Atmospheric Context ticker */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 bg-gray-950/40 rounded-xl px-2.5 py-1 border border-gray-800/50">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-blue-400 animate-pulse" />
          <span>Plume Velocity: <strong className="text-gray-200">46.8 km/h</strong></span>
          <span className="text-gray-600">|</span>
          <span>Bearing: <strong className="text-gray-200">297° NW→SE</strong></span>
        </div>
        <div className="text-orange-400 font-medium">
          {currentHour < 3
            ? '🔥 Smoke plume accelerating through rural Punjab'
            : currentHour < 6
            ? '⚠️ Heavy particulate front entering Karnal / Sonipat corridor'
            : currentHour < 9
            ? '🚨 Toxic plume fully engulfing North & West Delhi institutions'
            : '🌫️ Nocturnal boundary layer compression · Extended regional haze'}
        </div>
      </div>
    </div>
  );
};
