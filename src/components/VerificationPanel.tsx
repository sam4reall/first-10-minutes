import React from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { SkepticAnalysis, FollowUpQuestion } from '../services/skeptic';
import { PatientFacts } from '../services/protocolEngine';

interface Props {
  skepticAnalysis: SkepticAnalysis;
  facts: PatientFacts;
  onAnswerQuestion: (questionId: string, answer: string) => void;
}

export const VerificationPanel: React.FC<Props> = ({
  skepticAnalysis,
  facts,
  onAnswerQuestion
}) => {
  return (
    <div className="space-y-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black uppercase text-slate-200 tracking-wider">
            Agent 3: Skeptic Verification Layer & Safety Radar
          </span>
        </div>
        <span className="text-xs font-mono text-emerald-400 font-bold">
          Dual-Key Guarded
        </span>
      </div>

      {/* Prompt Injection / Adversarial Warning Notice */}
      {skepticAnalysis.promptInjectionBlocked && (
        <div className="p-3 bg-red-950/60 border border-red-600 rounded-xl text-red-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-red-400 uppercase">
            <AlertCircle className="w-4 h-4" /> Adversarial Prompt Injection Blocked
          </div>
          {skepticAnalysis.injectionWarnings.map((warn, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-red-300">
              {warn}
            </p>
          ))}
        </div>
      )}

      {/* Contradiction Radar Alerts */}
      {skepticAnalysis.contradictions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase text-amber-400 tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Contradiction Radar Detected ({skepticAnalysis.contradictions.length})
          </span>
          {skepticAnalysis.contradictions.map((contra) => (
            <div
              key={contra.id}
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                contra.severity === 'CRITICAL'
                  ? 'bg-red-950/40 border-red-600/80 text-red-200'
                  : 'bg-amber-950/30 border-amber-600/60 text-amber-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
                  {contra.severity}
                </span>
                <span>{contra.description}</span>
              </div>
              <p className="text-[11px] text-slate-300 pt-0.5">
                <strong>Action:</strong> {contra.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Max 2 Critical Follow-Up Triage Questions */}
      {skepticAnalysis.followUpQuestions.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold uppercase text-blue-400 tracking-wide flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Critical Triage Clarification (Max 2)
          </span>
          {skepticAnalysis.followUpQuestions.map((q) => (
            <div key={q.id} className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-2">
              <div>
                <p className="text-xs sm:text-sm font-bold text-white">{q.question}</p>
                <p className="text-[11px] text-blue-300/80 font-mono mt-0.5">Why: {q.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => onAnswerQuestion(q.id, opt)}
                    className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 rounded-lg text-xs font-semibold text-blue-100 transition-all active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strict Drug Advice Policy Notice */}
      {skepticAnalysis.drugNotice && (
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 font-mono">
          ℹ️ {skepticAnalysis.drugNotice}
        </div>
      )}

      {/* Source Tagged Facts Breakdown */}
      <div className="pt-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Fact Source Tags & Confidence Scores
        </span>
        <div className="flex flex-wrap gap-1.5">
          {skepticAnalysis.verifications.map((v, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs"
            >
              <span className="text-blue-400 font-mono font-bold text-[10px]">{v.source_tag}</span>
              <span className="text-slate-200">{v.fact}</span>
              <span className="text-emerald-400 font-mono text-[10px] font-bold">({v.confidence}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
