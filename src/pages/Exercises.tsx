import { useMemo, useState } from 'react';
import { CustomExerciseForm } from '../components/CustomExerciseForm';
import {
  ExerciseFilters,
  useExerciseFilters,
} from '../components/ExerciseFilters';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { ExerciseThumb } from '../components/ExerciseThumb';
import { ExportExercises } from '../components/ExportExercises';
import {
  localizeEquipment,
  localizeExerciseName,
  localizeMuscle,
  localizeTracking,
} from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import { getAllExercises } from '../lib/storage';

export function Exercises() {
  const { locale, t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const filters = useExerciseFilters(libraryVersion);
  const { results } = filters;

  const exerciseCount = useMemo(() => getAllExercises().length, [libraryVersion]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{t('exercises.title')}</h1>
          <p>{t('exercises.subtitle', { count: exerciseCount })}</p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            {t('exercises.addCustom')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setExportOpen(true)}
          >
            {t('exercises.export')}
          </button>
        </div>
      </header>

      <ExerciseFilters {...filters} />

      <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
        {t(results.length === 1 ? 'exercises.result' : 'exercises.results', {
          count: results.length,
        })}
      </p>

      <div className="exercise-list">
        {results.map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="exercise-row exercise-row-clickable"
            onClick={() => setOpenId(ex.id)}
          >
            <ExerciseThumb
              exerciseId={ex.id}
              name={localizeExerciseName(ex, locale)}
            />
            <div className="exercise-row-main">
              <div className="name">{localizeExerciseName(ex, locale)}</div>
              <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                {t('exercises.defaultRest', {
                  seconds: ex.defaultRestSec,
                })}{' '}
                ·{' '}
                {t('exercises.tracking', {
                  tracking: localizeTracking(ex.tracking, locale),
                })}
                {ex.custom ? ` · ${t('exercises.custom')}` : ''}
              </div>
            </div>
            <span className="badge">{localizeMuscle(ex.muscle, locale)}</span>
            {ex.custom && (
              <span className="badge">{t('exercises.customBadge')}</span>
            )}
            <span className="badge badge-accent">
              {localizeEquipment(ex.equipment, locale)}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <p className="empty">{t('exercises.empty')}</p>
        )}
      </div>

      {openId && (
        <ExerciseSheet exerciseId={openId} onClose={() => setOpenId(null)} />
      )}

      {/* On exporte la sélection affichée : les filtres actifs restreignent la liste. */}
      {exportOpen && (
        <ExportExercises
          exercises={results}
          onClose={() => setExportOpen(false)}
        />
      )}

      {createOpen && (
        <CustomExerciseForm
          onClose={() => setCreateOpen(false)}
          onCreated={(exercise) => {
            setLibraryVersion((version) => version + 1);
            setCreateOpen(false);
            filters.setField('category', 'custom');
            setOpenId(exercise.id);
          }}
        />
      )}
    </div>
  );
}
