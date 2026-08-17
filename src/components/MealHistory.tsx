import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { intlLocale } from '../i18n/messages';
import { groupMealsByMonth } from '../lib/nutritionGoals';
import type { DailyTargets } from '../lib/nutritionGoals';
import type { Meal } from '../types';

export function MealHistory({
  meals,
  targets,
  onClose,
}: {
  meals: Meal[];
  targets: DailyTargets | null;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const numberLocale = intlLocale(locale);
  const months = useMemo(() => groupMealsByMonth(meals), [meals]);
  const [openDays, setOpenDays] = useState<string[]>([]);

  function toggleDay(key: string) {
    setOpenDays((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const numberFormat = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  });
  const monthFormat = new Intl.DateTimeFormat(numberLocale, {
    month: 'long',
    year: 'numeric',
  });
  const dayFormat = new Intl.DateTimeFormat(numberLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeFormat = new Intl.DateTimeFormat(numberLocale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('nutrition.historyTitle')}
      >
        <div className="sheet-head">
          <div>
            <h2>{t('nutrition.historyTitle')}</h2>
            <p className="muted">{t('nutrition.historyLead')}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        {months.length === 0 ? (
          <p className="empty">{t('nutrition.historyEmpty')}</p>
        ) : (
          months.map((month) => (
            <section className="history-month" key={month.key}>
              <div className="history-month-head">
                <h3>{monthFormat.format(month.date)}</h3>
                <span>
                  {t('nutrition.historyMonthTotal', {
                    kcal: numberFormat.format(month.totals.kcal),
                    protein: numberFormat.format(month.totals.proteinG),
                    days: month.days.length,
                  })}
                </span>
              </div>

              {month.days.map((day) => {
                const open = openDays.includes(day.key);
                return (
                  <article className="history-day" key={day.key}>
                    <button
                      type="button"
                      className="history-day-head"
                      onClick={() => toggleDay(day.key)}
                      aria-expanded={open}
                    >
                      <span className="history-day-chevron" aria-hidden="true">
                        {open ? '▾' : '▸'}
                      </span>
                      <strong>{dayFormat.format(day.date)}</strong>
                      <span className="history-day-total">
                        {targets
                          ? t('nutrition.historyDayTotalGoal', {
                              kcal: numberFormat.format(day.totals.kcal),
                              kcalGoal: numberFormat.format(targets.kcal),
                              protein: numberFormat.format(day.totals.proteinG),
                              proteinGoal: numberFormat.format(
                                targets.proteinG,
                              ),
                            })
                          : t('nutrition.historyDayTotal', {
                              kcal: numberFormat.format(day.totals.kcal),
                              protein: numberFormat.format(day.totals.proteinG),
                            })}
                      </span>
                    </button>

                    {open && (
                      <ul className="history-meals">
                        {day.meals.map((meal) => (
                          <li key={meal.id}>
                            <span className="history-meal-time">
                              {timeFormat.format(new Date(meal.eatenAt))}
                            </span>
                            <span className="history-meal-label">
                              {meal.label}
                            </span>
                            <span className="history-meal-macros">
                              {numberFormat.format(meal.kcal)} {t('units.kcal')}{' '}
                              · {numberFormat.format(meal.proteinG)}{' '}
                              {t('units.g')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
