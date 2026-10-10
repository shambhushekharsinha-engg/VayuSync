import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { SimulationResult } from '../types';
import { apiClient } from '../utils/api';
import { soundEngine } from '../utils/audio';

interface SimulateTriggerProps {
  onSimulationComplete: (result: SimulationResult) => void;
  onReset: () => void;
}

interface PipelineStep {
  label: string;
  emoji: string;
  done: boolean;
  durationMs?: number;
}

type SimState = 'idle' | 'running' | 'done' | 'error';

const PIPELINE_STEPS: Omit<PipelineStep, 'done'>[] = [
  { label: 'Injecting synthetic NASA FIRMS thermal anomaly', emoji: '🛰️' },
  { label: 'Fetching Open-Meteo wind vectors', emoji: '🌊' },
  { label: 'Calculating 6-hour dispersion cone', emoji: '📐' },
  { label: 'Querying vulnerable institutions (DynamoDB)', emoji: '🏫' },
  { label: 'Generating advisories (Amazon Bedrock / Claude 3)', emoji: '🤖' },
  { label: 'Dispatching SMS alerts (Amazon SNS)', emoji: '📱' },
];

const SimulateTrigger: React.FC<SimulateTriggerProps> = ({ onSimulationComplete, onReset }) => {
  const [simState, setSimState] = useState<SimState>('idle');
  const [steps, setSteps] = useState<PipelineStep[]>(
    PIPELINE_STEPS.map(s => ({ ...s, done: false }))
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [totalMs, setTotalMs] = useState(0);

  const handleSimulate = async () => {
    setSimState('running');
    setSteps(PIPELINE_STEPS.map(s => ({ ...s, done: false })));
    setResult(null);
    setErrorMsg('');

    // Animate steps with staggered delays (visual pipeline progression)
    const stepDelays = [400, 700, 950, 1200, 1600, 2100];

    stepDelays.forEach((delay, idx) => {
      setTimeout(() => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, done: true } : s));
      }, delay);
    });

    soundEngine.playSurgeWhoosh();
    try {
      const simResult = await apiClient.simulate({
        hotspot_lat: 30.902,
        hotspot_lon: 75.852,
        frp_mw: 1050,
      });

      setTotalMs(simResult.pipeline_performance.total_ms);
      setResult(simResult);
      setSimState('done');
      soundEngine.playAlertHazard();
      onSimulationComplete(simResult);
    } catch (err) {
      setErrorMsg('Pipeline error — check API connection');
      setSimState('error');
    }
  };

  const handleReset = () => {
    setSimState('idle');
    setSteps(PIPELINE_STEPS.map(s => ({ ...s, done: false })));
    setResult(null);
    setErrorMsg('');
    onReset();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Big Red Button ──────────────────────────────────────────────── */}
      {simState === 'idle' && (
        <button
          data-tour="simulate-button"
          onClick={handleSimulate}
          className="group relative w-full py-4 px-5 rounded-xl font-bold text-white text-sm
                     bg-gradient-to-br from-red-600 to-red-700
                     border border-red-500/50
                     hover:from-red-500 hover:to-red-600
                     active:scale-[0.98]
                     transition-all duration-200
                     shadow-lg shadow-red-900/40
                     overflow-hidden"
        >
          {/* Animated shimmer */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                          bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative flex items-center justify-center gap-2">
            <span className="text-lg">🔴</span>
            <span>SIMULATE PUNJAB FIRE HOTSPOT</span>
          </div>
          <p className="relative text-red-200/80 text-xs font-normal mt-1">
            Live end-to-end pipeline demo · target &lt;3s
          </p>
          <p className="relative text-red-300/60 text-[10px] font-mono mt-1">
            Illustrative Demo Scenario: Wind vector calibrated along the historical North-Westerly autumn corridor toward Delhi NCR
          </p>
        </button>
      )}

      {/* ─── Running State ───────────────────────────────────────────────── */}
      {simState === 'running' && (
        <div className="bg-gray-900/80 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
            <span className="text-orange-400 font-semibold text-sm">Pipeline Executing...</span>
          </div>
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 text-xs transition-all duration-300 ${
                step.done ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.done ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                )}
              </div>
              <span className={`${step.done ? 'text-gray-200' : 'text-gray-500'}`}>
                {step.emoji} {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Success State ───────────────────────────────────────────────── */}
      {simState === 'done' && result && (
        <div className="space-y-3">
          {/* Success banner */}
          <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-3.5 text-center">
            <div className="text-green-400 font-bold text-base mb-1">
              ✅ PIPELINE COMPLETE
            </div>
            <div className="text-2xl font-mono font-black text-white">
              {totalMs.toFixed(0)}<span className="text-sm text-gray-400 font-normal">ms</span>
            </div>
            <div className="text-xs text-green-400/80 mt-0.5">
              {result.pipeline_performance.sla_passed ? '✓ SLA target met (< 3000ms)' : '⚠ SLA exceeded'}
            </div>
          </div>

          {/* Step results */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 space-y-1.5">
            {result.pipeline_performance.steps.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {s.step.split(' ').slice(0, 4).join(' ')}...
                </span>
                <span className="text-gray-300 font-mono">{s.duration_ms}ms</span>
              </div>
            ))}
          </div>

          {/* Alert count */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
              <div className="text-red-400 text-xl font-black">{result.institutions_at_risk}</div>
              <div className="text-gray-400 text-xs">Institutions Alerted</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
              <div className="text-blue-400 text-xl font-black">
                {result.pipeline_performance.total_ms < 3000 ? '✓' : '⚠'}
              </div>
              <div className="text-gray-400 text-xs">SNS SMS Delivered</div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-gray-300
                       bg-gray-800 hover:bg-gray-700 border border-gray-700
                       transition-all duration-200"
          >
            🔄 Reset & Clear Map
          </button>
        </div>
      )}

      {/* ─── Error State ─────────────────────────────────────────────────── */}
      {simState === 'error' && (
        <div className="space-y-2">
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 text-xs font-semibold">Pipeline Error</p>
              <p className="text-gray-400 text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button onClick={handleReset} className="w-full py-2 rounded-lg text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all">
            Retry
          </button>
        </div>
      )}

      {/* ─── AWS Services used footer ─────────────────────────────────────── */}
      {simState === 'idle' && (
        <div className="flex flex-wrap gap-1 pt-1">
          {['Lambda', 'DynamoDB', 'Bedrock', 'SNS', 'S3', 'EventBridge'].map(svc => (
            <span key={svc} className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400/70 rounded border border-orange-500/20">
              {svc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimulateTrigger;
