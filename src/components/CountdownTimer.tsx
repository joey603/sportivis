import { useEffect, useRef, useState } from 'react';

type Props = {
  seconds: number;
  label: string;
  variant?: 'rest' | 'work';
  onDone: () => void;
  onSkip: () => void;
};

export function CountdownTimer({
  seconds,
  label,
  variant = 'rest',
  onDone,
  onSkip,
}: Props) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(seconds);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Le décompte suit une échéance absolue : pas de dérive si l'onglet est
  // ralenti par le navigateur. L'effet ne dépend que de l'état de pause.
  useEffect(() => {
    if (paused) return;
    const deadline = Date.now() + remainingRef.current * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      remainingRef.current = remaining;
      setLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current();
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [paused]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const progress = seconds > 0 ? 1 - left / seconds : 1;

  return (
    <div
      className={`rest-timer timer-${variant} ${paused ? 'is-paused' : ''}`}
      role="timer"
      aria-live="polite"
    >
      <div
        className="timer-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <div className="timer-body">
        <div>
          <div
            className="muted"
            style={{
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {paused ? `${label} — en pause` : label}
          </div>
          <div className="time">
            {m}:{s.toString().padStart(2, '0')}
          </div>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? '▶ Reprendre' : '⏸ Pause'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSkip}>
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}
