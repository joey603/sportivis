import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ExercisePicker } from '../components/ExercisePicker';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { ExerciseThumb } from '../components/ExerciseThumb';
import { GenerateProgramDialog } from '../components/GenerateProgramDialog';
import { ImportProgram } from '../components/ImportProgram';
import { isSportExercise } from '../data/exercises';
import { useI18n } from '../i18n/I18nContext';
import {
  loadSettings,
  programExerciseCaloriesKcal,
  SPORT_INTENSITIES,
} from '../lib/calories';
import type { ImportedProgram } from '../lib/programExchange';
import {
  createId,
  exerciseWorkSeconds,
  formatExerciseTarget,
  formatSeconds,
  getExerciseById,
  loadData,
  upsertProgram,
} from '../lib/storage';
import type {
  Exercise,
  Program,
  ProgramExercise,
  SportIntensity,
} from '../types';

const WORK_TIME_OPTIONS = [
  0, 15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180, 240, 300,
];

const INTENSITY_LABELS: Record<SportIntensity, string> = {
  faible: 'Faible',
  moderee: 'Modérée',
  elevee: 'Élevée',
};

export function ProgramEditor() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDraft = id === 'nouveau';
  const [program, setProgram] = useState<Program | null>(() => {
    if (isDraft) {
      const now = new Date().toISOString();
      return {
        id: createId(),
        name: 'Nouveau programme',
        description: '',
        exercises: [],
        createdAt: now,
        updatedAt: now,
      };
    }
    return loadData().programs.find((p) => p.id === id) ?? null;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const bodyWeightKg = loadSettings().bodyWeightKg;

  if (!program) {
    return (
      <div>
        <p className="empty">Programme introuvable.</p>
        <Link to="/programmes" className="btn btn-ghost">
          Retour
        </Link>
      </div>
    );
  }

  function update(partial: Partial<Program>) {
    setProgram((p) => (p ? { ...p, ...partial } : p));
    setSaved(false);
  }

  function updateExercise(peId: string, patch: Partial<ProgramExercise>) {
    setProgram((p) => {
      if (!p) return p;
      return {
        ...p,
        exercises: p.exercises.map((e) =>
          e.id === peId ? { ...e, ...patch } : e,
        ),
      };
    });
    setSaved(false);
  }

  function removeExercise(peId: string) {
    setProgram((p) =>
      p ? { ...p, exercises: p.exercises.filter((e) => e.id !== peId) } : p,
    );
    setSaved(false);
  }

  function moveExercise(index: number, dir: -1 | 1) {
    setProgram((p) => {
      if (!p) return p;
      const next = [...p.exercises];
      const j = index + dir;
      if (j < 0 || j >= next.length) return p;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...p, exercises: next };
    });
    setSaved(false);
  }

  function addExercise(ex: Exercise) {
    // Un sport se pratique d'un bloc : une « série » de 45 min à intensité modérée.
    const pe: ProgramExercise = isSportExercise(ex)
      ? {
          id: createId(),
          exerciseId: ex.id,
          sets: 1,
          restSec: 0,
          durationSec: 45 * 60,
          intensity: 'moderee',
        }
      : {
          id: createId(),
          exerciseId: ex.id,
          sets: 3,
          restSec: ex.defaultRestSec,
          ...(ex.tracking === 'reps'
            ? { reps: 10 }
            : ex.tracking === 'duration'
              ? { durationSec: 60 }
              : { distanceM: 100 }),
        };
    setProgram((p) =>
      p ? { ...p, exercises: [...p.exercises, pe] } : p,
    );
    setPickerOpen(false);
    setSaved(false);
  }

  function applyImport(
    imported: ImportedProgram,
    mode: 'replace' | 'append',
  ) {
    setProgram((p) => {
      if (!p) return p;
      return {
        ...p,
        // Le nom et la description ne sont écrasés que si l'import en fournit.
        name: imported.name ?? p.name,
        description: imported.description ?? p.description,
        exercises:
          mode === 'append'
            ? [...p.exercises, ...imported.exercises]
            : imported.exercises,
      };
    });
    setSaved(false);
  }

  function save() {
    if (!program) return;
    const savedProgram = {
      ...program,
      updatedAt: new Date().toISOString(),
    };
    upsertProgram(savedProgram);
    setProgram(savedProgram);
    setSaved(true);
    if (isDraft) {
      navigate('/programmes', { replace: true });
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{isDraft ? 'Créer un programme' : 'Éditer le programme'}</h1>
          <p>
            <Link to="/programmes" className="muted">
              ← Programmes
            </Link>
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={save}>
            {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </button>
          {!isDraft && (
            <Link to={`/seance/${program.id}`} className="btn btn-secondary">
              Lancer
            </Link>
          )}
        </div>
      </header>

      <div className="panel">
        <div className="field">
          <label htmlFor="name">Nom</label>
          <input
            id="name"
            value={program.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="desc">Description</label>
          <textarea
            id="desc"
            rows={2}
            value={program.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
          />
        </div>
      </div>

      <section className="editor-exercises" aria-labelledby="editor-exercises-title">
        <h2 id="editor-exercises-title">
          Exercices ({program.exercises.length})
        </h2>

        {program.exercises.length === 0 && (
          <p className="empty">{t('import.emptyHint')}</p>
        )}

        {program.exercises.map((pe, index) => {
          const ex = getExerciseById(pe.exerciseId);
          const workSec = exerciseWorkSeconds(pe);
          const sport = isSportExercise(ex);
          const sportKcal = sport
            ? programExerciseCaloriesKcal(pe, ex, bodyWeightKg)
            : 0;
          return (
            <div key={pe.id} className="panel editor-ex">
              <div className="editor-ex-head">
                <div className="editor-ex-identity">
                  <button
                    type="button"
                    className="workout-thumb-btn"
                    onClick={() => setSheetId(pe.exerciseId)}
                    aria-label={`Voir la technique de ${ex?.name ?? ''}`}
                  >
                    <ExerciseThumb
                      exerciseId={pe.exerciseId}
                      name={ex?.name ?? pe.exerciseId}
                    />
                  </button>
                  <div className="editor-ex-copy">
                    <strong>{ex?.name ?? pe.exerciseId}</strong>
                    <div className="muted editor-ex-meta">
                      {sport ? (
                        <>
                          sport · {formatExerciseTarget(pe.exerciseId, pe)} ·{' '}
                          intensité{' '}
                          {INTENSITY_LABELS[
                            pe.intensity ?? 'moderee'
                          ].toLowerCase()}{' '}
                          · ≈ {sportKcal} kcal
                        </>
                      ) : (
                        <>
                          {ex?.muscle} · {ex?.equipment.replace(/_/g, ' ')} ·
                          cible {formatExerciseTarget(pe.exerciseId, pe)}
                          {workSec !== null &&
                            ` · effort ${formatSeconds(workSec)}`}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="move-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => moveExercise(index, -1)}
                    aria-label="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => moveExercise(index, 1)}
                    aria-label="Descendre"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeExercise(pe.id)}
                  >
                    Retirer
                  </button>
                </div>
              </div>
              <div className="editor-fields">
                {sport && (
                  <>
                    <div className="field">
                      <label>Durée (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        value={Math.round((pe.durationSec ?? 0) / 60) || ''}
                        onChange={(e) =>
                          updateExercise(pe.id, {
                            durationSec:
                              (Number(e.target.value) || 0) * 60 || undefined,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Intensité</label>
                      <select
                        value={pe.intensity ?? 'moderee'}
                        onChange={(e) =>
                          updateExercise(pe.id, {
                            intensity: e.target.value as SportIntensity,
                          })
                        }
                      >
                        {SPORT_INTENSITIES.map((value) => (
                          <option key={value} value={value}>
                            {INTENSITY_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Calories estimées</label>
                      <output className="editor-kcal">≈ {sportKcal} kcal</output>
                    </div>
                  </>
                )}
                {!sport && (
                  <div className="field">
                    <label>Séries</label>
                    <input
                      type="number"
                      min={1}
                      value={pe.sets}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          sets: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                )}
                {!sport && ex?.tracking === 'reps' && (
                  <div className="field">
                    <label>Reps</label>
                    <input
                      type="number"
                      min={1}
                      value={pe.reps ?? ''}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          reps: Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                )}
                {!sport && ex?.tracking === 'duration' && (
                  <div className="field">
                    <label>Durée (s)</label>
                    <input
                      type="number"
                      min={1}
                      value={pe.durationSec ?? ''}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          durationSec: Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                )}
                {!sport && ex?.tracking !== 'duration' && (
                  <div className="field">
                    <label>Temps d’effort (s)</label>
                    <select
                      value={pe.workDurationSec ?? 0}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          workDurationSec: Number(e.target.value) || undefined,
                        })
                      }
                    >
                      {WORK_TIME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === 0 ? 'Aucun' : formatSeconds(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!sport && ex?.tracking === 'distance' && (
                  <div className="field">
                    <label>Distance (m)</label>
                    <input
                      type="number"
                      min={1}
                      value={pe.distanceM ?? ''}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          distanceM: Number(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                )}
                {!sport && (
                  <div className="field">
                    <label>Repos (s)</label>
                    <input
                      type="number"
                      min={0}
                      value={pe.restSec}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          restSec: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
                {!sport && ex?.tracking === 'reps' && (
                  <div className="field">
                    <label>Charge cible (kg)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={pe.targetWeightKg ?? ''}
                      onChange={(e) =>
                        updateExercise(pe.id, {
                          targetWeightKg:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
              </div>
              <div className="field">
                <label>Notes</label>
                <input
                  value={pe.notes ?? ''}
                  onChange={(e) =>
                    updateExercise(pe.id, { notes: e.target.value })
                  }
                  placeholder="Optionnel"
                />
              </div>
            </div>
          );
        })}

        <div className="row-actions editor-exercise-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setPickerOpen(true)}
          >
            + Ajouter
          </button>
          <button
            type="button"
            className="btn btn-ai btn-sm"
            onClick={() => setGenerateOpen(true)}
          >
            {t('ai.generate')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setImportOpen(true)}
          >
            {t('import.chatgpt')}
          </button>
        </div>
      </section>

      <div className="cta-row">
        <button type="button" className="btn btn-primary" onClick={save}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate('/programmes')}
        >
          Retour
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {generateOpen && (
        <GenerateProgramDialog
          currentCount={program.exercises.length}
          onImport={applyImport}
          onClose={() => setGenerateOpen(false)}
        />
      )}

      {importOpen && (
        <ImportProgram
          currentCount={program.exercises.length}
          onImport={applyImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {sheetId && (
        <ExerciseSheet exerciseId={sheetId} onClose={() => setSheetId(null)} />
      )}
    </div>
  );
}
