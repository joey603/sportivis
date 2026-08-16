import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { copyToClipboard } from '../lib/clipboard';
import {
  buildChatGptPrompt,
  parseProgramImport,
  type ImportedProgram,
} from '../lib/programExchange';
import { getAllExercises } from '../lib/storage';

type Props = {
  /** Nombre d'exercices déjà présents : conditionne le mode d'insertion. */
  currentCount: number;
  onImport: (program: ImportedProgram, mode: 'replace' | 'append') => void;
  onClose: () => void;
};

export function ImportProgram({ currentCount, onImport, onClose }: Props) {
  const { locale, t } = useI18n();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [imported, setImported] = useState<number | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  function run(mode: 'replace' | 'append') {
    const result = parseProgramImport(text);
    if (!result.ok) {
      setError(result.error);
      setWarnings([]);
      return;
    }
    onImport(result.program, mode);
    // Sans avertissement il n'y a rien à lire : on referme directement.
    if (result.warnings.length === 0) {
      onClose();
      return;
    }
    setError(null);
    setWarnings(result.warnings);
    setImported(result.program.exercises.length);
  }

  async function copyPrompt() {
    const ok = await copyToClipboard(
      buildChatGptPrompt(getAllExercises(), locale),
    );
    setPromptCopied(ok);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('import.title')}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('import.title')}</h2>
            <p className="muted">{t('import.lead')}</p>
          </div>
        </div>

        <div className="row-actions" style={{ marginBottom: '0.85rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={copyPrompt}
          >
            {promptCopied ? t('import.promptCopied') : t('import.copyPrompt')}
          </button>
        </div>

        <div className="field">
          <label htmlFor="import-json">{t('import.json')}</label>
          <textarea
            id="import-json"
            className="exchange-text"
            rows={9}
            autoFocus
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            placeholder={'{\n  "name": "…",\n  "exercises": [ … ]\n}'}
          />
        </div>

        {error && <p className="exchange-error">{error}</p>}

        {imported !== null && (
          <p className="exchange-success">
            {t(
              imported > 1 ? 'import.doneCount_plural' : 'import.doneCount',
              { count: imported },
            )}
          </p>
        )}

        {warnings.length > 0 && (
          <ul className="exchange-warnings">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <div className="row-actions">
          {imported === null ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => run('replace')}
              >
                {currentCount > 0 ? t('import.replace') : t('import.action')}
              </button>
              {currentCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => run('append')}
                >
                  {t('import.append')}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('common.done')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
