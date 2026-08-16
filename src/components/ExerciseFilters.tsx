import { useMemo, useState } from 'react';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '../data/exercises';
import {
  localizeEquipment,
  localizeExerciseName,
  localizeMuscle,
} from '../i18n/exercises';
import { useI18n } from '../i18n/I18nContext';
import { searchAllExercises, type ExerciseCategory } from '../lib/storage';

type CategoryValue = '' | ExerciseCategory;

const CATEGORIES: CategoryValue[] = ['', 'library', 'custom'];

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
  const { locale } = useI18n();
  const [state, setState] = useState<State>(EMPTY);
  const { query, muscle, equipment, category } = state;

  const value = useMemo(
    () => {
      function search(
        muscleValue?: string,
        equipmentValue?: string,
        categoryValue?: ExerciseCategory,
      ) {
        const pool = searchAllExercises(
          '',
          muscleValue,
          equipmentValue,
          categoryValue,
        );
        const normalizedQuery = query.trim().toLocaleLowerCase(
          locale === 'he' ? 'he-IL' : 'fr-FR',
        );
        if (!normalizedQuery) return pool;

        return pool.filter((exercise) =>
          [
            exercise.name,
            localizeExerciseName(exercise, locale),
            localizeMuscle(exercise.muscle, locale),
            localizeEquipment(exercise.equipment, locale),
            ...(exercise.tags ?? []),
          ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
        );
      }

      return {
      results: search(
        muscle || undefined,
        equipment || undefined,
        category || undefined,
      ),
      muscles: (() => {
        const pool = search(
          undefined,
          equipment || undefined,
          category || undefined,
        );
        return MUSCLE_GROUPS.filter(
          (item) => item === muscle || pool.some((e) => e.muscle === item),
        );
      })(),
      equipments: (() => {
        const pool = search(
          muscle || undefined,
          undefined,
          category || undefined,
        );
        return EQUIPMENT_TYPES.filter(
          (item) => item === equipment || pool.some((e) => e.equipment === item),
        );
      })(),
      categories: (() => {
        const pool = search(
          muscle || undefined,
          equipment || undefined,
        );
        return CATEGORIES.filter(
          (item) =>
            item === '' ||
            item === category ||
            pool.some((e) =>
              item === 'custom' ? e.custom : !e.custom,
            ),
        );
      })(),
    };
    },
    // libraryVersion force le recalcul après création d'un exercice personnel.
    [query, muscle, equipment, category, libraryVersion, locale],
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
  placeholder,
}: Props) {
  const { locale, t } = useI18n();
  const categoryLabels: Record<CategoryValue, string> = {
    '': t('exercises.allCategories'),
    library: t('exercises.library'),
    custom: t('exercises.mine'),
  };

  return (
    <div className="filters">
      <input
        autoFocus={autoFocus}
        placeholder={placeholder ?? t('exercises.search')}
        value={query}
        onChange={(e) => setField('query', e.target.value)}
      />
      {/* Sans exercice personnel, « Bibliothèque » = « Toutes catégories » :
          le filtre n'apparaît que quand il distingue vraiment deux ensembles. */}
      {categories.length > 2 && (
        <select
          value={category}
          onChange={(e) => setField('category', e.target.value as CategoryValue)}
          aria-label={t('exercises.category')}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {categoryLabels[item]}
            </option>
          ))}
        </select>
      )}
      <select
        value={muscle}
        onChange={(e) => setField('muscle', e.target.value)}
        aria-label={t('exercises.muscleGroup')}
      >
        <option value="">{t('exercises.allMuscles')}</option>
        {muscles.map((item) => (
          <option key={item} value={item}>
            {localizeMuscle(item, locale)}
          </option>
        ))}
      </select>
      <select
        value={equipment}
        onChange={(e) => setField('equipment', e.target.value)}
        aria-label={t('exercises.equipment')}
      >
        <option value="">{t('exercises.allEquipment')}</option>
        {equipments.map((item) => (
          <option key={item} value={item}>
            {localizeEquipment(item, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
