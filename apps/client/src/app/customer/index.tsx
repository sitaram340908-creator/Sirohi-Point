import { Redirect } from 'expo-router';

// Keep existing bookmarks working while the storefront's canonical URL is `/`.
export default function LegacyCustomerHome() {
  return <Redirect href="/" />;
}
