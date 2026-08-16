import { EXERCISES } from '../data/exercises.js';
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  TrackingType,
} from '../types';
import type { Locale } from './messages';

/** Noms hébreux des exercices de bibliothèque, indexés par `exercise.id`. */
const EXERCISE_NAMES_HE = {
  // —— Pectoraux ——
  'chest-press-machine': 'מכשיר לחיצת חזה',
  'pec-deck': 'מכשיר פרפר (פק דק)',
  'bench-press-bar': 'לחיצת חזה בשכיבה עם מוט',
  'incline-bench-bar': 'לחיצת חזה בשיפוע עם מוט',
  'decline-bench-bar': 'לחיצת חזה בשיפוע שלילי עם מוט',
  'db-bench-flat': 'לחיצת חזה בשכיבה עם משקולות',
  'db-bench-incline': 'לחיצת חזה בשיפוע עם משקולות',
  'cable-crossover': 'קרוסאובר בכבלים',
  'cable-fly': 'פתיחות חזה בכבלים',
  'cable-fly-low': 'פתיחות חזה מכבלים נמוכים (חזה עליון)',
  'db-fly-flat': 'פתיחות חזה בשכיבה עם משקולות',
  'db-fly-incline': 'פתיחות חזה בשיפוע עם משקולות',
  pushups: 'שכיבות סמיכה',
  'pushups-decline': 'שכיבות סמיכה בשיפוע שלילי',
  'pushups-incline': 'שכיבות סמיכה בשיפוע',
  'smith-bench': 'לחיצת חזה במכונת סמית׳',

  // —— Dos ——
  'lat-pulldown': 'משיכה אנכית באחיזה רחבה',
  'lat-pulldown-uni': 'משיכה חד-צדדית בכבל עליון',
  'seated-row-cable': 'חתירה אופקית בישיבה',
  'seated-row-machine': 'חתירה בישיבה במכשיר',
  'chest-supported-row': 'חתירה עם תמיכת חזה במכשיר',
  't-bar-row': 'חתירת טי-בר',
  'barbell-row': 'חתירה עם מוט בכפיפה',
  'db-row': 'חתירה חד-צדדית עם משקולת',
  'cable-row-uni': 'חתירה חד-צדדית בכבל',
  pullups: 'מתח באחיזה רחבה',
  'pullups-weighted': 'מתח עם משקל',
  'australian-pullups': 'מתח אוסטרלי',
  deadlift: 'דדליפט',
  'rack-pull': 'ראק פול',
  'deficit-deadlift': 'דדליפט מדיפיסיט',
  superman: 'סופרמן לגב',
  'dead-hang': 'תלייה על מוט',
  'low-cable-row-uni': 'משיכה נמוכה חד-צדדית בכבל',

  // —— Épaules ——
  'shoulder-press-machine': 'לחיצת כתפיים במכשיר',
  'db-shoulder-press': 'לחיצת כתפיים בישיבה עם משקולות',
  'military-press': 'לחיצה צבאית עם מוט',
  'arnold-press': 'לחיצת ארנולד',
  'lateral-raise-db': 'הרמה צידית עם משקולת',
  'lateral-raise-cable': 'הרמה צידית בכבל',
  'front-raise-db': 'הרמה קדמית עם משקולת',
  'rear-delt-fly-cable': 'פתיחות אחוריות בכבל',
  'reverse-pec-deck': 'פק דק הפוך',
  'face-pull': 'פייס פול',
  'landmine-press': 'לחיצת לנדמיין',
  'upright-row': 'חתירה לסנטר עם מוט',
  'pike-pushup': 'שכיבות סמיכה בפייק',

  // —— Biceps ——
  'curl-machine': 'כפיפת מרפקים במכשיר (פריצ׳ר)',
  'curl-bar': 'כפיפת מרפקים עם מוט',
  'curl-db-alt': 'כפיפת מרפקים לסירוגין עם משקולות',
  'curl-hammer': 'כפיפת מרפקים פטיש',
  'curl-cable': 'כפיפת מרפקים בעמידה בכבל',
  'curl-concentration': 'כפיפת ריכוז',
  'curl-incline': 'כפיפת מרפקים בשיפוע עם משקולת',
  'curl-preacher-db': 'כפיפת מרפקים על ספסל פריצ׳ר עם משקולת',
  'curl-spider': 'כפיפת ספיידר',

  // —— Triceps ——
  'triceps-pushdown': 'דחיקת תלת-ראשי בחבל',
  'triceps-machine': 'פשיטת מרפקים במכשיר',
  'triceps-overhead-cable': 'פשיטת מרפקים מעל הראש בכבל',
  'triceps-overhead-db': 'פשיטת מרפקים מעל הראש עם משקולת',
  'skull-crushers': 'סקאל קרשרס',
  'close-grip-bench': 'לחיצת חזה באחיזה צרה',
  dips: 'מקבילים במשקל גוף',
  'bench-dips': 'מקבילים על ספסל',
  'triceps-kickback': 'קיקבק תלת-ראשי עם משקולת',
  'diamond-pushups': 'שכיבות סמיכה יהלום',

  // —— Quadriceps ——
  'leg-press': 'מכשיר לחיצת רגליים',
  'leg-extension': 'פשיטת ברכיים במכשיר',
  'hack-squat': 'האק סקוואט במכשיר',
  'back-squat': 'סקוואט עם מוט',
  'front-squat': 'פרונט סקוואט עם מוט',
  'goblet-squat': 'סקוואט גובלט',
  'bulgarian-split': 'ספליט סקוואט בולגרי',
  'lunges-forward': 'לאנג׳ים קדימה',
  'lunges-reverse': 'לאנג׳ים אחורה',
  'walking-lunges': 'לאנג׳ים בהליכה',
  'step-ups': 'עליות למדרגה',
  'bodyweight-squat': 'סקוואט במשקל גוף',
  'leg-press-uni': 'לחיצת רגליים חד-צדדית',
  'smith-squat': 'סקוואט במכונת סמית׳',

  // —— Ischio-jambiers ——
  'leg-curl-seated': 'כפיפת ברכיים בישיבה במכשיר',
  'leg-curl-lying': 'כפיפת ברכיים בשכיבה',
  rdl: 'דדליפט רומני',
  'rdl-db': 'דדליפט רומני עם משקולות',
  'rdl-single': 'דדליפט רומני חד-רגלי עם משקולת',
  'good-morning': 'גוד מורנינג',
  'nordic-curl': 'נורדיק קארל',
  'trap-bar-dl': 'דדליפט עם טראפ בר',

  // —— Fessiers ——
  'hip-thrust-bar': 'היפ תרסט עם מוט',
  'hip-thrust-machine': 'היפ תרסט במכשיר',
  'glute-bridge': 'גשר ישבן',
  'hip-abduction-machine': 'הרחקת ירכיים במכשיר',
  'hip-adduction-machine': 'קירוב ירכיים במכשיר',
  'cable-kickback': 'קיקבק לישבן בכבל',
  'cable-abduction': 'הרחקת ירך בכבל',
  'cable-pull-through': 'פול ת׳רו בכבל',
  'kb-swing': 'סווינג קטלבל רוסי',
  'sumo-squat-db': 'סקוואט סומו עם משקולת',
  'reverse-hyper': 'היפר-אקסטנשן הפוכה',

  // —— Mollets ——
  'calf-raise-machine': 'הרמות שוקיים במכשיר',
  'calf-raise-standing': 'הרמות שוקיים בעמידה',
  'calf-raise-seated': 'הרמות שוקיים בישיבה במכשיר',
  'calf-raise-single': 'הרמות שוקיים חד-רגליות',
  'calf-press-legpress': 'שוקיים על מכבש רגליים',

  // —— Core ——
  plank: 'פלאנק',
  'side-plank': 'פלאנק צד',
  crunch: 'קראנץ׳ קלאסי',
  'cable-crunch': 'קראנץ׳ בכבל',
  'ab-machine': 'מכשיר בטן',
  'hanging-knee-raise': 'הרמת ברכיים בתלייה',
  'hanging-leg-raise': 'הרמת רגליים בתלייה',
  'dead-bug': 'דד באג',
  'russian-twist': 'רוסיאן טוויסט',
  'ab-wheel': 'גלגל בטן (רולאאוט)',
  'hollow-hold': 'הולוא באודי הולד',
  'mountain-climbers': 'מטפסי הרים',
  'farmer-carry': 'הליכת חקלאי עם משקולות',
  'landmine-rotation': 'רוטציית לנדמיין',

  // —— Cardio / full body ——
  'treadmill-run': 'הליכון ריצה',
  'treadmill-incline': 'הליכון בשיפוע (הליכה)',
  'bike-upright': 'אופני כושר',
  'bike-recumbent': 'אופניים בשכיבה',
  elliptical: 'אליפטיקל',
  rower: 'מכשיר חתירה',
  'rower-intervals': 'חתירה במרווחים',
  stairmaster: 'סימולטור מדרגות',
  spinning: 'אופני ספינינג',
  'jump-rope': 'קפיצה בחבל',
  'sled-push': 'דחיפת מזחלת',
  'sled-pull': 'משיכת מזחלת',
  'battle-ropes': 'חבלים קרביים',

  // —— Extra ——
  'ext-decline-db-bench': 'לחיצת חזה בשיפוע שלילי עם משקולות',
  'ext-db-bench-neutral': 'לחיצת חזה עם משקולות באחיזה נייטרלית',
  'ext-db-pullover': 'פולאובר עם משקולת',
  'ext-incline-cable-fly': 'פתיחות חזה בשיפוע בכבלים',
  'ext-machine-chest-incline': 'לחיצת חזה בשיפוע במכשיר',
  'ext-machine-chest-decline': 'לחיצת חזה בשיפוע שלילי במכשיר',
  'ext-wide-bench': 'לחיצת חזה באחיזה רחבה',
  'ext-decline-db-fly': 'פתיחות חזה בשיפוע שלילי עם משקולות',
  'ext-plyo-pushup': 'שכיבות סמיכה פליומטריות',
  'ext-chinup': 'מתח באחיזה הפוכה (צ׳ין-אפ)',
  'ext-straight-arm-pulldown': 'פולאובר בכבל (ידיים ישרות)',
  'ext-vbar-pulldown': 'משיכה אנכית עם וי-בר',
  'ext-underhand-pulldown': 'משיכה אנכית באחיזה הפוכה',
  'ext-close-grip-pulldown': 'משיכה אנכית באחיזה צרה',
  'ext-bent-two-db-row': 'חתירה בשתי משקולות בכפיפה',
  'ext-incline-db-row': 'חתירה עם משקולות על ספסל משופע',
  'ext-reverse-grip-row': 'חתירה עם מוט באחיזה הפוכה',
  'ext-smith-row': 'חתירה במכונת סמית׳',
  'ext-machine-high-row': 'משיכה עליונה במכשיר',
  'ext-vbar-pullup': 'מתח באחיזה צרה (וי-בר)',
  'ext-db-shoulder-press-standing': 'לחיצת כתפיים בעמידה עם משקולות',
  'ext-cable-shoulder-press': 'לחיצת כתפיים בכבלים',
  'ext-smith-shoulder-press': 'לחיצת כתפיים במכונת סמית׳',
  'ext-push-press': 'פוש פרס',
  'ext-cable-front-raise': 'הרמה קדמית בכבל',
  'ext-rear-delt-db-seated': 'ציפור בישיבה עם משקולות',
  'ext-db-scaption': 'הרמה בסקפשן עם משקולות',
  'ext-external-rotation-cable': 'רוטציה חיצונית בכבל',
  'ext-cable-upright-row': 'חתירה לסנטר בכבל',
  'ext-barbell-shrug': 'שראג עם מוט (טרפזים)',
  'ext-db-shrug': 'שראג עם משקולות (טרפזים)',
  'ext-cable-shrug': 'שראג בכבל',
  'ext-ez-curl': 'כפיפת מרפקים עם מוט EZ',
  'ext-preacher-barbell': 'כפיפת מרפקים על ספסל פריצ׳ר עם מוט',
  'ext-cable-preacher': 'כפיפת מרפקים על ספסל פריצ׳ר בכבל',
  'ext-seated-db-curl': 'כפיפת מרפקים בישיבה עם משקולות',
  'ext-reverse-barbell-curl': 'כפיפת מרפקים עם מוט באחיזה הפוכה',
  'ext-zottman': 'כפיפת זוטמן',
  'ext-machine-curl': 'כפיפת מרפקים במכשיר בישיבה',
  'ext-high-cable-curl': 'כפיפת מרפקים בכבל עליון (דו-ראשי כפול)',
  'ext-drag-curl': 'דראג קארל',
  'ext-vbar-pushdown': 'פשיטת מרפקים עם וי-בר',
  'ext-reverse-pushdown': 'פשיטת מרפקים באחיזה הפוכה',
  'ext-dip-machine': 'מקבילים במכשיר',
  'ext-seated-triceps-press': 'פשיטת מרפקים בישיבה עם משקולת',
  'ext-tate-press': 'טייט פרס',
  'ext-ez-skullcrusher': 'מוט לחזית EZ (סקאל קרשר)',
  'ext-close-grip-db-press': 'לחיצה צרה עם משקולות',
  'ext-kneeling-cable-ext': 'פשיטת מרפקים על הברכיים בכבל',
  'ext-barbell-lunge': 'לאנג׳ עם מוט',
  'ext-barbell-step-up': 'עלייה למדרגה עם מוט',
  'ext-box-squat': 'בוקס סקוואט',
  'ext-overhead-squat': 'סקוואט מעל הראש',
  'ext-zercher-squat': 'זרצ׳ר סקוואט',
  'ext-db-squat': 'סקוואט עם משקולות',
  'ext-sissy-squat': 'סיסי סקוואט עם משקל',
  'ext-single-leg-ext': 'פשיטת ברך חד-צדדית',
  'ext-narrow-hack': 'האק סקוואט עם רגליים צמודות',
  'ext-front-squat-2kb': 'פרונט סקוואט עם שני קטלבלים',
  'ext-sumo-deadlift': 'דדליפט סומו',
  'ext-stiff-leg-db-dl': 'דדליפט רגליים ישרות עם משקולות',
  'ext-stiff-leg-barbell': 'דדליפט רגליים ישרות עם מוט',
  'ext-ghr': 'גלוט-האם רייז',
  'ext-standing-leg-curl': 'כפיפת ברך בעמידה',
  'ext-power-clean': 'פאוור קלין',
  'ext-barbell-glute-bridge': 'גשר ישבן עם מוט',
  'ext-glute-kickback-bw': 'קיקבק לישבן על הרצפה',
  'ext-single-leg-bridge': 'גשר ישבן חד-רגלי',
  'ext-kneeling-squat': 'סקוואט על הברכיים עם מוט',
  'ext-smith-calf': 'שוקיים במכונת סמית׳',
  'ext-db-standing-calf': 'שוקיים בעמידה עם משקולות',
  'ext-barbell-seated-calf': 'שוקיים בישיבה עם מוט',
  'ext-cable-woodchop': 'ווד צ׳ופ בכבל',
  'ext-cable-lift': 'ליפט בכבל (מלמטה למעלה)',
  'ext-pallof': 'פאלוף פרס',
  'ext-decline-crunch': 'קראנץ׳ על ספסל משופע שלילי',
  'ext-reverse-crunch': 'קראנץ׳ הפוך',
  'ext-db-side-bend': 'כפיפה צידית עם משקולת',
  'ext-cable-reverse-crunch': 'קראנץ׳ הפוך בכבל',
  'ext-situp': 'סיט-אפ מלא',
  'ext-air-bike': 'קראנץ׳ אופניים',
  'ext-hanging-pike': 'הרמה בתלייה לפייק',
} as const satisfies Record<string, string>;

export type LibraryExerciseId = keyof typeof EXERCISE_NAMES_HE;

const MUSCLE_LABELS = {
  fr: {
    pectoraux: 'Pectoraux',
    dos: 'Dos',
    épaules: 'Épaules',
    biceps: 'Biceps',
    triceps: 'Triceps',
    quadriceps: 'Quadriceps',
    'ischio-jambiers': 'Ischio-jambiers',
    fessiers: 'Fessiers',
    mollets: 'Mollets',
    core: 'Core',
    cardio: 'Cardio',
    full_body: 'Full body',
  },
  he: {
    pectoraux: 'חזה',
    dos: 'גב',
    épaules: 'כתפיים',
    biceps: 'דו-ראשי',
    triceps: 'תלת-ראשי',
    quadriceps: 'ארבע-ראשי',
    'ischio-jambiers': 'מיתרים',
    fessiers: 'ישבן',
    mollets: 'שוקיים',
    core: 'ליבה',
    cardio: 'קרדיו',
    full_body: 'כל הגוף',
  },
} as const satisfies Record<Locale, Record<MuscleGroup, string>>;

const EQUIPMENT_LABELS = {
  fr: {
    machine: 'Machine',
    haltères: 'Haltères',
    barre: 'Barre',
    poulie: 'Poulie',
    poids_du_corps: 'Poids du corps',
    cardio: 'Cardio',
    kettlebell: 'Kettlebell',
    autre: 'Autre',
  },
  he: {
    machine: 'מכשיר',
    haltères: 'משקולות',
    barre: 'מוט',
    poulie: 'כבלים',
    poids_du_corps: 'משקל גוף',
    cardio: 'קרדיו',
    kettlebell: 'קטלבל',
    autre: 'אחר',
  },
} as const satisfies Record<Locale, Record<Equipment, string>>;

const TRACKING_LABELS = {
  fr: {
    reps: 'Répétitions',
    duration: 'Durée',
    distance: 'Distance',
  },
  he: {
    reps: 'חזרות',
    duration: 'משך',
    distance: 'מרחק',
  },
} as const satisfies Record<Locale, Record<TrackingType, string>>;

/** Nombre d’exercices de bibliothèque couverts par les traductions hébraïques. */
export const LIBRARY_EXERCISE_I18N_COUNT = Object.keys(EXERCISE_NAMES_HE)
  .length as number;

const uncoveredLibraryIds = EXERCISES.filter(
  (exercise) => !(exercise.id in EXERCISE_NAMES_HE),
).map((exercise) => exercise.id);

if (uncoveredLibraryIds.length > 0) {
  throw new Error(
    `i18n/exercises: traductions hébraïques manquantes pour ${uncoveredLibraryIds.join(', ')}`,
  );
}

if (LIBRARY_EXERCISE_I18N_COUNT !== EXERCISES.length) {
  throw new Error(
    `i18n/exercises: couverture ${LIBRARY_EXERCISE_I18N_COUNT} ≠ bibliothèque ${EXERCISES.length}`,
  );
}

/**
 * Localise le nom d’un exercice.
 * Les exercices custom conservent toujours leur nom d’origine.
 */
export function localizeExerciseName(
  exercise: Pick<Exercise, 'id' | 'name' | 'custom'>,
  locale: Locale,
): string {
  if (exercise.custom || locale === 'fr') {
    return exercise.name;
  }
  return (
    EXERCISE_NAMES_HE[exercise.id as LibraryExerciseId] ?? exercise.name
  );
}

export function localizeMuscle(value: MuscleGroup, locale: Locale): string {
  return MUSCLE_LABELS[locale][value];
}

export function localizeEquipment(value: Equipment, locale: Locale): string {
  return EQUIPMENT_LABELS[locale][value];
}

export function localizeTracking(value: TrackingType, locale: Locale): string {
  return TRACKING_LABELS[locale][value];
}
