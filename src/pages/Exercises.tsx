import { useMemo, useState } from 'react';
import { CustomExerciseForm } from '../components/CustomExerciseForm';
import {
  ExerciseFilters,
  useExerciseFilters,
} from '../components/ExerciseFilters';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { ExerciseThumb } from '../components/ExerciseThumb';
import { getAllExercises } from '../lib/storage';

export function Exercises() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const filters = useExerciseFilters(libraryVersion);
  const { results } = filters;

  const exerciseCount = useMemo(() => getAllExercises().length, [libraryVersion]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Bibliothèque</h1>
          <p>
            {exerciseCount} exercices — machines, haltères, barre, poulie, poids
            du corps et cardio. Touche un exercice pour voir la démonstration et
            les consignes.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          + Ajouter mon exercice
        </button>
      </header>

      <ExerciseFilters {...filters} />

      <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
        {results.length} résultat{results.length > 1 ? 's' : ''}
      </p>

      <div className="exercise-list">
        {results.map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="exercise-row exercise-row-clickable"
            onClick={() => setOpenId(ex.id)}
          >
            <ExerciseThumb exerciseId={ex.id} name={ex.name} />
            <div className="exercise-row-main">
              <div className="name">{ex.name}</div>
              <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                Repos défaut {ex.defaultRestSec}s · suivi{' '}
                {ex.tracking === 'reps'
                  ? 'reps'
                  : ex.tracking === 'duration'
                    ? 'durée'
                    : 'distance'}
                {ex.custom ? ' · exercice personnel' : ''}
              </div>
            </div>
            <span className="badge">{ex.muscle}</span>
            {ex.custom && <span className="badge">personnel</span>}
            <span className="badge badge-accent">
              {ex.equipment.replace(/_/g, ' ')}
            </span>
          </button>
        ))}
        {results.length === 0 && <p className="empty">Aucun exercice trouvé</p>}
      </div>

      {openId && (
        <ExerciseSheet exerciseId={openId} onClose={() => setOpenId(null)} />
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
