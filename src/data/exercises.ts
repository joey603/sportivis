import type { Exercise } from '../types';
import { EXERCISES_EXTRA } from './exercisesExtra';

const BASE_EXERCISES: Exercise[] = [
  // —— Pectoraux ——
  { id: 'chest-press-machine', name: 'Chest press machine', muscle: 'pectoraux', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 'pec-deck', name: 'Pec deck (butterfly)', muscle: 'pectoraux', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },
  { id: 'bench-press-bar', name: 'Développé couché barre', muscle: 'pectoraux', equipment: 'barre', tracking: 'reps', defaultRestSec: 120 },
  { id: 'incline-bench-bar', name: 'Développé incliné barre', muscle: 'pectoraux', equipment: 'barre', tracking: 'reps', defaultRestSec: 120 },
  { id: 'decline-bench-bar', name: 'Développé décliné barre', muscle: 'pectoraux', equipment: 'barre', tracking: 'reps', defaultRestSec: 120 },
  { id: 'db-bench-flat', name: 'Développé haltères plat', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'db-bench-incline', name: 'Développé haltères incliné', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'cable-crossover', name: 'Cable crossover', muscle: 'pectoraux', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'cable-fly', name: 'Écarté câble', muscle: 'pectoraux', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'cable-fly-low', name: 'Écarté câble bas (haut pecs)', muscle: 'pectoraux', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'db-fly-flat', name: 'Écarté couché haltères', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'db-fly-incline', name: 'Écarté incliné haltères', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'pushups', name: 'Pompes', muscle: 'pectoraux', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },
  { id: 'pushups-decline', name: 'Pompes déclinées', muscle: 'pectoraux', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },
  { id: 'pushups-incline', name: 'Pompes inclinées', muscle: 'pectoraux', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 45 },
  { id: 'smith-bench', name: 'Développé Smith machine', muscle: 'pectoraux', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },

  // —— Dos ——
  { id: 'lat-pulldown', name: 'Tirage vertical prise large', muscle: 'dos', equipment: 'poulie', tracking: 'reps', defaultRestSec: 90 },
  { id: 'lat-pulldown-uni', name: 'Tirage unilatéral poulie haute', muscle: 'dos', equipment: 'poulie', tracking: 'reps', defaultRestSec: 75 },
  { id: 'seated-row-cable', name: 'Tirage horizontal assis', muscle: 'dos', equipment: 'poulie', tracking: 'reps', defaultRestSec: 90 },
  { id: 'seated-row-machine', name: 'Rowing assis machine', muscle: 'dos', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 'chest-supported-row', name: 'Rowing dos appuyé machine', muscle: 'dos', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 't-bar-row', name: 'Rowing T-bar', muscle: 'dos', equipment: 'barre', tracking: 'reps', defaultRestSec: 90 },
  { id: 'barbell-row', name: 'Rowing barre penché', muscle: 'dos', equipment: 'barre', tracking: 'reps', defaultRestSec: 90 },
  { id: 'db-row', name: 'Rowing haltère unilatéral', muscle: 'dos', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'cable-row-uni', name: 'Rowing câble unilatéral', muscle: 'dos', equipment: 'poulie', tracking: 'reps', defaultRestSec: 75 },
  { id: 'pullups', name: 'Tractions prise large', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 120 },
  { id: 'pullups-weighted', name: 'Tractions lestées', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 120 },
  { id: 'australian-pullups', name: 'Tractions australiennes', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },
  { id: 'deadlift', name: 'Soulevé de terre', muscle: 'dos', equipment: 'barre', tracking: 'reps', defaultRestSec: 180 },
  { id: 'rack-pull', name: 'Rack pull', muscle: 'dos', equipment: 'barre', tracking: 'reps', defaultRestSec: 150 },
  { id: 'deficit-deadlift', name: 'Soulevé de terre déficit', muscle: 'dos', equipment: 'barre', tracking: 'reps', defaultRestSec: 180 },
  { id: 'superman', name: 'Superman dos', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 45 },
  { id: 'dead-hang', name: 'Dead hang', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'duration', defaultRestSec: 45 },
  { id: 'low-cable-row-uni', name: 'Tirage bas poulie unilatéral', muscle: 'dos', equipment: 'poulie', tracking: 'reps', defaultRestSec: 75 },

  // —— Épaules ——
  { id: 'shoulder-press-machine', name: 'Développé épaules machine', muscle: 'épaules', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 'db-shoulder-press', name: 'Développé haltères épaules assis', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'military-press', name: 'Développé militaire barre', muscle: 'épaules', equipment: 'barre', tracking: 'reps', defaultRestSec: 120 },
  { id: 'arnold-press', name: 'Développé Arnold', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'lateral-raise-db', name: 'Élévation latérale haltère', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'lateral-raise-cable', name: 'Élévation latérale câble', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'front-raise-db', name: 'Élévation frontale haltère', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', defaultRestSec: 45 },
  { id: 'rear-delt-fly-cable', name: 'Écarté postérieur câble', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'reverse-pec-deck', name: 'Reverse pec deck', muscle: 'épaules', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },
  { id: 'face-pull', name: 'Face pull', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'landmine-press', name: 'Landmine press', muscle: 'épaules', equipment: 'barre', tracking: 'reps', defaultRestSec: 75 },
  { id: 'upright-row', name: 'Rowing menton barre', muscle: 'épaules', equipment: 'barre', tracking: 'reps', defaultRestSec: 75 },
  { id: 'pike-pushup', name: 'Pompes pike', muscle: 'épaules', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },

  // —— Biceps ——
  { id: 'curl-machine', name: 'Curl biceps machine (preacher)', muscle: 'biceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-bar', name: 'Curl barre', muscle: 'biceps', equipment: 'barre', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-db-alt', name: 'Curl haltères alternés', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-hammer', name: 'Curl marteau', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-cable', name: 'Curl câble debout', muscle: 'biceps', equipment: 'poulie', tracking: 'reps', defaultRestSec: 45 },
  { id: 'curl-concentration', name: 'Curl de concentration', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 45 },
  { id: 'curl-incline', name: 'Curl incliné haltère', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-preacher-db', name: 'Curl pupitre haltère', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'curl-spider', name: 'Curl spider', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 45 },

  // —— Triceps ——
  { id: 'triceps-pushdown', name: 'Pushdown triceps corde', muscle: 'triceps', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'triceps-machine', name: 'Extension triceps machine', muscle: 'triceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },
  { id: 'triceps-overhead-cable', name: 'Extension triceps overhead câble', muscle: 'triceps', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'triceps-overhead-db', name: 'Extension triceps haltère', muscle: 'triceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'skull-crushers', name: 'Skull crushers', muscle: 'triceps', equipment: 'barre', tracking: 'reps', defaultRestSec: 75 },
  { id: 'close-grip-bench', name: 'Développé prise serrée', muscle: 'triceps', equipment: 'barre', tracking: 'reps', defaultRestSec: 90 },
  { id: 'dips', name: 'Dips poids du corps', muscle: 'triceps', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 90 },
  { id: 'bench-dips', name: 'Dips sur banc', muscle: 'triceps', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },
  { id: 'triceps-kickback', name: 'Kickback triceps haltère', muscle: 'triceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 45 },
  { id: 'diamond-pushups', name: 'Pompes diamant', muscle: 'triceps', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },

  // —— Quadriceps ——
  { id: 'leg-press', name: 'Presse à cuisses', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 120 },
  { id: 'leg-extension', name: 'Extension jambes machine', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },
  { id: 'hack-squat', name: 'Hack squat machine', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 120 },
  { id: 'back-squat', name: 'Squat barre', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', defaultRestSec: 150 },
  { id: 'front-squat', name: 'Front squat barre', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', defaultRestSec: 150 },
  { id: 'goblet-squat', name: 'Squat gobelet', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'bulgarian-split', name: 'Split squat bulgare', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'lunges-forward', name: 'Fentes avant', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'lunges-reverse', name: 'Fentes arrière', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'walking-lunges', name: 'Fentes marchées', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'step-ups', name: 'Step-ups', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', defaultRestSec: 60 },
  { id: 'bodyweight-squat', name: 'Squat poids du corps', muscle: 'quadriceps', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 45 },
  { id: 'leg-press-uni', name: 'Presse à cuisses unilatérale', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 'smith-squat', name: 'Squat Smith machine', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', defaultRestSec: 120 },

  // —— Ischio-jambiers ——
  { id: 'leg-curl-seated', name: 'Curl jambes assis machine', muscle: 'ischio-jambiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 75 },
  { id: 'leg-curl-lying', name: 'Curl jambes couché', muscle: 'ischio-jambiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 75 },
  { id: 'rdl', name: 'Soulevé de terre roumain', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', defaultRestSec: 120 },
  { id: 'rdl-db', name: 'Soulevé de terre roumain haltères', muscle: 'ischio-jambiers', equipment: 'haltères', tracking: 'reps', defaultRestSec: 90 },
  { id: 'rdl-single', name: 'RDL unijambe haltère', muscle: 'ischio-jambiers', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'good-morning', name: 'Good morning', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', defaultRestSec: 90 },
  { id: 'nordic-curl', name: 'Nordic curl', muscle: 'ischio-jambiers', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 90 },
  { id: 'trap-bar-dl', name: 'Soulevé de terre trap bar', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', defaultRestSec: 150 },

  // —— Fessiers ——
  { id: 'hip-thrust-bar', name: 'Hip thrust barre', muscle: 'fessiers', equipment: 'barre', tracking: 'reps', defaultRestSec: 90 },
  { id: 'hip-thrust-machine', name: 'Hip thrust machine', muscle: 'fessiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 90 },
  { id: 'glute-bridge', name: 'Glute bridge', muscle: 'fessiers', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 45 },
  { id: 'hip-abduction-machine', name: 'Abduction hanches machine', muscle: 'fessiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'hip-adduction-machine', name: 'Adduction hanches machine', muscle: 'fessiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'cable-kickback', name: 'Kickback fessiers poulie', muscle: 'fessiers', equipment: 'poulie', tracking: 'reps', defaultRestSec: 45 },
  { id: 'cable-abduction', name: 'Abduction hanche câble', muscle: 'fessiers', equipment: 'poulie', tracking: 'reps', defaultRestSec: 45 },
  { id: 'cable-pull-through', name: 'Cable pull-through', muscle: 'fessiers', equipment: 'poulie', tracking: 'reps', defaultRestSec: 60 },
  { id: 'kb-swing', name: 'Kettlebell swing russe', muscle: 'fessiers', equipment: 'kettlebell', tracking: 'reps', defaultRestSec: 60 },
  { id: 'sumo-squat-db', name: 'Squat sumo haltère', muscle: 'fessiers', equipment: 'haltères', tracking: 'reps', defaultRestSec: 75 },
  { id: 'reverse-hyper', name: 'Reverse hyperextension', muscle: 'fessiers', equipment: 'machine', tracking: 'reps', defaultRestSec: 60 },

  // —— Mollets ——
  { id: 'calf-raise-machine', name: 'Mollets machine', muscle: 'mollets', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'calf-raise-standing', name: 'Mollets debout', muscle: 'mollets', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'calf-raise-seated', name: 'Mollets assis machine', muscle: 'mollets', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'calf-raise-single', name: 'Mollets unijambe', muscle: 'mollets', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 30 },
  { id: 'calf-press-legpress', name: 'Mollets sur presse', muscle: 'mollets', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },

  // —— Core ——
  { id: 'plank', name: 'Gainage planche', muscle: 'core', equipment: 'poids_du_corps', tracking: 'duration', defaultRestSec: 30 },
  { id: 'side-plank', name: 'Gainage latéral', muscle: 'core', equipment: 'poids_du_corps', tracking: 'duration', defaultRestSec: 30 },
  { id: 'crunch', name: 'Crunch classique', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 30 },
  { id: 'cable-crunch', name: 'Crunch câble', muscle: 'core', equipment: 'poulie', tracking: 'reps', defaultRestSec: 45 },
  { id: 'ab-machine', name: 'Machine abdominaux', muscle: 'core', equipment: 'machine', tracking: 'reps', defaultRestSec: 45 },
  { id: 'hanging-knee-raise', name: 'Relevé de genoux suspendu', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 45 },
  { id: 'hanging-leg-raise', name: 'Relevé de jambes suspendu', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 60 },
  { id: 'dead-bug', name: 'Dead bug', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 30 },
  { id: 'russian-twist', name: 'Russian twist', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', defaultRestSec: 30 },
  { id: 'ab-wheel', name: 'Ab wheel rollout', muscle: 'core', equipment: 'autre', tracking: 'reps', defaultRestSec: 60 },
  { id: 'hollow-hold', name: 'Hollow body hold', muscle: 'core', equipment: 'poids_du_corps', tracking: 'duration', defaultRestSec: 30 },
  { id: 'mountain-climbers', name: 'Mountain climbers', muscle: 'core', equipment: 'poids_du_corps', tracking: 'duration', defaultRestSec: 30 },
  { id: 'farmer-carry', name: 'Farmer carry haltères', muscle: 'core', equipment: 'haltères', tracking: 'distance', defaultRestSec: 60 },
  { id: 'landmine-rotation', name: 'Landmine rotation', muscle: 'core', equipment: 'barre', tracking: 'reps', defaultRestSec: 45 },

  // —— Cardio machines ——
  { id: 'treadmill-run', name: 'Tapis de course', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'treadmill-incline', name: 'Tapis incliné (marche)', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'bike-upright', name: 'Vélo stationnaire', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'bike-recumbent', name: 'Vélo allongé', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'elliptical', name: 'Elliptique', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'rower', name: 'Rameur', muscle: 'cardio', equipment: 'cardio', tracking: 'distance', defaultRestSec: 60, tags: ['cardio'] },
  { id: 'rower-intervals', name: 'Rameur intervalles', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 60, tags: ['cardio', 'hiit'] },
  { id: 'stairmaster', name: 'Simulateur d\'escalier', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'spinning', name: 'Vélo spinning', muscle: 'cardio', equipment: 'cardio', tracking: 'duration', defaultRestSec: 0, tags: ['cardio'] },
  { id: 'jump-rope', name: 'Corde à sauter', muscle: 'cardio', equipment: 'autre', tracking: 'duration', defaultRestSec: 30, tags: ['cardio'] },
  { id: 'sled-push', name: 'Sled push', muscle: 'full_body', equipment: 'autre', tracking: 'distance', defaultRestSec: 90 },
  { id: 'sled-pull', name: 'Sled pull', muscle: 'full_body', equipment: 'autre', tracking: 'distance', defaultRestSec: 90 },
  { id: 'battle-ropes', name: 'Battle ropes', muscle: 'full_body', equipment: 'autre', tracking: 'duration', defaultRestSec: 45 },
];

export const EXERCISES: Exercise[] = [...BASE_EXERCISES, ...EXERCISES_EXTRA];

export const MUSCLE_GROUPS = [
  'pectoraux',
  'dos',
  'épaules',
  'biceps',
  'triceps',
  'quadriceps',
  'ischio-jambiers',
  'fessiers',
  'mollets',
  'core',
  'cardio',
  'full_body',
] as const;

export const EQUIPMENT_TYPES = [
  'machine',
  'haltères',
  'barre',
  'poulie',
  'poids_du_corps',
  'cardio',
  'kettlebell',
  'autre',
] as const;

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function searchExercises(
  query: string,
  muscle?: string,
  equipment?: string,
): Exercise[] {
  const q = query.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    if (equipment && e.equipment !== equipment) return false;
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.muscle.includes(q) ||
      e.equipment.includes(q) ||
      (e.tags?.some((t) => t.includes(q)) ?? false)
    );
  });
}
