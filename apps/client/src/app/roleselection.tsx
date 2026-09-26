import { Redirect } from 'expo-router';

import { RoleSelection } from '@/components/role-selection';
import { SessionLoading } from '@/components/session-loading';
import { getRoleHomePath } from '@/lib/role-navigation';
import { useAuth } from '@/state/auth-context';

export default function RoleSelectionScreen() {
  const { user, hydrated } = useAuth();

  if (!hydrated) return <SessionLoading />;
  if (user) return <Redirect href={getRoleHomePath(user.role)} />;
  return <RoleSelection intent="welcome" />;
}
