import { Redirect, Slot, useSegments } from 'expo-router';

import { SessionLoading } from '@/components/session-loading';
import { getRoleHomePath } from '@/lib/role-navigation';
import { useAuth } from '@/state/auth-context';

export default function BusinessLayout() {
  const { user, token, hydrated } = useAuth();
  const segments = useSegments();
  const page = segments[1];
  if (page === undefined || page === 'login' || page === 'signup' || page === 'pending' || page === 'catalog' || page === 'cart' || page === 'product') return <Slot />;
  if (!hydrated) return <SessionLoading />;
  if (!user || !token) return <Redirect href="/business/login" />;
  if (user.role !== 'BUSINESS') return <Redirect href={getRoleHomePath(user.role)} />;
  return <Slot />;
}
