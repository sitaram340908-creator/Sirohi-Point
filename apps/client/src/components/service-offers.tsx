import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { formatMoney } from '@/shared/domain';
import { getServiceOffers } from '@/lib/api';
import { PortalButton, PortalCard } from './portal-ui';

export function ServiceOffers() {
  const router = useRouter();
  const offers = useQuery({ queryKey: ['service-offers'], queryFn: getServiceOffers });
  return <>{offers.isError ? <PortalCard copy="Service offers could not be loaded. Please try again." /> : null}{offers.data?.map((offer) => <PortalCard key={offer.id} title={offer.title} copy={`${offer.description} Save up to ${formatMoney(offer.discountInPaise)} on the visit charge.${offer.productId ? ' Requires a qualifying delivered product order; one booking per order.' : ''}`}><PortalButton label="Explore eligible services" secondary onPress={() => router.push({ pathname: '/services/nearby', params: { ...(offer.serviceType ? { serviceType: offer.serviceType } : {}) } } as never)} /></PortalCard>)}</>;
}

