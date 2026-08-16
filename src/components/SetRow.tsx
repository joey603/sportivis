import { useI18n } from '../i18n/I18nContext';
import { intlLocale } from '../i18n/messages';
import type { SetLog, TrackingType } from '../types';

type Props = {
  set: SetLog;
  tracking: TrackingType;
  calories: number;
  active?: boolean;
  onChange: (next: SetLog) => void;
  onComplete: () => void;
};

export function SetRow({
  set,
  tracking,
  calories,
  active,
  onChange,
  onComplete,
}: Props) {
  const { locale, t } = useI18n();
  const caloriesLabel = calories.toLocaleString(intlLocale(locale), {
    maximumFractionDigits: 1,
  });

  return (
    <div
      className={`set-row ${set.completed ? 'done' : ''} ${active ? 'active' : ''}`}
    >
      <span className="mono muted">{set.setIndex + 1}</span>
      {tracking === 'reps' && (
        <>
          <input
            type="number"
            inputMode="decimal"
            placeholder={t('workout.kg')}
            value={set.weightKg ?? ''}
            disabled={set.completed}
            onChange={(e) =>
              onChange({
                ...set,
                weightKg: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            aria-label={t('workout.ariaKg')}
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder={t('workout.reps')}
            value={set.reps ?? ''}
            disabled={set.completed}
            onChange={(e) =>
              onChange({
                ...set,
                reps: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            aria-label={t('workout.ariaReps')}
          />
        </>
      )}
      {tracking === 'duration' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={t('workout.sec')}
          value={set.durationSec ?? ''}
          disabled={set.completed}
          style={{ gridColumn: 'span 2' }}
          onChange={(e) =>
            onChange({
              ...set,
              durationSec: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          aria-label={t('workout.ariaDuration')}
        />
      )}
      {tracking === 'distance' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={t('workout.meters')}
          value={set.distanceM ?? ''}
          disabled={set.completed}
          style={{ gridColumn: 'span 2' }}
          onChange={(e) =>
            onChange({
              ...set,
              distanceM: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          aria-label={t('workout.ariaDistance')}
        />
      )}
      <div className="check-wrap">
        <span
          className="set-calories"
          aria-label={t('workout.caloriesAria', { count: caloriesLabel })}
        >
          {t('workout.caloriesValue', { count: caloriesLabel })}
        </span>
        <button
          type="button"
          className={`check-btn ${set.completed ? 'on' : ''}`}
          onClick={onComplete}
          aria-label={
            set.completed ? t('workout.setDone') : t('workout.setValidate')
          }
        >
          {set.completed ? '✓' : ''}
        </button>
      </div>
    </div>
  );
}
