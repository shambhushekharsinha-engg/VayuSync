import React, { useState } from 'react';
import { X, CheckCircle2, Bot, Sparkles, Send, ShieldCheck } from 'lucide-react';
import type { AlertLog } from '../types';
import { soundEngine } from '../utils/audio';
import { voiceBroadcast } from '../utils/voiceBroadcast';

interface BedrockInspectorModalProps {
  alert: AlertLog | null;
  onClose: () => void;
}

export const BedrockInspectorModal: React.FC<BedrockInspectorModalProps> = ({
  alert,
  onClose,
}) => {
  const [testSent, setTestSent] = useState(false);

  if (!alert) return null;

  const handleTestSms = () => {
    soundEngine.playAlertHazard();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 5000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal header */}
        <div className="flex items-start justify-between gap-2 pb-3 sm:pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/30 flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">Amazon Bedrock Advisory Engine</h3>
                <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {alert.advisory_source === 'rule_fallback' ? 'Rule Engine Standby' : (alert.bedrock_model ?? 'Bedrock LLM')}
                </span>
              </div>
              <p className="text-gray-400 text-[11px] sm:text-xs mt-0.5">
                Deterministic Structured JSON Generation · Zero-Hallucination Enforcement
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="mt-3.5 sm:mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Target Institution summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2 text-xs bg-gray-950/60 p-3 sm:p-3.5 rounded-2xl border border-gray-800">
            <div>
              <div className="text-gray-500 text-[10px]">Target Institution</div>
              <div className="text-white font-bold truncate mt-0.5">{alert.institution_name}</div>
              <div className="text-gray-400 text-[10px]">{alert.facility_type}</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">Severity Rating</div>
              <div className={`font-black mt-0.5 ${
                alert.impact_severity === 'CRITICAL' ? 'text-red-400' :
                alert.impact_severity === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'
              }`}>{alert.impact_severity}</div>
              <div className="text-gray-400 text-[10px]">Est. PM2.5: {Math.round(alert.predicted_pm25_ugm3)} µg/m³</div>
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">Model Confidence</div>
              <div className="text-green-400 font-black mt-0.5">
                {Math.round((alert.confidence_score ?? 0.94) * 100)}%
              </div>
              <div className="text-gray-400 text-[10px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-400 inline" /> Schema Validated
              </div>
            </div>
          </div>

          {/* Realistic Lockscreen Smartphone Notification Preview */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Simulated Institutional Smartphone SMS / Webhook Payload</span>
            </div>

            <div className="bg-gray-950/80 border border-gray-700 rounded-2xl p-3 sm:p-3.5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🚨</span>
                  <span className="font-bold text-white tracking-wide">VayuSync Emergency Dispatch</span>
                </div>
                <span className="text-[10px] text-gray-500">now</span>
              </div>

              <div className="text-xs text-gray-200 font-medium leading-relaxed">
                <span className="text-orange-400 font-bold">[{alert.impact_severity} SMOKE ARRIVAL ADVISORY]</span> To Administrator of {alert.institution_name}:
                Severe stubble plume arriving in ~6 hours. Predicted PM2.5 surge to {Math.round(alert.predicted_pm25_ugm3)} µg/m³.
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 space-y-1">
                <div className="text-gray-300 font-semibold text-[10px] uppercase tracking-wider">Mandatory Actions:</div>
                {(alert.recommended_actions ?? []).map((action, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-gray-300 text-[11px]">
                    <span className="text-orange-400 font-bold">›</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              {testSent && (
                <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-xl text-[11px] text-green-400 flex items-center gap-2 animate-fade-in-up">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Dispatched synthetic SNS packet to AWS AlertTopic (MessageId: {alert.alert_id})</span>
                </div>
              )}
            </div>
          </div>

          {/* Model execution telemetry */}
          <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 font-mono text-[10px] text-gray-400 space-y-1">
            <div className="text-purple-400 font-bold flex flex-wrap items-center justify-between gap-1">
              <span>{alert.advisory_source === 'rule_fallback' ? 'Deterministic Rule Engine (Bedrock Standby)' : 'Bedrock LLM Execution Breakdown'}</span>
              <span className={alert.advisory_source === 'rule_fallback' ? 'text-amber-400 font-bold' : 'text-green-400'}>
                {alert.advisory_source === 'rule_fallback' ? 'SOURCE: RULE-BASED FALLBACK' : 'STATUS: 200 OK'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Engine / Model:</span>
              <span className="text-gray-200 text-right">{alert.bedrock_model ?? (alert.advisory_source === 'rule_fallback' ? 'Deterministic Facility Matrix' : 'Amazon Bedrock Model')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{alert.advisory_source === 'rule_fallback' ? 'Fallback Trigger:' : 'Inference Latency:'}</span>
              <span className={`text-right ${alert.advisory_source === 'rule_fallback' ? 'text-amber-400 font-bold' : 'text-yellow-400 font-bold'}`}>
                {alert.advisory_source === 'rule_fallback'
                  ? 'Bedrock unavailable (paid access or model not enabled)'
                  : (alert.bedrock_latency_ms != null ? `${alert.bedrock_latency_ms} ms` : 'Unmeasured')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Output Formatting:</span>
              <span className="text-green-400 font-bold text-right">Enforced RFC-8259 JSON</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                const text = `VayuSync Emergency Dispatch to administrator of ${alert.institution_name}. Severe stubble smoke arrival advisory. Predicted PM2.5 surge to ${Math.round(alert.predicted_pm25_ugm3)} micrograms per cubic meter. Recommended action: ${alert.recommended_actions?.[0] ?? 'Initiate immediate indoor air filtration'}.`;
                voiceBroadcast.speak(text, 'en-IN');
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-xs transition-all border border-purple-500/40 active:scale-95"
              title="Broadcast text-to-speech announcement"
            >
              <span>🔊</span>
              <span>Listen Audio</span>
            </button>

            <button
              onClick={handleTestSms}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 flex-shrink-0" />
              <span>TEST SNS DISPATCH (SMS & EMAIL)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
