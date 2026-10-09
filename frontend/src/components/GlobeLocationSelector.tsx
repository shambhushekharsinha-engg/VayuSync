import React from 'react';
import { Globe2, Navigation2, Flame, MapPin } from 'lucide-react';
import { GLOBAL_REGIONS, type GlobalRegion } from '../data/globalRegions';
import { soundEngine } from '../utils/audio';

interface GlobeLocationSelectorProps {
  currentRegionId: string;
  onSelectRegion: (region: GlobalRegion) => void;
  onFlyToGlobalView: () => void;
  isGlobeView: boolean;
}

export const GlobeLocationSelector: React.FC<GlobeLocationSelectorProps> = ({
  currentRegionId,
  onSelectRegion,
  onFlyToGlobalView,
  isGlobeView,
}) => {
  const currentRegion = GLOBAL_REGIONS.find(r => r.id === currentRegionId) || GLOBAL_REGIONS[0];

  return (
    <div className="flex items-center gap-2">
      {/* Globe Orbit / Regional Toggle */}
      <button
        onClick={() => {
          soundEngine.playClick();
          onFlyToGlobalView();
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
          isGlobeView
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50'
            : 'bg-gray-900/90 hover:bg-gray-800 text-gray-300 border-gray-700'
        }`}
        title="Zoom Out to Planetary Global Orbit"
      >
        <Globe2 className={`w-3.5 h-3.5 ${isGlobeView ? 'text-cyan-300 animate-spin' : 'text-blue-400'}`} />
        <span className="hidden sm:inline">{isGlobeView ? 'GLOBAL ORBIT' : 'PLANETARY VIEW'}</span>
      </button>

      {/* Region Picker Dropdown */}
      <div className="relative group">
        <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-700 hover:border-gray-600 rounded-xl px-2.5 py-1.5 cursor-pointer shadow-lg">
          <span className="text-sm">{currentRegion.flag}</span>
          <span className="text-xs font-bold text-white max-w-[140px] truncate">
            {currentRegion.name}
          </span>
          <Navigation2 className="w-3 h-3 text-orange-400 transform rotate-180 group-hover:rotate-0 transition-transform" />
        </div>

        {/* Hover / Click Menu */}
        <div className="absolute top-full left-0 mt-1.5 w-72 bg-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-2xl p-2 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
          <div className="px-2 py-1.5 text-[10px] uppercase font-black tracking-widest text-gray-400 border-b border-gray-800/80 flex items-center justify-between">
            <span>Global Stubble & Fire Hotspots</span>
            <span className="text-orange-400">{GLOBAL_REGIONS.length} Continents</span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1 mt-1">
            {GLOBAL_REGIONS.map((reg) => {
              const isSelected = reg.id === currentRegionId && !isGlobeView;
              return (
                <button
                  key={reg.id}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectRegion(reg);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-orange-500/20 border border-orange-500/40 text-white'
                      : 'hover:bg-gray-900 text-gray-300 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="text-lg leading-none mt-0.5">{reg.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{reg.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-gray-800 text-gray-400">
                        {reg.country}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                      <Flame className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
                      <span>{reg.category}</span>
                      <span>·</span>
                      <MapPin className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                      <span>{reg.targetImpactArea.split('&')[0]}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
