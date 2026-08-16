import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { intlLocale } from '../i18n/messages';
import {
  aiErrorCode,
  aiErrorMessage,
  analyzeMealAi,
  type AnalyzedMeal,
} from '../lib/ai';
import { loadSettings } from '../lib/calories';
import {
  compareDayIntake,
  isNutritionProfileComplete,
  NUTRITION_GOALS,
  resolveDailyTargets,
  sumDayMacros,
} from '../lib/nutritionGoals';
import { addMeal, deleteMeal, mealsOfDay, saveProfile } from '../lib/storage';
import { useAppData } from '../lib/useAppData';
import type { MessageKey } from '../i18n/messages';
import type { NutritionGoal } from '../types';

/** Titre déduit de l'heure du repas, indépendant de la langue. */
function mealTimeKey(eatenAt: string): MessageKey {
  const hour = new Date(eatenAt).getHours();
  if (hour >= 5 && hour < 11) return 'nutrition.meal.breakfast';
  if (hour >= 11 && hour < 15) return 'nutrition.meal.lunch';
  if (hour >= 18 && hour < 23) return 'nutrition.meal.dinner';
  return 'nutrition.meal.snack';
}

export function Nutrition() {
  const { locale, t } = useI18n();
  const [data, setData] = useAppData();
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzedMeal | null>(null);
  const [goal, setGoal] = useState<NutritionGoal | ''>(
    data.profile?.goal ?? '',
  );
  const [sessionsPerWeek, setSessionsPerWeek] = useState(
    data.profile?.sessionsPerWeek ? String(data.profile.sessionsPerWeek) : '3',
  );
  const [configError, setConfigError] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    setGoal(data.profile?.goal ?? '');
    setSessionsPerWeek(
      data.profile?.sessionsPerWeek
        ? String(data.profile.sessionsPerWeek)
        : '3',
    );
  }, [data.profile]);

  const bodyWeightKg = loadSettings().bodyWeightKg;
  const todayMeals = useMemo(() => mealsOfDay(data.meals), [data.meals]);
  const totals = useMemo(() => sumDayMacros(todayMeals), [todayMeals]);
  const profileComplete = isNutritionProfileComplete(data.profile, bodyWeightKg);
  const targets = useMemo(
    () => resolveDailyTargets(data.profile, bodyWeightKg),
    [data.profile, bodyWeightKg],
  );
  const comparison = useMemo(
    () => (targets ? compareDayIntake(todayMeals, targets) : null),
    [todayMeals, targets],
  );

  const numberFormat = new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 0,
  });
  const gramsFormat = new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 1,
  });
  const timeFormat = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });

  async function analyze() {
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await analyzeMealAi(description.trim(), locale);
      setAnalysis(result.meal);
    } catch (reason) {
      setErrorCode(aiErrorCode(reason));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!analysis) return;
    setData(
      addMeal({
        label: analysis.label,
        kcal: analysis.kcal,
        proteinG: analysis.proteinG,
        carbsG: analysis.carbsG,
        fatG: analysis.fatG,
        items: analysis.items,
        eatenAt: new Date().toISOString(),
      }),
    );
    setAnalysis(null);
    setDescription('');
  }

  function remove(id: string) {
    setData(deleteMeal(id));
  }

  function saveNutritionConfig(event: React.FormEvent) {
    event.preventDefault();
    const sessions = Number(sessionsPerWeek);
    if (
      !goal ||
      !Number.isInteger(sessions) ||
      sessions < 1 ||
      sessions > 7
    ) {
      setConfigError(true);
      setConfigSaved(false);
      return;
    }
    if (!data.profile?.firstName || !data.profile?.lastName) {
      setConfigError(true);
      setConfigSaved(false);
      return;
    }
    setData(
      saveProfile({
        ...data.profile,
        goal,
        sessionsPerWeek: sessions,
      }),
    );
    setConfigError(false);
    setConfigSaved(true);
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{t('nutrition.title')}</h1>
          <p>{t('nutrition.subtitle')}</p>
        </div>
      </header>

      <section className="panel nutrition-global">
        <div className="sheet-head">
          <div>
            <h2>{t('nutrition.globalTitle')}</h2>
            <p className="muted">{t('nutrition.globalHint')}</p>
          </div>
          {goal && (
            <strong className="nutrition-global-badge">
              {t(`ai.goal.${goal}`)}
            </strong>
          )}
        </div>

        <form className="ai-fields nutrition-config" onSubmit={saveNutritionConfig}>
          <div className="field">
            <label htmlFor="nutrition-goal">{t('nutrition.goalGlobal')}</label>
            <select
              id="nutrition-goal"
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value as NutritionGoal | '');
                setConfigSaved(false);
                setConfigError(false);
              }}
            >
              <option value="">{t('account.sexUnset')}</option>
              {NUTRITION_GOALS.map((value) => (
                <option key={value} value={value}>
                  {t(`ai.goal.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nutrition-sessions">
              {t('nutrition.sessionsPerWeek')}
            </label>
            <input
              id="nutrition-sessions"
              type="number"
              min={1}
              max={7}
              value={sessionsPerWeek}
              onChange={(event) => {
                setSessionsPerWeek(event.target.value);
                setConfigSaved(false);
                setConfigError(false);
              }}
            />
          </div>
          <div className="row-actions nutrition-config-actions">
            <button type="submit" className="btn btn-secondary btn-sm">
              {t('nutrition.saveConfig')}
            </button>
            {!profileComplete && (
              <Link to="/compte" className="btn btn-ghost btn-sm">
                {t('nutrition.completeProfile')}
              </Link>
            )}
          </div>
        </form>

        {targets && profileComplete && (
          <p className="muted nutrition-targets-hint">
            {t('nutrition.targetsTitle')} :{' '}
            {t('nutrition.targetsKcal', {
              kcal: numberFormat.format(targets.kcal),
            })}{' '}
            ·{' '}
            {t('nutrition.targetsProtein', {
              protein: numberFormat.format(targets.proteinG),
            })}
          </p>
        )}

        {configError && (
          <p className="exchange-error">{t('nutrition.configInvalid')}</p>
        )}
        {configSaved && !configError && (
          <p className="muted">{t('nutrition.configSaved')}</p>
        )}
      </section>

      <section className="panel nutrition-goal">
        <div className="sheet-head">
          <div>
            <h2>{t('nutrition.goalTitle')}</h2>
            <p className="muted">
              {targets
                ? t('nutrition.goalProgress', {
                    consumed: numberFormat.format(totals.kcal),
                    goal: numberFormat.format(targets.kcal),
                  })
                : t('nutrition.goalHint')}
            </p>
          </div>
          {targets && (
            <strong className="meal-kcal">
              {numberFormat.format(targets.kcal)} {t('units.kcal')}
            </strong>
          )}
        </div>

        {comparison && targets ? (
          <>
            <div
              className="goal-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={targets.kcal}
              aria-valuenow={totals.kcal}
              aria-label={t('nutrition.goalTitle')}
            >
              <span
                className={comparison.kcal.over ? 'goal-bar over' : 'goal-bar'}
                style={{ width: `${comparison.kcal.percent}%` }}
              />
            </div>
            <p
              className={
                comparison.kcal.over ? 'goal-status over' : 'goal-status'
              }
            >
              {comparison.kcal.delta > 0
                ? t('nutrition.goalRemaining', {
                    count: numberFormat.format(comparison.kcal.delta),
                  })
                : comparison.kcal.delta < 0
                  ? t('nutrition.goalExceeded', {
                      count: numberFormat.format(-comparison.kcal.delta),
                    })
                  : t('nutrition.goalReached')}
            </p>

            <div className="goal-macro-block">
              <div className="sheet-head sheet-head-sm">
                <p className="muted">
                  {t('nutrition.proteinProgress', {
                    consumed: gramsFormat.format(totals.proteinG),
                    goal: numberFormat.format(targets.proteinG),
                  })}
                </p>
                <strong>
                  {numberFormat.format(targets.proteinG)} {t('units.g')}
                </strong>
              </div>
              <div
                className="goal-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={targets.proteinG}
                aria-valuenow={totals.proteinG}
                aria-label={t('nutrition.protein')}
              >
                <span
                  className={
                    comparison.protein.over
                      ? 'goal-bar over'
                      : 'goal-bar goal-bar-protein'
                  }
                  style={{ width: `${comparison.protein.percent}%` }}
                />
              </div>
              <p
                className={
                  comparison.protein.over ? 'goal-status over' : 'goal-status'
                }
              >
                {comparison.protein.delta > 0
                  ? t('nutrition.proteinRemaining', {
                      count: gramsFormat.format(comparison.protein.delta),
                    })
                  : comparison.protein.delta < 0
                    ? t('nutrition.proteinExceeded', {
                        count: gramsFormat.format(-comparison.protein.delta),
                      })
                    : t('nutrition.proteinReached')}
              </p>
            </div>
          </>
        ) : (
          <p className="goal-status">{t('nutrition.profileIncomplete')}</p>
        )}
      </section>

      <section className="panel">
        <div className="field">
          <label htmlFor="meal-description">{t('nutrition.describe')}</label>
          <textarea
            id="meal-description"
            rows={3}
            maxLength={600}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setErrorCode(null);
            }}
            placeholder={t('nutrition.placeholder')}
          />
        </div>

        {errorCode && (
          <p className="exchange-error">{aiErrorMessage(errorCode, t)}</p>
        )}

        <div className="row-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || description.trim().length < 3}
            onClick={() => void analyze()}
          >
            {busy ? t('nutrition.analyzing') : t('nutrition.analyze')}
          </button>
        </div>
      </section>

      {analysis && (
        <section className="panel meal-analysis">
          <div className="sheet-head">
            <div>
              <h2>{analysis.label}</h2>
              <p className="muted">{t('nutrition.estimateHint')}</p>
            </div>
            <strong className="meal-kcal">
              {numberFormat.format(analysis.kcal)} {t('units.kcal')}
            </strong>
          </div>

          <ul className="meal-items">
            {analysis.items.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <span>{item.name}</span>
                <span className="muted">
                  {t('nutrition.itemQuantity', {
                    quantity: item.quantity,
                    kcal: numberFormat.format(item.kcal),
                  })}
                </span>
              </li>
            ))}
          </ul>

          <p className="meal-macros">
            {t('nutrition.protein')} {gramsFormat.format(analysis.proteinG)}
            {t('units.g')} · {t('nutrition.carbs')}{' '}
            {gramsFormat.format(analysis.carbsG)}
            {t('units.g')} · {t('nutrition.fat')}{' '}
            {gramsFormat.format(analysis.fatG)}
            {t('units.g')}
          </p>

          <div className="row-actions">
            <button type="button" className="btn btn-primary" onClick={save}>
              {t('nutrition.add')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAnalysis(null)}
            >
              {t('nutrition.discard')}
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="sheet-head">
          <div>
            <h2>{t('nutrition.today')}</h2>
            <p className="muted">
              {t(
                todayMeals.length === 1
                  ? 'nutrition.mealsCount'
                  : 'nutrition.mealsCount_plural',
                { count: todayMeals.length },
              )}
            </p>
          </div>
          <strong className="meal-kcal">
            {numberFormat.format(totals.kcal)} {t('units.kcal')}
          </strong>
        </div>

        {todayMeals.length === 0 ? (
          <p className="empty">{t('nutrition.empty')}</p>
        ) : (
          <>
            <ul className="meal-log">
              {todayMeals.map((meal) => (
                <li key={meal.id}>
                  <div>
                    <strong>{t(mealTimeKey(meal.eatenAt))}</strong>
                    <span className="muted">
                      {' '}
                      · {timeFormat.format(new Date(meal.eatenAt))}
                    </span>
                    <div className="meal-log-label">{meal.label}</div>
                    <div className="muted meal-macros">
                      {numberFormat.format(meal.kcal)} {t('units.kcal')} ·{' '}
                      {t('nutrition.protein')}{' '}
                      {gramsFormat.format(meal.proteinG)}
                      {t('units.g')} · {t('nutrition.carbs')}{' '}
                      {gramsFormat.format(meal.carbsG)}
                      {t('units.g')} · {t('nutrition.fat')}{' '}
                      {gramsFormat.format(meal.fatG)}
                      {t('units.g')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={t('nutrition.deleteMeal', {
                      label: meal.label,
                    })}
                    onClick={() => remove(meal.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <p className="muted">
              {t('nutrition.total')} : {t('nutrition.protein')}{' '}
              {gramsFormat.format(totals.proteinG)}
              {t('units.g')} · {t('nutrition.carbs')}{' '}
              {gramsFormat.format(totals.carbsG)}
              {t('units.g')} · {t('nutrition.fat')}{' '}
              {gramsFormat.format(totals.fatG)}
              {t('units.g')}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
