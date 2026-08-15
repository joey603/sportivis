import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  clearSettings,
  loadSettings,
  saveBodyWeightKg,
  sessionCaloriesKcal,
} from '../lib/calories';
import {
  addWeightEntry,
  deleteWeightEntry,
  sessionDurationMin,
  sessionVolumeKg,
} from '../lib/storage';
import { useAppData } from '../lib/useAppData';
import type { WeightEntry } from '../types';

const DAY_LABELS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function Dashboard() {
  const [data, setData] = useAppData();
  const [newWeight, setNewWeight] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const bodyWeightKg = loadSettings().bodyWeightKg;

  const summary = useMemo(() => {
    const sessions = data.sessions
      .filter((session) => session.endedAt)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: dayKey(date),
        label: DAY_LABELS[date.getDay()],
        date: date.getDate(),
        sessions: 0,
      };
    });

    for (const session of sessions) {
      const day = days.find((item) => item.key === dayKey(new Date(session.startedAt)));
      if (day) day.sessions += 1;
    }

    const weekSessions = sessions.filter((session) => {
      const started = new Date(session.startedAt);
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(today.getDate() - 6);
      return started >= start;
    });

    return {
      sessions,
      days,
      weekCount: days.reduce((total, day) => total + day.sessions, 0),
      totalMinutes: sessions.reduce(
        (total, session) => total + (sessionDurationMin(session) ?? 0),
        0,
      ),
      totalVolume: sessions.reduce(
        (total, session) => total + sessionVolumeKg(session),
        0,
      ),
      weekCalories: weekSessions.reduce(
        (total, session) => total + sessionCaloriesKcal(session, bodyWeightKg),
        0,
      ),
    };
  }, [data.sessions, bodyWeightKg]);

  const lastSession = summary.sessions[0];
  const maxDaySessions = Math.max(1, ...summary.days.map((day) => day.sessions));

  function recordWeight(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      setWeightError('Indique un poids entre 30 et 300 kg.');
      return;
    }
    saveBodyWeightKg(value);
    setData(addWeightEntry(value));
    setNewWeight('');
    setWeightError(null);
  }

  function removeWeight(id: string) {
    const next = deleteWeightEntry(id);
    const latest = next.weightEntries.at(-1);
    if (latest) saveBodyWeightKg(latest.weightKg);
    else clearSettings();
    setData(next);
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Ton espace sportif</p>
          <h1>
            {data.profile?.firstName
              ? `Bonjour ${data.profile.firstName}`
              : 'Tableau de bord'}
          </h1>
          <p className="muted">Choisis un programme et continue ta progression.</p>
        </div>
        <Link to="/programmes" className="btn btn-secondary">
          Gérer mes programmes
        </Link>
      </header>

      <section className="dashboard-stats" aria-label="Résumé de l'activité">
        <article className="dashboard-stat">
          <span>Cette semaine</span>
          <strong>{summary.weekCount}</strong>
          <small>séance{summary.weekCount > 1 ? 's' : ''}</small>
        </article>
        <article className="dashboard-stat">
          <span>Temps total</span>
          <strong>{summary.totalMinutes}</strong>
          <small>minutes entraînées</small>
        </article>
        <article className="dashboard-stat">
          <span>Volume total</span>
          <strong>{Math.round(summary.totalVolume).toLocaleString('fr-FR')}</strong>
          <small>kg soulevés</small>
        </article>
        <article className="dashboard-stat">
          <span>Calories</span>
          <strong>{summary.weekCalories.toLocaleString('fr-FR')}</strong>
          <small>kcal cette semaine</small>
        </article>
      </section>

      <DashboardCarousel
        slides={[
          {
            id: 'overview',
            label: 'Séances',
            content: (
              <div className="dashboard-grid">
                <section className="panel dashboard-activity">
                  <div className="dashboard-section-title">
                    <div>
                      <h2>Activité récente</h2>
                      <p className="muted">Tes séances sur les 7 derniers jours</p>
                    </div>
                    <strong>{summary.weekCount}</strong>
                  </div>
                  <div
                    className="activity-chart"
                    aria-label="Séances des sept derniers jours"
                  >
                    {summary.days.map((day) => (
                      <div
                        className="activity-day"
                        key={day.key}
                        title={`${day.sessions} séance${day.sessions > 1 ? 's' : ''}`}
                      >
                        <span className="activity-value">{day.sessions || ''}</span>
                        <div className="activity-track">
                          <span
                            className={
                              day.sessions ? 'activity-bar active' : 'activity-bar'
                            }
                            style={{
                              height: day.sessions
                                ? `${Math.max(22, (day.sessions / maxDaySessions) * 100)}%`
                                : '5%',
                            }}
                          />
                        </div>
                        <span>{day.label}</span>
                        <small>{day.date}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel dashboard-last">
                  <div className="dashboard-section-title">
                    <div>
                      <h2>Dernière séance</h2>
                      <p className="muted">Ton dernier effort enregistré</p>
                    </div>
                  </div>
                  {lastSession ? (
                    <>
                      <h3>{lastSession.programName}</h3>
                      <p className="muted dashboard-last-date">
                        {formatSessionDate(lastSession.startedAt)}
                      </p>
                      <div className="dashboard-last-metrics">
                        <div>
                          <strong>{sessionDurationMin(lastSession) ?? 0}</strong>
                          <span>min</span>
                        </div>
                        <div>
                          <strong>
                            {sessionCaloriesKcal(
                              lastSession,
                              bodyWeightKg,
                            ).toLocaleString('fr-FR')}
                          </strong>
                          <span>kcal</span>
                        </div>
                        <div>
                          <strong>
                            {Math.round(
                              sessionVolumeKg(lastSession),
                            ).toLocaleString('fr-FR')}
                          </strong>
                          <span>kg</span>
                        </div>
                      </div>
                      <Link to="/historique" className="btn btn-ghost btn-sm">
                        Voir l’historique
                      </Link>
                    </>
                  ) : (
                    <p className="empty dashboard-empty">
                      Termine ta première séance pour voir tes statistiques.
                    </p>
                  )}
                </section>
              </div>
            ),
          },
          {
            id: 'weight',
            label: 'Poids',
            content: (
              <section className="panel weight-tracker">
                <div className="dashboard-section-title">
                  <div>
                    <h2>Suivi du poids</h2>
                    <p className="muted">
                      Ajoute régulièrement une mesure pour voir ton évolution.
                    </p>
                  </div>
                  {data.weightEntries.at(-1) && (
                    <strong>
                      {data.weightEntries.at(-1)?.weightKg.toLocaleString('fr-FR')} kg
                    </strong>
                  )}
                </div>
                <WeightTracker
                  entries={data.weightEntries}
                  newWeight={newWeight}
                  setNewWeight={setNewWeight}
                  error={weightError}
                  onSubmit={recordWeight}
                  onDelete={removeWeight}
                />
              </section>
            ),
          },
        ]}
      />

      <section className="dashboard-programs">
        <div className="dashboard-section-title">
          <div>
            <h2>Mes programmes</h2>
            <p className="muted">Prêt à commencer ? Lance directement ta séance.</p>
          </div>
          <Link to="/programmes" className="btn btn-ghost btn-sm">
            Tout voir
          </Link>
        </div>

        {data.programs.length ? (
          <div className="dashboard-program-grid">
            {data.programs.map((program, index) => (
              <article className="panel dashboard-program-card" key={program.id}>
                <span className="dashboard-program-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{program.name}</h3>
                <p className="muted">
                  {program.exercises.length} exercice
                  {program.exercises.length > 1 ? 's' : ''}
                  {program.description ? ` · ${program.description}` : ''}
                </p>
                <div className="row-actions">
                  <Link
                    to={`/seance/${program.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Lancer
                  </Link>
                  <Link
                    to={`/programmes/${program.id}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Modifier
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel dashboard-empty">
            <h3>Crée ton premier programme</h3>
            <p className="muted">
              Ajoute tes exercices, séries, répétitions et temps de repos.
            </p>
            <Link to="/programmes/nouveau" className="btn btn-primary">
              Créer un programme
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

type Slide = {
  id: string;
  label: string;
  content: ReactNode;
};

const SLIDE_DURATION_MS = 8000;

function DashboardCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Le défilement s'arrête dès qu'on survole ou saisit une valeur,
  // sinon le formulaire de pesée disparaîtrait pendant la frappe.
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, index, slides.length]);

  const active = slides[Math.min(index, slides.length - 1)];

  return (
    <section
      className="dashboard-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carrousel"
      aria-label="Statistiques d'entraînement"
    >
      <div className="carousel-body" key={active.id}>
        {active.content}
      </div>

      <div className="carousel-nav">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            className={slideIndex === index ? 'carousel-dot active' : 'carousel-dot'}
            onClick={() => setIndex(slideIndex)}
            aria-label={`Afficher ${slide.label}`}
            aria-current={slideIndex === index ? 'true' : undefined}
          >
            <span className="carousel-dot-track">
              {slideIndex === index && (
                <span
                  className="carousel-dot-fill"
                  style={{
                    animationDuration: `${SLIDE_DURATION_MS}ms`,
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              )}
            </span>
            <span className="carousel-dot-label">{slide.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WeightTracker({
  entries,
  newWeight,
  setNewWeight,
  error,
  onSubmit,
  onDelete,
}: {
  entries: WeightEntry[];
  newWeight: string;
  setNewWeight: (value: string) => void;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
  onDelete: (id: string) => void;
}) {
  const points = entries.slice(-10);
  const values = points.map((entry) => entry.weightKg);
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 0;
  // Marge verticale pour que la courbe ne colle jamais aux bords.
  const padding = Math.max(0.5, (rawMax - rawMin) * 0.25);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const range = max - min || 1;

  const box = { width: 620, height: 240 };
  const plot = { left: 46, right: 18, top: 26, bottom: 34 };
  const plotWidth = box.width - plot.left - plot.right;
  const plotHeight = box.height - plot.top - plot.bottom;

  const coordinates = points.map((entry, index) => ({
    entry,
    x:
      points.length === 1
        ? plot.left + plotWidth / 2
        : plot.left + (index / (points.length - 1)) * plotWidth,
    y: plot.top + (1 - (entry.weightKg - min) / range) * plotHeight,
  }));

  const line = coordinates
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
    .join(' ');
  const area = coordinates.length
    ? `${line} L ${coordinates.at(-1)!.x} ${plot.top + plotHeight} L ${
        coordinates[0].x
      } ${plot.top + plotHeight} Z`
    : '';
  const gridValues = [max, (max + min) / 2, min];

  return (
    <div className="weight-tracker">
      <div className="weight-layout">
        <div className="weight-chart">
          {coordinates.length ? (
            <svg
              viewBox={`0 0 ${box.width} ${box.height}`}
              role="img"
              aria-label="Courbe d'évolution du poids"
            >
              {gridValues.map((value, index) => {
                const y = plot.top + (index / (gridValues.length - 1)) * plotHeight;
                return (
                  <g key={value}>
                    <line
                      x1={plot.left}
                      y1={y}
                      x2={box.width - plot.right}
                      y2={y}
                      className="weight-grid"
                    />
                    <text x={plot.left - 10} y={y + 4} className="weight-axis-label">
                      {value.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {coordinates.length > 1 && (
                <>
                  <path d={area} className="weight-area" />
                  <path d={line} className="weight-line" />
                </>
              )}

              {coordinates.map(({ entry, x, y }) => (
                <g key={entry.id}>
                  <circle cx={x} cy={y} r="4.5" className="weight-point" />
                  <text x={x} y={y - 12} className="weight-value">
                    {entry.weightKg.toLocaleString('fr-FR')}
                  </text>
                  <text
                    x={x}
                    y={box.height - 10}
                    className="weight-date"
                  >
                    {new Date(entry.recordedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <p className="empty">
              Ajoute ta première pesée pour commencer la courbe.
            </p>
          )}
        </div>

        <div className="weight-side">
          <form className="weight-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="dashboard-weight">Poids du jour (kg)</label>
              <input
                id="dashboard-weight"
                type="number"
                min={30}
                max={300}
                step={0.1}
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Ex. 74,5"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Ajouter
            </button>
            {error && <p className="weight-error">{error}</p>}
          </form>

          {entries.length > 0 && (
            <div className="weight-table-wrap">
              <table className="weight-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Poids</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().slice(0, 6).map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {new Date(entry.recordedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td>{entry.weightKg.toLocaleString('fr-FR')} kg</td>
                      <td>
                        <button
                          type="button"
                          className="weight-delete"
                          onClick={() => onDelete(entry.id)}
                          aria-label={`Supprimer la pesée du ${new Date(
                            entry.recordedAt,
                          ).toLocaleDateString('fr-FR')}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
