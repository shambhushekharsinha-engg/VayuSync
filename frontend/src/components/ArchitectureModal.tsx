import React from 'react';
import { X, Server, Database, Bot, Radio, Cpu, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const PIPELINE_NODES = [
    {
      step: '01',
      service: 'Amazon EventBridge',
      type: 'Event-Driven Trigger',
      desc: 'Cron rule rate(6 hours) + on-demand POST /simulate trigger via API Gateway.',
      icon: Server,
      color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-400',
      badge: 'Free Tier',
      detail: 'Rule: VayuSync-IngestionSchedule',
    },
    {
      step: '02',
      service: 'AWS Lambda (Ingestion)',
      type: 'Python 3.12 Engine',
      desc: 'Fetches NASA FIRMS satellite anomalies + Open-Meteo wind vectors (u, v components). Calculates Lagrangian dispersion cone.',
      icon: Cpu,
      color: 'from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-400',
      badge: '512 MB · 60s',
      detail: 'VayuSync-IngestionEngine',
    },
    {
      step: '03',
      service: 'Amazon DynamoDB',
      type: 'NoSQL Storage Layer',
      desc: 'Persists active fire anomalies in VayuSync_Hotspots and queries vulnerable facility geofences in VayuSync_Institutions.',
      icon: Database,
      color: 'from-blue-600/20 to-indigo-600/20 border-blue-500/40 text-blue-400',
      badge: 'On-Demand Pay-per-Request',
      detail: '3 Tables (TTL Enabled)',
    },
    {
      step: '04',
      service: 'Amazon Bedrock',
      type: 'Generative AI Advisory',
      desc: 'Invokes Claude 3 Haiku with strict RFC-8259 JSON schema enforcement. Produces role-tailored institutional action directives.',
      icon: Bot,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-400',
      badge: 'Claude 3 Haiku',
      detail: 'Zero-Hallucination Schema',
    },
    {
      step: '05',
      service: 'Amazon SNS + Webhooks',
      type: 'Multi-Channel Dispatch',
      desc: 'Publishes instant SMS alerts to school principals and pushes webhooks to hospital building management systems.',
      icon: Radio,
      color: 'from-red-500/20 to-orange-500/20 border-red-500/40 text-red-400',
      badge: 'SMS & Email',
      detail: 'VayuSync-AlertTopic',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400">
                <Cpu className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  AWS Serverless Pipeline Architecture
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold border border-green-500/30">
                    100% Free Tier Compliant
                  </span>
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  End-to-end event-driven workflow verified on AWS Region: <span className="text-orange-300 font-mono">ap-south-1 (Mumbai)</span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Step Cards Flow */}
        <div className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {PIPELINE_NODES.map((node, i) => {
              const Icon = node.icon;
              return (
                <div key={node.step} className="relative flex flex-col">
                  <div className={`flex-1 bg-gradient-to-br ${node.color} p-4 rounded-2xl border flex flex-col justify-between shadow-lg relative group hover:border-white/50 transition-all`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-black text-gray-400">{node.step}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-gray-300 font-mono">
                          {node.badge}
                        </span>
                      </div>
                      <Icon className="w-6 h-6 mb-2" />
                      <h4 className="font-bold text-xs text-white leading-tight mb-1">{node.service}</h4>
                      <p className="text-[10px] text-gray-300 leading-relaxed">{node.desc}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 text-[9px] font-mono text-gray-400 truncate">
                      {node.detail}
                    </div>
                  </div>

                  {i < PIPELINE_NODES.length - 1 && (
                    <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-gray-500">
                      <ArrowRight className="w-4 h-4 text-orange-400/70" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Architecture verification grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>Least-Privilege IAM</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Roles restricted via SAM templates: <code className="text-orange-300">DynamoDBCrudPolicy</code>, <code className="text-orange-300">SNSPublishMessagePolicy</code>, and scoped Bedrock ARN invoke access.
              </p>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Resilient Fallback Mode</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                If satellite or weather API throttles, pipeline seamlessly ingests cached historical stubble analogues with zero failure.
              </p>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 p-3 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Claude 3 Guardrails</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Bedrock system prompt enforces strict RFC-8259 JSON validation preventing hallucinations in emergency advisories.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between text-xs flex-shrink-0">
          <div className="text-gray-400 text-[11px]">
            CloudFormation Stack: <strong className="text-white font-mono">VayuSync-Stack</strong> · SAM Managed
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-all"
          >
            Close Architecture Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
