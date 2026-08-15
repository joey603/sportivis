import { useState } from 'react';
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
    const ok = await copyToClipboard(buildChatGptPrompt(getAllExercises()));
    setPromptCopied(ok);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Importer un programme"
      >
        <div className="sheet-head">
          <div>
            <h2>Importer un programme</h2>
            <p className="muted">
              Colle la réponse JSON de ChatGPT : les exercices, séries, reps et
              repos sont remplis automatiquement.
            </p>
          </div>
        </div>

        <div className="row-actions" style={{ marginBottom: '0.85rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={copyPrompt}>
            {promptCopied ? 'Consigne copiée ✓' : 'Copier la consigne ChatGPT'}
          </button>
        </div>

        <div className="field">
          <label htmlFor="import-json">Programme (JSON)</label>
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
            placeholder={'{\n  "name": "Ma séance",\n  "exercises": [ … ]\n}'}
          />
        </div>

        {error && <p className="exchange-error">{error}</p>}

        {imported !== null && (
          <p className="exchange-success">
            {imported} exercice{imported > 1 ? 's' : ''} importé
            {imported > 1 ? 's' : ''}.
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
                {currentCount > 0 ? 'Remplacer les exercices' : 'Importer'}
              </button>
              {currentCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => run('append')}
                >
                  Ajouter à la suite
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Terminé
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
