import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bell, CheckCircle2 } from 'lucide-react';
import type { AlertLog } from '../types';
import { SEVERITY_BORDER, SEVERITY_BG, FACILITY_ICONS, formatRelativeTime, formatArrivalCountdown } from '../utils/mapHelpers';

interface AlertSidebarProps {
  alerts: AlertLog[];
  isSimulating?: boolean;
}

const AlertCard: React.FC<{ alert: AlertLog; isNew?: boolean }> = ({ alert, isNew }) => {
  const [expanded, setExpanded] = useState(false);
  const icon = FACILITY_ICONS[alert.facility_type] ?? '📍';
  const borderColor = SEVERITY_BORDER[alert.impact_severity] ?? 'border-l-gray-500';
  const badgeClass = SEVERITY_BG[alert.impact_severity] ?? '';

  return (
    <div
      className={`
        bg-gray-900 border border-gray-800 border-l-4 ${borderColor}
        rounded-xl p-3.5 space-y-2
        transition-all duration-300
        ${isNew ? 'animate-slide-in-right ring-1 ring-orange-500/30' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-gray-100 font-semibold text-xs leading-snug truncate">
              {alert.institution_name}
            </p>
            <p className="text-gray-500 text-[10px]">{alert.facility_type} · {formatRelativeTime(alert.timestamp)}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${badgeClass}`}>
          {alert.impact_severity}
        </span>
      </div>

      {/* PM2.5 + arrival */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-950/60 rounded-lg px-2.5 py-1.5">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">PM2.5 Forecast</p>
          <p className="text-red-400 font-black text-sm">{Math.round(alert.predicted_pm25_ugm3)} <span className="text-[9px] font-normal text-gray-500">µg/m³</span></p>
        </div>
        <div className="bg-gray-950/60 rounded-lg px-2.5 py-1.5">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Smoke Arrives</p>
          <p className="text-orange-400 font-bold text-xs">{formatArrivalCountdown(alert.predicted_arrival_utc)}</p>
        </div>
      </div>

      {/* Expandable actions */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span className="flex items-center gap-1">
          <Bell className="w-3 h-3" />
          {(alert.recommended_actions ?? []).length} recommended actions
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <ul className="space-y-1.5 pt-0.5 border-t border-gray-800/60">
          {(alert.recommended_actions ?? []).map((action, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300 text-[10px] leading-relaxed">{action}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Dispatch status */}
      {alert.sms_delivered && (
        <div className="flex items-center gap-1 text-[9px] text-green-500/80">
          <CheckCircle2 className="w-3 h-3" />
          SMS dispatched · confidence {Math.round((alert.confidence_score ?? 0) * 100)}%
        </div>
      )}
    </div>
  );
};

const AlertSidebar: React.FC<AlertSidebarProps> = ({ alerts, isSimulating }) => {
  const criticalCount = alerts.filter(a => a.impact_severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.impact_severity === 'HIGH').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" />
            Alert Feed
          </h2>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {alerts.length} active alerts · {criticalCount} critical
          </p>
        </div>
        {isSimulating && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
            <span className="text-orange-400 text-[10px] font-semibold">LIVE</span>
          </div>
        )}
      </div>

      {/* Severity summary bar */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 flex-shrink-0">
        {[
          { label: 'Critical', count: criticalCount, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'High', count: highCount, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Total', count: alerts.length, color: 'text-gray-300', bg: 'bg-gray-800 border-gray-700' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border rounded-lg p-2 text-center`}>
            <div className={`${color} font-black text-base`}>{count}</div>
            <div className="text-gray-500 text-[9px]">{label}</div>
          </div>
        ))}
      </div>

      {/* Alert cards list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No active alerts</p>
            <p className="text-[10px] mt-1">Trigger simulation to generate alerts</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              isNew={idx === 0 && isSimulating}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertSidebar;
