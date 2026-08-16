import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  fetchCloudData,
  pushAllData,
  upsertProfileCloud,
  upsertWeightEntryCloud,
} from '../lib/cloud';
import { setCloudUserId } from '../lib/cloudUser';
import { clearSettings, saveBodyWeightKg } from '../lib/calories';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { clearLocalData, loadData, saveData } from '../lib/storage';
import type { BiologicalSex, UserProfile, WeightEntry } from '../types';

export type SignUpDetails = Omit<UserProfile, 'sex' | 'heightCm'> & {
  weightKg: number;
  sex: BiologicalSex;
  heightCm: number;
};

type AuthContextValue = {
  configured: boolean;
  ready: boolean;
  user: User | null;
  session: Session | null;
  syncing: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    details: SignUpDetails,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  /** Remplace le cloud par les données locales actuelles. */
  pushLocalToCloud: () => Promise<void>;
  /** Remplace le localStorage par les données cloud. */
  pullCloudToLocal: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      setCloudUserId(next?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCloudUserId(user?.id ?? null);
  }, [user?.id]);

  // À la connexion : charger le cloud si le compte a déjà des données,
  // sinon pousser le localStorage pour initialiser le compte.
  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;

    async function hydrate() {
      setSyncing(true);
      setError(null);
      try {
        const cloud = await fetchCloudData(loadData().profile);
        if (cancelled) return;
        const hasCloud =
          cloud.programs.length > 0 ||
          cloud.sessions.length > 0 ||
          cloud.customExercises.length > 0 ||
          Boolean(cloud.profile) ||
          cloud.weightEntries.length > 0 ||
          cloud.incomingProgramShares.length > 0;
        if (hasCloud) {
          saveData(cloud);
          const latestWeight = cloud.weightEntries.at(-1);
          if (latestWeight) saveBodyWeightKg(latestWeight.weightKg);
          window.dispatchEvent(new Event('sportivis-data'));
        } else {
          await pushAllData(loadData(), user!.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erreur de synchronisation',
          );
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) throw err;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, details: SignUpDetails) => {
      if (!supabase) throw new Error('Supabase non configuré');
      setError(null);
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: details.firstName,
            last_name: details.lastName,
            age: details.age,
            sex: details.sex,
            height_cm: details.heightCm,
          },
        },
      });
      if (err) throw err;
      if (!data.session || !data.user) {
        throw new Error('La connexion directe doit être activée dans Supabase.');
      }

      const profile: UserProfile = {
        firstName: details.firstName,
        lastName: details.lastName,
        age: details.age,
        sex: details.sex,
        heightCm: details.heightCm,
        goal: details.goal,
        sessionsPerWeek: details.sessionsPerWeek,
      };
      const weightEntry: WeightEntry = {
        id: crypto.randomUUID(),
        weightKg: details.weightKg,
        recordedAt: new Date().toISOString(),
      };
      const local = loadData();
      local.profile = profile;
      local.weightEntries = [weightEntry];
      saveData(local);
      saveBodyWeightKg(details.weightKg);
      await Promise.all([
        upsertProfileCloud(profile, data.user.id),
        upsertWeightEntryCloud(weightEntry, data.user.id),
      ]);

      setSession(data.session);
      setUser(data.user);
      setCloudUserId(data.user.id);
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signOut();
    if (err) throw err;
    clearLocalData();
    clearSettings();
  }, []);

  const pushLocalToCloud = useCallback(async () => {
    if (!user) throw new Error('Non connecté');
    setSyncing(true);
    setError(null);
    try {
      await pushAllData(loadData(), user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’envoi');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const pullCloudToLocal = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const cloud = await fetchCloudData(loadData().profile);
      saveData(cloud);
      const latestWeight = cloud.weightEntries.at(-1);
      if (latestWeight) saveBodyWeightKg(latestWeight.weightKg);
      window.dispatchEvent(new Event('sportivis-data'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du téléchargement');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      ready,
      user,
      session,
      syncing,
      error,
      signIn,
      signUp,
      signOut,
      pushLocalToCloud,
      pullCloudToLocal,
    }),
    [
      ready,
      user,
      session,
      syncing,
      error,
      signIn,
      signUp,
      signOut,
      pushLocalToCloud,
      pullCloudToLocal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider');
  return ctx;
}

