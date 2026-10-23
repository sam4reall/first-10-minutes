import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { MatchedProtocolResult, ProtocolStep } from '../services/protocolEngine';

interface Props {
  matchedProtocol: MatchedProtocolResult;
  onSelectTrustStep: (step: ProtocolStep) => void;
  selectedTrustStep: ProtocolStep | null;
}

export const ActionPlanDisplay: React.FC<Props> = ({
  matchedProtocol,
  onSelectTrustStep,
  selectedTrustStep
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [metronomeBeat, setMetronomeBeat] = useState(false);
  const metronomeRef = useRef<number | null>(null);

  // Text-To-Speech Synthesis
  const speakCurrentPlan = () => {
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const stepsText = matchedProtocol.steps.map((s, i) => `Step ${i + 1}: ${s.text}`).join('. ');
    const fullText = `Urgency ${matchedProtocol.urgency}. Protocol: ${matchedProtocol.protocolName}. ${stepsText}. Remember: ${matchedProtocol.whenToCall}`;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = 0.95; // Calm, clear pacing
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  // Stop speech if protocol changes
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  }, [matchedProtocol.protocolId]);

  // CPR Metronome (100 - 120 BPM)
  useEffect(() => {
    if (metronomeActive) {
      const bpm = matchedProtocol.metronomeBpm || 110;
      const intervalMs = (60 / bpm) * 1000;

      // Audio click tone using Web Audio API
      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {}

      const timer = setInterval(() => {
        setMetronomeBeat(prev => !prev);
        if (audioCtx && audioCtx.state !== 'closed') {
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
          } catch (e) {}
        }
      }, intervalMs);

      return () => {
        clearInterval(timer);
        if (audioCtx) audioCtx.close();
      };
    }
  }, [metronomeActive, matchedProtocol.metronomeBpm]);

  const urgencyStyles = {
    RED: {
      border: 'border-red-500/80 bg-red-950/40 text-red-100',
      badge: 'bg-red-600 text-white animate-pulse',
      icon: '🚨 ACT NOW (RED URGENCY)'
    },
    AMBER: {
      border: 'border-amber-500/80 bg-amber-950/40 text-amber-100',
      badge: 'bg-amber-600 text-white',
      icon: '⚠️ HOURS TO ACT (AMBER URGENCY)'
    },
    GREEN: {
      border: 'border-emerald-500/80 bg-emerald-950/40 text-emerald-100',
      badge: 'bg-emerald-600 text-white',
      icon: '✅ MONITOR (GREEN URGENCY)'
    }
  };

  const currentUrgency = urgencyStyles[matchedProtocol.urgency] || urgencyStyles.RED;

  return (
    <div className="space-y-4">
      {/* Urgency and Verification Banner */}
      <div className={`p-4 rounded-2xl border-2 ${currentUrgency.border} backdrop-blur-md shadow-2xl`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${currentUrgency.badge}`}>
              {currentUrgency.icon}
            </span>
            {matchedProtocol.offlineFallbackActive && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">
                ⚡ Offline Fallback Active
              </span>
            )}
            {!matchedProtocol.isMatched && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-bounce">
                ⚠️ UNMATCHED — Human Help Needed
              </span>
            )}
          </div>

          {/* Voice Narration Action */}
          <button
            onClick={speakCurrentPlan}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95"
            title="Read action steps out loud"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-red-400 animate-pulse" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Read Aloud</span>
              </>
            )}
          </button>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">
          {matchedProtocol.protocolName}
        </h2>
        <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 inline" />
          {matchedProtocol.sourceLabel}
        </p>

        {/* CPR Rhythm Metronome (if applicable) */}
        {matchedProtocol.metronomeBpm && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center font-bold text-xs transition-all ${
                metronomeBeat ? 'scale-125 bg-red-600 border-white text-white shadow-lg shadow-red-500/50' : 'bg-red-900 border-red-700 text-red-200'
              }`}>
                {matchedProtocol.metronomeBpm}
              </div>
              <div>
                <p className="text-sm font-black text-white">CPR Rhythm Guide (100–120 BPM)</p>
                <p className="text-xs text-red-300">Push to the beat (Stayin' Alive rhythm)</p>
              </div>
            </div>
            <button
              onClick={() => setMetronomeActive(!metronomeActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                metronomeActive ? 'bg-red-500 text-white' : 'bg-red-800/80 hover:bg-red-700 text-white'
              }`}
            >
              {metronomeActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {metronomeActive ? 'Pause Metronome' : 'Start Metronome'}
            </button>
          </div>
        )}
      </div>

      {/* Ordered Steps (Max 6, Big typography, Imperative) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>VERIFIED ACTION STEPS ({matchedProtocol.steps.length})</span>
          <span className="text-blue-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Tap any step for Trust Trail
          </span>
        </div>

        {matchedProtocol.steps.map((step, idx) => {
          const isSelected = selectedTrustStep?.text === step.text;
          return (
            <div
              key={idx}
              onClick={() => onSelectTrustStep(step)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                isSelected
                  ? 'border-blue-500 bg-blue-950/50 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500'
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-base flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                    {step.text}
                  </p>
                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-blue-900/60 text-xs font-mono text-blue-300">
                      🔍 <strong>Trust Trail:</strong> Triggered by verified fact &quot;{step.sourceFact}&quot; matching rule in protocol [{step.protocolId}].
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* When to Call Emergency Services */}
      <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 text-red-200 text-sm font-semibold flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <strong className="text-red-400 uppercase tracking-wide text-xs block">Emergency Dispatch Trigger:</strong>
          {matchedProtocol.whenToCall}
        </div>
      </div>

      {/* "NEVER DO" List */}
      {matchedProtocol.neverDo.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/50">
          <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
            🚫 NEVER DO (Harm Prevention)
          </h3>
          <ul className="space-y-1.5">
            {matchedProtocol.neverDo.map((item, i) => (
              <li key={i} className="text-xs sm:text-sm text-amber-200/90 font-medium flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
