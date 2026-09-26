import { formatMoney } from '@/shared/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { PortalButton, PortalCard, PortalShell, StatusBadge } from '@/components/portal-ui';
import { createServiceBooking, getCustomerAddresses, getOrders, getPublicTechnician, getServiceOffers, saveCustomerAddress, type ServiceBookingRecord } from '@/lib/api';
import { useAuth } from '@/state/auth-context';
import { useAppTheme } from '@/theme/theme-context';

const timeSlots = [
  { value: '08:00', label: 'Morning · 8–11' },
  { value: '11:00', label: 'Midday · 11–2' },
  { value: '14:00', label: 'Afternoon · 2–5' },
  { value: '17:00', label: 'Evening · 5–8' },
] as const;

export default function ServiceBookingScreen() {
  const params = useLocalSearchParams<{ contractorId?: string; serviceType?: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const { user, token } = useAuth();
  const [serviceType, setServiceType] = useState(params.serviceType ?? '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [addressId, setAddressId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [offerId, setOfferId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<ServiceBookingRecord>();
  const profile = useQuery({ queryKey: ['services', 'public-profile', params.contractorId], queryFn: () => getPublicTechnician(params.contractorId!), enabled: Boolean(params.contractorId) });
  const offers = useQuery({ queryKey: ['service-offers'], queryFn: getServiceOffers });
  const orders = useQuery({ queryKey: ['orders', user?.id], queryFn: () => getOrders(token!), enabled: user?.role === 'CUSTOMER' && Boolean(token) });
  const addresses = useQuery({ queryKey: ['customer-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: user?.role === 'CUSTOMER' && Boolean(token) });
  const service = profile.data?.services.find((item) => item.serviceType.toLowerCase() === serviceType.toLowerCase()) ?? profile.data?.services[0];
  const validOffers = offers.data?.filter((offer) => (!offer.contractorId || offer.contractorId === params.contractorId) && (!offer.serviceType || offer.serviceType.toLowerCase() === service?.serviceType.toLowerCase())) ?? [];
  const offer = validOffers.find((item) => item.id === offerId);
  const eligibleOrders = orders.data?.filter((order) => order.status === 'DELIVERED' && order.approvalStatus === 'APPROVED' && order.items.some((item) => item.productId === offer?.productId)) ?? [];
  const selectedAddress = addresses.data?.find((item) => item.id === addressId);
  const base = service?.visitChargeInPaise ?? 0;
  const discount = offer ? Math.min(base, offer.discountInPaise) : 0;
  const inputStyle = { minHeight: 46, padding: 12, color: colors.cream, backgroundColor: colors.surfaceSunken, borderColor: colors.line, borderWidth: 1, borderRadius: 6 };

  useEffect(() => {
    const preferred = addresses.data?.find((item) => item.isDefault) ?? addresses.data?.[0];
    if (preferred && !addressId) chooseAddress(preferred.id);
  }, [addresses.data, addressId]);

  function chooseAddress(id: string) {
    const selected = addresses.data?.find((item) => item.id === id);
    if (!selected) return;
    setAddressId(id); setAddress(selected.line1); setCity(selected.city);
  }

  async function saveAddress() {
    if (user?.role !== 'CUSTOMER' || !token) { router.replace('/customer/login'); return; }
    if (address.trim().length < 10 || city.trim().length < 2) { setError('Enter a full service address and city before saving it.'); return; }
    setSavingAddress(true); setError('');
    try {
      const saved = await saveCustomerAddress(token, { label: 'Service address', line1: address.trim(), city: city.trim(), isDefault: !(addresses.data?.length) });
      await client.invalidateQueries({ queryKey: ['customer-addresses', user.id] });
      setAddressId(saved.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save this address.'); }
    finally { setSavingAddress(false); }
  }

  async function submit() {
    if (busy) return;
    if (user?.role !== 'CUSTOMER' || !token) { router.replace('/customer/login'); return; }
    if (!service || !params.contractorId) { setError('Choose an available technician first.'); return; }
    if (address.trim().length < 10) { setError('Service address must contain at least 10 characters.'); return; }
    const hasSchedule = Boolean(scheduledDate || timeSlot);
    if (hasSchedule && (!scheduledDate || !timeSlot)) { setError('Choose both a preferred date and time slot.'); return; }
    const date = scheduledDate && timeSlot ? new Date(`${scheduledDate}T${timeSlot}:00`) : undefined;
    if (date && (Number.isNaN(date.getTime()) || date <= new Date())) { setError('Preferred date and time slot must be in the future.'); return; }
    if (offer?.productId && !eligibleOrders.some((order) => order.id === orderId)) { setError('Select your qualifying delivered product order.'); return; }
    setBusy(true); setError('');
    try {
      const result = await createServiceBooking(token, {
        contractorId: params.contractorId, serviceType: service.serviceType, address: address.trim(), notes: notes.trim(),
        ...(addressId ? { addressId } : {}), ...(date ? { scheduledFor: date.toISOString() } : {}),
        ...(offer ? { offerId: offer.id, ...(offer.productId ? { orderId } : {}) } : {}),
      });
      setBooking(result);
      await client.invalidateQueries({ queryKey: ['services', 'bookings', user.id] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to submit your request'); }
    finally { setBusy(false); }
  }

  return <PortalShell eyebrow="SERVICE BOOKING" title={booking ? 'Your request has been submitted.' : 'Book your specialist.'} copy="Customer request → admin review → technician acceptance → completion." actions={<PortalButton label="Find a technician" secondary onPress={() => router.push('/services/nearby')} />}>
    {booking ? <PortalCard title="Waiting for admin approval" copy={booking.id}><StatusBadge label="Pending admin review" tone="warning" /><Text style={{ color: colors.cream }}>Visit charge: {formatMoney(booking.finalPriceInPaise ?? 0)}{booking.discountInPaise ? ' · Saved ' + formatMoney(booking.discountInPaise) : ''}</Text><PortalButton label="View my service requests" onPress={() => router.push('/services/bookings')} /></PortalCard> :
    !params.contractorId ? <PortalCard title="Select a specialist first" copy="Browse available technicians, view their services and visit charges, then request the service you need."><PortalButton label="Browse specialists" onPress={() => router.push('/services/nearby')} /></PortalCard> :
    profile.isLoading ? <PortalCard copy="Loading technician details…" /> :
    profile.isError ? <PortalCard title="Technician unavailable" copy={profile.error.message}><PortalButton label="Retry" onPress={() => void profile.refetch()} /></PortalCard> :
    <><PortalCard title={profile.data?.name} copy={profile.data?.bio ?? profile.data?.serviceArea ?? 'Approved service professional'}><Text style={{ color: colors.muted }}>{profile.data?.skills.join(', ')} · {profile.data?.serviceArea} · {profile.data?.experienceYears ?? 0} years experience</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{profile.data?.services.map((item) => <PortalButton key={item.id} label={item.serviceType + ' · ' + formatMoney(item.visitChargeInPaise)} secondary={service?.id !== item.id} onPress={() => { setServiceType(item.serviceType); setOfferId(''); setOrderId(''); }} />)}</View></PortalCard>
    <PortalCard title="Request details">
      <Text style={{ color: colors.cream }}>Saved service addresses</Text>
      {addresses.isLoading ? <Text style={{ color: colors.muted }}>Loading saved addresses…</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{addresses.data?.map((item) => <PortalButton key={item.id} label={`${item.label}: ${item.city}${item.isDefault ? ' (default)' : ''}`} secondary={addressId !== item.id} onPress={() => chooseAddress(item.id)} />)}</View>
      <View style={{ gap: 6 }}><Text style={{ color: colors.muted }}>Service address</Text><TextInput accessibilityLabel="Service address" value={address} onChangeText={(value) => { setAddress(value); setAddressId(''); }} style={inputStyle} /></View>
      <View style={{ gap: 6 }}><Text style={{ color: colors.muted }}>City</Text><TextInput accessibilityLabel="City" value={city} onChangeText={(value) => { setCity(value); setAddressId(''); }} style={inputStyle} /></View>
      <PortalButton label={savingAddress ? 'Saving address…' : selectedAddress ? 'Selected saved address' : 'Save this service address'} secondary disabled={savingAddress || Boolean(selectedAddress)} onPress={() => void saveAddress()} />
      <View style={{ gap: 8 }}><Text style={{ color: colors.muted }}>Schedule your visit</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><View style={{ flexGrow: 1, flexBasis: 180, gap: 6 }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>DATE</Text>{Platform.OS === 'web' ? createElement('input', { type: 'date', value: scheduledDate, min: inputDate(new Date()), onChange: (event: unknown) => setScheduledDate((event as { currentTarget: { value: string } }).currentTarget.value), 'aria-label': 'Preferred visit date', style: { width: '100%', minHeight: 46, padding: '0 12px', border: `1px solid ${colors.line}`, borderRadius: 6, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 14, boxSizing: 'border-box' } }) : <TextInput accessibilityLabel="Preferred visit date" value={scheduledDate} onChangeText={setScheduledDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={inputStyle} />}</View><View style={{ flexGrow: 1, flexBasis: 220, gap: 6 }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>TIME SLOT</Text>{Platform.OS === 'web' ? createElement('select', { value: timeSlot, onChange: (event: unknown) => setTimeSlot((event as { currentTarget: { value: string } }).currentTarget.value), 'aria-label': 'Preferred visit time slot', style: { width: '100%', minHeight: 46, padding: '0 12px', border: `1px solid ${colors.line}`, borderRadius: 6, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 14, boxSizing: 'border-box' } }, timeSlots.map((slot) => createElement('option', { key: slot.value, value: slot.value }, slot.label))) : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{timeSlots.map((slot) => <Pressable key={slot.value} accessibilityRole="radio" accessibilityState={{ checked: timeSlot === slot.value }} onPress={() => setTimeSlot(slot.value)} style={{ flexGrow: 1, flexBasis: 100, minHeight: 42, paddingHorizontal: 8, borderWidth: 1, borderColor: timeSlot === slot.value ? colors.copper : colors.line, borderRadius: 6, backgroundColor: timeSlot === slot.value ? colors.copperTint : colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: timeSlot === slot.value ? colors.copper : colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' }}>{slot.label}</Text></Pressable>)}</View>}</View></View><Text style={{ color: colors.muted, fontSize: 11 }}>Choose a date and one of the available visit windows.</Text></View>
      <View style={{ gap: 6 }}><Text style={{ color: colors.muted }}>Requirement notes (optional)</Text><TextInput accessibilityLabel="Requirement notes" value={notes} onChangeText={setNotes} style={inputStyle} /></View>
      <Text style={{ color: colors.cream }}>Available offers</Text><PortalButton label="No offer" secondary={Boolean(offerId)} onPress={() => { setOfferId(''); setOrderId(''); }} />
      {offers.isError ? <Text style={{ color: colors.danger }}>Offers could not be loaded. You can book without an offer or retry later.</Text> : null}
      {validOffers.map((item) => <PortalButton key={item.id} label={item.title + ' — up to ' + formatMoney(item.discountInPaise) + (item.productId ? ' (product purchase required)' : '')} secondary={offerId !== item.id} onPress={() => { setOfferId(item.id); setOrderId(''); }} />)}
      {offer?.productId ? <><Text style={{ color: colors.muted }}>Choose a qualifying delivered order. A product order can be used for one service booking only.</Text>{eligibleOrders.length ? eligibleOrders.map((order) => <PortalButton key={order.id} label={order.id} secondary={orderId !== order.id} onPress={() => setOrderId(order.id)} />) : <Text style={{ color: colors.danger }}>No qualifying delivered order found for this account.</Text>}</> : null}
      <Text style={{ color: colors.cream }}>Visit charge {formatMoney(base)} − offer {formatMoney(discount)} = {formatMoney(base - discount)}</Text><Text style={{ color: colors.muted }}>This is the visit charge only. Additional labour and materials are quoted separately. Prices and offer eligibility are checked again when you submit.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      <PortalButton label={busy ? 'Submitting…' : user?.role === 'CUSTOMER' ? 'Send request to admin' : 'Sign in as customer to book'} disabled={busy || !service || profile.data?.availability !== 'AVAILABLE'} onPress={() => void submit()} />
    </PortalCard></>}
  </PortalShell>;
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

