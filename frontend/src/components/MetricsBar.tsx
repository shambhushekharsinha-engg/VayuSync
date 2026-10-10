import React from 'react';
import { Flame, Building2, Clock, Zap, DollarSign } from 'lucide-react';
import type { DashboardData } from '../types';

interface MetricsBarProps {
  dashboard: DashboardData | null;
  isSimulating?: boolean;
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  pulse?: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ icon, label, value, sub, color = 'text-white', pulse }) => (
  <div className="flex items-center gap-2.5 px-4 py-2 border-r border-gray-800 last:border-0">
    <div className={`${color} flex-shrink-0`}>{icon}</div>
    <div>
      <div className={`font-black text-lg leading-none ${color} flex items-center gap-1.5`}>
        {value}
        {pulse && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
      </div>
      <div className="text-gray-500 text-[10px] mt-0.5">{label}</div>
      {sub && <div className="text-gray-600 text-[9px]">{sub}</div>}
    </div>
  </div>
);

const MetricsBar: React.FC<MetricsBarProps> = ({ dashboard, isSimulating }) => {
  const d = dashboard;

  return (
    <div className="flex items-center bg-gray-900/80 border-b border-gray-800 overflow-x-auto">
      <MetricItem
        icon={<Flame className="w-4 h-4" />}
        label="Active Fires"
        value={d?.active_fire_hotspots ?? 5}
        sub="Punjab + Haryana"
        color="text-orange-400"
        pulse={isSimulating}
      />
      <MetricItem
        icon={<Building2 className="w-4 h-4" />}
        label="Institutions Alerted"
        value={d?.institutions_at_risk ?? 8}
        sub={`${d?.critical_alerts ?? 3} critical · ${d?.high_alerts ?? 3} high`}
        color="text-red-400"
      />
      <MetricItem
        icon={<Clock className="w-4 h-4" />}
        label="Avg Lead Time"
        value={d?.avg_lead_time_hours != null ? `${d.avg_lead_time_hours}h` : '—'}
        sub={d?.is_mock_fallback ? 'demo scenario model' : (d?.avg_lead_time_hours != null ? 'live screening lead time' : 'requires active hotspot')}
        color="text-blue-400"
      />
      <MetricItem
        icon={<Zap className="w-4 h-4" />}
        label="Processing Latency"
        value={d?.pipeline_latency_ms != null ? `${d.pipeline_latency_ms}ms` : '—'}
        sub={d?.pipeline_latency_ms != null ? 'E2E Pipeline · SLA: <3.0s' : 'measured on /simulate'}
        color="text-yellow-400"
      />
      <MetricItem
        icon={<DollarSign className="w-4 h-4" />}
        label="AWS Cost Today"
        value={d?.aws_cost_today_usd != null ? `$${d.aws_cost_today_usd.toFixed(2)}` : '$0.00'}
        sub="Free Tier Core + Bedrock"
        color="text-green-400"
      />
      {/* AQI indicator */}
      <div className="flex items-center gap-2.5 px-4 py-2 ml-auto flex-shrink-0">
        <div className="text-center">
          <div className="text-red-400 font-black text-lg leading-none flex items-center justify-center gap-1.5">
            {d?.aqi_delhi_ncr?.current != null ? d.aqi_delhi_ncr.current : '—'}
            {d?.aqi_delhi_ncr?.current != null && (
              <span className={`w-1.5 h-1.5 rounded-full ${d.aqi_delhi_ncr.is_illustrative ? 'bg-orange-400' : 'bg-red-400 animate-ping'}`} />
            )}
          </div>
          <div className="text-gray-500 text-[10px]">Delhi NCR AQI</div>
          <div className="text-red-400/60 text-[9px]">
            {d?.aqi_delhi_ncr?.is_illustrative
              ? 'illustrative baseline'
              : (d?.aqi_delhi_ncr?.category ?? 'sensor feed')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsBar;
