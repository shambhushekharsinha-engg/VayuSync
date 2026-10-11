import React, { useState } from 'react';
import { Cpu, Wifi, Radio, RefreshCw, Battery, Zap } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface SensorNode {
  id: string;
  name: string;
  location: string;
  type: 'DTC_ELECTRIC_BUS' | 'CAMPUS_ROOFTOP' | 'METRO_STATION_GANTRY';
  hardware: string;
  batteryPct: number;
  firmware: string;
  samplingIntervalSec: number;
  currentPm25: number;
  currentPm10: number;
  temperatureC: number;
  humidityPct: number;
  satelliteDeltaPct: number;
  status: 'ONLINE' | 'TELEMETRY_STREAMING' | 'CALIBRATING';
}

const IOT_NODES: SensorNode[] = [
  {
    id: 'IOT-DEL-BUS-042',
    name: 'DTC E-Bus Route 534 (Mehrauli → Anand Vihar)',
    location: 'Moving Fleet · Ring Road Outer Sector',
    type: 'DTC_ELECTRIC_BUS',
    hardware: 'ESP32-S3 + Sensirion SPS30 Laser Sensor',
    batteryPct: 94,
    firmware: 'v2.4.1-ota-aws-iot',
    samplingIntervalSec: 5,
    currentPm25: 418.5,
    currentPm10: 590.2,
    temperatureC: 28.4,
    humidityPct: 62,
    satelliteDeltaPct: 2.8,
    status: 'TELEMETRY_STREAMING',
  },
  {
    id: 'IOT-DEL-ROOF-019',
    name: 'DPS RK Puram Science Block Rooftop Tower',
    location: 'South West Delhi · Static Weather Mast',
    type: 'CAMPUS_ROOFTOP',
    hardware: 'Raspberry Pi Pico W + Plantower PMS5003',
    batteryPct: 100,
    firmware: 'v3.1.0-aws-freertos',
    samplingIntervalSec: 10,
    currentPm25: 462.1,
    currentPm10: 642.0,
    temperatureC: 27.8,
    humidityPct: 65,
    satelliteDeltaPct: 1.4,
    status: 'TELEMETRY_STREAMING',
  },
  {
    id: 'IOT-DEL-MTR-008',
    name: 'DMRC Botanical Garden Station Gantry',
    location: 'Noida Blue/Magenta Line Interchange',
    type: 'METRO_STATION_GANTRY',
    hardware: 'Nordic nRF9160 LTE-M + Alphasense OPC-N3',
    batteryPct: 98,
    firmware: 'v1.8.4-mqtt-tls',
    samplingIntervalSec: 15,
    currentPm25: 338.4,
    currentPm10: 480.1,
    temperatureC: 29.1,
    humidityPct: 59,
    satelliteDeltaPct: -3.2,
    status: 'TELEMETRY_STREAMING',
  },
  {
    id: 'IOT-GGN-EXPR-003',
    name: 'Dwarka Expressway Toll Plaza Air Canopy',
    location: 'Delhi-Gurugram Border NH-48 Corridor',
    type: 'METRO_STATION_GANTRY',
    hardware: 'ESP32 + BME680 + Sensirion SPS30',
    batteryPct: 91,
    firmware: 'v2.4.1-ota-aws-iot',
    samplingIntervalSec: 5,
    currentPm25: 504.8,
    currentPm10: 710.6,
    temperatureC: 28.9,
    humidityPct: 61,
    satelliteDeltaPct: 4.1,
    status: 'TELEMETRY_STREAMING',
  },
];

export const GroundIoTSensorFusion: React.FC = () => {
  const [nodes, setNodes] = useState<SensorNode[]>(IOT_NODES);
  const [selectedNode, setSelectedNode] = useState<SensorNode>(IOT_NODES[0]);
  const [isSimulatingPacket, setIsSimulatingPacket] = useState(false);

  const handleSimulatePacket = () => {
    soundEngine.playRadarPing();
    setIsSimulatingPacket(true);

    setTimeout(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        currentPm25: Number((n.currentPm25 + (Math.random() * 8 - 4)).toFixed(1)),
        currentPm10: Number((n.currentPm10 + (Math.random() * 12 - 6)).toFixed(1)),
      })));
      setIsSimulatingPacket(false);
    }, 700);
  };

  return (
    <div className="flex flex-col space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-gray-900/80 border border-gray-800 p-3.5 sm:p-4 rounded-3xl shadow-xl">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                Ground IoT Mesh & Mobile Bus Sensor Fusion
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                HARDWARE SIMULATION TESTBED · AWS IoT Core (MQTT)
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Illustrative synthetic readings from AWS IoT Core testbed (ESP32 / SPS30 sensor models) demonstrating satellite-ground sensor corroboration architecture.
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulatePacket}
          disabled={isSimulatingPacket}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all active:scale-95 shadow-md shadow-cyan-950/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingPacket ? 'animate-spin' : ''}`} />
          <span>{isSimulatingPacket ? 'INGESTING TELEMETRY...' : 'INGEST MQTT TELEMETRY PACKET'}</span>
        </button>
      </div>

      {/* Sensor Node Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {nodes.map(node => {
          const isSelected = selectedNode.id === node.id;
          return (
            <div
              key={node.id}
              onClick={() => {
                soundEngine.playClick();
                setSelectedNode(node);
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-gray-900 border-cyan-500 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="font-mono text-gray-500">{node.id}</span>
                <span className="flex items-center gap-1 text-green-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                  {node.status === 'TELEMETRY_STREAMING' ? 'LIVE MQTT' : node.status}
                </span>
              </div>

              <div className="font-bold text-xs text-white truncate mb-1">{node.name}</div>
              <div className="text-[10px] text-gray-400 truncate mb-3">{node.location}</div>

              <div className="flex items-end justify-between bg-gray-950/80 p-2.5 rounded-2xl border border-gray-800">
                <div>
                  <div className="text-[9px] text-gray-500 uppercase font-black">Real-time PM2.5</div>
                  <div className="text-red-400 font-mono font-black text-base mt-0.5">
                    {node.currentPm25} <span className="text-[10px] text-gray-500 font-normal">µg/m³</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-gray-500 uppercase font-black">Satellite Corroboration</div>
                  <div className="text-green-400 font-mono font-bold text-xs mt-0.5">
                    Δ {node.satelliteDeltaPct > 0 ? `+${node.satelliteDeltaPct}` : node.satelliteDeltaPct}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Node Deep Dive Telemetry Panel */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Cpu className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-sm text-white truncate">{selectedNode.name}</h3>
              <div className="text-gray-400 text-[11px] sm:text-xs font-mono truncate">{selectedNode.hardware} · Firmware {selectedNode.firmware}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Battery className="w-3.5 h-3.5 text-green-400" /> {selectedNode.batteryPct}%</span>
            <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-cyan-400" /> MQTT 1883</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-400" /> {selectedNode.samplingIntervalSec}s Cadence</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-center">
          <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">PM2.5 Particle Density</div>
            <div className="text-red-400 font-mono font-black text-base sm:text-xl mt-1">{selectedNode.currentPm25} µg/m³</div>
          </div>
          <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">PM10 Coarse Fraction</div>
            <div className="text-orange-400 font-mono font-black text-base sm:text-xl mt-1">{selectedNode.currentPm10} µg/m³</div>
          </div>
          <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">Ambient Temperature</div>
            <div className="text-white font-mono font-black text-base sm:text-xl mt-1">{selectedNode.temperatureC}°C</div>
          </div>
          <div className="bg-gray-950 p-3 rounded-2xl border border-gray-800">
            <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold">Relative Humidity</div>
            <div className="text-blue-400 font-mono font-black text-base sm:text-xl mt-1">{selectedNode.humidityPct}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
