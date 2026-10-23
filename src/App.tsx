import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Ambulance, 
  ShieldCheck, 
  AlertTriangle, 
  Key, 
  Settings, 
  HelpCircle, 
  Share2, 
  FileText, 
  ShieldAlert, 
  RotateCcw,
  Volume2
} from 'lucide-react';
import { IngestionPanel } from './components/IngestionPanel';
import { ActionPlanDisplay } from './components/ActionPlanDisplay';
import { VerificationPanel } from './components/VerificationPanel';
import { ParamedicHandoffModal } from './components/ParamedicHandoffModal';
import { RedTeamModal } from './components/RedTeamModal';
import { extractPatientFacts } from './services/scribe';
import { matchProtocol, PatientFacts, MatchedProtocolResult, ProtocolStep, SAFE_DEFAULT_RESULT } from './services/protocolEngine';
import { auditFactsAndSafety, SkepticAnalysis } from './services/skeptic';

export function App() {
  // Application State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);

  // Core Emergency State
  const [rawEmergencyInput, setRawEmergencyInput] = useState('');
  const [patientFacts, setPatientFacts] = useState<PatientFacts | null>(null);
  const [matchedProtocol, setMatchedProtocol] = useState<MatchedProtocolResult | null>(null);
  const [skepticAnalysis, setSkepticAnalysis] = useState<SkepticAnalysis | null>(null);
  const [selectedTrustStep, setSelectedTrustStep] = useState<ProtocolStep | null>(null);
  
  // Bystander Timeline & Location
  const [actionTimeline, setActionTimeline] = useState<{ timestamp: string; action: string }[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modals
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showRedTeamModal, setShowRedTeamModal] = useState(false);

  // Get Geolocation on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.log('Geolocation note: using approximate location fallback')
      );
    }
  }, []);

  const addTimelineEvent = (action: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActionTimeline(prev => [...prev, { timestamp: time, action }]);
  };

  // Main Emergency Fact & Action Evaluation Workflow
  const handleAnalyzeEmergency = async (
    rawText: string, 
    imageBase64?: string, 
    source: 'voice' | 'photo' | 'text' | 'paste' = 'text'
  ) => {
    setIsProcessing(true);
    setRawEmergencyInput(rawText);
    addTimelineEvent(`Emergency chaos ingested via ${source.toUpperCase()} input`);

    try {
      // 1. Agent 1: Scribe extracts structured facts
      const { facts, usedApi } = await extractPatientFacts(rawText, imageBase64, apiKey);
      setPatientFacts(facts);
      addTimelineEvent(`Agent 1 (Scribe): Facts extracted (Age: ${facts.patient.approx_age || 'N/A'}, Symptoms: ${facts.symptoms.join(', ') || 'Observed'}) via ${usedApi ? 'Gemini 1.5' : 'Deterministic Engine'}`);

      // 2. Agent 3: Skeptic audits facts, tags sources, checks contradictions & prompt injection
      const skeptic = auditFactsAndSafety(facts, rawText, source);
      setSkepticAnalysis(skeptic);
      if (skeptic.contradictions.length > 0) {
        addTimelineEvent(`Agent 3 (Skeptic): ${skeptic.contradictions.length} contradiction(s) flagged on Contradiction Radar`);
      }
      if (skeptic.promptInjectionBlocked) {
        addTimelineEvent(`Agent 3 (Skeptic): Neutralized prompt-injection attack in raw input`);
      }

      // 3. Agent 2: Protocol Keeper deterministically matches protocol
      const matched = matchProtocol(facts, !navigator.onLine || !usedApi);
      setMatchedProtocol(matched);
      addTimelineEvent(`Agent 2 (Protocol Keeper): Matched [${matched.protocolName}] with urgency ${matched.urgency}`);

    } catch (err) {
      console.error(err);
      setMatchedProtocol(SAFE_DEFAULT_RESULT);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnswerTriageQuestion = (questionId: string, answer: string) => {
    if (!patientFacts) return;
    addTimelineEvent(`Bystander answered triage question [${questionId}]: "${answer}"`);

    const updatedFacts: PatientFacts = {
      ...patientFacts,
      raw_extracted_text: `${patientFacts.raw_extracted_text || ''} ${answer}`
    };

    if (answer.toLowerCase().includes('breathing normally')) {
      updatedFacts.symptoms = updatedFacts.symptoms.filter(s => s !== 'not breathing');
      updatedFacts.symptoms.push('unconscious breathing');
    } else if (answer.toLowerCase().includes('not breathing')) {
      updatedFacts.symptoms.push('not breathing');
    }

    if (answer.toLowerCase().includes('allergic to aspirin')) {
      updatedFacts.allergies.push('Aspirin / NSAIDs');
    }

    setPatientFacts(updatedFacts);
    const updatedSkeptic = auditFactsAndSafety(updatedFacts, updatedFacts.raw_extracted_text || '', 'text');
    setSkepticAnalysis(updatedSkeptic);
    const updatedMatched = matchProtocol(updatedFacts, false);
    setMatchedProtocol(updatedMatched);
  };

  const handleClearEverything = () => {
    if (confirm("Reset and clear all active emergency data?")) {
      setRawEmergencyInput('');
      setPatientFacts(null);
      setMatchedProtocol(null);
      setSkepticAnalysis(null);
      setSelectedTrustStep(null);
      setActionTimeline([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 selection:bg-red-600">
      {/* Permanent Safety Disclaimer Banner */}
      <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black tracking-wide text-center uppercase flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Decision support, not a medical diagnosis. Call emergency services in any serious situation.</span>
      </div>

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-white shadow-lg shadow-red-600/40 text-lg">
              10
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                FIRST 10 MINUTES
              </h1>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Key className="w-3 h-3 text-red-500 inline" />
                <span>AI Reads • Rules Decide • Humans Control</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Red Team Attack Report Button */}
            <button
              onClick={() => setShowRedTeamModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-700/80 text-red-300 text-xs font-bold transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="hidden sm:inline">Red Team</span> Report
            </button>

            {/* Paramedic Handoff Button */}
            {matchedProtocol && (
              <button
                onClick={() => setShowHandoffModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-white text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>SBAR Handoff</span>
              </button>
            )}

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              title="API Key Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Settings Dropdown Box */}
        {showSettings && (
          <div className="max-w-4xl mx-auto mt-3 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">Gemini API Key (Optional — Local Fallback is Active)</span>
              <span className="text-[10px] text-slate-500 font-mono">Stored locally in browser</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  localStorage.setItem('GEMINI_API_KEY', e.target.value);
                }}
                placeholder="AIzaSy... (leave blank to run in 100% offline rule-based mode)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none font-mono"
              />
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-5 flex-1">
        {/* Ingestion Panel (Agent 1 + Demo Scenarios) */}
        <IngestionPanel
          onAnalyze={handleAnalyzeEmergency}
          isProcessing={isProcessing}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
        />

        {/* Action Plan Display (Agent 2: Protocol Keeper) */}
        {matchedProtocol && (
          <ActionPlanDisplay
            matchedProtocol={matchedProtocol}
            onSelectTrustStep={setSelectedTrustStep}
            selectedTrustStep={selectedTrustStep}
          />
        )}

        {/* Verification & Contradiction Layer (Agent 3: Skeptic) */}
        {skepticAnalysis && patientFacts && (
          <VerificationPanel
            skepticAnalysis={skepticAnalysis}
            facts={patientFacts}
            onAnswerQuestion={handleAnswerTriageQuestion}
          />
        )}

        {/* Reset / Clear Button */}
        {matchedProtocol && (
          <div className="text-center pt-2">
            <button
              onClick={handleClearEverything}
              className="text-xs font-bold text-slate-500 hover:text-red-400 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Case & Clear Emergency Input
            </button>
          </div>
        )}
      </main>

      {/* Paramedic Handoff Modal (SBAR) */}
      {showHandoffModal && matchedProtocol && patientFacts && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl w-full my-auto max-h-[95vh] overflow-y-auto">
            <div className="text-right pb-1">
              <button
                onClick={() => setShowHandoffModal(false)}
                className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Close (ESC)
              </button>
            </div>
            <ParamedicHandoffModal
              facts={patientFacts}
              matchedProtocol={matchedProtocol}
              actionTimeline={actionTimeline}
              gpsCoords={gpsCoords}
              onClearAll={() => {
                setShowHandoffModal(false);
                handleClearEverything();
              }}
            />
          </div>
        </div>
      )}

      {/* Red Team Report Modal */}
      {showRedTeamModal && (
        <RedTeamModal onClose={() => setShowRedTeamModal(false)} />
      )}

      {/* FIXED BOTTOM EMERGENCY CALL BAR (High Contrast, Always Visible) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t-2 border-red-600/80 backdrop-blur-xl p-3 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Giant Call 112 Button */}
          <a
            href="tel:112"
            id="emergency-call-112-btn"
            className="flex-1 py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-center text-lg sm:text-xl flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/40 active:scale-95 transition-all glow-red"
          >
            <PhoneCall className="w-6 h-6 animate-bounce" />
            <span>CALL 112 NOW</span>
          </a>

          {/* 108 Ambulance Button */}
          <a
            href="tel:108"
            id="emergency-call-108-btn"
            className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-center text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <Ambulance className="w-6 h-6" />
            <span>108 AMBULANCE</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
export default App;
