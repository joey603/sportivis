import { EXERCISE_MEDIA } from '../data/exerciseMedia';
import { ExercisePictogram } from './ExercisePictogram';

export function ExerciseThumb({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const media = EXERCISE_MEDIA[exerciseId];
  if (!media) {
    return (
      <div className="thumb thumb-picto">
        <ExercisePictogram label={name} />
      </div>
    );
  }
  return (
    <div className="thumb">
      <img src={media.images[0]} alt={name} loading="lazy" />
    </div>
  );
}
