import { Severity } from '../types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#ef4444',  // red-500
  HIGH: '#f97316',      // orange-500
  MEDIUM: '#eab308',    // yellow-500
  LOW: '#22c55e',       // green-500
  NONE: '#6b7280',      // gray-500
};

export const SEVERITY_BG: Record<Severity, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/40',
  NONE: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-yellow-500',
  LOW: 'border-l-green-500',
  NONE: 'border-l-gray-500',
};

export const FACILITY_ICONS: Record<string, string> = {
  School: '🏫',
  Hospital: '🏥',
  Construction: '🏗️',
  Municipality: '🏛️',
};

export const AQI_CATEGORY: Record<string, { color: string; label: string }> = {
  Good: { color: '#22c55e', label: 'Good (0-50)' },
  Satisfactory: { color: '#84cc16', label: 'Satisfactory (51-100)' },
  Moderate: { color: '#eab308', label: 'Moderate (101-200)' },
  Poor: { color: '#f97316', label: 'Poor (201-300)' },
  'Very Poor': { color: '#ef4444', label: 'Very Poor (301-400)' },
  Severe: { color: '#7c3aed', label: 'Severe (401+)' },
};

export function getAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getAqiColor(aqi: number): string {
  const cat = getAqiCategory(aqi);
  return AQI_CATEGORY[cat]?.color ?? '#ef4444';
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function formatArrivalCountdown(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'Arriving now';
  const diffMin = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `in ${hrs}h ${mins}m`;
}

export function getHotspotRadius(frp: number): number {
  // Scale marker radius with fire radiative power (log scale for visual balance)
  return Math.max(8, Math.min(20, 6 + Math.log(frp / 100) * 4));
}

export function frpToColor(frp: number): string {
  if (frp > 1000) return '#dc2626'; // red-600
  if (frp > 700) return '#ea580c';  // orange-600
  if (frp > 400) return '#d97706';  // amber-600
  return '#ca8a04'; // yellow-600
}
