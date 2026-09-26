import type {
  AuthSession,
  ContractorRegisterInput,
  LoginInput,
  PublicUser,
  CustomerRegisterInput,
  CustomerProfileUpdate,
} from '@/shared/contracts';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import {
  getCurrentUser,
  ApiError,
  login as loginRequest,
  refreshAuthSession,
  register as registerRequest,
  registerBusiness as registerBusinessRequest,
  registerTechnician as registerTechnicianRequest,
  type BusinessRegistrationInput,
  updateCustomerProfile as updateCustomerProfileRequest,
} from '@/lib/api';

interface AuthContextValue {
  user: PublicUser | null;
  token: string | null;
  hydrated: boolean;
  busy: boolean;
  login(input: LoginInput): Promise<PublicUser>;
  register(input: CustomerRegisterInput): Promise<PublicUser>;
  registerBusiness(input: BusinessRegistrationInput): Promise<PublicUser>;
  registerTechnician(input: ContractorRegisterInput): Promise<AuthSession>;
  updateProfile(input: CustomerProfileUpdate): Promise<PublicUser>;
  logout(): Promise<void>;
}

const STORAGE_KEY = 'sirohi-point-auth-v1';
const SESSION_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession(): Promise<AuthSession | null> {
  try {
    const raw = Platform.OS === 'web'
      ? (typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY))
      : await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AuthSession : null;
  } catch {
    return null;
  }
}

async function writeSession(session: AuthSession | null) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (session) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

async function requireSignedOut() {
  const activeSession = await readSession();
  if (activeSession) {
    const roleLabel = activeSession.user.role === 'CUSTOMER'
      ? 'customer'
      : activeSession.user.role === 'BUSINESS'
        ? 'business'
        : activeSession.user.role === 'CONTRACTOR'
          ? 'technician'
          : activeSession.user.role === 'SUPER_ADMIN' || activeSession.user.role === 'SUB_ADMIN'
            ? 'admin'
            : activeSession.user.role.toLowerCase();
    throw new Error(`You are already logged in as a ${roleLabel} in this browser. Sign out before signing in with another account.`);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await readSession();
      if (!mounted) return;
      if (!stored) {
        setHydrated(true);
        return;
      }
      try {
        const user = await getCurrentUser(stored.token);
        if (!mounted) return;
        const next = { token: stored.token, user };
        queryClient.clear();
        setSession(next);
        await writeSession(next);
      } catch {
        await writeSession(null);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue !== null) return;
      queryClient.clear();
      setSession(null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void refreshAuthSession(session.token)
        .then((next) => {
          if (cancelled) return;
          setSession(next);
          void writeSession(next);
        })
        .catch((error: unknown) => {
          if (!cancelled && error instanceof ApiError && [401, 403].includes(error.status)) {
            queryClient.clear();
            setSession(null);
            void writeSession(null);
          }
        });
    }, SESSION_REFRESH_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [session, queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    hydrated,
    busy,
    async login(input) {
      setBusy(true);
      try {
        await requireSignedOut();
        const next = await loginRequest(input);
        queryClient.clear();
        setSession(next);
        await writeSession(next);
        return next.user;
      } finally {
        setBusy(false);
      }
    },
    async register(input) {
      setBusy(true);
      try {
        await requireSignedOut();
        const next = await registerRequest(input);
        queryClient.clear();
        setSession(next);
        await writeSession(next);
        return next.user;
      } finally {
        setBusy(false);
      }
    },
    async registerBusiness(input) {
      setBusy(true);
      try {
        await requireSignedOut();
        const next = await registerBusinessRequest(input);
        // Business registration creates a pending approval request. It must
        // never create a logged-in business session before admin approval.
        queryClient.clear();
      setSession(null);
        await writeSession(null);
        return next.user;
      } finally {
        setBusy(false);
      }
    },
    async registerTechnician(input) {
      setBusy(true);
      try {
        await requireSignedOut();
        // A technician registration is only an approval request. Keep the
        // one-time response token for profile submission, but never create a
        // logged-in technician session before admin approval.
        return await registerTechnicianRequest(input);
      } finally {
        setBusy(false);
      }
    },
    async updateProfile(input) {
      if (!session) throw new Error('Sign in is required');
      const next = await updateCustomerProfileRequest(session.token, input);
      setSession(next);
      await writeSession(next);
      return next.user;
    },
    async logout() {
      queryClient.clear();
      setSession(null);
      await writeSession(null);
    },
  }), [busy, hydrated, session, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
