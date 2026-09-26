import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { TechnicianAccessGate } from '@/components/technician-access-gate';
import { getContractorProfile } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useAppTheme } from '@/theme/theme-context';

export default function TechnicianApplicationScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { token, user } = useAuth();
  const profile = useQuery({ queryKey: ['services', 'contractor', 'profile', user?.id], queryFn: () => getContractorProfile(token!), enabled: user?.role === 'CONTRACTOR' && Boolean(token) });
  const data = profile.data;
  return <TechnicianAccessGate><PortalShell eyebrow="TECHNICIAN REGISTRATION" title="My registration request" copy="This screen reads the approval status and the profile details saved with your technician application." actions={<PortalButton label="Back to workspace" onPress={() => router.replace('/technician' as never)} />}>
    {profile.isLoading ? <PortalCard copy="Loading your registration from the backend…" /> : null}
    {profile.isError ? <PortalCard title="Registration unavailable" copy="Your profile could not be loaded. Please try again from the technician workspace." /> : null}
    {data ? <PortalCard title={data.name} copy={`${data.email}${data.phone ? ` · ${data.phone}` : ''}`}><StatusBadge label={data.approvalStatus} tone={data.approvalStatus === 'APPROVED' ? 'success' : data.approvalStatus === 'REJECTED' ? 'danger' : 'warning'} /><View style={{ gap: 5 }}><Text style={{ color: colors.cream }}>{data.services.map((service) => service.serviceType).join(', ')}</Text><Text style={{ color: colors.muted }}>{data.serviceArea ?? 'Service area not provided'} · {data.serviceRadiusKm} km service radius</Text><Text style={{ color: colors.muted }}>Skills: {data.skills.join(', ') || 'Not provided'}</Text></View></PortalCard> : null}
  </PortalShell></TechnicianAccessGate>;
}
