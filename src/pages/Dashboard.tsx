import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NutritionTrend } from '../components/NutritionTrend';
import { useI18n } from '../i18n/I18nContext';
import { intlLocale } from '../i18n/messages';
import {
  clearSettings,
  loadSettings,
  saveBodyWeightKg,
  sessionCaloriesKcal,
} from '../lib/calories';
import {
  compareIntake,
  dailyMacroSeries,
  resolveDailyTargets,
  scaleTargets,
} from '../lib/nutritionGoals';
import {
  addMeal,
  addWeightEntry,
  deleteWeightEntry,
  sessionDurationMin,
  sessionVolumeKg,
} from '../lib/storage';
import { useAppData } from '../lib/useAppData';
import type { Locale, MessageKey } from '../i18n/messages';
import type { DailyTargets, DayComparison } from '../lib/nutritionGoals';
import type { AppData, WeightEntry } from '../types';

const DAY_LABELS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAY_LABELS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

type StatPeriod = 'day' | 'week' | 'month';

/** Fenêtres glissantes terminant aujourd'hui. */
const PERIOD_DAYS: Record<StatPeriod, number> = { day: 1, week: 7, month: 30 };
const STAT_PERIODS: StatPeriod[] = ['day', 'week', 'month'];

type PeriodStat = {
  period: StatPeriod;
  sessions: number;
  minutes: number;
  burnedKcal: number;
  kcal: number;
  proteinG: number;
  targets: DailyTargets | null;
  intake: DayComparison | null;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatSessionDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function Dashboard() {
  const { t, locale } = useI18n();
  const [data, setData] = useAppData();
  const [newWeight, setNewWeight] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const settings = loadSettings();
  const bodyWeightKg = settings.bodyWeightKg;
  const dayLabels = locale === 'he' ? DAY_LABELS_HE : DAY_LABELS_FR;
  const numberLocale = intlLocale(locale);

  const targets = useMemo(
    () => resolveDailyTargets(data.profile, bodyWeightKg),
    [data.profile, bodyWeightKg],
  );

  const periodStats = useMemo<PeriodStat[]>(() => {
    const finished = data.sessions.filter((session) => session.endedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return STAT_PERIODS.map((period) => {
      const length = PERIOD_DAYS[period];
      const from = new Date(today);
      from.setDate(today.getDate() - (length - 1));
      const sessions = finished.filter(
        (session) => new Date(session.startedAt) >= from,
      );
      const macros = dailyMacroSeries(data.meals, length).reduce(
        (total, day) => ({
          kcal: total.kcal + day.totals.kcal,
          proteinG: total.proteinG + day.totals.proteinG,
        }),
        { kcal: 0, proteinG: 0 },
      );
      const periodTargets = targets ? scaleTargets(targets, length) : null;

      return {
        period,
        sessions: sessions.length,
        minutes: sessions.reduce(
          (total, session) => total + (sessionDurationMin(session) ?? 0),
          0,
        ),
        burnedKcal: sessions.reduce(
          (total, session) =>
            total + sessionCaloriesKcal(session, bodyWeightKg),
          0,
        ),
        kcal: macros.kcal,
        proteinG: macros.proteinG,
        targets: periodTargets,
        intake: periodTargets ? compareIntake(macros, periodTargets) : null,
      };
    });
  }, [data.sessions, data.meals, targets, bodyWeightKg]);

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
        label: dayLabels[date.getDay()],
        date: date.getDate(),
        sessions: 0,
      };
    });

    for (const session of sessions) {
      const day = days.find((item) => item.key === dayKey(new Date(session.startedAt)));
      if (day) day.sessions += 1;
    }

    return {
      sessions,
      days,
      weekCount: days.reduce((total, day) => total + day.sessions, 0),
    };
  }, [data.sessions, dayLabels]);

  const lastSession = summary.sessions[0];
  const maxDaySessions = Math.max(1, ...summary.days.map((day) => day.sessions));

  function recordWeight(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      setWeightError(t('account.weightInvalid'));
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
          <p className="dashboard-kicker">{t('dashboard.kicker')}</p>
          <h1>
            {data.profile?.firstName
              ? t('dashboard.hello', { name: data.profile.firstName })
              : t('dashboard.title')}
          </h1>
          <p className="muted">{t('dashboard.lead')}</p>
          <div className="dashboard-global-goal">
            <span>{t('dashboard.globalGoal')}</span>
            <Link to="/nutrition">
              {data.profile?.goal
                ? t(`ai.goal.${data.profile.goal}`)
                : t('dashboard.globalGoalUnset')}
            </Link>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/programmes" className="btn btn-secondary">
            {t('dashboard.managePrograms')}
          </Link>
          <Link to="/nutrition" className="btn btn-secondary">
            {t('dashboard.manageNutrition')}
          </Link>
        </div>
      </header>

      <DashboardCarousel
        label={t('dashboard.periodStats')}
        slides={periodStats.map((stat) => ({
          id: stat.period,
          label: t(`dashboard.period.${stat.period}`),
          content: (
            <PeriodStatCards
              stat={stat}
              onAddProtein={(grams) => setData(addManualProteinMeal(grams, t))}
            />
          ),
        }))}
      />

      <DashboardCarousel
        label={t('dashboard.carousel')}
        slides={[
          {
            id: 'overview',
            label: t('dashboard.sessions'),
            content: (
              <div className="dashboard-grid">
                <section className="panel dashboard-activity">
                  <div className="dashboard-section-title">
                    <div>
                      <h2>{t('dashboard.activity')}</h2>
                      <p className="muted">{t('dashboard.week')}</p>
                    </div>
                    <strong>{summary.weekCount}</strong>
                  </div>
                  <div
                    className="activity-chart"
                    aria-label={t('dashboard.activityChart')}
                  >
                    {summary.days.map((day) => (
                      <div
                        className="activity-day"
                        key={day.key}
                        title={t(
                          day.sessions > 1
                            ? 'dashboard.daySessions_plural'
                            : 'dashboard.daySessions',
                          { count: day.sessions },
                        )}
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
                      <h2>{t('dashboard.lastSession')}</h2>
                      <p className="muted">{t('dashboard.noSession')}</p>
                    </div>
                  </div>
                  {lastSession ? (
                    <>
                      <h3>{lastSession.programName}</h3>
                      <p className="muted dashboard-last-date">
                        {formatSessionDate(lastSession.startedAt, locale)}
                      </p>
                      <div className="dashboard-last-metrics">
                        <div>
                          <strong>{sessionDurationMin(lastSession) ?? 0}</strong>
                          <span>{t('units.min')}</span>
                        </div>
                        <div>
                          <strong>
                            {sessionCaloriesKcal(
                              lastSession,
                              bodyWeightKg,
                            ).toLocaleString(numberLocale)}
                          </strong>
                          <span>{t('units.kcal')}</span>
                        </div>
                        <div>
                          <strong>
                            {Math.round(
                              sessionVolumeKg(lastSession),
                            ).toLocaleString(numberLocale)}
                          </strong>
                          <span>{t('weight.kg')}</span>
                        </div>
                      </div>
                      <Link to="/historique" className="btn btn-ghost btn-sm">
                        {t('nav.history')}
                      </Link>
                    </>
                  ) : (
                    <p className="empty dashboard-empty">
                      {t('dashboard.noSession')}
                    </p>
                  )}
                </section>
              </div>
            ),
          },
          {
            id: 'weight',
            label: t('dashboard.weight'),
            content: (
              <div className="tracking-grid">
                <section className="panel weight-tracker">
                  <div className="dashboard-section-title">
                    <div>
                      <h2>{t('dashboard.weightTracking')}</h2>
                      <p className="muted">{t('dashboard.weightHint')}</p>
                    </div>
                    {data.weightEntries.at(-1) && (
                      <strong>
                        {data.weightEntries
                          .at(-1)
                          ?.weightKg.toLocaleString(numberLocale)}{' '}
                        {t('weight.kg')}
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

                <NutritionTrend meals={data.meals} targets={targets} />
              </div>
            ),
          },
        ]}
      />

      <section className="dashboard-programs">
        <div className="dashboard-section-title">
          <div>
            <h2>{t('dashboard.programs')}</h2>
            <p className="muted">{t('programs.subtitle')}</p>
          </div>
          <Link to="/programmes" className="btn btn-ghost btn-sm">
            {t('nav.programs')}
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
                  {t(
                    program.exercises.length > 1
                      ? 'programs.exerciseCount_plural'
                      : 'programs.exerciseCount',
                    { count: program.exercises.length },
                  )}
                  {program.description ? ` · ${program.description}` : ''}
                </p>
                <div className="row-actions">
                  <Link
                    to={`/seance/${program.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    {t('dashboard.launch')}
                  </Link>
                  <Link
                    to={`/programmes/${program.id}`}
                    className="btn btn-ghost btn-sm"
                  >
                    {t('dashboard.edit')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel dashboard-empty">
            <h3>{t('programs.empty')}</h3>
            <p className="muted">{t('programs.subtitle')}</p>
            <Link to="/programmes/nouveau" className="btn btn-primary">
              {t('common.create')}
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

function DashboardCarousel({
  slides,
  label,
}: {
  slides: Slide[];
  label: string;
}) {
  const { t } = useI18n();
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
      aria-label={label}
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
            aria-label={t('dashboard.showSlide', { label: slide.label })}
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

function PeriodStatCards({
  stat,
  onAddProtein,
}: {
  stat: PeriodStat;
  onAddProtein: (grams: number) => void;
}) {
  const { locale, t } = useI18n();
  const numberLocale = intlLocale(locale);
  const [proteinFormOpen, setProteinFormOpen] = useState(false);
  const [proteinGrams, setProteinGrams] = useState('');
  const [proteinError, setProteinError] = useState(false);

  function submitProtein(event: React.FormEvent) {
    event.preventDefault();
    const grams = Number(proteinGrams.replace(',', '.'));
    if (!Number.isFinite(grams) || grams <= 0 || grams > 200) {
      setProteinError(true);
      return;
    }
    onAddProtein(Math.round(grams * 10) / 10);
    setProteinGrams('');
    setProteinError(false);
    setProteinFormOpen(false);
  }

  return (
    <section
      className="dashboard-stats"
      aria-label={t(`dashboard.periodTitle.${stat.period}`)}
    >
      <article className="dashboard-stat">
        <span>{t(`dashboard.periodTitle.${stat.period}`)}</span>
        <strong>{stat.sessions}</strong>
        <small>{t('dashboard.sessions').toLowerCase()}</small>
      </article>
      <article className="dashboard-stat">
        <span>{t('dashboard.totalTime')}</span>
        <strong>{stat.minutes}</strong>
        <small>{t('dashboard.totalTimeHint')}</small>
      </article>
      <article className="dashboard-stat">
        <span>{t('dashboard.burned')}</span>
        <strong>
          {Math.round(stat.burnedKcal).toLocaleString(numberLocale)}
        </strong>
        <small>{t('dashboard.burnedHint')}</small>
      </article>
      <article className="dashboard-stat">
        <span>{t(`dashboard.periodIntake.${stat.period}`)}</span>
        {stat.intake && stat.targets ? (
          <>
            <strong>
              {t('dashboard.intakeProgress', {
                consumed: Math.round(stat.kcal).toLocaleString(numberLocale),
                goal: stat.targets.kcal.toLocaleString(numberLocale),
              })}
            </strong>
            <small>{t('units.kcal')}</small>
            <div className="goal-track goal-track-sm">
              <span
                className={stat.intake.kcal.over ? 'goal-bar over' : 'goal-bar'}
                style={{ width: `${stat.intake.kcal.percent}%` }}
              />
            </div>
            <span className="dashboard-stat-protein">
              {t('dashboard.intakeProteinProgress', {
                consumed: Math.round(stat.proteinG).toLocaleString(numberLocale),
                goal: stat.targets.proteinG.toLocaleString(numberLocale),
              })}
            </span>
            <div className="goal-track goal-track-sm">
              <span
                className={
                  stat.intake.protein.over
                    ? 'goal-bar over'
                    : 'goal-bar goal-bar-protein'
                }
                style={{ width: `${stat.intake.protein.percent}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <strong>
              {t('dashboard.intakeProgress', {
                consumed: Math.round(stat.kcal).toLocaleString(numberLocale),
                goal: '—',
              })}
            </strong>
            <small>{t('dashboard.intakeIncomplete')}</small>
            <Link to="/nutrition" className="dashboard-stat-link">
              {t('dashboard.intakeSetGoal')}
            </Link>
          </>
        )}

        {!proteinFormOpen ? (
          <button
            type="button"
            className="btn btn-protein btn-sm dashboard-add-protein"
            onClick={() => {
              setProteinFormOpen(true);
              setProteinError(false);
            }}
          >
            {t('nutrition.addProtein')}
          </button>
        ) : (
          <form className="dashboard-protein-form" onSubmit={submitProtein}>
            <input
              type="number"
              min={1}
              max={200}
              step={0.5}
              autoFocus
              value={proteinGrams}
              onChange={(event) => {
                setProteinGrams(event.target.value);
                setProteinError(false);
              }}
              placeholder={t('nutrition.addProteinPlaceholder')}
              aria-label={t('nutrition.addProteinAmount')}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              {t('nutrition.addProteinConfirm')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setProteinFormOpen(false);
                setProteinGrams('');
                setProteinError(false);
              }}
            >
              {t('common.cancel')}
            </button>
            {proteinError && (
              <p className="exchange-error">{t('nutrition.addProteinInvalid')}</p>
            )}
          </form>
        )}
      </article>
    </section>
  );
}

/** Entrée journaliere minimale : protéines saisies à la main. */
function addManualProteinMeal(
  proteinG: number,
  t: (key: MessageKey) => string,
): AppData {
  const kcal = Math.round(proteinG * 4);
  return addMeal({
    label: t('nutrition.manualProteinLabel'),
    kcal,
    proteinG,
    carbsG: 0,
    fatG: 0,
    items: [
      {
        name: t('nutrition.manualProteinLabel'),
        quantity: `${proteinG} g`,
        kcal,
        proteinG,
        carbsG: 0,
        fatG: 0,
      },
    ],
    eatenAt: new Date().toISOString(),
  });
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
  const { locale, t } = useI18n();
  const numberLocale = intlLocale(locale);
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
              aria-label={t('weight.chart')}
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
                    {entry.weightKg.toLocaleString(numberLocale)}
                  </text>
                  <text
                    x={x}
                    y={box.height - 10}
                    className="weight-date"
                  >
                    {new Date(entry.recordedAt).toLocaleDateString(numberLocale, {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <p className="empty">{t('weight.emptyChart')}</p>
          )}
        </div>

        <div className="weight-side">
          <form className="weight-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="dashboard-weight">{t('weight.today')}</label>
              <input
                id="dashboard-weight"
                type="number"
                min={30}
                max={300}
                step={0.1}
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder={t('weight.placeholder')}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              {t('weight.add')}
            </button>
            {error && <p className="weight-error">{error}</p>}
          </form>

          {entries.length > 0 && (
            <div className="weight-table-wrap">
              <table className="weight-table">
                <thead>
                  <tr>
                    <th>{t('weight.date')}</th>
                    <th>{t('weight.value')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().slice(0, 6).map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {new Date(entry.recordedAt).toLocaleDateString(
                          numberLocale,
                          { day: '2-digit', month: 'short' },
                        )}
                      </td>
                      <td>
                        {entry.weightKg.toLocaleString(numberLocale)}{' '}
                        {t('weight.kg')}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="weight-delete"
                          onClick={() => onDelete(entry.id)}
                          aria-label={t('weight.deleteEntry', {
                            date: new Date(
                              entry.recordedAt,
                            ).toLocaleDateString(numberLocale),
                          })}
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
