import { useEffect, useState } from 'react';
import { EQUIPMENT_TYPES } from '../data/exercises';
import { localizeEquipment } from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import {
  aiErrorCode,
  aiErrorMessage,
  fetchAiQuota,
  generateProgramAi,
} from '../lib/ai';
import type { ImportedProgram } from '../lib/programExchange';
import { loadData } from '../lib/storage';
import type { MessageKey } from '../i18n/messages';

type Props = {
  /** Nombre d'exercices déjà présents : conditionne le mode d'insertion. */
  currentCount: number;
  onImport: (program: ImportedProgram, mode: 'replace' | 'append') => void;
  onClose: () => void;
};

const GOALS = ['masse', 'perte', 'force', 'endurance', 'forme'] as const;
const LEVELS = ['debutant', 'intermediaire', 'avance'] as const;

type Result = {
  program: ImportedProgram;
  warnings: string[];
};

export function GenerateProgramDialog({
  currentCount,
  onImport,
  onClose,
}: Props) {
  const { locale, t } = useI18n();
  const [goal, setGoal] = useState<(typeof GOALS)[number]>(() => {
    const savedGoal = loadData().profile?.goal;
    return savedGoal && GOALS.includes(savedGoal) ? savedGoal : 'masse';
  });
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('debutant');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(() => {
    const savedSessions = loadData().profile?.sessionsPerWeek;
    return savedSessions && savedSessions >= 1 && savedSessions <= 7
      ? savedSessions
      : 3;
  });
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAiQuota('program').then((value) => {
      if (!cancelled) setRemaining(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleEquipment(value: string) {
    setEquipment((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function generate() {
    setBusy(true);
    setErrorCode(null);
    try {
      const generated = await generateProgramAi({
        locale,
        goal,
        level,
        sessionsPerWeek,
        sessionMinutes,
        equipment,
        notes,
        customExercises: loadData().customExercises,
      });
      setResult({
        program: generated.program,
        warnings: generated.warnings,
      });
      setRemaining(generated.remaining);
    } catch (reason) {
      const code = aiErrorCode(reason);
      setErrorCode(code);
      if (code === 'quota_exceeded') setRemaining(0);
    } finally {
      setBusy(false);
    }
  }

  function apply(mode: 'replace' | 'append') {
    if (!result) return;
    onImport(result.program, mode);
    onClose();
  }

  const quotaLabel =
    remaining === null
      ? null
      : remaining === 0
        ? t('ai.quotaNone')
        : t(remaining > 1 ? 'ai.quota_plural' : 'ai.quota', {
            count: remaining,
          });

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('ai.title')}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('ai.title')}</h2>
            <p className="muted">{t('ai.lead')}</p>
          </div>
        </div>

        {quotaLabel && <p className="ai-quota">{quotaLabel}</p>}

        {result ? (
          <>
            <p className="exchange-success">
              {t('ai.result', { count: result.program.exercises.length })}
            </p>
            <p>
              <strong>{result.program.name}</strong>
              {result.program.description ? ` · ${result.program.description}` : ''}
            </p>

            {result.warnings.length > 0 && (
              <ul className="exchange-warnings">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <div className="row-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => apply('replace')}
              >
                {currentCount > 0 ? t('import.replace') : t('ai.apply')}
              </button>
              {currentCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => apply('append')}
                >
                  {t('import.append')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setResult(null)}
              >
                {t('ai.retry')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ai-fields">
              <div className="field">
                <label htmlFor="ai-goal">{t('ai.goal')}</label>
                <select
                  id="ai-goal"
                  value={goal}
                  onChange={(event) =>
                    setGoal(event.target.value as (typeof GOALS)[number])
                  }
                >
                  {GOALS.map((value) => (
                    <option key={value} value={value}>
                      {t(`ai.goal.${value}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="ai-level">{t('ai.level')}</label>
                <select
                  id="ai-level"
                  value={level}
                  onChange={(event) =>
                    setLevel(event.target.value as (typeof LEVELS)[number])
                  }
                >
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {t(`ai.level.${value}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="ai-sessions">{t('ai.sessions')}</label>
                <input
                  id="ai-sessions"
                  type="number"
                  min={1}
                  max={7}
                  value={sessionsPerWeek}
                  onChange={(event) =>
                    setSessionsPerWeek(Number(event.target.value) || 1)
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="ai-minutes">{t('ai.duration')}</label>
                <input
                  id="ai-minutes"
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={sessionMinutes}
                  onChange={(event) =>
                    setSessionMinutes(Number(event.target.value) || 60)
                  }
                />
              </div>
            </div>

            <fieldset className="ai-equipment">
              <legend>{t('ai.equipment')}</legend>
              <div className="ai-equipment-grid">
                {EQUIPMENT_TYPES.map((value) => (
                  <label key={value} className="ai-check">
                    <input
                      type="checkbox"
                      checked={equipment.includes(value)}
                      onChange={() => toggleEquipment(value)}
                    />
                    {localizeEquipment(value, locale)}
                  </label>
                ))}
              </div>
              <p className="muted">{t('ai.equipmentHint')}</p>
            </fieldset>

            <div className="field">
              <label htmlFor="ai-notes">{t('ai.notes')}</label>
              <textarea
                id="ai-notes"
                rows={2}
                value={notes}
                maxLength={400}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('ai.notesPlaceholder')}
              />
            </div>

            {errorCode && (
              <p className="exchange-error">{aiErrorMessage(errorCode, t)}</p>
            )}

            <div className="row-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || remaining === 0}
                onClick={() => void generate()}
              >
                {busy ? t('ai.busy') : t('ai.submit')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}