import { useRouter } from 'expo-router';
import { useEffect, type PropsWithChildren } from 'react';

import { useAuth } from '@/state/auth-context';

export function TechnicianAccessGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const { hydrated, user } = useAuth();
  const approvedTechnician = user?.role === 'CONTRACTOR';

  useEffect(() => {
    if (hydrated && !approvedTechnician) router.replace('/' as never);
  }, [approvedTechnician, hydrated, router]);

  if (!hydrated || !approvedTechnician) return null;
  return children;
}
