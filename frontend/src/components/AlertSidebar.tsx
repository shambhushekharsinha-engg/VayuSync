import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bell, CheckCircle2, Sparkles } from 'lucide-react';
import type { AlertLog } from '../types';
import { SEVERITY_BORDER, SEVERITY_BG, FACILITY_ICONS, formatRelativeTime, formatArrivalCountdown } from '../utils/mapHelpers';
import { soundEngine } from '../utils/audio';

interface AlertSidebarProps {
  alerts: AlertLog[];
  isSimulating?: boolean;
  onSelectAlert?: (alert: AlertLog) => void;
}

const AlertCard: React.FC<{
  alert: AlertLog;
  isNew?: boolean;
  onInspect?: () => void;
}> = ({ alert, isNew, onInspect }) => {
  const [expanded, setExpanded] = useState(false);
  const icon = FACILITY_ICONS[alert.facility_type] ?? '📍';
  const borderColor = SEVERITY_BORDER[alert.impact_severity] ?? 'border-l-gray-500';
  const badgeClass = SEVERITY_BG[alert.impact_severity] ?? '';

  return (
    <div
      className={`
        bg-gray-900 border border-gray-800 border-l-4 ${borderColor}
        rounded-2xl p-3.5 space-y-2.5
        transition-all duration-300 hover:border-gray-700
        ${isNew ? 'animate-slide-in-right ring-1 ring-orange-500/30' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-gray-100 font-bold text-xs leading-snug truncate">
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
        <div className="bg-gray-950/60 rounded-xl px-2.5 py-1.5 border border-gray-800/60">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">PM2.5 Forecast</p>
          <p className="text-red-400 font-black text-sm">{Math.round(alert.predicted_pm25_ugm3)} <span className="text-[9px] font-normal text-gray-500">µg/m³</span></p>
        </div>
        <div className="bg-gray-950/60 rounded-xl px-2.5 py-1.5 border border-gray-800/60">
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Smoke Arrives</p>
          <p className="text-orange-400 font-bold text-xs">{formatArrivalCountdown(alert.predicted_arrival_utc)}</p>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            soundEngine.playClick();
            setExpanded(!expanded);
          }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Bell className="w-3 h-3 text-orange-400" />
          <span>{(alert.recommended_actions ?? []).length} Actions</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {onInspect && (
          <button
            onClick={() => {
              soundEngine.playClick();
              onInspect();
            }}
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/20 transition-all"
            title="Inspect AI Advisory Protocol & Telemetry"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Protocol</span>
          </button>
        )}
      </div>

      {expanded && (
        <ul className="space-y-1.5 pt-1.5 border-t border-gray-800/80 animate-fade-in-up">
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
        <div className="flex items-center gap-1 text-[9px] text-green-400/90 pt-0.5">
          <CheckCircle2 className="w-3 h-3" />
          <span>SMS Dispatched via SNS · Conf. {Math.round((alert.confidence_score ?? 0.94) * 100)}%</span>
        </div>
      )}
    </div>
  );
};

const AlertSidebar: React.FC<AlertSidebarProps> = ({ alerts, isSimulating, onSelectAlert }) => {
  const criticalCount = alerts.filter(a => a.impact_severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.impact_severity === 'HIGH').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" />
            Live Alert Feed
          </h2>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {alerts.length} active alerts · {criticalCount} critical · {highCount} high
          </p>
        </div>
        {isSimulating && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
            <span className="text-orange-400 text-[10px] font-semibold">LIVE</span>
          </div>
        )}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No active alerts in this time window.
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              isNew={idx === 0 && isSimulating}
              onInspect={onSelectAlert ? () => onSelectAlert(alert) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertSidebar;
