import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useRef, useState } from 'react';
import { CountdownTimer } from '../components/CountdownTimer';
import { ExerciseSheet } from '../components/ExerciseSheet';
import { ExerciseThumb } from '../components/ExerciseThumb';
import { SetRow } from '../components/SetRow';
import { isSportExercise } from '../data/exercises';
import { localizeExerciseName } from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import { loadSettings, setCaloriesKcal } from '../lib/calories';
import {
  createId,
  exerciseWorkSeconds,
  formatExerciseTarget,
  formatSeconds,
  getExerciseById,
  loadData,
  saveSession,
} from '../lib/storage';
import type { ExerciseLog, Program, Session, SetLog } from '../types';

type Phase = {
  kind: 'work' | 'rest';
  seconds: number;
  exerciseIndex: number;
  setIndex: number;
  key: number;
};

type Position = { exerciseIndex: number; setIndex: number };

function buildLogs(programId: string): ExerciseLog[] {
  const program = loadData().programs.find((p) => p.id === programId);
  if (!program) return [];
  return program.exercises.map((pe) => {
    const ex = getExerciseById(pe.exerciseId);
    const sets: SetLog[] = Array.from({ length: pe.sets }, (_, i) => ({
      setIndex: i,
      completed: false,
      reps: ex?.tracking === 'reps' ? pe.reps : undefined,
      weightKg: ex?.tracking === 'reps' ? pe.targetWeightKg : undefined,
      durationSec: pe.durationSec,
      distanceM: pe.distanceM,
      intensity: pe.intensity,
    }));
    return {
      programExerciseId: pe.id,
      exerciseId: pe.exerciseId,
      sets,
    };
  });
}

function initialPhase(program: Program | undefined): Phase | null {
  const first = program?.exercises[0];
  if (!first) return null;
  const seconds = exerciseWorkSeconds(first);
  if (!seconds) return null;
  return { kind: 'work', seconds, exerciseIndex: 0, setIndex: 0, key: 1 };
}

export function Workout() {
  const { locale, t } = useI18n();
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const program = useMemo(
    () => loadData().programs.find((p) => p.id === programId),
    [programId],
  );

  const [session] = useState<Session | null>(() => {
    if (!program) return null;
    return {
      id: createId(),
      programId: program.id,
      programName: program.name,
      startedAt: new Date().toISOString(),
      logs: buildLogs(program.id),
    };
  });

  const [logs, setLogs] = useState<ExerciseLog[]>(() => session?.logs ?? []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [phase, setPhase] = useState<Phase | null>(() => initialPhase(program));
  const [sheetId, setSheetId] = useState<string | null>(null);
  const phaseKey = useRef(1);
  const bodyWeightKg = loadSettings().bodyWeightKg;

  if (!program || !session) {
    return (
      <div>
        <p className="empty">{t('workout.missing')}</p>
        <Link to="/programmes" className="btn btn-ghost">
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const prog = program;
  const sess = session;

  const pe = prog.exercises[activeIndex];
  const log = logs[activeIndex];
  const ex = pe ? getExerciseById(pe.exerciseId) : undefined;
  const workSec = pe ? exerciseWorkSeconds(pe) : null;
  const localizedName = ex ? localizeExerciseName(ex, locale) : '';

  function nextPosition(from: Position): Position | null {
    const current = prog.exercises[from.exerciseIndex];
    if (!current) return null;
    if (from.setIndex + 1 < current.sets) {
      return { exerciseIndex: from.exerciseIndex, setIndex: from.setIndex + 1 };
    }
    if (from.exerciseIndex + 1 < prog.exercises.length) {
      return { exerciseIndex: from.exerciseIndex + 1, setIndex: 0 };
    }
    return null;
  }

  function firstPendingSet(exerciseIndex: number): number {
    const sets = logs[exerciseIndex]?.sets ?? [];
    const pending = sets.find((s) => !s.completed);
    return pending ? pending.setIndex : 0;
  }

  function makePhase(
    kind: 'work' | 'rest',
    { exerciseIndex, setIndex }: Position,
  ): Phase | null {
    const target = prog.exercises[exerciseIndex];
    if (!target) return null;
    const seconds =
      kind === 'work' ? exerciseWorkSeconds(target) : target.restSec;
    if (!seconds || seconds <= 0) return null;
    phaseKey.current += 1;
    return { kind, seconds, exerciseIndex, setIndex, key: phaseKey.current };
  }

  function beginWork(position: Position) {
    setActiveIndex(position.exerciseIndex);
    setPhase(makePhase('work', position));
  }

  /** Repos après une série, puis enchaînement si le mode auto est actif. */
  function beginRest(position: Position) {
    const after = nextPosition(position);
    const rest = after ? makePhase('rest', position) : null;
    if (rest) {
      setPhase(rest);
      return;
    }
    if (autoMode && after) {
      beginWork(after);
      return;
    }
    setPhase(null);
  }

  function setCompleted(position: Position, completed: boolean) {
    setLogs((prev) =>
      prev.map((l, i) =>
        i === position.exerciseIndex
          ? {
              ...l,
              sets: l.sets.map((s) =>
                s.setIndex === position.setIndex ? { ...s, completed } : s,
              ),
            }
          : l,
      ),
    );
  }

  function updateSet(setIndex: number, next: SetLog) {
    setLogs((prev) =>
      prev.map((l, i) =>
        i === activeIndex
          ? { ...l, sets: l.sets.map((s) => (s.setIndex === setIndex ? next : s)) }
          : l,
      ),
    );
  }

  function completeSet(setIndex: number) {
    const current = logs[activeIndex]?.sets.find((s) => s.setIndex === setIndex);
    if (!current) return;
    const completing = !current.completed;
    setCompleted({ exerciseIndex: activeIndex, setIndex }, completing);
    if (completing) beginRest({ exerciseIndex: activeIndex, setIndex });
  }

  function handlePhaseDone() {
    if (!phase) return;
    const position = {
      exerciseIndex: phase.exerciseIndex,
      setIndex: phase.setIndex,
    };
    if (phase.kind === 'work') {
      setCompleted(position, true);
      if (autoMode) beginRest(position);
      else setPhase(null);
      return;
    }
    const after = nextPosition(position);
    if (autoMode && after) beginWork(after);
    else setPhase(null);
  }

  function goToExercise(index: number) {
    if (autoMode) {
      beginWork({ exerciseIndex: index, setIndex: firstPendingSet(index) });
      return;
    }
    setActiveIndex(index);
    setPhase(null);
  }

  function finish() {
    const ended: Session = {
      id: sess.id,
      programId: sess.programId,
      programName: sess.programName,
      startedAt: sess.startedAt,
      endedAt: new Date().toISOString(),
      logs,
    };
    saveSession(ended);
    navigate('/accueil');
  }

  const totalSets = logs.reduce((acc, l) => acc + l.sets.length, 0);
  const setsBeforeActive = prog.exercises
    .slice(0, activeIndex)
    .reduce((total, item) => total + item.sets, 0);
  const activeSetIndex =
    phase?.exerciseIndex === activeIndex
      ? phase.setIndex
      : firstPendingSet(activeIndex);
  const currentStep = totalSets
    ? Math.min(totalSets, setsBeforeActive + activeSetIndex + 1)
    : 0;

  const phaseSets = phase ? prog.exercises[phase.exerciseIndex]?.sets : undefined;
  const phaseLabel = phase
    ? `${t(phase.kind === 'work' ? 'workout.effort' : 'workout.rest')}${
        phaseSets
          ? ` · ${t('workout.setOf', {
              current: phase.setIndex + 1,
              total: phaseSets,
            })}`
          : ''
      }`
    : '';

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{prog.name}</h1>
          <p>
            {t('workout.inProgress', {
              step: currentStep,
              total: totalSets,
              current: activeIndex + 1,
              count: prog.exercises.length,
            })}
          </p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className={`btn btn-sm ${autoMode ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setAutoMode((v) => !v)}
            aria-pressed={autoMode}
          >
            {t('workout.auto')} {autoMode ? '✓' : ''}
          </button>
          <button type="button" className="btn btn-primary" onClick={finish}>
            {t('workout.finish')}
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          marginBottom: '1rem',
          paddingBottom: '0.25rem',
        }}
      >
        {prog.exercises.map((item, i) => {
          const e = getExerciseById(item.exerciseId);
          const done = logs[i]?.sets.every((s) => s.completed);
          const shortName = e
            ? localizeExerciseName(e, locale).slice(0, 18)
            : '?';
          return (
            <button
              key={item.id}
              type="button"
              className={`btn btn-sm ${i === activeIndex ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => goToExercise(i)}
              style={{ opacity: done ? 0.7 : 1 }}
            >
              {i + 1}. {shortName}
              {done ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      {pe && log && ex && (
        <div className="panel">
          <div className="workout-ex-head">
            <button
              type="button"
              className="workout-thumb-btn"
              onClick={() => setSheetId(ex.id)}
              aria-label={t('workout.techniqueOf', { name: localizedName })}
            >
              <ExerciseThumb exerciseId={ex.id} name={localizedName} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>
                {localizedName}
              </h2>
              <p className="muted">
                {pe.sets} × {formatExerciseTarget(pe.exerciseId, pe, locale)}
                {workSec !== null &&
                  ` · ${t('workout.effortLabel', {
                    time: formatSeconds(workSec, locale),
                  })}`}{' '}
                · {t('workout.restLabel', { seconds: pe.restSec })}
                {pe.notes ? ` · ${pe.notes}` : ''}
              </p>
              {autoMode && workSec === null && (
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  {t('workout.noWorkTime')}
                </p>
              )}
              <div className="row-actions" style={{ marginTop: '0.5rem' }}>
                {workSec !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      beginWork({
                        exerciseIndex: activeIndex,
                        setIndex: firstPendingSet(activeIndex),
                      })
                    }
                  >
                    {t('workout.chrono', {
                      time: formatSeconds(workSec, locale),
                    })}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSheetId(ex.id)}
                >
                  {t('workout.technique')}
                </button>
              </div>
            </div>
          </div>

          <div className="set-grid">
            <div
              className="muted"
              style={{
                display: 'grid',
                gridTemplateColumns: '2rem 1fr 1fr auto',
                gap: '0.5rem',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 0.5rem',
              }}
            >
              <span>#</span>
              <span>
                {ex.tracking === 'reps'
                  ? t('workout.charge')
                  : ex.tracking === 'duration'
                    ? t('workout.duration')
                    : t('workout.distance')}
              </span>
              <span>{ex.tracking === 'reps' ? t('workout.reps') : ''}</span>
              <span title={t('workout.calories')}>
                {t('workout.caloriesShort')}
              </span>
            </div>
            {log.sets.map((set) => (
              <SetRow
                key={set.setIndex}
                set={set}
                tracking={ex.tracking}
                calories={setCaloriesKcal(set, ex, bodyWeightKg)}
                durationUnit={isSportExercise(ex) ? 'min' : 'sec'}
                active={
                  phase?.kind === 'work' &&
                  phase.exerciseIndex === activeIndex &&
                  phase.setIndex === set.setIndex
                }
                onChange={(next) => updateSet(set.setIndex, next)}
                onComplete={() => completeSet(set.setIndex)}
              />
            ))}
          </div>

          <div className="cta-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={activeIndex === 0}
              onClick={() => goToExercise(activeIndex - 1)}
            >
              {t('workout.prev')}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={activeIndex >= prog.exercises.length - 1}
              onClick={() => goToExercise(activeIndex + 1)}
            >
              {t('workout.next')}
            </button>
          </div>
        </div>
      )}

      {phase && (
        <CountdownTimer
          key={phase.key}
          seconds={phase.seconds}
          variant={phase.kind}
          label={phaseLabel}
          onDone={handlePhaseDone}
          onSkip={handlePhaseDone}
        />
      )}

      {sheetId && (
        <ExerciseSheet exerciseId={sheetId} onClose={() => setSheetId(null)} />
      )}
    </div>
  );
}
