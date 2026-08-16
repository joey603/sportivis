import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { loadSettings, saveBodyWeightKg } from '../lib/calories';
import { addWeightEntry, saveProfile } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAppData } from '../lib/useAppData';

export function Account() {
  const auth = useAuth();
  const { t } = useI18n();
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
      setMessage(t('account.nameRequired'));
      return;
    }
    if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      setMessage(t('account.ageInvalid'));
      return;
    }
    setData(
      saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNumber,
      }),
    );
    setMessage(t('account.profileSaved'));
  }

  function saveWeight() {
    const value = Number(bodyWeightKg.replace(',', '.'));
    if (!Number.isFinite(value) || value < 30 || value > 300) {
      setMessage(t('account.weightInvalid'));
      return;
    }
    const saved = saveBodyWeightKg(value);
    setData(addWeightEntry(saved.bodyWeightKg));
    setBodyWeightKg(String(saved.bodyWeightKg));
    setMessage(t('account.weightSaved'));
  }

  if (!isSupabaseConfigured) {
    return (
      <div>
        <header className="page-header">
          <div>
            <h1>{t('account.title')}</h1>
            <p>{t('account.localMode')}</p>
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
      setMessage(err instanceof Error ? err.message : t('account.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{t('account.title')}</h1>
          <p>{t('account.connected')}</p>
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
          <strong>{t('login.email')}</strong>
          <br />
          {auth.user?.email}
        </p>
        {auth.syncing && (
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            {t('account.syncing')}
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
              void run(auth.pullCloudToLocal, t('account.pullDone'))
            }
          >
            {t('account.pullCloud')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || auth.syncing}
            onClick={() =>
              void run(auth.pushLocalToCloud, t('account.pushDone'))
            }
          >
            {t('account.pushLocal')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void run(auth.signOut, t('account.signedOut'))}
          >
            {t('nav.logout')}
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
  const { t } = useI18n();
  return (
    <div className="panel" style={{ marginTop: '0.75rem' }}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.85rem' }}>
        {t('account.profile')}
      </h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="account-first-name">{t('account.firstName')}</label>
          <input
            id="account-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-last-name">{t('account.lastName')}</label>
          <input
            id="account-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-age">{t('account.age')}</label>
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
        {t('account.saveProfile')}
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
  const { t } = useI18n();
  return (
    <div className="panel">
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>
        {t('account.caloriesTitle')}
      </h2>
      <p className="muted" style={{ marginBottom: '0.85rem', fontSize: '0.9rem' }}>
        {t('account.caloriesHint')}
      </p>
      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="body-weight">{t('account.weight')}</label>
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
          {t('account.saveWeight')}
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
