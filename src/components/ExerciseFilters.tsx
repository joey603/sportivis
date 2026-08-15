import { useMemo, useState } from 'react';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '../data/exercises';
import { searchAllExercises, type ExerciseCategory } from '../lib/storage';

type CategoryValue = '' | ExerciseCategory;

const CATEGORIES: { value: CategoryValue; label: string }[] = [
  { value: '', label: 'Toutes catégories' },
  { value: 'library', label: 'Bibliothèque' },
  { value: 'custom', label: 'Mes exercices' },
];

type State = {
  query: string;
  muscle: string;
  equipment: string;
  category: CategoryValue;
};

const EMPTY: State = { query: '', muscle: '', equipment: '', category: '' };

/**
 * Filtres à facettes : chaque liste déroulante ne propose que les valeurs qui
 * donnent au moins un résultat compte tenu des autres filtres actifs.
 * La valeur déjà sélectionnée reste toujours proposée pour ne pas la perdre.
 */
export function useExerciseFilters(libraryVersion = 0) {
  const [state, setState] = useState<State>(EMPTY);
  const { query, muscle, equipment, category } = state;

  const value = useMemo(
    () => ({
      results: searchAllExercises(
        query,
        muscle || undefined,
        equipment || undefined,
        category || undefined,
      ),
      muscles: (() => {
        const pool = searchAllExercises(
          query,
          undefined,
          equipment || undefined,
          category || undefined,
        );
        return MUSCLE_GROUPS.filter(
          (item) => item === muscle || pool.some((e) => e.muscle === item),
        );
      })(),
      equipments: (() => {
        const pool = searchAllExercises(
          query,
          muscle || undefined,
          undefined,
          category || undefined,
        );
        return EQUIPMENT_TYPES.filter(
          (item) => item === equipment || pool.some((e) => e.equipment === item),
        );
      })(),
      categories: (() => {
        const pool = searchAllExercises(
          query,
          muscle || undefined,
          equipment || undefined,
        );
        return CATEGORIES.filter(
          (item) =>
            item.value === '' ||
            item.value === category ||
            pool.some((e) =>
              item.value === 'custom' ? e.custom : !e.custom,
            ),
        );
      })(),
    }),
    // libraryVersion force le recalcul après création d'un exercice personnel.
    [query, muscle, equipment, category, libraryVersion],
  );

  function setField<K extends keyof State>(key: K, next: State[K]) {
    setState((prev) => ({ ...prev, [key]: next }));
  }

  return { ...state, ...value, setField, reset: () => setState(EMPTY) };
}

type Props = ReturnType<typeof useExerciseFilters> & {
  autoFocus?: boolean;
  placeholder?: string;
};

export function ExerciseFilters({
  query,
  muscle,
  equipment,
  category,
  muscles,
  equipments,
  categories,
  setField,
  autoFocus,
  placeholder = 'Rechercher un exercice…',
}: Props) {
  return (
    <div className="filters">
      <input
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setField('query', e.target.value)}
      />
      {/* Sans exercice personnel, « Bibliothèque » = « Toutes catégories » :
          le filtre n'apparaît que quand il distingue vraiment deux ensembles. */}
      {categories.length > 2 && (
        <select
          value={category}
          onChange={(e) => setField('category', e.target.value as CategoryValue)}
          aria-label="Catégorie"
        >
          {categories.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      )}
      <select
        value={muscle}
        onChange={(e) => setField('muscle', e.target.value)}
        aria-label="Groupe musculaire"
      >
        <option value="">Tous muscles</option>
        {muscles.map((item) => (
          <option key={item} value={item}>
            {item.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <select
        value={equipment}
        onChange={(e) => setField('equipment', e.target.value)}
        aria-label="Équipement"
      >
        <option value="">Tout équipement</option>
        {equipments.map((item) => (
          <option key={item} value={item}>
            {item.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
