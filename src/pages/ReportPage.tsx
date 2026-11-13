import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Cpu, Info, Send } from 'lucide-react';
import { api } from '../services/api';
import { IdentifierField } from '../components/IdentifierField';
import { SubmissionReceipt } from '../components/SubmissionReceipt';
import { CategoryBadge, CorridorBadge, PriorityBadge } from '../components/Badges';
import { validateAnomalyCodeLocal, validateStationCodeLocal } from '../utils/validation';
import type { ReportRecord, ValidationCheckResponse } from '../types/metropulse';

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const initialStation = searchParams.get('station') || '';

  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [stationCode, setStationCode] = useState(initialStation);
  const [anomalyCode, setAnomalyCode] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [locationDetail, setLocationDetail] = useState('');
  const [description, setDescription] = useState('');

  const [serverCheck, setServerCheck] = useState<ValidationCheckResponse | null>(null);
  const [meta, setMeta] = useState<{
    stations: Array<{ station_prefix: string; station_label: string; zone: string; is_demo_config: boolean }>;
    anomaly_mappings: Array<{ anomaly_code: string; category: string; description: string; default_priority: string }>;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState<{
    report: ReportRecord;
    dispatch_summary: {
      routing_key: string;
      zone: string;
      routed_zone: string;
      medical_override: boolean;
      decision: string;
      target: string;
      is_backup: boolean;
      handler_code: string | null;
      reason: string;
    };
  } | null>(null);

  useEffect(() => {
    api.getPublicMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (stationCode.trim() || anomalyCode.trim()) {
        api
          .checkValidation(stationCode, anomalyCode, urgency)
          .then(setServerCheck)
          .catch(() => {});
      } else {
        setServerCheck(null);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [stationCode, anomalyCode, urgency]);

  const localStation = validateStationCodeLocal(stationCode);
  const localAnomaly = validateAnomalyCodeLocal(anomalyCode);

  const canSubmit =
    reporterName.trim().length >= 2 &&
    reporterContact.trim().length >= 4 &&
    description.trim().length >= 8 &&
    localStation.valid &&
    localAnomaly.valid &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!localStation.valid || !localAnomaly.valid) {
      setSubmitError('Correct malformed Station Code or Anomaly Code before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitReport({
        reporter_name: reporterName,
        reporter_contact: reporterContact,
        station_code: stationCode,
        anomaly_code: anomalyCode,
        description,
        urgency,
        location_detail: locationDetail,
      });
      setReceipt(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setReceipt(null);
    setStationCode('');
    setAnomalyCode('');
    setLocationDetail('');
    setDescription('');
    setSubmitError('');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-[#D9CDBB] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Station Reporting Terminal · Intake &amp; Automata Validation
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            Report a Metro Station Anomaly
          </h1>
        </div>
        <p className="text-xs text-[#6E6255] max-w-sm">
          Identifiers are normalized to uppercase and independently validated by Python DFA and Regex engines before deterministic classification and corridor dispatch.
        </p>
      </div>

      {receipt ? (
        <SubmissionReceipt
          report={receipt.report}
          dispatchSummary={receipt.dispatch_summary}
          onReset={resetForm}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Reporting Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-8 bg-white border border-[#D9CDBB] rounded-sm p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#5B4632] border-b border-[#EFE8DA] pb-2">
                01. Reporter Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reporter-name" className="block text-xs font-bold uppercase tracking-wider text-[#2D261F] mb-1.5">
                    Reporter Name
                  </label>
                  <input
                    id="reporter-name"
                    type="text"
                    required
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g., Ananya Sharma"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm text-sm text-[#2D261F] focus:border-[#C8792C]"
                  />
                </div>
                <div>
                  <label htmlFor="reporter-contact" className="block text-xs font-bold uppercase tracking-wider text-[#2D261F] mb-1.5">
                    Phone Number or Email
                  </label>
                  <input
                    id="reporter-contact"
                    type="text"
                    required
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    placeholder="e.g., passenger@example.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm text-sm text-[#2D261F] focus:border-[#C8792C]"
                  />
                  <p className="text-[11px] text-[#6E6255] mt-1">
                    Stored securely; hidden from public report tracking views.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#5B4632] border-b border-[#EFE8DA] pb-2">
                02. Validated Station &amp; Anomaly Identifiers
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <IdentifierField
                  id="station-code"
                  label="Station Code"
                  value={stationCode}
                  onChange={setStationCode}
                  placeholder="STAEC123"
                  expectedFormat="^STA[A-Z]{2}[0-9]{3}$"
                  localValidation={localStation}
                  serverValidation={serverCheck?.station}
                  showTrace={true}
                />

                <IdentifierField
                  id="anomaly-code"
                  label="Anomaly Code"
                  value={anomalyCode}
                  onChange={setAnomalyCode}
                  placeholder="A01"
                  expectedFormat="^A[0-9]{2}$"
                  localValidation={localAnomaly}
                  serverValidation={serverCheck?.anomaly}
                  showTrace={true}
                />
              </div>

              {/* Live Corridor & Classification Preview */}
              {(serverCheck?.corridor_preview || serverCheck?.classification_preview) && (
                <div className="p-4 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-[#5B4632] mb-1">Detected Corridor Zone</div>
                    {serverCheck.corridor_preview ? (
                      <div className="space-y-1">
                        <CorridorBadge zone={serverCheck.corridor_preview.zone} />
                        <div className="text-[#6E6255] mt-1">
                          {serverCheck.corridor_preview.station_label}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#6E6255]">Enter a valid station code to preview corridor.</span>
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-[#5B4632] mb-1">Deterministic Classification</div>
                    {serverCheck.classification_preview ? (
                      serverCheck.classification_preview.mapped ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <CategoryBadge category={serverCheck.classification_preview.category} />
                            <PriorityBadge priority={serverCheck.classification_preview.priority} />
                          </div>
                          {serverCheck.classification_preview.category === 'Medical' && (
                            <div className="text-[#9F2929] font-semibold">
                              Medical Emergency Override: routes to Central Emergency Line
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[#9F2929] font-medium">
                          {serverCheck.classification_preview.reason}
                        </div>
                      )
                    ) : (
                      <span className="text-[#6E6255]">Enter a valid anomaly code (e.g., A01–A05).</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#5B4632] border-b border-[#EFE8DA] pb-2">
                03. Incident Context
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="urgency-level" className="block text-xs font-bold uppercase tracking-wider text-[#2D261F] mb-1.5">
                    Urgency Level
                  </label>
                  <select
                    id="urgency-level"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm text-sm text-[#2D261F] focus:border-[#C8792C]"
                  >
                    <option value="Low">Low — Non-urgent upkeep</option>
                    <option value="Normal">Normal — Standard operational issue</option>
                    <option value="High">High — Affects passenger flow or safety</option>
                    <option value="Critical">Critical — Immediate attention required</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="location-detail" className="block text-xs font-bold uppercase tracking-wider text-[#2D261F] mb-1.5">
                    Platform / Concourse Detail (Optional)
                  </label>
                  <input
                    id="location-detail"
                    type="text"
                    value={locationDetail}
                    onChange={(e) => setLocationDetail(e.target.value)}
                    placeholder="e.g., Platform 2 North Escalator"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm text-sm text-[#2D261F] focus:border-[#C8792C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="incident-description" className="block text-xs font-bold uppercase tracking-wider text-[#2D261F] mb-1.5">
                  Incident Description
                </label>
                <textarea
                  id="incident-description"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the observed anomaly clearly (minimum 8 characters)..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm text-sm text-[#2D261F] focus:border-[#C8792C]"
                />
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="p-4 bg-[#C83D3D]/10 border border-[#C83D3D] rounded-sm text-xs text-[#9F2929] flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#EFE8DA]">
              <div className="text-xs text-[#6E6255]">
                Backend performs independent DFA, Regex, classification, and capacity checks.
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#C8792C] hover:bg-[#B26821] disabled:bg-[#D9CDBB] disabled:text-[#6E6255] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{submitting ? 'Validating & Dispatching...' : 'Submit Anomaly Report'}</span>
              </button>
            </div>
          </form>

          {/* Reference Sidebar: Clearly Labeled Demo Station Prefixes & Anomaly Mappings */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-[#231A12] text-[#F4D9A0] border border-[#5B4632] rounded-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#C8792C]">
                <Info className="w-4 h-4" aria-hidden="true" />
                <span>Demo Quick-Fill Reference</span>
              </div>
              <p className="text-xs text-[#F4D9A0]/80 leading-relaxed">
                Click any illustrative demo prefix or anomaly mapping below to populate the terminal and test DFA validation, corridor routing, or Medical Override.
              </p>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#F4D9A0]">Demo Station Prefixes</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {(meta?.stations || []).map((st) => (
                    <button
                      key={st.station_prefix}
                      type="button"
                      onClick={() => setStationCode(`${st.station_prefix}123`)}
                      className="flex items-center justify-between px-3 py-2 bg-[#2D2217] hover:bg-[#3D2E20] border border-[#5B4632] rounded-sm text-left text-xs transition-colors"
                    >
                      <span className="font-mono font-bold text-[#F4D9A0]">{st.station_prefix}123</span>
                      <span className="text-[#F4D9A0]/75 truncate ml-2">{st.zone}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStationCode('STAZZ999')}
                    className="flex items-center justify-between px-3 py-2 bg-[#2D2217] hover:bg-[#3D2E20] border border-[#C8792C]/40 rounded-sm text-left text-xs"
                  >
                    <span className="font-mono font-bold text-[#F4D9A0]">STAZZ999</span>
                    <span className="text-[#C8792C]">Test Unknown Zone</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#5B4632]">
                <div className="text-xs font-semibold text-[#F4D9A0]">Demo Anomaly Mappings</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {(meta?.anomaly_mappings || []).map((m) => (
                    <button
                      key={m.anomaly_code}
                      type="button"
                      onClick={() => setAnomalyCode(m.anomaly_code)}
                      className="flex items-center justify-between px-3 py-2 bg-[#2D2217] hover:bg-[#3D2E20] border border-[#5B4632] rounded-sm text-left text-xs transition-colors"
                    >
                      <span className="font-mono font-bold text-[#F4D9A0]">{m.anomaly_code}</span>
                      <span className={m.category === 'Medical' ? 'text-[#F28B82] font-semibold' : 'text-[#F4D9A0]/80'}>
                        {m.category} ({m.default_priority})
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAnomalyCode('A99')}
                    className="flex items-center justify-between px-3 py-2 bg-[#2D2217] hover:bg-[#3D2E20] border border-[#C83D3D]/50 rounded-sm text-left text-xs"
                  >
                    <span className="font-mono font-bold text-[#F4D9A0]">A99</span>
                    <span className="text-[#F28B82]">Test Unmapped Code</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#D9CDBB] rounded-sm p-5 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D261F]">
                <Cpu className="w-4 h-4 text-[#C8792C]" aria-hidden="true" />
                <span>Automata Acceptance Spec</span>
              </div>
              <p className="text-[#6E6255] leading-relaxed">
                Station DFA accepts exact 8-character strings matching <code className="font-mono text-[#2D261F]">^STA[A-Z]{'{2}'}[0-9]{'{3}'}$</code>. Anomaly DFA accepts exact 3-character strings matching <code className="font-mono text-[#2D261F]">^A[0-9]{'{2}'}$</code>.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
