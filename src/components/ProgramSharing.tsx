import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { formatSeconds, getExerciseById } from '../lib/storage';
import type {
  Exercise,
  Program,
  ProgramShare,
  ProgramShareStatus,
  SentProgramShare,
} from '../types';

const SHARE_STATUS_KEYS: Record<ProgramShareStatus, MessageKey> = {
  pending: 'share.status.pending',
  accepted: 'share.status.accepted',
  rejected: 'share.status.rejected',
};

function exerciseTarget(
  exercise: Exercise | undefined,
  item: Program['exercises'][number],
): string {
  if (!exercise) return '';
  if (exercise.tracking === 'reps') {
    const weight = item.targetWeightKg ? ` · ${item.targetWeightKg} kg` : '';
    return `${item.sets} × ${item.reps ?? '—'} reps${weight}`;
  }
  if (exercise.tracking === 'duration') {
    return `${item.sets} × ${formatSeconds(item.durationSec ?? 0)}`;
  }
  return `${item.sets} × ${item.distanceM ?? '—'} m`;
}

export function ShareProgramDialog({
  program,
  sentShares,
  loadingHistory,
  onShare,
  onClose,
}: {
  program: Program;
  sentShares: SentProgramShare[];
  loadingHistory: boolean;
  onShare: (email: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !sending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await onShare(email);
      setSent(true);
      setEmail('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('share.error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={sending ? undefined : onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${t('share.title')} ${program.name}`}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('share.title')}</h2>
            <p className="muted">{t('share.hint', { name: program.name })}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {sent && <p className="exchange-success">{t('share.sent')}</p>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="share-email">{t('share.email')}</label>
            <input
              id="share-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSent(false);
              }}
              placeholder="sportif@exemple.com"
            />
          </div>
          {error && <p className="exchange-error">{error}</p>}
          <div className="row-actions">
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? t('share.sending') : t('share.send')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={sending}
              onClick={onClose}
            >
              {t('common.close')}
            </button>
          </div>
        </form>

        <section className="sent-shares" aria-labelledby="sent-shares-title">
          <div className="sent-shares-heading">
            <h3 id="sent-shares-title">{t('share.with')}</h3>
            {!loadingHistory && sentShares.length > 0 && (
              <span className="badge">{sentShares.length}</span>
            )}
          </div>

          {loadingHistory ? (
            <p className="muted sent-shares-empty">{t('share.loading')}</p>
          ) : sentShares.length === 0 ? (
            <p className="muted sent-shares-empty">{t('share.none')}</p>
          ) : (
            <div className="sent-shares-list">
              {sentShares.map((share) => (
                <div className="sent-share-row" key={share.id}>
                  <div>
                    <strong>{share.recipientName}</strong>
                    <span>{share.recipientEmail}</span>
                  </div>
                  <span className={`share-status ${share.status}`}>
                    {t(SHARE_STATUS_KEYS[share.status])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function SharedProgramPreview({
  share,
  busy,
  onAccept,
  onReject,
  onClose,
}: {
  share: ProgramShare;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const customById = new Map(
    share.customExercises.map((exercise) => [exercise.id, exercise]),
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div
        className="modal shared-program-preview"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${t('share.preview')} ${share.program.name}`}
      >
        <div className="sheet-head">
          <div>
            <span className="badge badge-accent">
              {t('programs.sharedBy', { name: share.senderName })}
            </span>
            <h2>{share.program.name}</h2>
            {share.program.description && (
              <p className="muted">{share.program.description}</p>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shared-exercise-list">
          {share.program.exercises.map((item, index) => {
            const exercise =
              customById.get(item.exerciseId) ?? getExerciseById(item.exerciseId);
            return (
              <div className="shared-exercise-row" key={item.id}>
                <span className="mono shared-exercise-index">{index + 1}</span>
                <div>
                  <strong>{exercise?.name ?? item.exerciseId}</strong>
                  <p className="muted">
                    {exerciseTarget(exercise, item)} · {formatSeconds(item.restSec)}
                  </p>
                  {item.notes && <p className="shared-exercise-note">{item.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="row-actions shared-program-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onAccept}>
            {busy ? t('common.loading') : t('common.accept')}
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={onReject}>
            {t('common.reject')}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
