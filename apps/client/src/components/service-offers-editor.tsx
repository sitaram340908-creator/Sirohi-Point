import type { ServiceOffer, ServiceOfferInput } from '@/shared/contracts';
import type { ThemeColors } from '@/shared/design-tokens';
import { formatMoney } from '@/shared/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getAdminContractors, getAdminProducts, getAdminServiceOffers, saveAdminServiceOffer } from '@/lib/api';
import { useAppTheme } from '@/theme/theme-context';
import { AdminPermissionContext } from '@/app/admin/admin-permission-context';
import { PortalButton, PortalCard } from './portal-ui';

const empty = { title: '', description: '', discount: '', serviceType: '', contractorId: '', productId: '', active: true };

function ProductSelect({
  value,
  products,
  onSelect,
  colors,
}: {
  value: string;
  products: { id: string; name: string; brand?: string; category?: string; active: boolean }[];
  onSelect(productId: string): void;
  colors: ThemeColors;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const activeProducts = products.filter((p) => p.active);
  const selected = activeProducts.find((p) => p.id === value);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = normalizedSearch
    ? activeProducts.filter((p) =>
        `${p.name} ${p.brand ?? ''} ${p.category ?? ''}`.toLowerCase().includes(normalizedSearch)
      )
    : activeProducts;

  return (
    <View style={{ gap: 4, zIndex: 20 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Eligible product purchase (optional)</Text>
      <TextInput
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChangeText={(text) => {
          setSearch(text);
          setOpen(true);
        }}
        placeholder="Search and select an eligible product"
        placeholderTextColor={colors.muted}
        style={{
          color: colors.cream,
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          minHeight: 44,
          fontSize: 13,
        }}
        accessibilityLabel="Search eligible product"
      />
      {open ? (
        <View
          style={{
            maxHeight: 220,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 8,
            backgroundColor: colors.surfaceSunken,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 218 }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !value }}
              onPressIn={() => {
                onSelect('');
                setSearch('');
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                backgroundColor: !value ? colors.tealTint : undefined,
              }}
            >
              <Text
                style={{
                  color: !value ? colors.teal : colors.muted,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {!value ? '✓ ' : ''}No purchase required
              </Text>
            </Pressable>
            {filteredProducts.length ? (
              filteredProducts.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === p.id }}
                  onPressIn={() => {
                    onSelect(p.id);
                    setSearch('');
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    backgroundColor: value === p.id ? colors.tealTint : undefined,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: value === p.id ? colors.teal : colors.muted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {value === p.id ? '✓ ' : ''}{p.name}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>No matching products found.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : null}
      {selected && !open ? (
        <Text style={{ color: colors.teal, fontSize: 11, fontWeight: '800' }}>
          Selected: {selected.name}
        </Text>
      ) : null}
    </View>
  );
}

function TechnicianSelect({
  value,
  contractors,
  onSelect,
  colors,
}: {
  value: string;
  contractors: { id: string; name: string; email?: string; phone?: string; serviceArea?: string; skills?: string[]; approvalStatus: string }[];
  onSelect(contractorId: string): void;
  colors: ThemeColors;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const approvedContractors = contractors.filter((c) => c.approvalStatus === 'APPROVED');
  const selected = approvedContractors.find((c) => c.id === value);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredContractors = normalizedSearch
    ? approvedContractors.filter((c) =>
        `${c.name} ${c.email ?? ''} ${c.phone ?? ''} ${c.serviceArea ?? ''} ${(c.skills ?? []).join(' ')}`
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : approvedContractors;

  return (
    <View style={{ gap: 4, zIndex: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Technician (optional)</Text>
      <TextInput
        value={search}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChangeText={(text) => {
          setSearch(text);
          setOpen(true);
        }}
        placeholder="Search and select a technician"
        placeholderTextColor={colors.muted}
        style={{
          color: colors.cream,
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          minHeight: 44,
          fontSize: 13,
        }}
        accessibilityLabel="Search technician"
      />
      {open ? (
        <View
          style={{
            maxHeight: 220,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: 8,
            backgroundColor: colors.surfaceSunken,
            overflow: 'hidden',
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 218 }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !value }}
              onPressIn={() => {
                onSelect('');
                setSearch('');
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                backgroundColor: !value ? colors.tealTint : undefined,
              }}
            >
              <Text
                style={{
                  color: !value ? colors.teal : colors.muted,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {!value ? '✓ ' : ''}Any approved technician
              </Text>
            </Pressable>
            {filteredContractors.length ? (
              filteredContractors.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === c.id }}
                  onPressIn={() => {
                    onSelect(c.id);
                    setSearch('');
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    backgroundColor: value === c.id ? colors.tealTint : undefined,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: value === c.id ? colors.teal : colors.muted,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {value === c.id ? '✓ ' : ''}{c.name}{c.serviceArea ? ` · ${c.serviceArea}` : ''}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>No matching technicians found.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : null}
      {selected && !open ? (
        <Text style={{ color: colors.teal, fontSize: 11, fontWeight: '800' }}>
          Selected: {selected.name}{selected.serviceArea ? ` (${selected.serviceArea})` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export function ServiceOffersEditor({ token }: { token: string }) {
  const can = useContext(AdminPermissionContext);
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const [form, setForm] = useState(empty);
  const [id, setId] = useState<string>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const offers = useQuery({ queryKey: ['admin', 'service-offers'], queryFn: () => getAdminServiceOffers(token) });
  const canCreate = can('serviceOffers.create');
  const canEdit = can('serviceOffers.edit');
  const canManage = canCreate || canEdit;
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: () => getAdminProducts(token), enabled: canManage && can('products.view') });
  const contractors = useQuery({ queryKey: ['admin', 'contractors'], queryFn: () => getAdminContractors(token), enabled: canManage && can('technicians.view') });

  function edit(offer: ServiceOffer) {
    setId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description,
      discount: String(offer.discountInPaise / 100),
      serviceType: offer.serviceType ?? '',
      contractorId: offer.contractorId ?? '',
      productId: offer.productId ?? '',
      active: offer.active,
    });
  }

  async function save() {
    if (busy) return;
    const input: ServiceOfferInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      discountInPaise: Math.round(Number(form.discount) * 100),
      serviceType: form.serviceType.trim() || null,
      productId: form.productId || null,
      contractorId: form.contractorId || null,
      active: form.active,
    };
    if (!Number.isFinite(input.discountInPaise) || input.discountInPaise <= 0) {
      setMessage('Discount must be a positive amount in rupees.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await saveAdminServiceOffer(token, input, id);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'service-offers'] }),
        client.invalidateQueries({ queryKey: ['service-offers'] }),
      ]);
      setId(undefined);
      setForm(empty);
      setMessage('Service offer saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save offer');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    color: colors.cream,
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  };

  return (
    <View style={{ gap: 18 }}>
      {(id ? canEdit : canCreate) ? <PortalCard
        title={id ? 'Edit service offer' : 'New service offer'}
        copy="Discounts apply to the listed visit charge, capped at that charge. Product-linked offers require the customer's delivered order and can be used once per order."
      >
        {(['title', 'description', 'discount', 'serviceType'] as const).map((key) => {
          const label =
            key === 'discount'
              ? 'Discount (₹)'
              : key === 'serviceType'
              ? 'Service type (blank = any)'
              : key;
          return (
            <View key={key} style={{ gap: 6 }}>
              <Text style={{ color: colors.muted }}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                value={form[key]}
                onChangeText={(value) => setForm({ ...form, [key]: value })}
                style={inputStyle}
              />
            </View>
          );
        })}
        {can('products.view') ? <ProductSelect
          value={form.productId}
          products={products.data ?? []}
          onSelect={(productId) => setForm({ ...form, productId })}
          colors={colors}
        /> : null}
        {can('technicians.view') ? <TechnicianSelect
          value={form.contractorId}
          contractors={contractors.data ?? []}
          onSelect={(contractorId) => setForm({ ...form, contractorId })}
          colors={colors}
        /> : null}
        <PortalButton
          label={form.active ? 'Active ✓' : 'Inactive'}
          secondary={!form.active}
          onPress={() => setForm({ ...form, active: !form.active })}
        />
        {id && !canEdit ? null : <PortalButton
          label={busy ? 'Saving…' : 'Save offer'}
          disabled={busy}
          onPress={() => void save()}
        />}
        {id ? (
          <PortalButton
            label="Cancel editing"
            secondary
            onPress={() => {
              setId(undefined);
              setForm(empty);
            }}
          />
        ) : null}
        {message ? <Text accessibilityRole="alert" style={{ color: colors.cream }}>{message}</Text> : null}
      </PortalCard> : null}
      {offers.isLoading ? (
        <PortalCard copy="Loading offers…" />
      ) : offers.isError ? (
        <PortalCard copy="Unable to load offers." />
      ) : (
        offers.data?.map((offer) => (
          <PortalCard
            key={offer.id}
            title={offer.title}
            copy={`${offer.active ? 'Active' : 'Inactive'} · Up to ${formatMoney(offer.discountInPaise)} off the visit charge`}
          >
            {canEdit ? <PortalButton label="Edit offer" secondary onPress={() => edit(offer)} /> : null}
          </PortalCard>
        ))
      )}
    </View>
  );
}
