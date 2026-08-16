import { useEffect, useState } from 'react';
import { EXERCISE_MEDIA } from '../data/exerciseMedia';
import { getGuide } from '../data/exerciseGuides';
import {
  localizeEquipment,
  localizeExerciseName,
  localizeMuscle,
} from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import { getExerciseById } from '../lib/storage';
import { ExercisePictogram } from './ExercisePictogram';

/** Alterne les deux photos (départ / arrivée) pour simuler le mouvement. */
export function ExerciseFrames({
  images,
  playing,
  alt,
}: {
  images: string[];
  playing: boolean;
  alt: string;
}) {
  const { t } = useI18n();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!playing || images.length < 2) return;
    const t = window.setInterval(
      () => setFrame((f) => (f + 1) % images.length),
      900,
    );
    return () => window.clearInterval(t);
  }, [playing, images.length]);

  return (
    <div className="frames">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${alt} — ${t('exercises.position', { number: i + 1 })}`}
          loading="lazy"
          className={i === frame ? 'on' : ''}
        />
      ))}
      <span className="frames-tag mono">
        {t(frame === 0 ? 'exercises.start' : 'exercises.end')}
      </span>
    </div>
  );
}

export function ExerciseSheet({
  exerciseId,
  onClose,
}: {
  exerciseId: string;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const [playing, setPlaying] = useState(true);
  const exercise = getExerciseById(exerciseId);
  const localizedName = exercise
    ? localizeExerciseName(exercise, locale)
    : '';
  const media = EXERCISE_MEDIA[exerciseId];
  const cues = exercise?.instructions?.length
    ? exercise.instructions
    : getGuide(exerciseId, locale);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!exercise) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={localizedName}
      >
        <div className="sheet-head">
          <div>
            <h2>{localizedName}</h2>
            <div className="sheet-badges">
              <span className="badge">
                {localizeMuscle(exercise.muscle, locale)}
              </span>
              <span className="badge badge-accent">
                {localizeEquipment(exercise.equipment, locale)}
              </span>
              {exercise.custom && (
                <span className="badge badge-pink">
                  {t('exercises.customBadge')}
                </span>
              )}
              {exercise.defaultRestSec > 0 && (
                <span className="badge">
                  {t('exercises.rest', {
                    seconds: exercise.defaultRestSec,
                  })}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {media ? (
          <>
            <ExerciseFrames
              images={media.images}
              playing={playing}
              alt={localizedName}
            />
            <div className="row-actions" style={{ marginTop: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPlaying((p) => !p)}
              >
                {t(playing ? 'exercises.pause' : 'exercises.animate')}
              </button>
            </div>
          </>
        ) : (
          <ExercisePictogram label={localizedName} />
        )}

        {cues.length > 0 && (
          <div className="cues">
            <h3>{t('exercises.howTo')}</h3>
            <ol>
              {cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </div>
        )}

        {media && (
          <p className="credit muted">
            {t('exercises.photos')} :{' '}
            <a
              href="https://github.com/yuhonas/free-exercise-db"
              target="_blank"
              rel="noreferrer"
            >
              free-exercise-db
            </a>{' '}
            — domaine public (Unlicense)
          </p>
        )}
      </div>
    </div>
  );
}
