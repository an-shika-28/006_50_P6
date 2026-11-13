import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { IdentifierValidationResult } from '../types/metropulse';
import type { ClientValidationResult } from '../utils/validation';

interface IdentifierFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  expectedFormat: string;
  localValidation: ClientValidationResult;
  serverValidation?: IdentifierValidationResult | null;
  maxLength?: number;
  showTrace?: boolean;
}

export function IdentifierField({
  id,
  label,
  value,
  onChange,
  placeholder,
  expectedFormat,
  localValidation,
  serverValidation,
  maxLength = 16,
  showTrace = false,
}: IdentifierFieldProps) {
  const hasValue = value.trim().length > 0;
  const isValid = serverValidation ? serverValidation.valid : localValidation.valid;
  const message = serverValidation ? serverValidation.message : localValidation.message;

  const borderClass = !hasValue
    ? 'border-[#D9CDBB] focus:border-[#C8792C]'
    : isValid
    ? 'border-[#2E8057] bg-[#2E8057]/[0.03]'
    : 'border-[#C83D3D] bg-[#C83D3D]/[0.03]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-[#2D261F]">
          {label}
        </label>
        <span className="text-[11px] font-mono text-[#6E6255]">{expectedFormat}</span>
      </div>

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={hasValue && !isValid}
          aria-describedby={`${id}-feedback`}
          className={`w-full px-3.5 py-2.5 pr-10 bg-white border rounded-sm font-mono text-sm uppercase tracking-wider text-[#2D261F] transition-colors ${borderClass}`}
        />
        {hasValue && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-[#2E8057]" />
            ) : (
              <XCircle className="w-4 h-4 text-[#C83D3D]" />
            )}
          </span>
        )}
      </div>

      <div id={`${id}-feedback`} className="min-h-[20px] text-xs flex items-start gap-1.5">
        {hasValue ? (
          <span className={isValid ? 'text-[#1F5E3F] font-medium' : 'text-[#9F2929] font-medium'}>
            {message}
          </span>
        ) : (
          <span className="text-[#6E6255]">Normalized to uppercase before DFA &amp; Regex validation.</span>
        )}
      </div>

      {showTrace && serverValidation && hasValue && (
        <div className="mt-2 p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
            <span>
              DFA: <strong className={serverValidation.dfa.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                {serverValidation.dfa.accepted ? 'ACCEPT' : 'REJECT'} ({serverValidation.dfa.final_state})
              </strong>
            </span>
            <span>
              Regex: <strong className={serverValidation.regex.accepted ? 'text-[#2E8057]' : 'text-[#C83D3D]'}>
                {serverValidation.regex.accepted ? 'MATCH' : 'NO MATCH'}
              </strong>
            </span>
            <span>
              Agreement: <strong className="text-[#2D261F]">{serverValidation.agreement ? 'YES' : 'DISAGREE'}</strong>
            </span>
          </div>
          {serverValidation.dfa.trace.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {serverValidation.dfa.trace.map((step) => (
                <span
                  key={step.step}
                  className={`px-1.5 py-0.5 font-mono text-[11px] border rounded-sm ${
                    step.to_state === 'q_DEAD'
                      ? 'bg-[#C83D3D]/10 border-[#C83D3D] text-[#9F2929]'
                      : step.to_state.includes('ACCEPT')
                      ? 'bg-[#2E8057]/12 border-[#2E8057] text-[#1F5E3F]'
                      : 'bg-white border-[#D9CDBB] text-[#2D261F]'
                  }`}
                >
                  '{step.char}' → {step.to_state}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
