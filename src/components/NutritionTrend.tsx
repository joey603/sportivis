import { useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { intlLocale } from '../i18n/messages';
import { dailyMacroSeries } from '../lib/nutritionGoals';
import type { DailyTargets } from '../lib/nutritionGoals';
import type { Meal } from '../types';

const TREND_DAYS = 7;

/**
 * Marge au-dessus de la cible : une journée à 100 % occupe deux tiers de la
 * hauteur, ce qui laisse voir les dépassements sans tronquer la barre.
 */
const HEADROOM = 1.5;

export function NutritionTrend({
  meals,
  targets,
}: {
  meals: Meal[];
  targets: DailyTargets | null;
}) {
  const { locale, t } = useI18n();
  const numberLocale = intlLocale(locale);
  const days = useMemo(() => dailyMacroSeries(meals, TREND_DAYS), [meals]);

  const numberFormat = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  });
  const dayFormat = new Intl.DateTimeFormat(numberLocale, { weekday: 'narrow' });
  const fullDayFormat = new Intl.DateTimeFormat(numberLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const trackedDays = days.filter((day) => day.meals.length > 0);
  const averageKcal = trackedDays.length
    ? trackedDays.reduce((total, day) => total + day.totals.kcal, 0) /
      trackedDays.length
    : 0;
  const averageProtein = trackedDays.length
    ? trackedDays.reduce((total, day) => total + day.totals.proteinG, 0) /
      trackedDays.length
    : 0;

  // Sans cible calculée, chaque série est ramenée à son propre maximum.
  const kcalRef =
    targets?.kcal ?? Math.max(1, ...days.map((day) => day.totals.kcal));
  const proteinRef =
    targets?.proteinG ?? Math.max(1, ...days.map((day) => day.totals.proteinG));
  const headroom = targets ? HEADROOM : 1;
  const targetLine = 100 / headroom;

  function barHeight(value: number, reference: number): number {
    if (value <= 0) return 0;
    return Math.max(3, Math.min(100, (value / (reference * headroom)) * 100));
  }

  return (
    <section className="panel nutrition-trend">
      <div className="dashboard-section-title">
        <div>
          <h2>{t('dashboard.nutritionTrend')}</h2>
          <p className="muted">
            {t('dashboard.nutritionTrendHint', { count: TREND_DAYS })}
          </p>
        </div>
      </div>

      {trackedDays.length === 0 ? (
        <p className="empty">{t('dashboard.nutritionTrendEmpty')}</p>
      ) : (
        <>
          <div
            className="nutrition-chart"
            role="img"
            aria-label={t('dashboard.nutritionTrendChart', {
              count: TREND_DAYS,
            })}
          >
            {days.map((day) => (
              <div
                className="nutrition-day"
                key={day.key}
                title={`${fullDayFormat.format(day.date)} · ${numberFormat.format(
                  day.totals.kcal,
                )} ${t('units.kcal')} · ${numberFormat.format(
                  day.totals.proteinG,
                )} ${t('units.g')}`}
              >
                <div className="nutrition-bars">
                  {targets && (
                    <span
                      className="nutrition-target"
                      style={{ bottom: `${targetLine}%` }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      targets && day.totals.kcal > targets.kcal
                        ? 'nutrition-bar kcal over'
                        : 'nutrition-bar kcal'
                    }
                    style={{ height: `${barHeight(day.totals.kcal, kcalRef)}%` }}
                  />
                  <span
                    className="nutrition-bar protein"
                    style={{
                      height: `${barHeight(day.totals.proteinG, proteinRef)}%`,
                    }}
                  />
                </div>
                <span className="nutrition-day-label">
                  {dayFormat.format(day.date)}
                </span>
              </div>
            ))}
          </div>

          <div className="nutrition-legend">
            <span className="nutrition-legend-item kcal">
              {t('units.kcal')}
            </span>
            <span className="nutrition-legend-item protein">
              {t('nutrition.protein')}
            </span>
            {targets && (
              <span className="nutrition-legend-item target">
                {t('dashboard.nutritionTrendTarget')}
              </span>
            )}
          </div>

          <p className="muted nutrition-trend-average">
            {t('dashboard.nutritionTrendAverage', {
              kcal: numberFormat.format(averageKcal),
              protein: numberFormat.format(averageProtein),
            })}
          </p>
        </>
      )}
    </section>
  );
}
