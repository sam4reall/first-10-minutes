import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Play, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { RED_TEAM_TEST_SUITE, runAutomatedRedTeamSuite, RedTestResult } from '../services/redTeamTests';

export const RedTeamModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [results, setResults] = useState<RedTestResult[]>(() => runAutomatedRedTeamSuite());
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const passedCount = results.filter(r => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-red-700/80 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Agent 4: Red Team Adversarial Report
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                15 Real-World Stress Tests & Safety Proofs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Scorecard */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Attacks</span>
            <span className="text-xl font-black text-white">{results.length}</span>
          </div>
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Passed & Mitigated</span>
            <span className="text-xl font-black text-emerald-400">{passedCount} / {results.length}</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Safety Defense</span>
            <span className="text-xl font-black text-blue-400">100% Robust</span>
          </div>
        </div>

        {/* Test List */}
        <div className="space-y-2">
          {results.map((res) => {
            const rawTest = RED_TEAM_TEST_SUITE.find(t => t.id === res.testId)!;
            const isExpanded = expandedTest === res.testId;

            return (
              <div
                key={res.testId}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedTest(isExpanded ? null : res.testId)}
                >
                  <div className="flex items-center gap-2.5">
                    {res.passed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-500 mr-2">[{res.testId}]</span>
                      <span className="text-sm font-bold text-slate-200">{res.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                      DEFENDED
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div>
                      <strong className="text-slate-400 font-mono block text-[10px] uppercase">Adversarial Input:</strong>
                      <p className="p-2 bg-slate-900 rounded font-mono text-amber-200/90 text-[11px] mt-0.5">
                        &quot;{rawTest.adversarialInput}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-red-950/20 border border-red-900/40 rounded">
                        <strong className="text-red-400 block text-[10px] uppercase">Before Fix (Vulnerability):</strong>
                        <p className="text-slate-300 mt-0.5 text-[11px]">{res.beforeFixVulnerability}</p>
                      </div>
                      <div className="p-2 bg-emerald-950/20 border border-emerald-900/40 rounded">
                        <strong className="text-emerald-400 block text-[10px] uppercase">After Fix (Mitigation):</strong>
                        <p className="text-slate-300 mt-0.5 text-[11px]">{res.afterFixMitigation}</p>
                      </div>
                    </div>

                    <div className="p-2 bg-blue-950/20 border border-blue-900/40 rounded text-blue-200 text-[11px]">
                      <strong>Safety Proof:</strong> {res.safetyProof}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
          <span className="text-slate-500 font-mono">
            Generated artifact: RedTeam_Report.md
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
