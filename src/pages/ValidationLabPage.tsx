import React, { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { ValidationCheckResponse } from '../types/metropulse';

const STATION_STATES = [
  'q0_START',
  'q1_S',
  'q2_T',
  'q3_A',
  'q4_L1',
  'q5_L2',
  'q6_D1',
  'q7_D2',
  'q8_ACCEPT',
];

export function ValidationLabPage() {
  const [stationInput, setStationInput] = useState('STAEC123');
  const [anomalyInput, setAnomalyInput] = useState('A05');
  const [liveResult, setLiveResult] = useState<ValidationCheckResponse | null>(null);
  const [corpus, setCorpus] = useState<{
    station_corpus: Array<{
      input: string;
      description: string;
      expected: boolean;
      dfa_accepted: boolean;
      regex_accepted: boolean;
      agreement: boolean;
      final_state: string;
      passed: boolean;
    }>;
    anomaly_corpus: Array<{
      input: string;
      description: string;
      expected: boolean;
      dfa_accepted: boolean;
      regex_accepted: boolean;
      agreement: boolean;
      final_state: string;
      passed: boolean;
    }>;
    all_agreed: boolean;
  } | null>(null);
  const [testSuite, setTestSuite] = useState<{
    total: number;
    passed: number;
    test_cases: Array<{
      test_id: string;
      input: string;
      expected_result: string;
      coverage: string;
      actual_result: string;
      status: 'PASS' | 'FAIL';
    }>;
  } | null>(null);

  const runLive = (st: string, an: string) => {
    api.checkValidation(st, an).then(setLiveResult).catch(() => {});
  };

  const loadLab = () => {
    runLive(stationInput, anomalyInput);
    api.getValidationCorpus().then(setCorpus).catch(() => {});
    api.getTestSuite().then(setTestSuite).catch(() => {});
  };

  useEffect(() => {
    loadLab();
  }, []);

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D9CDBB] pb-6">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Automata Theory &amp; Verification Report
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            DFA vs Regex Validation Lab &amp; Test Suite
          </h1>
        </div>
        <button
          type="button"
          onClick={loadLab}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B4632] text-[#F4D9A0] text-xs font-semibold rounded-sm hover:bg-[#3D2E20] self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Re-Run Verification Corpus</span>
        </button>
      </div>

      {/* Interactive DFA State-Machine Playground */}
      <section className="bg-white border border-[#D9CDBB] rounded-sm p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#C8792C]" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-[#2D261F]">
            Interactive Python DFA State Trace &amp; Regex Equivalence Checker
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label htmlFor="lab-station" className="block text-xs font-bold uppercase text-[#5B4632]">
              Test Station Code (^STA[A-Z]{'{2}'}[0-9]{'{3}'}$)
            </label>
            <div className="flex gap-2">
              <input
                id="lab-station"
                type="text"
                value={stationInput}
                onChange={(e) => {
                  setStationInput(e.target.value);
                  runLive(e.target.value, anomalyInput);
                }}
                className="flex-1 px-3.5 py-2 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm font-mono text-sm uppercase"
              />
            </div>
            {liveResult?.station && (
              <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs space-y-2">
                <div className="flex flex-wrap gap-4 font-mono">
                  <span>
                    DFA:{' '}
                    <strong className={liveResult.station.dfa.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                      {liveResult.station.dfa.accepted ? 'ACCEPT' : 'REJECT'} ({liveResult.station.dfa.final_state})
                    </strong>
                  </span>
                  <span>
                    Regex:{' '}
                    <strong className={liveResult.station.regex.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                      {liveResult.station.regex.accepted ? 'MATCH' : 'REJECT'}
                    </strong>
                  </span>
                  <span>
                    Agreement: <strong>{liveResult.station.agreement ? 'TRUE' : 'FALSE'}</strong>
                  </span>
                </div>
                <p className="text-[#6E6255]">{liveResult.station.message}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label htmlFor="lab-anomaly" className="block text-xs font-bold uppercase text-[#5B4632]">
              Test Anomaly Code (^A[0-9]{'{2}'}$)
            </label>
            <div className="flex gap-2">
              <input
                id="lab-anomaly"
                type="text"
                value={anomalyInput}
                onChange={(e) => {
                  setAnomalyInput(e.target.value);
                  runLive(stationInput, e.target.value);
                }}
                className="flex-1 px-3.5 py-2 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm font-mono text-sm uppercase"
              />
            </div>
            {liveResult?.anomaly && (
              <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs space-y-2">
                <div className="flex flex-wrap gap-4 font-mono">
                  <span>
                    DFA:{' '}
                    <strong className={liveResult.anomaly.dfa.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                      {liveResult.anomaly.dfa.accepted ? 'ACCEPT' : 'REJECT'} ({liveResult.anomaly.dfa.final_state})
                    </strong>
                  </span>
                  <span>
                    Regex:{' '}
                    <strong className={liveResult.anomaly.regex.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                      {liveResult.anomaly.regex.accepted ? 'MATCH' : 'REJECT'}
                    </strong>
                  </span>
                  <span>
                    Agreement: <strong>{liveResult.anomaly.agreement ? 'TRUE' : 'FALSE'}</strong>
                  </span>
                </div>
                <p className="text-[#6E6255]">{liveResult.anomaly.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Station DFA State Diagram Rail */}
        <div className="pt-2 border-t border-[#EFE8DA]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#5B4632] mb-3">
            Station Code DFA State Transition Chain
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATION_STATES.map((st, idx) => {
              const visited = liveResult?.station.dfa.trace.some((t) => t.to_state === st) || st === 'q0_START';
              const isFinal = liveResult?.station.dfa.final_state === st;
              return (
                <React.Fragment key={st}>
                  <span
                    className={`px-2.5 py-1.5 font-mono text-xs border rounded-sm ${
                      isFinal && st === 'q8_ACCEPT'
                        ? 'bg-[#2E8057] text-white border-[#2E8057] font-bold'
                        : isFinal
                        ? 'bg-[#C8792C] text-white border-[#C8792C] font-bold'
                        : visited
                        ? 'bg-[#F4D9A0]/50 text-[#2D261F] border-[#5B4632]'
                        : 'bg-[#F8F4EC] text-[#6E6255] border-[#D9CDBB]'
                    }`}
                  >
                    {st}
                  </span>
                  {idx < STATION_STATES.length - 1 && (
                    <span className="text-[#6E6255] font-mono text-xs" aria-hidden="true">→</span>
                  )}
                </React.Fragment>
              );
            })}
            <span
              className={`ml-2 px-2.5 py-1.5 font-mono text-xs border rounded-sm ${
                liveResult?.station.dfa.final_state === 'q_DEAD'
                  ? 'bg-[#C83D3D] text-white border-[#C83D3D] font-bold'
                  : 'bg-[#F8F4EC] text-[#6E6255] border-[#D9CDBB]'
              }`}
            >
              q_DEAD (Reject Sink)
            </span>
          </div>
        </div>
      </section>

      {/* DFA vs Regex Agreement Corpus */}
      {corpus && (
        <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-[#2D261F]">
              DFA &amp; Python Regex Equivalence Corpus
            </h2>
            <span className="text-xs font-mono font-bold text-[#2E8057]">
              ALL AGREED: {corpus.all_agreed ? '100% AGREEMENT' : 'DISAGREEMENT'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Input</th>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">DFA Final State</th>
                  <th className="py-3 px-4">DFA Result</th>
                  <th className="py-3 px-4">Regex Result</th>
                  <th className="py-3 px-4">Agreement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DA]">
                {[
                  ...corpus.station_corpus.map((r) => ({ ...r, kind: 'Station' })),
                  ...corpus.anomaly_corpus.map((r) => ({ ...r, kind: 'Anomaly' })),
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F4EC]">
                    <td className="py-2.5 px-4 font-semibold text-[#5B4632]">{row.kind}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#2D261F]">
                      {row.input || '<empty>'}
                    </td>
                    <td className="py-2.5 px-4 text-[#6E6255]">{row.description}</td>
                    <td className="py-2.5 px-4 font-mono text-[#2D261F]">{row.final_state}</td>
                    <td className="py-2.5 px-4 font-mono">
                      {row.dfa_accepted ? 'ACCEPT' : 'REJECT'}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {row.regex_accepted ? 'MATCH' : 'REJECT'}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#2E8057]">
                      {row.agreement ? 'AGREE' : 'MISMATCH'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 24 Documented Test Cases Report */}
      {testSuite && (
        <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#231A12] text-[#F4D9A0] border-b border-[#5B4632] flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-sm font-bold">
              Documented System Test Cases ({testSuite.passed} / {testSuite.total} Passed)
            </h2>
            <span className="text-xs font-mono text-[#F4D9A0]/80">
              Verified via pytest (backend/tests/test_metropulse.py)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                  <th className="py-3 px-4">Test ID</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Scenario / Input</th>
                  <th className="py-3 px-4">Expected Result</th>
                  <th className="py-3 px-4">Actual Result</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DA]">
                {testSuite.test_cases.map((tc) => (
                  <tr key={tc.test_id} className="hover:bg-[#F8F4EC]">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#2D261F] whitespace-nowrap">
                      {tc.test_id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#5B4632] whitespace-nowrap">
                      {tc.coverage}
                    </td>
                    <td className="py-2.5 px-4 text-[#2D261F]">{tc.input}</td>
                    <td className="py-2.5 px-4 text-[#6E6255]">{tc.expected_result}</td>
                    <td className="py-2.5 px-4 text-[#6E6255]">{tc.actual_result}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold ${
                          tc.status === 'PASS' ? 'text-[#2E8057]' : 'text-[#C83D3D]'
                        }`}
                      >
                        {tc.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{tc.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
