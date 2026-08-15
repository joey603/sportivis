/**
 * Silhouette SVG de repli pour les exercices sans photo de démonstration
 * (exercices personnels créés par l'utilisateur). Dessinée avec currentColor.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function ExercisePictogram({ label }: { label?: string }) {
  return (
    <div className="pictogram">
      <svg viewBox="0 0 240 120" role="img" aria-label={label ?? 'Illustration'}>
        <circle cx={120} cy={32} r={12} {...stroke} />
        <path d="M120 44 L120 76" {...stroke} />
        <path d="M120 52 L94 66 M120 52 L146 66" {...stroke} />
        <path d="M120 76 L102 106 M120 76 L140 106" {...stroke} />
      </svg>
    </div>
  );
}
