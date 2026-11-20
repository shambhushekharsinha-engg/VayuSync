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
  <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 border-r border-gray-800 last:border-0 flex-shrink-0">
    <div className={`${color} flex-shrink-0`}>{icon}</div>
    <div className="whitespace-nowrap">
      <div className={`font-black text-sm sm:text-lg leading-none ${color} flex items-center gap-1.5`}>
        {value}
        {pulse && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
      </div>
      <div className="text-gray-500 text-[9px] sm:text-[10px] mt-0.5">{label}</div>
      {sub && <div className="text-gray-600 text-[8px] sm:text-[9px] hidden sm:block">{sub}</div>}
    </div>
  </div>
);

const MetricsBar: React.FC<MetricsBarProps> = ({ dashboard, isSimulating }) => {
  const d = dashboard;
  const leadTime = d?.avg_lead_time_hours != null ? `${d.avg_lead_time_hours}h` : '5.8h';
  const latency = d?.pipeline_latency_ms != null ? `${d.pipeline_latency_ms}ms` : '1,250ms';
  const aqiVal = d?.aqi_delhi_ncr?.current != null ? d.aqi_delhi_ncr.current : 387;

  return (
    <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-gray-900/90 border-b border-gray-800 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-gray-800/80">
      <MetricItem
        icon={<Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        label="Active Fires"
        value={d?.active_fire_hotspots ?? 5}
        sub="Punjab + Haryana"
        color="text-orange-400"
        pulse={isSimulating}
      />
      <MetricItem
        icon={<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        label="Institutions Alerted"
        value={d?.institutions_at_risk ?? 8}
        sub={`${d?.critical_alerts ?? 3} critical · ${d?.high_alerts ?? 3} high`}
        color="text-red-400"
      />
      <MetricItem
        icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        label="Avg Lead Time"
        value={leadTime}
        sub={d?.avg_lead_time_hours != null ? 'live screening lead time' : 'preemptive arrival window'}
        color="text-blue-400"
      />
      <MetricItem
        icon={<Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        label="Processing Latency"
        value={latency}
        sub="E2E Pipeline · SLA: <3.0s"
        color="text-yellow-400"
      />
      <MetricItem
        icon={<DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        label="AWS Cost Today"
        value={d?.aws_cost_today_usd != null ? `$${d.aws_cost_today_usd.toFixed(2)}` : '$0.00'}
        sub="Free Tier Core + Bedrock"
        color="text-green-400"
      />
      {/* AQI indicator */}
      <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 flex-shrink-0 whitespace-nowrap">
        <div className="text-left sm:text-center w-full">
          <div className="text-red-400 font-black text-sm sm:text-lg leading-none flex items-center justify-start sm:justify-center gap-1.5">
            {aqiVal}
            <span className={`w-1.5 h-1.5 rounded-full ${d?.aqi_delhi_ncr?.is_illustrative ? 'bg-orange-400' : 'bg-red-400 animate-ping'}`} />
          </div>
          <div className="text-gray-500 text-[9px] sm:text-[10px] mt-0.5">Delhi NCR AQI</div>
          <div className="text-red-400/60 text-[8px] sm:text-[9px] hidden sm:block">
            {d?.aqi_delhi_ncr?.category ?? 'Severe Inversion Surge'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsBar;
