import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FireHotspot, Institution, TrajectoryFeature } from '../types';
import { MOCK_HOTSPOTS, MOCK_INSTITUTIONS, MAIN_TRAJECTORY_CONE } from '../types';
import { SEVERITY_COLORS, FACILITY_ICONS, frpToColor } from '../utils/mapHelpers';

interface VayuSyncMapProps {
  simulatedCone?: TrajectoryFeature | null;
  simulatedHotspot?: FireHotspot | null;
  onInstitutionClick?: (inst: Institution) => void;
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const VayuSyncMap: React.FC<VayuSyncMapProps> = ({
  simulatedCone,
  simulatedHotspot: _simulatedHotspot,
  onInstitutionClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ─── Initialize Map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE,
      center: [76.5, 29.8], // Centered between Punjab and Delhi
      zoom: 6.2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    map.on('load', () => {
      setMapLoaded(true);
      addBaseLayers(map);
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ─── Add static base layers (hotspots + institutions) ────────────────────
  function addBaseLayers(map: maplibregl.Map) {
    // ─ Trajectory Cone (main Ludhiana → Delhi cone) ─
    map.addSource('trajectory-cone', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [MAIN_TRAJECTORY_CONE],
      },
    });

    map.addLayer({
      id: 'trajectory-cone-fill',
      type: 'fill',
      source: 'trajectory-cone',
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['zoom'],
          5, 'rgba(239, 68, 68, 0.10)',
          8, 'rgba(239, 68, 68, 0.18)',
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
        'line-width': 1.5,
        'line-dasharray': [4, 3],
        'line-opacity': 0.7,
      },
    });

    // ─ Fire Hotspot circles ─
    map.addSource('fire-hotspots', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: MOCK_HOTSPOTS.map(h => ({
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
      },
    });

    // Outer pulse ring
    map.addLayer({
      id: 'hotspot-pulse',
      type: 'circle',
      source: 'fire-hotspots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 300, 16, 1300, 32],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.15,
        'circle-stroke-width': 0,
      },
    });

    // Core fire circle
    map.addLayer({
      id: 'hotspot-core',
      type: 'circle',
      source: 'fire-hotspots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 300, 7, 1300, 14],
        'circle-color': ['get', 'color'],
        'circle-opacity': 1,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.8,
      },
    });

    // ─ Institution markers (HTML markers) ─
    MOCK_INSTITUTIONS.forEach(inst => {
      const severity = inst.current_risk ?? 'NONE';
      const color = SEVERITY_COLORS[severity];
      const icon = FACILITY_ICONS[inst.facility_type] ?? '📍';

      const el = document.createElement('div');
      el.innerHTML = `
        <div class="vayusync-inst-marker" title="${inst.name}" data-severity="${severity}">
          <div class="inst-icon" style="border-color:${color};box-shadow:0 0 8px ${color}40">
            ${icon}
          </div>
          ${severity === 'CRITICAL' ? '<div class="inst-pulse" style="border-color:'+color+'"></div>' : ''}
        </div>
      `;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => onInstitutionClick?.(inst));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([inst.longitude, inst.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // ─ Wind arrow overlay ─
    addWindArrows(map);

    // ─ Hotspot popups ─
    map.on('click', 'hotspot-core', (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties;
      const coords = ((e.features[0].geometry as unknown) as { coordinates: [number, number] }).coordinates;
      new maplibregl.Popup({ className: 'vayusync-popup', closeButton: true })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-content">
            <div class="popup-title">🔥 ${props['district']}, ${props['state']}</div>
            <div class="popup-row"><span>FRP</span><span class="popup-val">${Number(props['frp']).toFixed(0)} MW</span></div>
            <div class="popup-row"><span>Confidence</span><span class="popup-val popup-high">${props['confidence']}</span></div>
            <div class="popup-row"><span>Satellite</span><span class="popup-val">VIIRS/SNPP</span></div>
            <div class="popup-note">⚡ 6-hour trajectory active → Delhi NCR</div>
          </div>
        `)
        .addTo(map);
    });

    map.on('mouseenter', 'hotspot-core', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'hotspot-core', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  // ─── Wind direction arrows ────────────────────────────────────────────────
  function addWindArrows(map: maplibregl.Map) {
    const arrowPoints = [
      [75.5, 30.5], [76.5, 29.5], [77.0, 28.8],
    ];

    arrowPoints.forEach(([lon, lat]) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;display:flex;align-items:center;justify-content:center;
        font-size:20px;transform:rotate(146deg);opacity:0.6;pointer-events:none;
      `;
      el.textContent = '➤';
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lon, lat])
        .addTo(map);
    });
  }

  // ─── Update simulated cone on map ────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (simulatedCone) {
      // Add or update simulated cone layer
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
            'fill-color': 'rgba(249, 115, 22, 0.25)',
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

      // Fly to show full trajectory
      map.flyTo({
        center: [76.5, 29.0],
        zoom: 6.0,
        duration: 2000,
        easing: (t: number) => t * (2 - t), // ease-out
      });
    } else {
      // Remove simulated cone
      ['sim-cone-fill', 'sim-cone-border'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('simulated-cone')) map.removeSource('simulated-cone');
    }
  }, [simulatedCone, mapLoaded]);

  return (
    <>
      <style>{`
        .vayusync-inst-marker { position: relative; }
        .inst-icon {
          width: 28px; height: 28px;
          background: rgba(3,7,18,0.85);
          border: 2px solid;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          transition: transform 0.2s;
        }
        .inst-icon:hover { transform: scale(1.2); }
        .inst-pulse {
          position: absolute; top: -4px; left: -4px;
          width: 36px; height: 36px;
          border: 2px solid;
          border-radius: 8px;
          animation: instPulse 2s ease-out infinite;
          opacity: 0;
        }
        @keyframes instPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .maplibregl-popup-content { padding: 0 !important; border-radius: 12px !important; background: transparent !important; border: none !important; box-shadow: none !important; }
        .vayusync-popup .maplibregl-popup-tip { display: none; }
        .popup-content {
          background: #111827; border: 1px solid #374151;
          border-radius: 10px; padding: 12px 14px; min-width: 200px;
          font-family: system-ui, sans-serif;
        }
        .popup-title { color: #f9fafb; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
        .popup-row { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin: 3px 0; }
        .popup-val { color: #e5e7eb; font-weight: 600; }
        .popup-high { color: #f97316; }
        .popup-note { margin-top: 8px; font-size: 10px; color: #6b7280; border-top: 1px solid #1f2937; padding-top: 6px; }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">🔥</div>
            <p className="text-gray-400 text-sm">Loading satellite map...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default VayuSyncMap;
