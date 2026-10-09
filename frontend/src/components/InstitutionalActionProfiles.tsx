import React, { useState } from 'react';
import { School, Building, HardHat, Download, Copy, Check, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { voiceBroadcast } from '../utils/voiceBroadcast';

type FacilityCategory = 'SCHOOL' | 'CONSTRUCTION' | 'HOSPITAL';

interface ActionProfile {
  id: string;
  name: string;
  category: FacilityCategory;
  district: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  leadTimeHours: number;
  expectedPm25: number;
  contactPerson: string;
  rules: string[];
  protocolCode: string;
}

const PROFILES: ActionProfile[] = [
  {
    id: 'SCH-DEL-0492',
    name: 'DPS Rohini / Model Senior Secondary School',
    category: 'SCHOOL',
    district: 'North West Delhi',
    threatLevel: 'CRITICAL',
    leadTimeHours: 6.2,
    expectedPm25: 485,
    contactPerson: 'Principal / Admin Directorate',
    protocolCode: 'SOP-SCH-AIR-CRIT-01',
    rules: [
      'Shift all morning PE classes & sports practices indoors by 08:30 AM.',
      'Mandatory suspension of diesel transport bus idling inside campus gates.',
      'Issue N95 respirators to campus perimeter guards, gatekeepers & conductors.',
      'Switch central HVAC system to 100% internal HEPA filtration mode at 07:45 AM.',
      'Broadcast automated health advisory to parents via parent portal notification.'
    ]
  },
  {
    id: 'CON-DEL-0088',
    name: 'Pragati Maidan / Dwarka Expressway Corridor Project',
    category: 'CONSTRUCTION',
    district: 'Central / South West Delhi',
    threatLevel: 'CRITICAL',
    leadTimeHours: 5.8,
    expectedPm25: 520,
    contactPerson: 'Safety Director / Site Lead',
    protocolCode: 'SOP-CON-DUST-HALT-04',
    rules: [
      'Activate high-pressure water mist cannons along site perimeter at 09:00 AM.',
      'Mandatory N95/P2 respirator distribution & compliance audit for all shift workers.',
      'Complete suspension of dry earth excavation, demolition, and rock cutting during smoke window.',
      'Enclose all aggregate and dry cement stockpiles under dust-proof tarping.',
      'Rotate outdoor laborers to indoor or below-grade finishing activities.'
    ]
  },
  {
    id: 'HSP-DEL-0031',
    name: 'AIIMS New Delhi / Safdarjung Hospital Network',
    category: 'HOSPITAL',
    district: 'South Delhi',
    threatLevel: 'CRITICAL',
    leadTimeHours: 6.5,
    expectedPm25: 440,
    contactPerson: 'Chief Medical Superintendent',
    protocolCode: 'SOP-HSP-PULM-PREP-09',
    rules: [
      'Switch building air intake dampers to 100% internal HEPA recirculation mode immediately.',
      'Pre-stage pediatric & geriatric emergency nebulizer stations in pulmonary triage wing.',
      'Alert on-call pulmonology medical staff for an anticipated 35% patient surge (10:00 - 18:00 IST).',
      'Verify 48-hour reserve inventory of bronchodilators, oxygen cylinders & high-flow masks.',
      'Initiate positive-pressure air curtains at all main emergency department trauma entries.'
    ]
  }
];

export const InstitutionalActionProfiles: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<FacilityCategory>('SCHOOL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeProfile = PROFILES.find(p => p.category === selectedCategory) || PROFILES[0];

  const handleCopy = () => {
    soundEngine.playClick();
    const text = `
=====================================================
VAYUSYNC PREEMPTIVE ACTION DIRECTIVE
Facility: ${activeProfile.name} (${activeProfile.id})
Category: ${activeProfile.category} | District: ${activeProfile.district}
Threat Level: ${activeProfile.threatLevel} | Forecast PM2.5: ${activeProfile.expectedPm25} µg/m³
Lead Time: ${activeProfile.leadTimeHours} Hours Advance Warning
Protocol Code: ${activeProfile.protocolCode}
=====================================================
MANDATORY OPERATIONAL DIRECTIVES:
${activeProfile.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Issued autonomously by VayuSync AI Engine via Amazon Bedrock (Claude 3 Haiku).
Dispatched via Amazon SNS to ${activeProfile.contactPerson}.
=====================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedId(activeProfile.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleDownloadPdf = () => {
    soundEngine.playClick();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>VayuSync Action Directive - ${activeProfile.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
    .header { border-bottom: 3px solid #f97316; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 26px; font-weight: 900; color: #ea580c; }
    .badge { background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; border: 1px solid #f87171; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 10px; margin-bottom: 25px; }
    .meta-item { font-size: 13px; }
    .meta-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; }
    .meta-val { font-size: 15px; font-weight: bold; color: #0f172a; }
    h2 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; }
    ol { padding-left: 20px; }
    li { margin-bottom: 12px; font-size: 14px; color: #1e293b; }
    .footer { margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">🌬️ VayuSync Preemptive Directive</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Autonomous Stubble Smoke Early Warning & Institutional Action Engine</div>
    </div>
    <div class="badge">THREAT LEVEL: ${activeProfile.threatLevel}</div>
  </div>

  <div class="meta">
    <div class="meta-item"><div class="meta-label">Designated Facility</div><div class="meta-val">${activeProfile.name}</div></div>
    <div class="meta-item"><div class="meta-label">Facility ID & District</div><div class="meta-val">${activeProfile.id} · ${activeProfile.district}</div></div>
    <div class="meta-item"><div class="meta-label">Predictive Lead Time</div><div class="meta-val">${activeProfile.leadTimeHours} Hours Advance Warning</div></div>
    <div class="meta-item"><div class="meta-label">Forecast Peak PM2.5</div><div class="meta-val" style="color:#dc2626;">${activeProfile.expectedPm25} µg/m³ (Hazardous Surge)</div></div>
  </div>

  <h2>Mandatory Operational Directives (Protocol: ${activeProfile.protocolCode})</h2>
  <ol>
    ${activeProfile.rules.map(r => `<li><strong>${r}</strong></li>`).join('')}
  </ol>

  <div class="footer">
    Authorized by VayuSync AI Evaluation Core (Powered by Amazon Bedrock Claude 3 Haiku).<br/>
    Dispatched via Amazon SNS to: ${activeProfile.contactPerson} · Bharat Builds 2026 Environmental Hacks.
  </div>
</body>
</html>
`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Category selector pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
        <div>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            Institutional Operational Action Profiles
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Concrete operational mandates customized for schools, construction, and hospitals
          </p>
        </div>

        {/* Category Toggles */}
        <div className="flex items-center gap-1.5 bg-gray-950 p-1 border border-gray-800 rounded-2xl">
          {[
            { id: 'SCHOOL', label: 'Schools', icon: School },
            { id: 'CONSTRUCTION', label: 'Outdoor Construction', icon: HardHat },
            { id: 'HOSPITAL', label: 'Hospitals', icon: Building },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                soundEngine.playClick();
                setSelectedCategory(id as FacilityCategory);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                selectedCategory === id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Card Header */}
      <div className="bg-gray-950/70 border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-white">{activeProfile.name}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              {activeProfile.threatLevel} THREAT
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-3">
            <span>District: <strong className="text-gray-200">{activeProfile.district}</strong></span>
            <span>·</span>
            <span className="flex items-center gap-1 text-orange-400 font-medium">
              <Clock className="w-3 h-3" />
              Advance Notice: <strong>{activeProfile.leadTimeHours} Hours</strong>
            </span>
            <span>·</span>
            <span className="text-red-400 font-bold">
              Est. PM2.5: {activeProfile.expectedPm25} µg/m³
            </span>
          </div>
        </div>

        {/* Action Buttons: Download PDF, Copy, and Audio Voice Broadcast */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              soundEngine.playClick();
              const announcementText = `Emergency Public Health Advisory for ${activeProfile.name}. Toxic stubble smoke plume arriving in approximately ${activeProfile.leadTimeHours} hours. Forecast PM2.5 surge is ${activeProfile.expectedPm25} micrograms per cubic meter. Immediate mandatory directive: ${activeProfile.rules[0]}.`;
              voiceBroadcast.speak(announcementText, 'en-IN');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold rounded-xl transition-all border border-purple-500/40 active:scale-95"
            title="Listen to automated voice announcement (Amazon Polly Style)"
          >
            <span className="text-sm">🔊</span>
            <span>Listen Voice Broadcast</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-all border border-gray-700 active:scale-95"
            title="Copy operational directives to clipboard"
          >
            {copiedId === activeProfile.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === activeProfile.id ? 'Copied Directive!' : 'Copy Advisory'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95"
            title="Download printable / PDF action plan"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Action Directive (PDF)</span>
          </button>
        </div>
      </div>

      {/* Concrete Operational Rules List */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-1 flex items-center justify-between">
          <span>Actionable Protocol Directives ({activeProfile.protocolCode}):</span>
          <span className="text-purple-400 font-mono text-[9px] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Claude 3 Haiku Guardrailed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {activeProfile.rules.map((rule, index) => (
            <div
              key={index}
              className="bg-gray-950/80 border border-gray-800/80 hover:border-orange-500/40 p-3 rounded-2xl flex items-start gap-2.5 transition-colors"
            >
              <div className="w-5 h-5 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="text-xs text-gray-200 leading-relaxed font-medium">
                {rule}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
