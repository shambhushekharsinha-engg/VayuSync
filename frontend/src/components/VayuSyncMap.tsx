import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { FireHotspot, Institution, TrajectoryFeature } from '../types';
import type { GlobalRegion } from '../data/globalRegions';
import { SEVERITY_COLORS, FACILITY_ICONS, frpToColor } from '../utils/mapHelpers';
import { Layers } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface VayuSyncMapProps {
  activeRegion: GlobalRegion;
  simulatedCone?: TrajectoryFeature | null;
  simulatedHotspot?: FireHotspot | null;
  timelineHour?: number;
  onInstitutionClick?: (inst: Institution) => void;
  isGlobeView?: boolean;
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const VayuSyncMap: React.FC<VayuSyncMapProps> = ({
  activeRegion,
  simulatedCone,
  timelineHour = 6,
  onInstitutionClick,
  isGlobeView = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const windMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(false);

  // ─── Initialize Map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: activeRegion.center,
      zoom: activeRegion.zoom,
      pitch: activeRegion.pitch,
      bearing: activeRegion.bearing,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    map.on('load', () => {
      setMapLoaded(true);
      renderRegionData(map, activeRegion);
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      windMarkersRef.current.forEach(m => m.remove());
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ─── 3D Pitch Toggle ─────────────────────────────────────────────────────
  const toggle3D = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    soundEngine.playClick();
    const next = !is3D;
    setIs3D(next);
    map.easeTo({
      pitch: next ? 55 : 0,
      bearing: next ? -15 : 0,
      duration: 1200,
    });
  }, [is3D]);

  // ─── Clean up & Render Region-Specific Layers ────────────────────────────
  const renderRegionData = useCallback((map: maplibregl.Map, region: GlobalRegion) => {
    // 1. Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    windMarkersRef.current.forEach(m => m.remove());
    windMarkersRef.current = [];

    // 2. Trajectory Cone Source & Layers
    const coneSource = map.getSource('trajectory-cone') as maplibregl.GeoJSONSource | undefined;
    const coneData = {
      type: 'FeatureCollection' as const,
      features: [region.trajectoryCone],
    };

    if (coneSource) {
      coneSource.setData(coneData);
    } else {
      map.addSource('trajectory-cone', {
        type: 'geojson',
        data: coneData,
      });

      map.addLayer({
        id: 'trajectory-cone-fill',
        type: 'fill',
        source: 'trajectory-cone',
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['zoom'],
            4, 'rgba(239, 68, 68, 0.15)',
            8, 'rgba(239, 68, 68, 0.28)',
          ],
          'fill-outline-color': 'rgba(239, 68, 68, 0.0)',
        },
      });

      map.addLayer({
        id: 'trajectory-cone-border',
        type: 'line',
        source: 'trajectory-cone',
        paint: {
          'line-color': '#ef4444',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.85,
        },
      });
    }

    // 3. Fire Hotspots Source & Layers
    const hotspotsSource = map.getSource('fire-hotspots') as maplibregl.GeoJSONSource | undefined;
    const hotspotsData = {
      type: 'FeatureCollection' as const,
      features: region.hotspots.map(h => ({
        type: 'Feature' as const,
        properties: {
          hotspot_id: h.hotspot_id,
          district: h.district,
          state: h.state,
          frp: h.fire_radiative_power_mw,
          confidence: h.confidence,
          color: frpToColor(h.fire_radiative_power_mw),
        },
        geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
      })),
    };

    if (hotspotsSource) {
      hotspotsSource.setData(hotspotsData);
    } else {
      map.addSource('fire-hotspots', {
        type: 'geojson',
        data: hotspotsData,
      });

      map.addLayer({
        id: 'hotspot-pulse',
        type: 'circle',
        source: 'fire-hotspots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 300, 18, 2500, 42],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.5,
        },
      });

      map.addLayer({
        id: 'hotspot-core',
        type: 'circle',
        source: 'fire-hotspots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 300, 7, 2500, 16],
          'circle-color': ['get', 'color'],
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
        },
      });

      // Hotspot click popups
      map.on('click', 'hotspot-core', (e) => {
        if (!e.features?.length) return;
        soundEngine.playClick();
        const props = e.features[0].properties;
        const coords = ((e.features[0].geometry as unknown) as { coordinates: [number, number] }).coordinates;
        new maplibregl.Popup({ className: 'vayusync-popup', closeButton: true })
          .setLngLat(coords)
          .setHTML(`
            <div class="popup-content">
              <div class="popup-title">🔥 ${props['district']}, ${props['state']}</div>
              <div class="popup-row"><span>Radiative Power (FRP)</span><span class="popup-val">${Number(props['frp']).toFixed(0)} MW</span></div>
              <div class="popup-row"><span>Satellite Confidence</span><span class="popup-val popup-high">${props['confidence']}</span></div>
              <div class="popup-row"><span>Sensor System</span><span class="popup-val">VIIRS / Sentinel-3 / MODIS</span></div>
              <div class="popup-note">⚡ 6h trajectory dispersion cone active → Advancing toward institutions</div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'hotspot-core', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'hotspot-core', () => { map.getCanvas().style.cursor = ''; });
    }

    // 4. Institution HTML Markers
    region.institutions.forEach(inst => {
      const severity = inst.current_risk ?? 'NONE';
      const color = SEVERITY_COLORS[severity];
      const icon = FACILITY_ICONS[inst.facility_type] ?? '📍';

      const el = document.createElement('div');
      el.innerHTML = `
        <div class="vayusync-inst-marker" title="${inst.name}" data-severity="${severity}">
          <div class="inst-icon" style="border-color:${color};box-shadow:0 0 10px ${color}60">
            ${icon}
          </div>
          ${severity === 'CRITICAL' ? '<div class="inst-pulse" style="border-color:'+color+'"></div>' : ''}
        </div>
      `;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        soundEngine.playClick();
        onInstitutionClick?.(inst);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([inst.longitude, inst.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 5. Wind Direction Arrows
    const [cLng, cLat] = region.center;
    const arrowOffsets = [
      [cLng - 0.5, cLat + 0.4],
      [cLng + 0.3, cLat - 0.2],
      [cLng - 0.2, cLat - 0.5],
    ];

    arrowOffsets.forEach(([lon, lat]) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;display:flex;align-items:center;justify-content:center;
        font-size:20px;transform:rotate(${region.defaultWind.directionDeg}deg);opacity:0.7;pointer-events:none;color:#60a5fa;
      `;
      el.textContent = '➤';
      const arrowMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lon, lat])
        .addTo(map);
      windMarkersRef.current.push(arrowMarker);
    });
  }, [onInstitutionClick]);

  // ─── Handle Region Changes & Fly-To Animation ─────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (isGlobeView) {
      soundEngine.playWhoosh();
      map.flyTo({
        center: [0, 20],
        zoom: 1.5,
        pitch: 0,
        bearing: 0,
        duration: 2500,
        essential: true,
      });
      return;
    }

    soundEngine.playWhoosh();
    renderRegionData(map, activeRegion);

    map.flyTo({
      center: activeRegion.center,
      zoom: activeRegion.zoom,
      pitch: activeRegion.pitch,
      bearing: activeRegion.bearing,
      duration: 2200,
      essential: true,
    });
  }, [activeRegion, isGlobeView, mapLoaded, renderRegionData]);

  // ─── Dynamic Trajectory Cone Scaling with Timeline Hour ───────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource('trajectory-cone') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const baseCoords = activeRegion.trajectoryCone.geometry.coordinates[0];
    const origin = baseCoords[0];
    const ratio = Math.max(0.1, Math.min(timelineHour / 6, 2.0));

    const scaledCoords = baseCoords.map(([lng, lat], idx) => {
      if (idx === 0 || idx === baseCoords.length - 1) return origin;
      const dLng = lng - origin[0];
      const dLat = lat - origin[1];
      return [origin[0] + dLng * ratio, origin[1] + dLat * ratio];
    });

    source.setData({
      type: 'FeatureCollection',
      features: [{
        ...activeRegion.trajectoryCone,
        geometry: {
          type: 'Polygon',
          coordinates: [scaledCoords],
        },
      }],
    });
  }, [timelineHour, activeRegion, mapLoaded]);

  // ─── Handle Simulated Hotspot & Cone Overlays ──────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (simulatedCone) {
      soundEngine.playRadarPing();
      const sourceId = 'simulated-cone';
      const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: [simulatedCone],
      };

      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojsonData });

        map.addLayer({
          id: 'sim-cone-fill',
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': 'rgba(249, 115, 22, 0.28)',
            'fill-outline-color': 'rgba(249, 115, 22, 0)',
          },
        });

        map.addLayer({
          id: 'sim-cone-border',
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#f97316',
            'line-width': 2.5,
            'line-opacity': 0.9,
          },
        });
      }

      map.flyTo({
        center: activeRegion.center,
        zoom: activeRegion.zoom,
        duration: 1800,
      });
    }
  }, [simulatedCone, activeRegion, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .vayusync-inst-marker { position: relative; }
        .inst-icon {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; border: 2px solid;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .vayusync-inst-marker:hover .inst-icon { transform: scale(1.3) translateY(-4px); }
        .inst-pulse {
          position: absolute; top: -4px; left: -4px;
          width: 40px; height: 40px; border-radius: 50%;
          border: 2px solid;
          animation: instPulse 2s ease-out infinite;
          opacity: 0;
        }
        @keyframes instPulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .maplibregl-popup-content { padding: 0 !important; border-radius: 12px !important; background: transparent !important; border: none !important; box-shadow: none !important; }
        .vayusync-popup .maplibregl-popup-tip { display: none; }
        .popup-content {
          background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(8px);
          border: 1px solid #374151;
          border-radius: 14px; padding: 14px 16px; min-width: 220px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          font-family: system-ui, sans-serif;
        }
        .popup-title { color: #f9fafb; font-weight: 800; font-size: 14px; margin-bottom: 8px; }
        .popup-row { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin: 4px 0; }
        .popup-val { color: #e5e7eb; font-weight: 700; }
        .popup-high { color: #f97316; }
        .popup-note { margin-top: 10px; font-size: 10px; color: #9ca3af; border-top: 1px solid #1f2937; padding-top: 8px; }
      `}</style>

      {/* Map Canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Floating Tactical Controls */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <button
          onClick={toggle3D}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xl backdrop-blur-md ${
            is3D
              ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/20'
              : 'bg-gray-900/90 text-gray-300 border-gray-700 hover:text-white hover:bg-gray-800'
          }`}
          title="Toggle 3D Perspective Pitch"
        >
          <Layers className="w-3.5 h-3.5 text-orange-400" />
          <span>{is3D ? '3D TACTICAL (55°)' : '2D PLAN VIEW'}</span>
        </button>

        {/* Region Flag & Identifier Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 backdrop-blur-md border border-gray-700 text-xs font-bold text-gray-200 shadow-xl">
          <span className="text-base">{activeRegion.flag}</span>
          <span className="hidden sm:inline">{activeRegion.name}</span>
          <span className="text-orange-400 text-[10px]">({activeRegion.category})</span>
        </div>
      </div>

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-30">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">🌍</div>
            <p className="text-gray-400 text-sm font-medium">Loading planetary satellite vectors...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VayuSyncMap;
