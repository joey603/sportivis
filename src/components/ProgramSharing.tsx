import { useEffect, useState, type FormEvent } from 'react';
import { formatSeconds, getExerciseById } from '../lib/storage';
import type { Exercise, Program, ProgramShare } from '../types';

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
  onShare,
  onClose,
}: {
  program: Program;
  onShare: (email: string) => Promise<void>;
  onClose: () => void;
}) {
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
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Le programme n’a pas pu être partagé.',
      );
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
        aria-label={`Partager ${program.name}`}
      >
        <div className="sheet-head">
          <div>
            <h2>Partager le programme</h2>
            <p className="muted">
              « {program.name} » apparaîtra chez le destinataire. Il pourra le
              consulter avant de l’accepter ou de le refuser.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {sent ? (
          <>
            <p className="exchange-success">
              Programme envoyé. Il apparaîtra dans la liste du destinataire.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Terminé
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="share-email">Email du destinataire</label>
              <input
                id="share-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sportif@exemple.com"
              />
            </div>
            {error && <p className="exchange-error">{error}</p>}
            <div className="row-actions">
              <button type="submit" className="btn btn-primary" disabled={sending}>
                {sending ? 'Envoi…' : 'Partager'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={sending}
                onClick={onClose}
              >
                Annuler
              </button>
            </div>
          </form>
        )}
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
  const customById = new Map(share.customExercises.map((exercise) => [exercise.id, exercise]));

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
        aria-label={`Aperçu de ${share.program.name}`}
      >
        <div className="sheet-head">
          <div>
            <span className="badge badge-accent">Partagé par {share.senderName}</span>
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
            const exercise = customById.get(item.exerciseId) ?? getExerciseById(item.exerciseId);
            return (
              <div className="shared-exercise-row" key={item.id}>
                <span className="mono shared-exercise-index">{index + 1}</span>
                <div>
                  <strong>{exercise?.name ?? item.exerciseId}</strong>
                  <p className="muted">
                    {exerciseTarget(exercise, item)} · repos {formatSeconds(item.restSec)}
                  </p>
                  {item.notes && <p className="shared-exercise-note">{item.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="row-actions shared-program-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onAccept}>
            {busy ? 'Traitement…' : 'Accepter'}
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={onReject}>
            Refuser
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
