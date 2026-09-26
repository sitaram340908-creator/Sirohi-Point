import type { CustomerAddress, CustomerAddressInput, PublicUser } from '@/shared/contracts';
import { createElement, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import type { ThemeColors } from '@/shared/design-tokens';

import { ADDRESS_LABEL_OPTIONS, INDIAN_STATE_OPTIONS } from '@/lib/address-options';
import { makeDefaultCustomerAddress, saveCustomerAddress, updateCustomerAddress } from '@/lib/api';
import { useBusinessStyles } from '@/theme/business-theme';

type AddressForm = CustomerAddressInput & { id?: string };

export function BusinessAddressManager({ user, token, addresses, loading, onChanged }: {
  user: PublicUser;
  token: string;
  addresses: CustomerAddress[];
  loading: boolean;
  onChanged(): Promise<unknown>;
}) {
  const styles = useBusinessStyles(createStyles);
  const [form, setForm] = useState<AddressForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function setField<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }
  function addAddress() {
    setMessage(null);
    setForm({ label: 'Office', name: user.name, line1: '', city: '', state: '', postalCode: '', phone: user.phone ?? '', alternatePhone: '', houseNumber: '', isDefault: addresses.length === 0 });
  }
  function editAddress(address: CustomerAddress) {
    setMessage(null);
    setForm({ id: address.id, label: address.label, name: address.name ?? '', line1: address.line1, city: address.city, state: address.state ?? '', postalCode: address.postalCode ?? '', phone: address.phone ?? '', alternatePhone: address.alternatePhone ?? '', houseNumber: address.houseNumber ?? '', isDefault: address.isDefault });
  }
  async function saveAddress() {
    if (!form) return;
    setSaving(true); setMessage(null);
    const { id, ...input } = form;
    try {
      if (id) await updateCustomerAddress(token, id, input);
      else await saveCustomerAddress(token, input);
      await onChanged(); setForm(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save this address.'); }
    finally { setSaving(false); }
  }
  async function makeDefault(id: string) {
    setSaving(true); setMessage(null);
    try { await makeDefaultCustomerAddress(token, id); await onChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to set the default address.'); }
    finally { setSaving(false); }
  }

  return <View style={styles.panel}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>DELIVERY ADDRESSES</Text><Text style={styles.title}>Your saved addresses</Text><Text style={styles.copy}>Save multiple office, site, and delivery addresses for business orders.</Text></View>{!form ? <Pressable accessibilityRole="button" onPress={addAddress} style={styles.addButton}><Text style={styles.addButtonText}>+ Add address</Text></Pressable> : null}</View>
    {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
    {form ? <View style={styles.form}>
      <Text style={styles.formTitle}>{form.id ? 'Edit address' : 'Add a new address'}</Text>
      <View style={styles.grid}>
        <SelectField label="LABEL" value={form.label} options={ADDRESS_LABEL_OPTIONS} onChange={(value) => setField('label', value)} />
        <Field label="CONTACT NAME" value={form.name ?? ''} onChangeText={(value) => setField('name', value)} placeholder="Recipient name" />
        <Field label="FLAT / HOUSE / BUILDING" value={form.houseNumber ?? ''} onChangeText={(value) => setField('houseNumber', value)} placeholder="Flat, house or building name" />
        <Field label="CITY" value={form.city} onChangeText={(value) => setField('city', value)} placeholder="City" />
        <SelectField label="STATE" value={form.state ?? ''} options={INDIAN_STATE_OPTIONS} onChange={(value) => setField('state', value)} />
        <Field label="PIN CODE" value={form.postalCode ?? ''} onChangeText={(value) => setField('postalCode', value)} placeholder="PIN code" keyboardType="number-pad" />
        <Field label="PRIMARY PHONE" value={form.phone ?? ''} onChangeText={(value) => setField('phone', value)} placeholder="Primary delivery number" keyboardType="phone-pad" />
        <Field label="ALTERNATIVE PHONE (OPTIONAL)" value={form.alternatePhone ?? ''} onChangeText={(value) => setField('alternatePhone', value)} placeholder="Backup contact number" keyboardType="phone-pad" />
      </View>
      <View><Text style={styles.label}>STREET / AREA / LANDMARK</Text><TextInput accessibilityLabel="Street, area and landmark" value={form.line1} onChangeText={(value) => setField('line1', value)} placeholder="Street, area and landmark" placeholderTextColor={styles.placeholder.color} multiline style={[styles.input, styles.textarea]} /></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.isDefault }} onPress={() => setField('isDefault', !form.isDefault)} style={styles.defaultChoice}><View style={[styles.checkbox, form.isDefault && styles.checkboxActive]}>{form.isDefault ? <Text style={styles.check}>✓</Text> : null}</View><Text style={styles.choiceText}>Set as default delivery address</Text></Pressable>
      <View style={styles.actions}><Pressable disabled={saving} onPress={() => void saveAddress()} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save address</Text>}</Pressable><Pressable disabled={saving} onPress={() => setForm(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable></View>
    </View> : null}
    {loading ? <Text style={styles.status}>Loading saved addresses…</Text> : null}
    {!loading && !addresses.length && !form ? <View style={styles.empty}><Text style={styles.emptyTitle}>No saved addresses</Text><Text style={styles.copy}>Add office, site, or delivery addresses for your business orders.</Text></View> : null}
    {!loading && addresses.length ? <View style={styles.addressGrid}>{addresses.map((address) => <View key={address.id} style={styles.addressCard}><View style={styles.addressTop}><Text style={styles.addressLabel}>{address.label.toUpperCase()}</Text>{address.isDefault ? <Text style={styles.defaultPill}>DEFAULT</Text> : null}</View>{address.name ? <Text style={styles.addressName}>{address.name}</Text> : null}<Text style={styles.addressName}>{[address.houseNumber, address.line1].filter(Boolean).join(', ')}</Text><Text style={styles.addressCopy}>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</Text>{address.phone ? <Text style={styles.addressCopy}>Primary phone · {address.phone}</Text> : null}{address.alternatePhone ? <Text style={styles.addressCopy}>Alternative phone · {address.alternatePhone}</Text> : null}<View style={styles.cardActions}><Pressable onPress={() => editAddress(address)}><Text style={styles.link}>Edit address</Text></Pressable>{!address.isDefault ? <Pressable disabled={saving} onPress={() => void makeDefault(address.id)}><Text style={styles.link}>Set default</Text></Pressable> : null}</View></View>)}</View> : null}
  </View>;
}

function Field({ label, keyboardType, ...props }: { label: string; value: string; onChangeText(value: string): void; placeholder: string; keyboardType?: KeyboardTypeOptions }) { const styles = useBusinessStyles(createStyles); return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} keyboardType={keyboardType} placeholderTextColor={styles.placeholder.color} style={styles.input} /></View>; }
function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: string; options: readonly T[]; onChange(value: T): void }) {
  const styles = useBusinessStyles(createStyles);
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return <View style={styles.field}><Text style={styles.label}>{label}</Text>{createElement('select', { value, onChange: (event: unknown) => onChange((event as { currentTarget: { value: string } }).currentTarget.value as T), 'aria-label': `Select ${label.toLowerCase()}`, style: { width: '100%', minHeight: 44, padding: '0 11px', borderRadius: 9, border: '1px solid #2C4056', backgroundColor: '#FFFFFF', color: '#182D45', fontSize: 12 } }, options.map((option) => createElement('option', { key: option, value: option }, option)))}</View>;
  }
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={styles.select}><Text style={[styles.selectText, !value && styles.placeholder]}>{value || `Select ${label.toLowerCase()}`}</Text><Text style={styles.selectText}>{open ? '⌃' : '⌄'}</Text></Pressable>{open ? <View style={styles.options}><ScrollView nestedScrollEnabled style={styles.optionsScroll}>{options.map((option) => <Pressable key={option} onPress={() => { onChange(option); setOpen(false); }} style={styles.option}><Text style={styles.optionText}>{value === option ? '✓ ' : ''}{option}</Text></Pressable>)}</ScrollView></View> : null}</View>;
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  panel: { padding: 24, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, gap: 18 }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }, eyebrow: { color: c.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, title: { color: c.cream, fontSize: 22, fontWeight: '800', marginTop: 5 }, copy: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }, addButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.cta, alignItems: 'center', justifyContent: 'center' }, addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, form: { padding: 16, borderRadius: 14, backgroundColor: c.surfaceSunken, gap: 14 }, formTitle: { color: c.cream, fontSize: 16, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, field: { flexGrow: 1, flexShrink: 1, flexBasis: 210, gap: 6 }, label: { color: c.muted, fontSize: 10, fontWeight: '900', letterSpacing: .5 }, input: { minHeight: 44, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.cream, fontSize: 12 }, textarea: { minHeight: 78, paddingVertical: 10, textAlignVertical: 'top' }, select: { minHeight: 44, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectText: { color: c.cream, fontSize: 12 }, placeholder: { color: c.muted }, options: { position: 'absolute', zIndex: 10, top: 67, left: 0, right: 0, maxHeight: 190, borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.surface }, optionsScroll: { maxHeight: 188 }, option: { minHeight: 38, paddingHorizontal: 11, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: c.line }, optionText: { color: c.cream, fontSize: 12 }, defaultChoice: { flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' }, checkboxActive: { backgroundColor: c.cta, borderColor: c.cta }, check: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, choiceText: { color: c.cream, fontSize: 12, fontWeight: '700' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, saveButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.cta, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, cancelButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: c.cream, fontSize: 12, fontWeight: '800' }, disabled: { opacity: .5 }, status: { color: c.muted, fontSize: 12 }, error: { color: c.copper, fontSize: 12, fontWeight: '700' }, empty: { padding: 18, borderRadius: 12, backgroundColor: c.surfaceSunken }, emptyTitle: { color: c.cream, fontSize: 14, fontWeight: '800' }, addressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, addressCard: { flexGrow: 1, flexShrink: 1, flexBasis: 250, padding: 15, borderWidth: 1, borderColor: c.line, borderRadius: 12, gap: 5 }, addressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, addressLabel: { color: c.teal, fontSize: 10, fontWeight: '900', letterSpacing: .8 }, defaultPill: { color: c.cta, fontSize: 9, fontWeight: '900' }, addressName: { color: c.cream, fontSize: 13, fontWeight: '700', lineHeight: 19 }, addressCopy: { color: c.muted, fontSize: 11, lineHeight: 17 }, cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 5 }, link: { color: c.teal, fontSize: 11, fontWeight: '800' },
});

