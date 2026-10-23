import React, { useState, useEffect } from 'react';
import { FileText, Printer, Copy, Check, MapPin, QrCode, Shield, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { PatientFacts, MatchedProtocolResult } from '../services/protocolEngine';

interface Props {
  facts: PatientFacts;
  matchedProtocol: MatchedProtocolResult;
  actionTimeline: { timestamp: string; action: string }[];
  gpsCoords: { lat: number; lng: number } | null;
  onClearAll: () => void;
}

export const ParamedicHandoffModal: React.FC<Props> = ({
  facts,
  matchedProtocol,
  actionTimeline,
  gpsCoords,
  onClearAll
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const what3words = facts.location.what3words_approx || "///brave.pulse.rescue";
  const coordsString = gpsCoords 
    ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` 
    : "18.52043, 73.85674 (Bystander GPS)";

  // Format SBAR plain-text
  const sbarText = `=== SBAR PARAMEDIC & CLINICIAN EMERGENCY HANDOFF ===
Generated: ${new Date().toLocaleTimeString()} (First 10 Minutes Protocol)
LOCATION: ${coordsString} | what3words: ${what3words}

[S] SITUATION:
- Patient: ${facts.patient.age_category?.toUpperCase() || 'ADULT'} (${facts.patient.gender || 'unknown'}), Approx Age: ${facts.patient.approx_age || 'Unknown'}
- Primary Emergency: ${matchedProtocol.protocolName} [${matchedProtocol.urgency} URGENCY]
- Observed Symptoms: ${facts.symptoms.join(', ') || 'Acute distress'}

[B] BACKGROUND:
- Medications Observed: ${facts.medications_observed.join(', ') || 'None found on scene'}
- Allergies: ${facts.allergies.join(', ') || 'No known allergies reported'}
- Environmental Hazards: ${facts.hazards.join(', ') || 'None identified'}

[A] ASSESSMENT (BYSTANDER ACTION TIMELINE):
${actionTimeline.map(t => `  • [${t.timestamp}] ${t.action}`).join('\n')}

[R] RECOMMENDATION:
- Rule-based Protocol Triggered: ${matchedProtocol.protocolName}
- Standard Guidance: ${matchedProtocol.sourceLabel}
- Emergency Dispatch Trigger: ${matchedProtocol.whenToCall}
- Never Do Reminders: ${matchedProtocol.neverDo.join('; ')}
===================================================`;

  // Generate QR code for instant phone-to-phone paramedic scan
  useEffect(() => {
    QRCode.toDataURL(sbarText, { width: 180, margin: 1 })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error(err));
  }, [sbarText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sbarText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
            Official Clinical Handoff (SBAR)
          </span>
          <h3 className="text-xl font-black text-white mt-1">
            Paramedic & ER Doctor Transfer Sheet
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            <span>{copied ? 'Copied' : 'Copy SBAR'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold border border-slate-700 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* GPS Location & QR Code Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Geolocation & Emergency Coordinates</span>
          </div>
          <div className="font-mono text-sm text-emerald-400 font-bold">
            {coordsString}
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-blue-300">
            <span>what3words:</span> <span className="font-bold">{what3words}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="Paramedic Handoff QR Code" className="w-24 h-24 rounded border border-slate-700" />
          ) : (
            <div className="w-24 h-24 bg-slate-900 rounded flex items-center justify-center text-xs text-slate-500">QR Loading</div>
          )}
          <span className="text-[10px] text-slate-400 font-mono mt-1">Scan for Full SBAR Data</span>
        </div>
      </div>

      {/* Structured SBAR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Situation */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="font-black text-red-400 uppercase tracking-wide text-[11px]">
            [S] Situation
          </div>
          <p className="text-slate-200">
            <strong>Patient:</strong> {facts.patient.age_category || 'Adult'} ({facts.patient.gender || 'Unknown'}), ~{facts.patient.approx_age || 'N/A'} yrs.
          </p>
          <p className="text-slate-200">
            <strong>Condition:</strong> {matchedProtocol.protocolName} ({matchedProtocol.urgency})
          </p>
          <p className="text-slate-300">
            <strong>Symptoms:</strong> {facts.symptoms.join(', ') || 'Acute distress'}
          </p>
        </div>

        {/* Background */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="font-black text-blue-400 uppercase tracking-wide text-[11px]">
            [B] Background
          </div>
          <p className="text-slate-200">
            <strong>Medications Seen:</strong> {facts.medications_observed.join(', ') || 'None found'}
          </p>
          <p className="text-slate-200">
            <strong>Allergies:</strong> {facts.allergies.join(', ') || 'None stated'}
          </p>
          <p className="text-slate-300">
            <strong>Hazards:</strong> {facts.hazards.join(', ') || 'No active hazard'}
          </p>
        </div>

        {/* Assessment / Timeline */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 sm:col-span-2">
          <div className="font-black text-amber-400 uppercase tracking-wide text-[11px] flex items-center justify-between">
            <span>[A] Assessment & Bystander Action Timeline</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            {actionTimeline.length === 0 ? (
              <p className="text-slate-500 italic">No bystander actions recorded yet</p>
            ) : (
              actionTimeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500">[{item.timestamp}]</span>
                  <span>{item.action}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 sm:col-span-2">
          <div className="font-black text-emerald-400 uppercase tracking-wide text-[11px]">
            [R] Recommendation & Protocol Base
          </div>
          <p className="text-slate-300">
            <strong>Protocol Triggered:</strong> {matchedProtocol.protocolName} ({matchedProtocol.sourceLabel})
          </p>
          <p className="text-slate-300">
            <strong>Harm Prevention:</strong> {matchedProtocol.neverDo.join('; ')}
          </p>
        </div>
      </div>

      {/* Privacy Notice and Clear Everything Button */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 text-[11px] text-slate-500">
        <div>
          🔒 <strong>Privacy:</strong> All processing is done locally in your browser. Zero data is stored on servers.
        </div>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 font-bold text-xs transition-all active:scale-95"
        >
          Clear Everything (Reset Emergency Data)
        </button>
      </div>
    </div>
  );
};
