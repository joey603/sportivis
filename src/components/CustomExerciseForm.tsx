import { useState } from 'react';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '../data/exercises';
import { createId, saveCustomExercise } from '../lib/storage';
import type {
  Equipment,
  Exercise,
  MuscleGroup,
  TrackingType,
} from '../types';

type Props = {
  onCreated: (exercise: Exercise) => void;
  onClose: () => void;
};

export function CustomExerciseForm({ onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('full_body');
  const [equipment, setEquipment] = useState<Equipment>('autre');
  const [tracking, setTracking] = useState<TrackingType>('reps');
  const [restSec, setRestSec] = useState(60);
  const [instructions, setInstructions] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const exercise: Exercise = {
      id: `custom-${createId()}`,
      name: cleanName,
      muscle,
      equipment,
      tracking,
      defaultRestSec: Math.max(0, restSec),
      custom: true,
      instructions: instructions
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    saveCustomExercise(exercise);
    onCreated(exercise);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
        aria-label="Créer un exercice personnel"
      >
        <div className="sheet-head">
          <div>
            <h2>Créer mon exercice</h2>
            <p className="muted">Il sera enregistré sans photo sur cet appareil.</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="field">
          <label htmlFor="custom-name">Nom de l’exercice</label>
          <input
            id="custom-name"
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Tirage de ma salle"
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="custom-muscle">Groupe musculaire</label>
            <select
              id="custom-muscle"
              value={muscle}
              onChange={(event) => setMuscle(event.target.value as MuscleGroup)}
            >
              {MUSCLE_GROUPS.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="custom-equipment">Équipement</label>
            <select
              id="custom-equipment"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as Equipment)}
            >
              {EQUIPMENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="custom-tracking">Type de suivi</label>
            <select
              id="custom-tracking"
              value={tracking}
              onChange={(event) =>
                setTracking(event.target.value as TrackingType)
              }
            >
              <option value="reps">Répétitions</option>
              <option value="duration">Durée</option>
              <option value="distance">Distance</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="custom-rest">Repos par défaut (s)</label>
            <input
              id="custom-rest"
              type="number"
              min={0}
              value={restSec}
              onChange={(event) => setRestSec(Number(event.target.value) || 0)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="custom-instructions">
            Consignes personnelles (une par ligne)
          </label>
          <textarea
            id="custom-instructions"
            rows={4}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={'Régler le siège à hauteur de poitrine\nGarder le dos droit'}
          />
        </div>

        <div className="row-actions">
          <button type="submit" className="btn btn-primary">
            Ajouter l’exercice
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
