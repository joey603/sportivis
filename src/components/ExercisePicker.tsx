import { useState } from 'react';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseFilters, useExerciseFilters } from './ExerciseFilters';
import { ExerciseThumb } from './ExerciseThumb';
import type { Exercise } from '../types';

type Props = {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExercisePicker({ onPick, onClose }: Props) {
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
        aria-label="Choisir un exercice"
      >
        <div className="sheet-head">
          <div>
            <h2>Ajouter un exercice</h2>
            <p className="muted">Choisis dans la bibliothèque ou crée le tien.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreateOpen(true)}
          >
            + Créer
          </button>
        </div>

        <ExerciseFilters {...filters} autoFocus placeholder="Rechercher…" />

        <div className="exercise-list" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {results.length === 0 && <p className="empty">Aucun exercice</p>}
          {results.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="exercise-row"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => onPick(ex)}
            >
              <ExerciseThumb exerciseId={ex.id} name={ex.name} />
              <div className="name">{ex.name}</div>
              <span className="badge">{ex.muscle}</span>
              {ex.custom && <span className="badge">personnel</span>}
              <span className="badge badge-accent">{ex.equipment.replace(/_/g, ' ')}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fermer
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
