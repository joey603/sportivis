import { useEffect, useState } from 'react';
import { EXERCISE_MEDIA } from '../data/exerciseMedia';
import { getGuide } from '../data/exerciseGuides';
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
          alt={`${alt} — position ${i + 1}`}
          loading="lazy"
          className={i === frame ? 'on' : ''}
        />
      ))}
      <span className="frames-tag mono">{frame === 0 ? 'départ' : 'arrivée'}</span>
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
  const [playing, setPlaying] = useState(true);
  const exercise = getExerciseById(exerciseId);
  const media = EXERCISE_MEDIA[exerciseId];
  const cues = exercise?.instructions?.length
    ? exercise.instructions
    : getGuide(exerciseId);

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
        aria-label={exercise.name}
      >
        <div className="sheet-head">
          <div>
            <h2>{exercise.name}</h2>
            <div className="sheet-badges">
              <span className="badge">{exercise.muscle}</span>
              <span className="badge badge-accent">
                {exercise.equipment.replace(/_/g, ' ')}
              </span>
              {exercise.custom && <span className="badge">personnel</span>}
              {exercise.defaultRestSec > 0 && (
                <span className="badge">repos {exercise.defaultRestSec}s</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {media ? (
          <>
            <ExerciseFrames
              images={media.images}
              playing={playing}
              alt={exercise.name}
            />
            <div className="row-actions" style={{ marginTop: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? 'Pause' : 'Animer'}
              </button>
            </div>
          </>
        ) : (
          <ExercisePictogram label={exercise.name} />
        )}

        {cues.length > 0 && (
          <div className="cues">
            <h3>Comment l&apos;exécuter</h3>
            <ol>
              {cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </div>
        )}

        {media && (
          <p className="credit muted">
            Photos :{' '}
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
