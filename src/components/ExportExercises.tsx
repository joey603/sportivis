import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { copyToClipboard } from '../lib/clipboard';
import { buildChatGptPrompt } from '../lib/programExchange';
import type { Exercise } from '../types';

type Props = {
  exercises: Exercise[];
  onClose: () => void;
};

export function ExportExercises({ exercises, onClose }: Props) {
  const { locale, t } = useI18n();
  const prompt = useMemo(
    () => buildChatGptPrompt(exercises, locale),
    [exercises, locale],
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(prompt);
    setCopied(ok);
    if (!ok) window.alert(t('export.copyFail'));
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
        aria-label={t('export.title')}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('export.title')}</h2>
            <p className="muted">
              {t('export.lead', { count: exercises.length })}
            </p>
          </div>
        </div>

        <ol className="exchange-steps">
          <li>{t('export.step1')}</li>
          <li>{t('export.step2')}</li>
          <li>{t('export.step3')}</li>
        </ol>

        <div className="field">
          <label htmlFor="export-prompt">{t('export.label')}</label>
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
            {copied ? t('export.copied') : t('export.copy')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={download}>
            {t('export.download')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
