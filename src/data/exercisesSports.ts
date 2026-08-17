import type { Exercise } from '../types';

/**
 * Sports pratiqués hors salle : suivis en durée, avec une intensité choisie
 * dans le programme. Le champ `met` porte la dépense de référence à intensité
 * modérée (valeurs du Compendium of Physical Activities).
 */
export const SPORT_EXERCISES: Exercise[] = [
  { id: 'sport-padel', name: 'Padel', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7, tags: ['sport', 'raquette'] },
  { id: 'sport-tennis-single', name: 'Tennis (simple)', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 8, tags: ['sport', 'raquette'] },
  { id: 'sport-tennis-double', name: 'Tennis (double)', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 6, tags: ['sport', 'raquette'] },
  { id: 'sport-badminton', name: 'Badminton', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 5.5, tags: ['sport', 'raquette'] },
  { id: 'sport-squash', name: 'Squash', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7.3, tags: ['sport', 'raquette'] },
  { id: 'sport-table-tennis', name: 'Tennis de table', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 4, tags: ['sport', 'raquette'] },
  { id: 'sport-football', name: 'Football', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7, tags: ['sport', 'collectif'] },
  { id: 'sport-basketball', name: 'Basket-ball', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 6.5, tags: ['sport', 'collectif'] },
  { id: 'sport-volleyball', name: 'Volley-ball', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 4.5, tags: ['sport', 'collectif'] },
  { id: 'sport-handball', name: 'Handball', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 8, tags: ['sport', 'collectif'] },
  { id: 'sport-rugby', name: 'Rugby', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 8.3, tags: ['sport', 'collectif'] },
  { id: 'sport-running', name: 'Course à pied', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 9.8, tags: ['sport', 'endurance'] },
  { id: 'sport-cycling', name: 'Vélo (route)', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7.5, tags: ['sport', 'endurance'] },
  { id: 'sport-swimming', name: 'Natation', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7, tags: ['sport', 'endurance'] },
  { id: 'sport-hiking', name: 'Randonnée', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 6, tags: ['sport', 'endurance'] },
  { id: 'sport-boxing', name: 'Boxe (sac / sparring)', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7.8, tags: ['sport', 'combat'] },
  { id: 'sport-martial-arts', name: 'Sports de combat', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 10.3, tags: ['sport', 'combat'] },
  { id: 'sport-climbing', name: 'Escalade', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 8, tags: ['sport'] },
  { id: 'sport-ski', name: 'Ski alpin', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 7, tags: ['sport'] },
  { id: 'sport-dance', name: 'Danse', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 5, tags: ['sport'] },
  { id: 'sport-golf', name: 'Golf (marche)', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 4.8, tags: ['sport'] },
  { id: 'sport-surf', name: 'Surf', muscle: 'sport', equipment: 'sport', tracking: 'duration', defaultRestSec: 0, met: 5, tags: ['sport'] },
];
