import { useLocalSearchParams } from 'expo-router';

import { CustomerAuthLayout } from '@/components/customer-auth-layout';

export default function CustomerLoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <CustomerAuthLayout mode="login" returnToCart={returnTo === 'cart'} />;
}
