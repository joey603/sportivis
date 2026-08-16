import { useState } from 'react';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseFilters, useExerciseFilters } from './ExerciseFilters';
import { ExerciseThumb } from './ExerciseThumb';
import {
  localizeEquipment,
  localizeExerciseName,
  localizeMuscle,
} from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import type { Exercise } from '../types';

type Props = {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExercisePicker({ onPick, onClose }: Props) {
  const { locale, t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const filters = useExerciseFilters(libraryVersion);
  const { results } = filters;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('exercises.choose')}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('exercises.add')}</h2>
            <p className="muted">{t('exercises.chooseHint')}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreateOpen(true)}
          >
            {t('exercises.create')}
          </button>
        </div>

        <ExerciseFilters {...filters} autoFocus />

        <div className="exercise-list" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {results.length === 0 && (
            <p className="empty">{t('exercises.empty')}</p>
          )}
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="exercise-row"
              style={{ width: '100%', textAlign: 'start', cursor: 'pointer' }}
              onClick={() => onPick(ex)}
            >
              <ExerciseThumb
                exerciseId={ex.id}
                name={localizeExerciseName(ex, locale)}
              />
              <div className="name">{localizeExerciseName(ex, locale)}</div>
              <span className="badge">
                {localizeMuscle(ex.muscle, locale)}
              </span>
              {ex.custom && (
                <span className="badge badge-pink">
                  {t('exercises.customBadge')}
                </span>
              )}
              <span className="badge badge-accent">
                {localizeEquipment(ex.equipment, locale)}
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
      {createOpen && (
        <CustomExerciseForm
          onClose={() => setCreateOpen(false)}
          onCreated={(exercise) => {
            setLibraryVersion((version) => version + 1);
            setCreateOpen(false);
            onPick(exercise);
          }}
        />
      )}
    </div>
  );
}
