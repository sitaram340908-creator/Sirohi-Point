import { useLocalSearchParams } from 'expo-router';

import { CustomerAuthLayout } from '@/components/customer-auth-layout';

export default function CustomerSignupScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <CustomerAuthLayout mode="signup" returnToCart={returnTo === 'cart'} />;
}
