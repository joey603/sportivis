import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { loadSettings, sessionCaloriesKcal } from '../lib/calories';
import {
  deleteSession,
  getExerciseById,
  sessionDurationMin,
  sessionVolumeKg,
} from '../lib/storage';
import { useAppData } from '../lib/useAppData';
import type { Session } from '../types';

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'he' ? 'he-IL' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function History() {
  const { t, locale } = useI18n();
  const [data, setData] = useAppData();
  const [openId, setOpenId] = useState<string | null>(null);
  const bodyWeightKg = loadSettings().bodyWeightKg;

  const sessions = data.sessions.filter((s) => s.endedAt);

  function onDelete(id: string) {
    if (!confirm(t('history.deleteConfirm'))) return;
    setData(deleteSession(id));
    if (openId === id) setOpenId(null);
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{t('history.title')}</h1>
          <p>
            {t(
              sessions.length > 1 ? 'history.subtitle_plural' : 'history.subtitle',
              { count: sessions.length },
            )}
          </p>
        </div>
      </header>

      {sessions.length === 0 && (
        <p className="empty">{t('history.empty')}</p>
      )}

      {sessions.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          bodyWeightKg={bodyWeightKg}
          open={openId === s.id}
          locale={locale}
          deleteLabel={t('common.delete')}
          onToggle={() => setOpenId(openId === s.id ? null : s.id)}
          onDelete={() => onDelete(s.id)}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  bodyWeightKg,
  open,
  locale,
  deleteLabel,
  onToggle,
  onDelete,
}: {
  session: Session;
  bodyWeightKg: number;
  open: boolean;
  locale: string;
  deleteLabel: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const duration = sessionDurationMin(session);
  const volume = sessionVolumeKg(session);
  const calories = sessionCaloriesKcal(session, bodyWeightKg);
  const completedSets = session.logs.reduce(
    (a, l) => a + l.sets.filter((s) => s.completed).length,
    0,
  );

  return (
    <div className="panel program-card">
      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', textAlign: 'start' }}
      >
        <h3>{session.programName}</h3>
        <p className="meta">
          {formatDate(session.startedAt, locale)}
          {duration != null ? ` · ${duration} min` : ''}
          {calories > 0 ? ` · ${calories} kcal` : ''}
          {volume > 0 ? ` · ${volume} kg` : ''}
          {` · ${completedSets}`}
        </p>
      </button>

      {open && (
        <div style={{ marginTop: '1rem' }}>
          {session.logs.map((log) => {
            const ex = getExerciseById(log.exerciseId);
            const done = log.sets.filter((s) => s.completed);
            if (done.length === 0) return null;
            return (
              <div key={log.programExerciseId} style={{ marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>
                  {ex?.name ?? log.exerciseId}
                </strong>
                <ul style={{ marginTop: '0.25rem' }}>
                  {done.map((set) => (
                    <li
                      key={set.setIndex}
                      className="muted mono"
                      style={{ fontSize: '0.85rem' }}
                    >
                      #{set.setIndex + 1}
                      {set.weightKg != null ? ` · ${set.weightKg} kg` : ''}
                      {set.reps != null ? ` × ${set.reps}` : ''}
                      {set.durationSec != null ? ` · ${set.durationSec}s` : ''}
                      {set.distanceM != null ? ` · ${set.distanceM} m` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
            {deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
}
