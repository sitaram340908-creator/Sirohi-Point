import type { ThemeColors } from '@/shared/design-tokens';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { useThemedStyles } from '@/theme/theme-context';

export default function TechnicianPendingScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  return (
    <PortalShell
      eyebrow="REGISTRATION RECEIVED"
      title="Your technician request is under review."
      copy="Thank you for applying to the Sirohi Point service network. An administrator will review your professional details before your account can sign in."
      actions={<PortalButton label="Back to role selection" secondary onPress={() => router.replace('/' as never)} />}
    >
      <PortalCard title="Please wait for approval" copy="Approval normally takes up to 48 working hours. You cannot sign in or appear in nearby technician searches until the request is approved.">
        <View style={styles.statusRow}>
          <StatusBadge label="PENDING ADMIN APPROVAL" tone="warning" />
        </View>
        <Text style={styles.body}>Once approved, return to the technician sign-in page and use the email and password from your registration.</Text>
        <PortalButton label="Technician sign in" onPress={() => router.replace('/technician/login' as never)} />
      </PortalCard>
    </PortalShell>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  statusRow: { alignItems: 'flex-start' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});

