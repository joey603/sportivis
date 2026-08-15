/**
 * Génère src/data/exerciseMedia.ts à partir de free-exercise-db (licence Unlicense).
 * Source : https://github.com/yuhonas/free-exercise-db
 *
 * Usage : node scripts/build-media.mjs
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** id Sportivis -> id free-exercise-db */
const MAPPING = {
  // Pectoraux
  'chest-press-machine': 'Machine_Bench_Press',
  'pec-deck': 'Butterfly',
  'bench-press-bar': 'Barbell_Bench_Press_-_Medium_Grip',
  'incline-bench-bar': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'decline-bench-bar': 'Decline_Barbell_Bench_Press',
  'db-bench-flat': 'Dumbbell_Bench_Press',
  'db-bench-incline': 'Incline_Dumbbell_Press',
  'cable-crossover': 'Cable_Crossover',
  'cable-fly': 'Flat_Bench_Cable_Flyes',
  'cable-fly-low': 'Low_Cable_Crossover',
  'db-fly-flat': 'Dumbbell_Flyes',
  'db-fly-incline': 'Incline_Dumbbell_Flyes',
  pushups: 'Pushups',
  'pushups-decline': 'Push-Ups_With_Feet_Elevated',
  'pushups-incline': 'Incline_Push-Up',
  'smith-bench': 'Smith_Machine_Bench_Press',

  // Dos
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'lat-pulldown-uni': 'One_Arm_Lat_Pulldown',
  'seated-row-cable': 'Seated_Cable_Rows',
  'seated-row-machine': 'Leverage_Iso_Row',
  'chest-supported-row': 'Lying_T-Bar_Row',
  't-bar-row': 'Bent_Over_Two-Arm_Long_Bar_Row',
  'barbell-row': 'Bent_Over_Barbell_Row',
  'db-row': 'One-Arm_Dumbbell_Row',
  'cable-row-uni': 'Seated_One-arm_Cable_Pulley_Rows',
  pullups: 'Pullups',
  'pullups-weighted': 'Weighted_Pull_Ups',
  'australian-pullups': 'Inverted_Row',
  deadlift: 'Barbell_Deadlift',
  'rack-pull': 'Rack_Pulls',
  'deficit-deadlift': 'Deficit_Deadlift',
  superman: 'Hyperextensions_With_No_Hyperextension_Bench',
  'dead-hang': 'Scapular_Pull-Up',
  'low-cable-row-uni': 'Elevated_Cable_Rows',

  // Épaules
  'shoulder-press-machine': 'Machine_Shoulder_Military_Press',
  'db-shoulder-press': 'Dumbbell_Shoulder_Press',
  'military-press': 'Barbell_Shoulder_Press',
  'arnold-press': 'Arnold_Dumbbell_Press',
  'lateral-raise-db': 'Side_Lateral_Raise',
  'lateral-raise-cable': 'Cable_Seated_Lateral_Raise',
  'front-raise-db': 'Front_Dumbbell_Raise',
  'rear-delt-fly-cable': 'Cable_Rear_Delt_Fly',
  'reverse-pec-deck': 'Reverse_Machine_Flyes',
  'face-pull': 'Face_Pull',
  'landmine-press': 'Landmine_Linear_Jammer',
  'upright-row': 'Upright_Barbell_Row',
  'pike-pushup': 'Handstand_Push-Ups',

  // Biceps
  'curl-machine': 'Machine_Preacher_Curls',
  'curl-bar': 'Barbell_Curl',
  'curl-db-alt': 'Dumbbell_Alternate_Bicep_Curl',
  'curl-hammer': 'Hammer_Curls',
  'curl-cable': 'Standing_Biceps_Cable_Curl',
  'curl-concentration': 'Concentration_Curls',
  'curl-incline': 'Incline_Dumbbell_Curl',
  'curl-preacher-db': 'One_Arm_Dumbbell_Preacher_Curl',
  'curl-spider': 'Spider_Curl',

  // Triceps
  'triceps-pushdown': 'Triceps_Pushdown_-_Rope_Attachment',
  'triceps-machine': 'Machine_Triceps_Extension',
  'triceps-overhead-cable': 'Cable_Rope_Overhead_Triceps_Extension',
  'triceps-overhead-db': 'Dumbbell_One-Arm_Triceps_Extension',
  'skull-crushers': 'Lying_Triceps_Press',
  'close-grip-bench': 'Close-Grip_Barbell_Bench_Press',
  dips: 'Parallel_Bar_Dip',
  'bench-dips': 'Bench_Dips',
  'triceps-kickback': 'Tricep_Dumbbell_Kickback',
  'diamond-pushups': 'Push-Ups_-_Close_Triceps_Position',

  // Quadriceps
  'leg-press': 'Leg_Press',
  'leg-extension': 'Leg_Extensions',
  'hack-squat': 'Hack_Squat',
  'back-squat': 'Barbell_Squat',
  'front-squat': 'Front_Barbell_Squat',
  'goblet-squat': 'Goblet_Squat',
  'bulgarian-split': 'Split_Squat_with_Dumbbells',
  'lunges-forward': 'Dumbbell_Lunges',
  'lunges-reverse': 'Dumbbell_Rear_Lunge',
  'walking-lunges': 'Barbell_Walking_Lunge',
  'step-ups': 'Dumbbell_Step_Ups',
  'bodyweight-squat': 'Bodyweight_Squat',
  'leg-press-uni': 'Narrow_Stance_Leg_Press',
  'smith-squat': 'Smith_Machine_Squat',

  // Ischio-jambiers
  'leg-curl-seated': 'Seated_Leg_Curl',
  'leg-curl-lying': 'Lying_Leg_Curls',
  rdl: 'Romanian_Deadlift',
  'rdl-db': 'Romanian_Deadlift',
  'rdl-single': 'Kettlebell_One-Legged_Deadlift',
  'good-morning': 'Good_Morning',
  'nordic-curl': 'Natural_Glute_Ham_Raise',
  'trap-bar-dl': 'Trap_Bar_Deadlift',

  // Fessiers
  'hip-thrust-bar': 'Barbell_Hip_Thrust',
  'hip-thrust-machine': 'Smith_Machine_Hip_Raise',
  'glute-bridge': 'Butt_Lift_Bridge',
  'hip-abduction-machine': 'Thigh_Abductor',
  'hip-adduction-machine': 'Thigh_Adductor',
  'cable-kickback': 'One-Legged_Cable_Kickback',
  'cable-abduction': 'Cable_Hip_Adduction',
  'cable-pull-through': 'Band_Good_Morning_Pull_Through',
  'kb-swing': 'One-Arm_Kettlebell_Swings',
  'sumo-squat-db': 'Plie_Dumbbell_Squat',
  'reverse-hyper': 'Reverse_Hyperextension',

  // Mollets
  'calf-raise-machine': 'Standing_Calf_Raises',
  'calf-raise-standing': 'Standing_Barbell_Calf_Raise',
  'calf-raise-seated': 'Seated_Calf_Raise',
  'calf-raise-single': 'Calf_Raise_On_A_Dumbbell',
  'calf-press-legpress': 'Calf_Press_On_The_Leg_Press_Machine',

  // Core
  plank: 'Plank',
  'side-plank': 'Side_Bridge',
  crunch: 'Crunches',
  'cable-crunch': 'Cable_Crunch',
  'ab-machine': 'Ab_Crunch_Machine',
  'hanging-knee-raise': 'Knee_Hip_Raise_On_Parallel_Bars',
  'hanging-leg-raise': 'Hanging_Leg_Raise',
  'dead-bug': 'Dead_Bug',
  'russian-twist': 'Russian_Twist',
  'ab-wheel': 'Barbell_Ab_Rollout_-_On_Knees',
  'hollow-hold': 'Flat_Bench_Lying_Leg_Raise',
  'mountain-climbers': 'Mountain_Climbers',
  'farmer-carry': 'Farmers_Walk',
  'landmine-rotation': 'Landmine_180s',

  // Cardio
  'treadmill-run': 'Running_Treadmill',
  'treadmill-incline': 'Walking_Treadmill',
  'bike-upright': 'Bicycling_Stationary',
  'bike-recumbent': 'Recumbent_Bike',
  elliptical: 'Elliptical_Trainer',
  rower: 'Rowing_Stationary',
  'rower-intervals': 'Rowing_Stationary',
  stairmaster: 'Stairmaster',
  spinning: 'Bicycling_Stationary',
  'jump-rope': 'Rope_Jumping',
  'sled-push': 'Sled_Push',
  'sled-pull': 'Sled_Drag_-_Harness',
  'battle-ropes': 'Battling_Ropes',
};

/**
 * Exercices supplémentaires (avec photos) importés de free-exercise-db.
 * Chaque entrée génère à la fois la fiche (src/data/exercisesExtra.ts)
 * et les médias (src/data/exerciseMedia.ts).
 */
const EXTRA = [
  // —— Pectoraux ——
  { id: 'ext-decline-db-bench', src: 'Decline_Dumbbell_Bench_Press', name: 'Développé décliné haltères', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-db-bench-neutral', src: 'Dumbbell_Bench_Press_with_Neutral_Grip', name: 'Développé haltères prise neutre', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-db-pullover', src: 'Straight-Arm_Dumbbell_Pullover', name: 'Pullover haltère', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', rest: 75 },
  { id: 'ext-incline-cable-fly', src: 'Incline_Cable_Flye', name: 'Écarté câble incliné', muscle: 'pectoraux', equipment: 'poulie', tracking: 'reps', rest: 60 },
  { id: 'ext-machine-chest-incline', src: 'Leverage_Incline_Chest_Press', name: 'Développé incliné machine', muscle: 'pectoraux', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-machine-chest-decline', src: 'Leverage_Decline_Chest_Press', name: 'Développé décliné machine', muscle: 'pectoraux', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-wide-bench', src: 'Wide-Grip_Barbell_Bench_Press', name: 'Développé couché prise large', muscle: 'pectoraux', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-decline-db-fly', src: 'Decline_Dumbbell_Flyes', name: 'Écarté décliné haltères', muscle: 'pectoraux', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-plyo-pushup', src: 'Plyo_Push-up', name: 'Pompes pliométriques', muscle: 'pectoraux', equipment: 'poids_du_corps', tracking: 'reps', rest: 60 },

  // —— Dos ——
  { id: 'ext-chinup', src: 'Chin-Up', name: 'Traction supination (chin-up)', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', rest: 120 },
  { id: 'ext-straight-arm-pulldown', src: 'Straight-Arm_Pulldown', name: 'Pull-over à la poulie (bras tendus)', muscle: 'dos', equipment: 'poulie', tracking: 'reps', rest: 60 },
  { id: 'ext-vbar-pulldown', src: 'V-Bar_Pulldown', name: 'Tirage vertical V-bar', muscle: 'dos', equipment: 'poulie', tracking: 'reps', rest: 90 },
  { id: 'ext-underhand-pulldown', src: 'Underhand_Cable_Pulldowns', name: 'Tirage vertical supination', muscle: 'dos', equipment: 'poulie', tracking: 'reps', rest: 90 },
  { id: 'ext-close-grip-pulldown', src: 'Close-Grip_Front_Lat_Pulldown', name: 'Tirage vertical prise serrée', muscle: 'dos', equipment: 'poulie', tracking: 'reps', rest: 90 },
  { id: 'ext-bent-two-db-row', src: 'Bent_Over_Two-Dumbbell_Row', name: 'Rowing deux haltères penché', muscle: 'dos', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-incline-db-row', src: 'Dumbbell_Incline_Row', name: 'Rowing haltères sur banc incliné', muscle: 'dos', equipment: 'haltères', tracking: 'reps', rest: 75 },
  { id: 'ext-reverse-grip-row', src: 'Reverse_Grip_Bent-Over_Rows', name: 'Rowing barre supination', muscle: 'dos', equipment: 'barre', tracking: 'reps', rest: 90 },
  { id: 'ext-smith-row', src: 'Smith_Machine_Bent_Over_Row', name: 'Rowing Smith machine', muscle: 'dos', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-machine-high-row', src: 'Leverage_High_Row', name: 'Tirage haut machine', muscle: 'dos', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-vbar-pullup', src: 'V-Bar_Pullup', name: 'Traction prise serrée (V-bar)', muscle: 'dos', equipment: 'poids_du_corps', tracking: 'reps', rest: 120 },

  // —— Épaules ——
  { id: 'ext-db-shoulder-press-standing', src: 'Standing_Dumbbell_Press', name: 'Développé épaules debout haltères', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-cable-shoulder-press', src: 'Cable_Shoulder_Press', name: 'Développé épaules à la poulie', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', rest: 90 },
  { id: 'ext-smith-shoulder-press', src: 'Smith_Machine_Overhead_Shoulder_Press', name: 'Développé épaules Smith machine', muscle: 'épaules', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-push-press', src: 'Push_Press', name: 'Push press', muscle: 'épaules', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-cable-front-raise', src: 'Front_Cable_Raise', name: 'Élévation frontale poulie', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-rear-delt-db-seated', src: 'Seated_Bent-Over_Rear_Delt_Raise', name: 'Oiseau haltères assis', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-db-scaption', src: 'Dumbbell_Scaption', name: 'Élévation en scaption haltères', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', rest: 45 },
  { id: 'ext-external-rotation-cable', src: 'External_Rotation_with_Cable', name: 'Rotation externe à la poulie', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-cable-upright-row', src: 'Upright_Cable_Row', name: 'Rowing menton à la poulie', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', rest: 75 },
  { id: 'ext-barbell-shrug', src: 'Barbell_Shrug', name: 'Shrug barre (trapèzes)', muscle: 'épaules', equipment: 'barre', tracking: 'reps', rest: 60 },
  { id: 'ext-db-shrug', src: 'Dumbbell_Shrug', name: 'Shrug haltères (trapèzes)', muscle: 'épaules', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-cable-shrug', src: 'Cable_Shrugs', name: 'Shrug à la poulie', muscle: 'épaules', equipment: 'poulie', tracking: 'reps', rest: 60 },

  // —— Biceps ——
  { id: 'ext-ez-curl', src: 'EZ-Bar_Curl', name: 'Curl barre EZ', muscle: 'biceps', equipment: 'barre', tracking: 'reps', rest: 60 },
  { id: 'ext-preacher-barbell', src: 'Preacher_Curl', name: 'Curl pupitre barre', muscle: 'biceps', equipment: 'barre', tracking: 'reps', rest: 60 },
  { id: 'ext-cable-preacher', src: 'Cable_Preacher_Curl', name: 'Curl pupitre à la poulie', muscle: 'biceps', equipment: 'poulie', tracking: 'reps', rest: 60 },
  { id: 'ext-seated-db-curl', src: 'Seated_Dumbbell_Curl', name: 'Curl haltères assis', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-reverse-barbell-curl', src: 'Reverse_Barbell_Curl', name: 'Curl barre pronation', muscle: 'biceps', equipment: 'barre', tracking: 'reps', rest: 60 },
  { id: 'ext-zottman', src: 'Zottman_Curl', name: 'Curl Zottman', muscle: 'biceps', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-machine-curl', src: 'Machine_Bicep_Curl', name: 'Curl biceps machine assis', muscle: 'biceps', equipment: 'machine', tracking: 'reps', rest: 60 },
  { id: 'ext-high-cable-curl', src: 'High_Cable_Curls', name: 'Curl poulie haute (double biceps)', muscle: 'biceps', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-drag-curl', src: 'Drag_Curl', name: 'Drag curl', muscle: 'biceps', equipment: 'barre', tracking: 'reps', rest: 60 },

  // —— Triceps ——
  { id: 'ext-vbar-pushdown', src: 'Triceps_Pushdown_-_V-Bar_Attachment', name: 'Extension triceps V-bar', muscle: 'triceps', equipment: 'poulie', tracking: 'reps', rest: 60 },
  { id: 'ext-reverse-pushdown', src: 'Reverse_Grip_Triceps_Pushdown', name: 'Extension triceps prise inversée', muscle: 'triceps', equipment: 'poulie', tracking: 'reps', rest: 60 },
  { id: 'ext-dip-machine', src: 'Dip_Machine', name: 'Dips machine', muscle: 'triceps', equipment: 'machine', tracking: 'reps', rest: 75 },
  { id: 'ext-seated-triceps-press', src: 'Seated_Triceps_Press', name: 'Extension triceps assis haltère', muscle: 'triceps', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-tate-press', src: 'Tate_Press', name: 'Tate press', muscle: 'triceps', equipment: 'haltères', tracking: 'reps', rest: 60 },
  { id: 'ext-ez-skullcrusher', src: 'EZ-Bar_Skullcrusher', name: 'Barre au front EZ (skullcrusher)', muscle: 'triceps', equipment: 'barre', tracking: 'reps', rest: 75 },
  { id: 'ext-close-grip-db-press', src: 'Close-Grip_Dumbbell_Press', name: 'Développé serré haltères', muscle: 'triceps', equipment: 'haltères', tracking: 'reps', rest: 75 },
  { id: 'ext-kneeling-cable-ext', src: 'Kneeling_Cable_Triceps_Extension', name: 'Extension triceps à genoux poulie', muscle: 'triceps', equipment: 'poulie', tracking: 'reps', rest: 60 },

  // —— Quadriceps ——
  { id: 'ext-barbell-lunge', src: 'Barbell_Lunge', name: 'Fente barre', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 90 },
  { id: 'ext-barbell-step-up', src: 'Barbell_Step_Ups', name: 'Step-up barre', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 75 },
  { id: 'ext-box-squat', src: 'Box_Squat', name: 'Box squat', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-overhead-squat', src: 'Overhead_Squat', name: 'Squat overhead', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-zercher-squat', src: 'Zercher_Squats', name: 'Zercher squat', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-db-squat', src: 'Dumbbell_Squat', name: 'Squat haltères', muscle: 'quadriceps', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-sissy-squat', src: 'Weighted_Sissy_Squat', name: 'Sissy squat lesté', muscle: 'quadriceps', equipment: 'barre', tracking: 'reps', rest: 60 },
  { id: 'ext-single-leg-ext', src: 'Single-Leg_Leg_Extension', name: 'Extension jambe unilatérale', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', rest: 60 },
  { id: 'ext-narrow-hack', src: 'Narrow_Stance_Hack_Squats', name: 'Hack squat pieds serrés', muscle: 'quadriceps', equipment: 'machine', tracking: 'reps', rest: 120 },
  { id: 'ext-front-squat-2kb', src: 'Front_Squats_With_Two_Kettlebells', name: 'Front squat deux kettlebells', muscle: 'quadriceps', equipment: 'kettlebell', tracking: 'reps', rest: 120 },

  // —— Ischio-jambiers ——
  { id: 'ext-sumo-deadlift', src: 'Sumo_Deadlift', name: 'Soulevé de terre sumo', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', rest: 150 },
  { id: 'ext-stiff-leg-db-dl', src: 'Stiff-Legged_Dumbbell_Deadlift', name: 'Soulevé jambes tendues haltères', muscle: 'ischio-jambiers', equipment: 'haltères', tracking: 'reps', rest: 90 },
  { id: 'ext-stiff-leg-barbell', src: 'Stiff-Legged_Barbell_Deadlift', name: 'Soulevé jambes tendues barre', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', rest: 120 },
  { id: 'ext-ghr', src: 'Glute_Ham_Raise', name: 'Glute-ham raise', muscle: 'ischio-jambiers', equipment: 'machine', tracking: 'reps', rest: 90 },
  { id: 'ext-standing-leg-curl', src: 'Standing_Leg_Curl', name: 'Leg curl debout', muscle: 'ischio-jambiers', equipment: 'machine', tracking: 'reps', rest: 60 },
  { id: 'ext-power-clean', src: 'Power_Clean', name: 'Épaulé (power clean)', muscle: 'ischio-jambiers', equipment: 'barre', tracking: 'reps', rest: 150 },

  // —— Fessiers ——
  { id: 'ext-barbell-glute-bridge', src: 'Barbell_Glute_Bridge', name: 'Glute bridge barre', muscle: 'fessiers', equipment: 'barre', tracking: 'reps', rest: 75 },
  { id: 'ext-glute-kickback-bw', src: 'Glute_Kickback', name: 'Kickback fessier au sol', muscle: 'fessiers', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-single-leg-bridge', src: 'Single_Leg_Glute_Bridge', name: 'Pont fessier unijambe', muscle: 'fessiers', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-kneeling-squat', src: 'Kneeling_Squat', name: 'Squat à genoux barre', muscle: 'fessiers', equipment: 'barre', tracking: 'reps', rest: 75 },

  // —— Mollets ——
  { id: 'ext-smith-calf', src: 'Smith_Machine_Calf_Raise', name: 'Mollets Smith machine', muscle: 'mollets', equipment: 'machine', tracking: 'reps', rest: 45 },
  { id: 'ext-db-standing-calf', src: 'Standing_Dumbbell_Calf_Raise', name: 'Mollets debout haltères', muscle: 'mollets', equipment: 'haltères', tracking: 'reps', rest: 45 },
  { id: 'ext-barbell-seated-calf', src: 'Barbell_Seated_Calf_Raise', name: 'Mollets assis barre', muscle: 'mollets', equipment: 'barre', tracking: 'reps', rest: 45 },

  // —— Core ——
  { id: 'ext-cable-woodchop', src: 'Standing_Cable_Wood_Chop', name: 'Wood chop à la poulie', muscle: 'core', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-cable-lift', src: 'Standing_Cable_Lift', name: 'Lift à la poulie (bas vers haut)', muscle: 'core', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-pallof', src: 'Pallof_Press', name: 'Pallof press', muscle: 'core', equipment: 'poulie', tracking: 'reps', rest: 45 },
  { id: 'ext-decline-crunch', src: 'Decline_Crunch', name: 'Crunch banc décliné', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-reverse-crunch', src: 'Reverse_Crunch', name: 'Crunch inversé', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-db-side-bend', src: 'Dumbbell_Side_Bend', name: 'Flexion latérale haltère', muscle: 'core', equipment: 'haltères', tracking: 'reps', rest: 30 },
  { id: 'ext-cable-reverse-crunch', src: 'Cable_Reverse_Crunch', name: 'Crunch inversé à la poulie', muscle: 'core', equipment: 'poulie', tracking: 'reps', rest: 30 },
  { id: 'ext-situp', src: 'Sit-Up', name: 'Sit-up complet', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-air-bike', src: 'Air_Bike', name: 'Crunch bicyclette', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', rest: 30 },
  { id: 'ext-hanging-pike', src: 'Hanging_Pike', name: 'Relevé suspendu en pike', muscle: 'core', equipment: 'poids_du_corps', tracking: 'reps', rest: 60 },
];

const res = await fetch(DB_URL);
if (!res.ok) throw new Error(`Téléchargement échoué : ${res.status}`);
const db = await res.json();
const byId = new Map(db.map((e) => [e.id, e]));

const missing = [];
const entries = [];

for (const [localId, sourceId] of Object.entries(MAPPING)) {
  const source = byId.get(sourceId);
  if (!source) {
    missing.push(`${localId} -> ${sourceId}`);
    continue;
  }
  entries.push({
    localId,
    sourceId,
    images: source.images.map((p) => `${IMAGE_BASE}/${p}`),
  });
}

const extraEntries = [];
for (const ex of EXTRA) {
  const source = byId.get(ex.src);
  if (!source) {
    missing.push(`${ex.id} -> ${ex.src}`);
    continue;
  }
  entries.push({
    localId: ex.id,
    sourceId: ex.src,
    images: source.images.map((p) => `${IMAGE_BASE}/${p}`),
  });
  extraEntries.push(ex);
}

if (missing.length) {
  console.error('Correspondances introuvables :');
  for (const m of missing) console.error(`  ${m}`);
  process.exitCode = 1;
}

entries.sort((a, b) => a.localId.localeCompare(b.localId));

const body = entries
  .map(
    (e) =>
      `  '${e.localId}': {\n` +
      `    sourceId: '${e.sourceId}',\n` +
      `    images: [\n${e.images.map((u) => `      '${u}',`).join('\n')}\n    ],\n` +
      `  },`,
  )
  .join('\n');

const out = `// Généré par scripts/build-media.mjs — ne pas éditer à la main.
// Source : https://github.com/yuhonas/free-exercise-db (Unlicense / domaine public)

export type ExerciseMedia = {
  sourceId: string;
  images: string[];
};

export const EXERCISE_MEDIA: Record<string, ExerciseMedia> = {
${body}
};
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(root, 'src/data/exerciseMedia.ts'), out);

const extraBody = extraEntries
  .map(
    (e) =>
      `  { id: '${e.id}', name: ${JSON.stringify(e.name)}, muscle: '${e.muscle}', equipment: '${e.equipment}', tracking: '${e.tracking}', defaultRestSec: ${e.rest}, extra: true, tags: ['supplémentaire'] },`,
  )
  .join('\n');

const extraOut = `// Généré par scripts/build-media.mjs — ne pas éditer à la main.
// Exercices supplémentaires illustrés (source : free-exercise-db, Unlicense).
import type { Exercise } from '../types';

export const EXERCISES_EXTRA: Exercise[] = [
${extraBody}
];
`;

writeFileSync(join(root, 'src/data/exercisesExtra.ts'), extraOut);

console.log(
  `${entries.length} exercices illustrés (${extraEntries.length} supplémentaires), ${missing.length} manquants.`,
);
