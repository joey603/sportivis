import type { SetLog, TrackingType } from '../types';

type Props = {
  set: SetLog;
  tracking: TrackingType;
  active?: boolean;
  onChange: (next: SetLog) => void;
  onComplete: () => void;
};

export function SetRow({
  set,
  tracking,
  active,
  onChange,
  onComplete,
}: Props) {
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
            placeholder="kg"
            value={set.weightKg ?? ''}
            disabled={set.completed}
            onChange={(e) =>
              onChange({
                ...set,
                weightKg: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            aria-label="Charge kg"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="reps"
            value={set.reps ?? ''}
            disabled={set.completed}
            onChange={(e) =>
              onChange({
                ...set,
                reps: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            aria-label="Répétitions"
          />
        </>
      )}
      {tracking === 'duration' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="sec"
          value={set.durationSec ?? ''}
          disabled={set.completed}
          style={{ gridColumn: 'span 2' }}
          onChange={(e) =>
            onChange({
              ...set,
              durationSec: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          aria-label="Durée secondes"
        />
      )}
      {tracking === 'distance' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="mètres"
          value={set.distanceM ?? ''}
          disabled={set.completed}
          style={{ gridColumn: 'span 2' }}
          onChange={(e) =>
            onChange({
              ...set,
              distanceM: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          aria-label="Distance mètres"
        />
      )}
      <div className="check-wrap">
        <button
          type="button"
          className={`check-btn ${set.completed ? 'on' : ''}`}
          onClick={onComplete}
          aria-label={set.completed ? 'Série validée' : 'Valider la série'}
        >
          {set.completed ? '✓' : ''}
        </button>
      </div>
    </div>
  );
}
