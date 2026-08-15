import { useMemo, useState } from 'react';
import { copyToClipboard } from '../lib/clipboard';
import { buildChatGptPrompt } from '../lib/programExchange';
import type { Exercise } from '../types';

type Props = {
  exercises: Exercise[];
  onClose: () => void;
};

export function ExportExercises({ exercises, onClose }: Props) {
  const prompt = useMemo(() => buildChatGptPrompt(exercises), [exercises]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(prompt);
    setCopied(ok);
    if (!ok) window.alert('Copie impossible : sélectionne le texte manuellement.');
  }

  function download() {
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sportivis-exercices.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Exporter les exercices"
      >
        <div className="sheet-head">
          <div>
            <h2>Exporter les exercices</h2>
            <p className="muted">
              Colle ce texte dans ChatGPT : il contient la liste des{' '}
              {exercises.length} exercices et le format de réponse attendu.
            </p>
          </div>
        </div>

        <ol className="exchange-steps">
          <li>Copie le texte ci-dessous et envoie-le à ChatGPT.</li>
          <li>Précise ton objectif, ton niveau et le nombre de séances.</li>
          <li>
            Copie sa réponse JSON, puis dans <strong>Programmes → Créer</strong>{' '}
            utilise <strong>Importer</strong>.
          </li>
        </ol>

        <div className="field">
          <label htmlFor="export-prompt">Texte à copier</label>
          <textarea
            id="export-prompt"
            className="exchange-text"
            rows={10}
            readOnly
            value={prompt}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>

        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={copy}>
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={download}>
            Télécharger .txt
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
