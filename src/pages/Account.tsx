import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { loadSettings, saveBodyWeightKg } from '../lib/calories';
import { addWeightEntry, saveProfile } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAppData } from '../lib/useAppData';

export function Account() {
  const auth = useAuth();
  const [data, setData] = useAppData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(data.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(data.profile?.lastName ?? '');
  const [age, setAge] = useState(data.profile ? String(data.profile.age) : '');
  const [bodyWeightKg, setBodyWeightKg] = useState(
    () =>
      String(data.weightEntries.at(-1)?.weightKg ?? loadSettings().bodyWeightKg),
  );

  useEffect(() => {
    if (!data.profile) return;
    setFirstName(data.profile.firstName);
    setLastName(data.profile.lastName);
    setAge(String(data.profile.age));
  }, [data.profile]);

  useEffect(() => {
    const latestWeight = data.weightEntries.at(-1);
    if (latestWeight) setBodyWeightKg(String(latestWeight.weightKg));
  }, [data.weightEntries]);

  function saveAccountProfile() {
    const ageNumber = Number(age);
    if (!firstName.trim() || !lastName.trim()) {
      setMessage('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      setMessage('Indique un âge entre 13 et 120 ans.');
      return;
    }
    setData(
      saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNumber,
      }),
    );
    setMessage('Profil enregistré.');
  }

  function saveWeight() {
    const value = Number(bodyWeightKg.replace(',', '.'));
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      setMessage('Indique un poids entre 30 et 300 kg.');
      return;
    }
    const saved = saveBodyWeightKg(value);
    setData(addWeightEntry(saved.bodyWeightKg));
    setBodyWeightKg(String(saved.bodyWeightKg));
    setMessage('Poids enregistré dans ton suivi — les calories sont recalculées.');
  }

  if (!isSupabaseConfigured) {
    return (
      <div>
        <header className="page-header">
          <div>
            <h1>Compte</h1>
            <p>Mode local — aucun compte requis.</p>
          </div>
        </header>
        <WeightPanel
          bodyWeightKg={bodyWeightKg}
          setBodyWeightKg={setBodyWeightKg}
          onSave={saveWeight}
          message={message}
        />
        <ProfilePanel
          firstName={firstName}
          lastName={lastName}
          age={age}
          setFirstName={setFirstName}
          setLastName={setLastName}
          setAge={setAge}
          onSave={saveAccountProfile}
        />
        <div className="panel" style={{ marginTop: '0.75rem' }}>
          <p>
            Supabase n’est pas configuré. Copie <code>.env.example</code> vers{' '}
            <code>.env</code>, renseigne l’URL et la clé anon de ton projet, puis
            exécute le SQL dans <code>supabase/schema.sql</code> pour activer la
            synchronisation.
          </p>
        </div>
      </div>
    );
  }

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Compte</h1>
          <p>Connecté — tes données sont synchronisées.</p>
        </div>
      </header>

      <WeightPanel
        bodyWeightKg={bodyWeightKg}
        setBodyWeightKg={setBodyWeightKg}
        onSave={saveWeight}
        message={null}
      />

      <ProfilePanel
        firstName={firstName}
        lastName={lastName}
        age={age}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setAge={setAge}
        onSave={saveAccountProfile}
      />

      <div className="panel" style={{ marginTop: '0.75rem' }}>
        <p>
          <strong>Email</strong>
          <br />
          {auth.user?.email}
        </p>
        {auth.syncing && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Synchronisation en cours…
          </p>
        )}
        {auth.error && (
          <p style={{ marginTop: '0.75rem', color: 'var(--danger, #ff6b6b)' }}>
            {auth.error}
          </p>
        )}
        {message && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {message}
          </p>
        )}

        <div className="row-actions" style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || auth.syncing}
            onClick={() =>
              void run(
                auth.pullCloudToLocal,
                'Données cloud téléchargées sur cet appareil.',
              )
            }
          >
            Télécharger le cloud
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || auth.syncing}
            onClick={() =>
              void run(
                auth.pushLocalToCloud,
                'Données locales envoyées vers le cloud.',
              )
            }
          >
            Envoyer le local
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void run(auth.signOut, 'Déconnecté.')}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({
  firstName,
  lastName,
  age,
  setFirstName,
  setLastName,
  setAge,
  onSave,
}: {
  firstName: string;
  lastName: string;
  age: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setAge: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="panel" style={{ marginTop: '0.75rem' }}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.85rem' }}>
        Informations personnelles
      </h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="account-first-name">Prénom</label>
          <input
            id="account-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-last-name">Nom</label>
          <input
            id="account-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-age">Âge</label>
          <input
            id="account-age"
            type="number"
            min={13}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>
        Enregistrer le profil
      </button>
    </div>
  );
}

function WeightPanel({
  bodyWeightKg,
  setBodyWeightKg,
  onSave,
  message,
}: {
  bodyWeightKg: string;
  setBodyWeightKg: (value: string) => void;
  onSave: () => void;
  message: string | null;
}) {
  return (
    <div className="panel">
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>
        Estimation des calories
      </h2>
      <p className="muted" style={{ marginBottom: '0.85rem', fontSize: '0.9rem' }}>
        Le calcul utilise ton poids, le type d’exercice (MET) et les séries
        terminées. C’est une estimation, pas une mesure médicale.
      </p>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="body-weight">Poids corporel (kg)</label>
        <input
          id="body-weight"
          type="number"
          min={30}
          max={300}
          step={0.5}
          value={bodyWeightKg}
          onChange={(e) => setBodyWeightKg(e.target.value)}
        />
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>
          Enregistrer le poids
        </button>
      </div>
      {message && (
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {message}
        </p>
      )}
    </div>
  );
}
