import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { calculateCartTotal, formatMoney } from '@/shared/domain';
import type { CustomerAddress } from '@/shared/contracts';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { createElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { CartQuantity } from '@/components/cart-quantity';
import { ProductVisual } from '@/components/product-visual';
import { ADDRESS_LABEL_OPTIONS, INDIAN_STATE_OPTIONS } from '@/lib/address-options';
import { getB2CProduct, getCustomerAddresses, initiateRazorpayPayment, saveCustomerAddress, submitOrder, verifyRazorpayPayment } from '@/lib/api';
import { cartQuantityError } from '@/lib/cart-rules';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useCustomerStyles as useThemedStyles } from '@/theme/customer-theme';
import { useLanguage } from '@/state/language-context';

type DeliveryMode = 'standard' | 'express';
type PaymentMethod = 'COD' | 'ONLINE';
const EMPTY_ADDRESSES: CustomerAddress[] = [];

interface RazorpayCheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color: string };
  handler(response: RazorpayCheckoutSuccess): void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open(): void;
  on(event: 'payment.failed', handler: () => void): void;
}

interface RazorpayCheckoutConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayCheckoutInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutConstructor;
  }
}

function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('Razorpay checkout is available only in a web browser.'));
  if (window.Razorpay) return Promise.resolve();
  const existing = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

export default function CartScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const { cart, buyNowProduct, buyNowQuantity, clearBuyNow, clearCart, placeOrder, setBuyNowQuantity, showNotice } = useAppState();
  const { user, token } = useAuth();
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string | null>(null);
  const [addingShippingAddress, setAddingShippingAddress] = useState(false);
  const [savingShippingAddress, setSavingShippingAddress] = useState(false);
  const [shippingAddressName, setShippingAddressName] = useState('');
  const [shippingHouseNumber, setShippingHouseNumber] = useState('');
  const [shippingCompleteAddress, setShippingCompleteAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAlternatePhone, setShippingAlternatePhone] = useState('');
  const [shippingAddressLabel, setShippingAddressLabel] = useState<(typeof ADDRESS_LABEL_OPTIONS)[number]>('Home');
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [completeAddress, setCompleteAddress] = useState('');
  const [addressName, setAddressName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [alternateAddressPhone, setAlternateAddressPhone] = useState('');
  const [addressLabel, setAddressLabel] = useState<(typeof ADDRESS_LABEL_OPTIONS)[number]>('Home');
  // Use the rendered content width as well as the viewport width. This keeps
  // the cart in a single column when it is displayed inside a narrow mobile
  // shell, even if the browser viewport itself is wider.
  const desktop = width >= 920 && contentWidth >= 920;
  const isBuyNow = Boolean(buyNowProduct);
  const cartIds = isBuyNow ? [] : Object.keys(cart).sort();
  const catalog = useQuery({ queryKey: ['catalog', 'b2c', 'cart', user?.id, cartIds], queryFn: () => Promise.all(cartIds.map(getB2CProduct)) });
  const addressesQuery = useQuery({ queryKey: ['customer-addresses', user?.id], queryFn: () => getCustomerAddresses(token!), enabled: user?.role === 'CUSTOMER' && Boolean(token) });
  const products = buyNowProduct ? [buyNowProduct] : catalog.data ?? [];
  const compactLine = width < 620;
  const lines = useMemo(
    () => buyNowProduct
      ? [{ product: buyNowProduct, quantity: buyNowQuantity }]
      : products.filter((product) => (cart[product.id] ?? 0) > 0).map((product) => ({ product, quantity: cart[product.id] })),
    [buyNowProduct, buyNowQuantity, cart, products],
  );
  const subtotal = calculateCartTotal(lines);
  const delivery = lines.reduce((sum, line) => sum + (line.product.deliveryChargeInPaise ?? 5000) * line.quantity, 0);
  const total = subtotal + delivery;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const codAvailable = lines.length > 0 && lines.every(({ product }) => product.codAvailable !== false);
  const savedAddresses = addressesQuery.data ?? EMPTY_ADDRESSES;
  const selectedAddress = addingAddress ? null : savedAddresses.find((item) => item.id === selectedAddressId) ?? savedAddresses.find((item) => item.isDefault) ?? savedAddresses[0] ?? null;
  const selectedShippingAddress = addingShippingAddress ? null : savedAddresses.find((item) => item.id === selectedShippingAddressId) ?? null;
  const showNewAddressForm = addingAddress || (!addressesQuery.isLoading && savedAddresses.length === 0);
  const showNewShippingAddressForm = addingShippingAddress || (!addressesQuery.isLoading && savedAddresses.length === 0);

  useEffect(() => {
    if (!showNewAddressForm) return;
    setAddressName((value) => value || user?.name || '');
    setAddressPhone((value) => value || user?.phone || '');
  }, [showNewAddressForm, user?.name, user?.phone]);

  useEffect(() => {
    if (!showNewShippingAddressForm) return;
    setShippingAddressName((value) => value || user?.name || '');
    setShippingPhone((value) => value || user?.phone || '');
  }, [showNewShippingAddressForm, user?.name, user?.phone]);

  useEffect(() => {
    if (!codAvailable && paymentMethod === 'COD') setPaymentMethod('ONLINE');
  }, [codAvailable, paymentMethod]);

  function changeBuyNowQuantity(nextQuantity: number) {
    if (!buyNowProduct) return;
    const error = cartQuantityError(buyNowProduct, nextQuantity, false);
    if (error) {
      showNotice(error);
      return;
    }
    setBuyNowQuantity(nextQuantity);
  }

  async function completeRazorpayPayment(response: RazorpayCheckoutSuccess, razorpayOrderId: string, deliveryAddress: string) {
    if (!token || response.razorpay_order_id !== razorpayOrderId) {
      showNotice('Razorpay returned an invalid payment order.');
      return;
    }
    setSubmitting(true);
    try {
      const payment = await verifyRazorpayPayment(token, {
        razorpayOrderId,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      if (payment.state !== 'COMPLETED' || !payment.orderId) throw new Error('Razorpay payment was not captured. Your cart is still available.');
      const order = placeOrder({
        totalInPaise: payment.amount,
        itemCount,
        deliveryMode,
        paymentMethod: 'ONLINE',
        address: deliveryAddress,
        items: lines.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          unitPriceInPaise: product.priceInPaise,
        })),
      }, payment.orderId, !isBuyNow);
      clearBuyNow();
      setOrderId(order.id);
      setOrdered(true);
    } catch (reason) {
      showNotice(reason instanceof Error ? reason.message : 'Unable to verify the Razorpay payment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveNewAddress(): Promise<CustomerAddress | null> {
    if (user?.role !== 'CUSTOMER' || !token) {
      showNotice('Sign in before adding a billing address.');
      return null;
    }
    if (completeAddress.trim().length < 10) {
      showNotice('Please enter a complete billing address.');
      return null;
    }
    if (city.trim().length < 2) {
      showNotice('Please enter your city.');
      return null;
    }
    if (!postalCode.trim()) {
      showNotice('Please enter your PIN code.');
      return null;
    }
    setSavingAddress(true);
    try {
      const saved = await saveCustomerAddress(token, {
        label: addressLabel,
        name: addressName.trim() || undefined,
        line1: completeAddress.trim(),
        houseNumber: houseNumber.trim() || undefined,
        city: city.trim(),
        state: state || undefined,
        postalCode: postalCode.trim(),
        ...(addressPhone.trim() ? { phone: addressPhone.trim() } : {}),
        ...(alternateAddressPhone.trim() ? { alternatePhone: alternateAddressPhone.trim() } : {}),
        isDefault: savedAddresses.length === 0,
      });
      await addressesQuery.refetch();
      setSelectedAddressId(saved.id);
      setAddingAddress(false);
      setCompleteAddress('');
      setAddressName('');
      setHouseNumber('');
      setCity('');
      setState('');
      setPostalCode('');
      setAddressPhone('');
      setAlternateAddressPhone('');
      showNotice('Address saved and selected for billing.');
      return saved;
    } catch (reason) {
      showNotice(reason instanceof Error ? reason.message : 'Unable to save this address.');
      return null;
    } finally {
      setSavingAddress(false);
    }
  }

  async function saveNewShippingAddress(): Promise<CustomerAddress | null> {
    if (user?.role !== 'CUSTOMER' || !token) return null;
    if (shippingCompleteAddress.trim().length < 10 || shippingCity.trim().length < 2 || !shippingPostalCode.trim()) {
      showNotice('Please complete the shipping address, city, and PIN code.');
      return null;
    }
    setSavingShippingAddress(true);
    try {
      const saved = await saveCustomerAddress(token, {
        label: shippingAddressLabel,
        name: shippingAddressName.trim() || undefined,
        line1: shippingCompleteAddress.trim(),
        houseNumber: shippingHouseNumber.trim() || undefined,
        city: shippingCity.trim(),
        state: shippingState || undefined,
        postalCode: shippingPostalCode.trim(),
        ...(shippingPhone.trim() ? { phone: shippingPhone.trim() } : {}),
        ...(shippingAlternatePhone.trim() ? { alternatePhone: shippingAlternatePhone.trim() } : {}),
        isDefault: false,
      });
      await addressesQuery.refetch();
      setSelectedShippingAddressId(saved.id);
      setAddingShippingAddress(false);
      setShippingCompleteAddress(''); setShippingAddressName(''); setShippingHouseNumber(''); setShippingCity(''); setShippingState(''); setShippingPostalCode(''); setShippingPhone(''); setShippingAlternatePhone('');
      showNotice('Shipping address saved and selected.');
      return saved;
    } catch (reason) {
      showNotice(reason instanceof Error ? reason.message : 'Unable to save this shipping address.');
      return null;
    } finally {
      setSavingShippingAddress(false);
    }
  }

  async function confirmOrder() {
    if (submitting || savingAddress) return;
    if (user?.role !== 'CUSTOMER' || !token) {
      showNotice('Sign in before placing your order.');
      router.replace({ pathname: '/customer/login', params: { returnTo: 'cart' } } as never);
      return;
    }
    let chosenAddress = selectedAddress;
    if (!chosenAddress && showNewAddressForm) chosenAddress = await saveNewAddress();
    if (!chosenAddress) {
      showNotice('Please choose or add a billing address.');
      return;
    }
    const billingAddress = formatDeliveryAddress(chosenAddress);
    let chosenShippingAddress = selectedShippingAddress;
    if (!shippingSameAsBilling && !chosenShippingAddress && showNewShippingAddressForm) chosenShippingAddress = await saveNewShippingAddress();
    if (!shippingSameAsBilling && !chosenShippingAddress) { showNotice('Please choose or add a shipping address.'); return; }
    const resolvedShippingAddress = shippingSameAsBilling ? billingAddress : formatDeliveryAddress(chosenShippingAddress!);
    if (paymentMethod === 'COD' && !codAvailable) {
      showNotice('Cash on delivery is unavailable for one or more products in your cart.');
      setPaymentMethod('ONLINE');
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        billingAddress,
        shippingSameAsBilling,
        ...(shippingSameAsBilling ? {} : { shippingAddress: resolvedShippingAddress }),
        paymentMethod,
        items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      };
      if (paymentMethod === 'ONLINE') {
        if (Platform.OS !== 'web') throw new Error('Razorpay checkout is currently available on the web version of the app.');
        const payment = await initiateRazorpayPayment(token, input);
        await loadRazorpayCheckout();
        if (!window.Razorpay) throw new Error('Razorpay checkout did not load.');
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: 'Sirohi Point',
          description: 'Customer order payment',
          order_id: payment.razorpayOrderId,
          prefill: { name: user.name, email: user.email, contact: user.phone ?? undefined },
          theme: { color: '#0F766E' },
          handler: (response) => void completeRazorpayPayment(response, payment.razorpayOrderId, resolvedShippingAddress),
          modal: { ondismiss: () => setSubmitting(false) },
        });
        checkout.on('payment.failed', () => {
          setSubmitting(false);
          showNotice('Razorpay payment failed. Your cart is still available.');
        });
        checkout.open();
        return;
      }
      const summary = await submitOrder(token, input);
      const order = placeOrder({
        totalInPaise: summary.totalInPaise,
        itemCount,
        deliveryMode,
        paymentMethod,
        address: resolvedShippingAddress,
        items: lines.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          unitPriceInPaise: product.priceInPaise,
        })),
      }, summary.id, !isBuyNow);
      clearBuyNow();
      setOrderId(order.id);
      setOrdered(true);
    } catch (reason) {
      showNotice(reason instanceof Error ? reason.message : 'Unable to place the order');
    } finally {
      setSubmitting(false);
    }
  }

  if (user?.role === 'BUSINESS') return <Redirect href="/business/cart" />;
  return (
    <AppShell>
      <View onLayout={(event) => setContentWidth(Math.round(event.nativeEvent.layout.width))} style={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{ordered ? t('Order submitted') : isBuyNow ? 'Buy now checkout' : `${t('Shopping cart')}${itemCount ? ` (${itemCount} ${t(itemCount === 1 ? 'item' : 'items')})` : ''}`}</Text>
        </View>

        {!lines.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{ordered ? t('Your order is awaiting admin approval.') : catalog.isLoading ? t('Loading your cart…') : catalog.isError ? t('Cart products are unavailable.') : t('Your cart is empty.')}</Text>
            <Text style={styles.emptyCopy}>
              {ordered
                ? t('Your order now appears in the account panel, where you can review its products, total and status.')
                : catalog.isError
                  ? t('The cart uses the current product catalogue from the backend. Check the API connection and try again.')
                : t('Add products from the store, then review quantities, delivery and payment here.')}
            </Text>
            {ordered ? (
              <View style={styles.confirmationCard}>
                <ConfirmationItem label="Order ID" value={orderId ?? 'Confirmed'} />
                <ConfirmationItem label="Delivery" value={deliveryMode === 'express' ? 'Express' : 'Standard'} />
                <ConfirmationItem label="Payment" value={paymentMethod === 'COD' ? 'Pay on delivery' : 'Online'} />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              onPress={() => router.push(ordered ? '/dashboard' : '/catalog')}
            >
                <Text style={styles.primaryText}>{ordered ? t('Track your order') : t('Continue shopping')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.columns, desktop && styles.columnsDesktop]}>
            <View style={[styles.lineList, desktop && styles.lineListDesktop]}>
              <View style={styles.listHeader}>
                <Text style={styles.listCopy}>{t('Quantities can be changed before you place the order')}</Text>
                {!isBuyNow ? <Pressable onPress={clearCart} style={styles.clearButton}><Text style={styles.clearText}>{t('Clear cart')}</Text></Pressable> : null}
              </View>

              {lines.map(({ product, quantity }) =>
                compactLine ? (
                  <View key={product.id} style={styles.lineCard}>
                    <View style={styles.lineCardTop}>
                      <View style={styles.lineVisual}>
                        <ProductVisual product={product} compact />
                      </View>
                      <View style={styles.lineCardInfo}>
                        <Text style={styles.lineBrand} numberOfLines={1}>{product.brand}</Text>
                        <Text style={styles.lineName} numberOfLines={2}>{product.name}</Text>
                        <View style={styles.lineStatus}>
                          <View style={styles.stockDot} />
                          <Text style={styles.lineMeta}>{product.stock} {t('in stock')}</Text>
                          <Text style={styles.lineMeta}>·</Text>
                          <Text style={styles.lineMeta}>{product.serviceAvailable ? t('Installation available') : t('Material only')}</Text>
                        </View>
                        <Text style={styles.lineMeta}>Delivery: {formatMoney((product.deliveryChargeInPaise ?? 5000) * quantity)}</Text>
                      </View>
                      <Text style={styles.linePriceCompact} numberOfLines={1}>{formatMoney(product.priceInPaise * quantity)}</Text>
                    </View>
                    <View style={styles.lineCardActions}>
                      {isBuyNow ? (
                        <View style={styles.stepper}>
                          <Pressable accessibilityRole="button" accessibilityLabel="Decrease buy now quantity" disabled={buyNowQuantity <= 1} style={[styles.stepButton, buyNowQuantity <= 1 && styles.disabled]} onPress={() => changeBuyNowQuantity(buyNowQuantity - 1)}>
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.quantity}>Qty {buyNowQuantity}</Text>
                          <Pressable accessibilityRole="button" accessibilityLabel="Increase buy now quantity" style={styles.stepButton} onPress={() => changeBuyNowQuantity(buyNowQuantity + 1)}>
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      ) : <CartQuantity product={product} quantity={quantity} />}
                    </View>
                  </View>
                ) : (
                  <View key={product.id} style={styles.line}>
                    <View style={styles.lineVisual}>
                      <ProductVisual product={product} compact />
                    </View>
                    <View style={styles.lineBody}>
                      <Text style={styles.lineBrand} numberOfLines={1}>{product.brand}</Text>
                      <Text style={styles.lineName} numberOfLines={2}>{product.name}</Text>
                      <View style={styles.lineStatus}>
                        <View style={styles.stockDot} />
                        <Text style={styles.lineMeta}>{product.stock} {t('in stock')}</Text>
                        <Text style={styles.lineMeta}>·</Text>
                        <Text style={styles.lineMeta}>{product.serviceAvailable ? t('Installation available') : t('Material only')}</Text>
                      </View>
                      <Text style={styles.lineMeta}>Delivery: {formatMoney((product.deliveryChargeInPaise ?? 5000) * quantity)}</Text>
                      {isBuyNow ? (
                        <View style={styles.stepper}>
                          <Pressable accessibilityRole="button" accessibilityLabel="Decrease buy now quantity" disabled={buyNowQuantity <= 1} style={[styles.stepButton, buyNowQuantity <= 1 && styles.disabled]} onPress={() => changeBuyNowQuantity(buyNowQuantity - 1)}>
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <Text style={styles.quantity}>Qty {buyNowQuantity}</Text>
                          <Pressable accessibilityRole="button" accessibilityLabel="Increase buy now quantity" style={styles.stepButton} onPress={() => changeBuyNowQuantity(buyNowQuantity + 1)}>
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      ) : <CartQuantity product={product} quantity={quantity} />}
                    </View>
                    <Text style={styles.linePrice} numberOfLines={1}>{formatMoney(product.priceInPaise * quantity)}</Text>
                  </View>
                ),
              )}

              <View style={styles.fulfilmentCard}>
                <View style={styles.deliveryHeader}><View><Text style={styles.panelTitle}>Billing address</Text><Text style={styles.deliveryCopy}>Choose a saved billing address or add a new one.</Text></View>{savedAddresses.length > 0 && !showNewAddressForm ? <Pressable accessibilityRole="button" style={styles.addAddressButton} onPress={() => setAddingAddress(true)}><Text style={styles.addAddressText}>+ Add new address</Text></Pressable> : null}</View>
                {addressesQuery.isLoading ? <Text style={styles.deliveryCopy}>Loading your saved addresses…</Text> : null}
                {addressesQuery.isError ? <Text style={styles.addressError}>Unable to load saved addresses. You can add a new address below.</Text> : null}
                {savedAddresses.length ? <View style={styles.addressOptions}>{savedAddresses.map((savedAddress) => <SavedAddressOption key={savedAddress.id} address={savedAddress} selected={!showNewAddressForm && selectedAddress?.id === savedAddress.id} onPress={() => { setSelectedAddressId(savedAddress.id); setAddingAddress(false); }} styles={styles} />)}</View> : null}
                {showNewAddressForm ? <View style={styles.newAddressForm}>
                  <Text style={styles.newAddressTitle}>Add new billing address</Text>
                  <AddressSelect label="LABEL" value={addressLabel} options={ADDRESS_LABEL_OPTIONS} onChange={setAddressLabel} styles={styles} />
                  <Text style={styles.fieldLabel}>CONTACT NAME</Text>
                  <TextInput value={addressName} onChangeText={setAddressName} accessibilityLabel="Delivery contact name" placeholder="Recipient name" placeholderTextColor={styles.inputPlaceholder.color} autoCapitalize="words" style={styles.singleLineInput} />
                  <Text style={styles.fieldLabel}>FLAT / HOUSE / BUILDING</Text>
                  <TextInput value={houseNumber} onChangeText={setHouseNumber} accessibilityLabel="Flat, house or building name" placeholder="Flat/House/building name" placeholderTextColor={styles.inputPlaceholder.color} style={styles.singleLineInput} />
                  <View style={styles.addressFieldRow}>
                    <View style={styles.shortAddressField}><Text style={styles.fieldLabel}>CITY</Text><TextInput value={city} onChangeText={setCity} accessibilityLabel="Delivery city" placeholder="City" placeholderTextColor={styles.inputPlaceholder.color} autoCapitalize="words" style={styles.singleLineInput} /></View>
                    <View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PIN CODE</Text><TextInput value={postalCode} onChangeText={setPostalCode} accessibilityLabel="Delivery PIN code" placeholder="PIN code" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="number-pad" style={styles.singleLineInput} /></View>
                    <View style={styles.shortAddressField}><AddressSelect label="STATE" value={state} options={INDIAN_STATE_OPTIONS} onChange={setState} styles={styles} /></View>
                  </View>
                  <View style={styles.addressFieldRow}>
                    <View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PRIMARY PHONE</Text><TextInput value={addressPhone} onChangeText={setAddressPhone} accessibilityLabel="Primary delivery phone number" placeholder="Your phone number" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View>
                    <View style={styles.shortAddressField}><Text style={styles.fieldLabel}>ALTERNATIVE PHONE (OPTIONAL)</Text><TextInput value={alternateAddressPhone} onChangeText={setAlternateAddressPhone} accessibilityLabel="Alternative delivery phone number" placeholder="Backup number" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View>
                  </View>
                  <Text style={styles.fieldLabel}>STREET / AREA / LANDMARK</Text>
                  <TextInput value={completeAddress} onChangeText={setCompleteAddress} accessibilityLabel="Street, area and landmark" placeholder="Street, area and landmark" placeholderTextColor={styles.inputPlaceholder.color} multiline style={styles.addressInput} />
                  <View style={styles.addressFormActions}><Pressable accessibilityRole="button" disabled={savingAddress} style={[styles.saveAddressButton, savingAddress && styles.disabled]} onPress={() => void saveNewAddress()}>{savingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAddressText}>Save &amp; use this address</Text>}</Pressable>{savedAddresses.length ? <Pressable accessibilityRole="button" disabled={savingAddress} style={styles.cancelAddressButton} onPress={() => setAddingAddress(false)}><Text style={styles.cancelAddressText}>Cancel</Text></Pressable> : null}</View>
                </View> : null}
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: shippingSameAsBilling }} onPress={() => setShippingSameAsBilling((value) => !value)} style={styles.sameAddressOption}><View style={[styles.checkbox, shippingSameAsBilling && styles.checkboxChecked]}>{shippingSameAsBilling ? <Text style={styles.checkboxTick}>✓</Text> : null}</View><View style={styles.sameAddressCopy}><Text style={styles.sameAddressTitle}>Shipping address same as billing address</Text><Text style={styles.deliveryCopy}>Uncheck to enter a different shipping address.</Text></View></Pressable>
                {!shippingSameAsBilling ? <View style={styles.shippingAddressForm}><View style={styles.deliveryHeader}><View><Text style={styles.newAddressTitle}>Shipping address</Text><Text style={styles.deliveryCopy}>Choose a saved address or add a new one.</Text></View>{savedAddresses.length > 0 && !showNewShippingAddressForm ? <Pressable accessibilityRole="button" style={styles.addAddressButton} onPress={() => setAddingShippingAddress(true)}><Text style={styles.addAddressText}>+ Add new address</Text></Pressable> : null}</View>{savedAddresses.map((savedAddress) => <SavedAddressOption key={`shipping-${savedAddress.id}`} address={savedAddress} selected={!showNewShippingAddressForm && selectedShippingAddress?.id === savedAddress.id} onPress={() => { setSelectedShippingAddressId(savedAddress.id); setAddingShippingAddress(false); }} styles={styles} />)}{showNewShippingAddressForm ? <View style={styles.newAddressForm}><Text style={styles.newAddressTitle}>Add new shipping address</Text><AddressSelect label="LABEL" value={shippingAddressLabel} options={ADDRESS_LABEL_OPTIONS} onChange={setShippingAddressLabel} styles={styles} /><Text style={styles.fieldLabel}>CONTACT NAME</Text><TextInput value={shippingAddressName} onChangeText={setShippingAddressName} accessibilityLabel="Shipping contact name" placeholder="Recipient name" placeholderTextColor={styles.inputPlaceholder.color} autoCapitalize="words" style={styles.singleLineInput} /><Text style={styles.fieldLabel}>FLAT / HOUSE / BUILDING</Text><TextInput value={shippingHouseNumber} onChangeText={setShippingHouseNumber} accessibilityLabel="Shipping house or building" placeholder="Flat/House/building name" placeholderTextColor={styles.inputPlaceholder.color} style={styles.singleLineInput} /><View style={styles.addressFieldRow}><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>CITY</Text><TextInput value={shippingCity} onChangeText={setShippingCity} accessibilityLabel="Shipping city" placeholder="City" placeholderTextColor={styles.inputPlaceholder.color} autoCapitalize="words" style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PIN CODE</Text><TextInput value={shippingPostalCode} onChangeText={setShippingPostalCode} accessibilityLabel="Shipping PIN code" placeholder="PIN code" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="number-pad" style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><AddressSelect label="STATE" value={shippingState} options={INDIAN_STATE_OPTIONS} onChange={setShippingState} styles={styles} /></View></View><View style={styles.addressFieldRow}><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PRIMARY PHONE</Text><TextInput value={shippingPhone} onChangeText={setShippingPhone} accessibilityLabel="Shipping phone number" placeholder="Your phone number" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>ALTERNATIVE PHONE (OPTIONAL)</Text><TextInput value={shippingAlternatePhone} onChangeText={setShippingAlternatePhone} accessibilityLabel="Shipping alternative phone" placeholder="Backup number" placeholderTextColor={styles.inputPlaceholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View></View><Text style={styles.fieldLabel}>STREET / AREA / LANDMARK</Text><TextInput value={shippingCompleteAddress} onChangeText={setShippingCompleteAddress} accessibilityLabel="Shipping street, area and landmark" placeholder="Street, area and landmark" placeholderTextColor={styles.inputPlaceholder.color} multiline style={styles.addressInput} /><View style={styles.addressFormActions}><Pressable accessibilityRole="button" disabled={savingShippingAddress} style={[styles.saveAddressButton, savingShippingAddress && styles.disabled]} onPress={() => void saveNewShippingAddress()}>{savingShippingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAddressText}>Save &amp; use this address</Text>}</Pressable>{savedAddresses.length ? <Pressable accessibilityRole="button" disabled={savingShippingAddress} style={styles.cancelAddressButton} onPress={() => setAddingShippingAddress(false)}><Text style={styles.cancelAddressText}>Cancel</Text></Pressable> : null}</View></View> : null}</View> : null}
              </View>
            </View>

            <View style={[styles.summary, desktop && styles.summaryDesktop, !desktop && styles.summaryMobile]}>
              <Text style={styles.summaryTitle}>{t('Price details')}</Text>
              <SummaryRow label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`} value={formatMoney(subtotal)} />
              <SummaryRow label={deliveryMode === 'express' ? 'Express delivery' : 'Delivery charges'} value={formatMoney(delivery)} />
              <View style={styles.totalRow}><Text style={styles.totalLabel}>{t('Total amount')}</Text><Text style={styles.totalValue}>{formatMoney(total)}</Text></View>

              <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
              <View style={styles.paymentRow}>
                {codAvailable ? <Pressable onPress={() => setPaymentMethod('COD')} style={[styles.paymentButton, paymentMethod === 'COD' && styles.paymentActive]}>
                  <Text style={[styles.paymentText, paymentMethod === 'COD' && styles.paymentTextActive]}>{t('Pay on delivery')}</Text>
                </Pressable> : null}
                <Pressable onPress={() => setPaymentMethod('ONLINE')} style={[styles.paymentButton, paymentMethod === 'ONLINE' && styles.paymentActive]}>
                  <Text style={[styles.paymentText, paymentMethod === 'ONLINE' && styles.paymentTextActive]}>{t('Pay with Razorpay')}</Text>
                </Pressable>
              </View>
              {!codAvailable ? <Text style={styles.savingsNote}>{t('Cash on delivery is unavailable for one or more products in this cart. Online payment is available.')}</Text> : null}
              <Pressable accessibilityRole="button" disabled={submitting || savingAddress} style={[styles.primaryButton, (submitting || savingAddress) && styles.disabled]} onPress={() => void confirmOrder()}>
                {submitting || savingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{paymentMethod === 'ONLINE' ? t('Continue to Razorpay') : t('Place order')}</Text>}
              </Pressable>
              <Text style={styles.secureNote}>{t('GST invoice · Verified fulfilment · Support included')}</Text>
            </View>

          </View>
        )}
      </View>
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function ConfirmationItem({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.confirmationItem}><Text style={styles.confirmationLabel}>{label}</Text><Text style={styles.confirmationValue}>{value}</Text></View>;
}

function formatDeliveryAddress(address: CustomerAddress) {
  return [address.name, address.houseNumber, address.line1, address.city, address.state, address.postalCode, address.phone ? `Primary phone: ${address.phone}` : undefined, address.alternatePhone ? `Alternative phone: ${address.alternatePhone}` : undefined].filter(Boolean).join(', ');
}

function SavedAddressOption({ address, selected, onPress, styles }: { address: CustomerAddress; selected: boolean; onPress(): void; styles: ReturnType<typeof createStyles> }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.savedAddressOption, selected && styles.savedAddressOptionActive]}><View style={styles.savedAddressTop}><View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View><Text style={styles.savedAddressLabel}>{address.label}</Text>{address.isDefault ? <Text style={styles.defaultAddressLabel}>DEFAULT</Text> : null}</View>{address.name ? <Text style={styles.savedAddressLine}>{address.name}</Text> : null}<Text style={styles.savedAddressLine}>{[address.houseNumber, address.line1].filter(Boolean).join(', ')}</Text><Text style={styles.savedAddressMeta}>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</Text>{address.phone ? <Text style={styles.savedAddressPhone}>Primary phone · {address.phone}</Text> : null}{address.alternatePhone ? <Text style={styles.savedAddressPhone}>Alternative phone · {address.alternatePhone}</Text> : null}</Pressable>;
}

function AddressSelect<T extends string>({ label, value, options, onChange, styles }: { label: string; value: string; options: readonly T[]; onChange(value: T): void; styles: ReturnType<typeof createStyles> }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return <View style={styles.addressSelectField}><Text style={styles.fieldLabel}>{label}</Text>{createElement('select', { value, onChange: (event: unknown) => onChange((event as { currentTarget: { value: string } }).currentTarget.value as T), 'aria-label': `Select ${label.toLowerCase()}`, style: { width: '100%', minHeight: 44, padding: '0 12px', borderRadius: 6, border: '1px solid #2C4056', backgroundColor: 'transparent', color: styles.selectText.color, fontSize: 13.5 } }, options.map((option) => createElement('option', { key: option, value: option, style: { color: '#182D45', backgroundColor: '#FFFFFF' } }, option)))}</View>;
  }
  return <View style={[styles.addressSelectField, open && styles.selectFieldOpen]}><Text style={styles.fieldLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Select ${label.toLowerCase()}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.select}><Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>{value || `Select ${label.toLowerCase()}`}</Text><Text style={styles.selectChevron}>{open ? '⌃' : '⌄'}</Text></Pressable>{open ? <View style={styles.selectOptions}><ScrollView style={styles.selectScroll} contentContainerStyle={styles.selectScrollContent} nestedScrollEnabled>{options.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => { onChange(option); setOpen(false); }} style={[styles.selectOption, value === option && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]} numberOfLines={1}>{value === option ? '✓ ' : ''}{option}</Text></Pressable>)}</ScrollView></View> : null}</View>;
}

function OptionCard({ title, copy, price, selected, onPress }: { title: string; copy: string; price: string; selected: boolean; onPress(): void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.optionCard, selected && styles.optionCardActive]}>
      <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionCopy}>{copy}</Text>
      <Text style={styles.optionPrice}>{price}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md },
  pageHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  pageTitle: { color: colors.cream, fontSize: 22, fontWeight: '900' },
  columns: { width: '100%', minWidth: 0, gap: spacing.md },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  lineList: { minWidth: 0, flexShrink: 1, gap: spacing.sm },
  lineListDesktop: { flex: 1.4, minWidth: 0 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingBottom: spacing.xs },
  listCopy: { color: colors.muted, fontSize: 12.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface, width: '100%', minWidth: 0, overflow: 'hidden' },
  lineVisual: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden', flexShrink: 0, flexGrow: 0 },
  lineBody: { flex: 1, flexShrink: 1, minWidth: 0, gap: 4 },
  lineBrand: { color: colors.teal, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  lineName: { color: colors.cream, fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  lineStatus: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  lineMeta: { color: colors.muted, fontSize: 11 },
  linePrice: { color: colors.cream, fontSize: 15, fontWeight: '900', flexShrink: 0, marginLeft: spacing.sm, textAlign: 'right' },
  // Mobile-only card: image + name + price sit in a top row, and the
  // quantity stepper/remove control gets its own full-width row below so it
  // never gets squeezed for space (this was the cause of the broken mobile
  // layout — the stepper was fighting the image and price for room on a
  // single narrow row).
  lineCard: { width: '100%', minWidth: 0, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface, gap: spacing.sm, overflow: 'hidden' },
  lineCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, width: '100%', minWidth: 0 },
  lineCardInfo: { flex: 1, flexShrink: 1, minWidth: 0, gap: 4 },
  linePriceCompact: { color: colors.cream, fontSize: 14, fontWeight: '900', flexShrink: 0, marginLeft: spacing.xs },
  lineCardActions: { width: '100%' },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  stepButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  stepText: { color: colors.cream, fontSize: 16, fontWeight: '700' },
  quantity: { color: colors.cream, width: 30, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  clearButton: { paddingVertical: spacing.xs },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  fulfilmentCard: { width: '100%', alignSelf: 'stretch', marginTop: spacing.xs, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: spacing.sm },
  panelTitle: { color: colors.cream, fontSize: 16, fontWeight: '900' },
  deliveryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  deliveryCopy: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
  addAddressButton: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  addAddressText: { color: colors.teal, fontSize: 11, fontWeight: '900' },
  addressError: { color: colors.danger, fontSize: 11.5, lineHeight: 18 },
  addressOptions: { gap: spacing.sm },
  savedAddressOption: { padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, gap: 5 },
  savedAddressOptionActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  savedAddressTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  savedAddressLabel: { color: colors.cream, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  defaultAddressLabel: { color: colors.teal, fontSize: 8, fontWeight: '900', marginLeft: 'auto' },
  savedAddressLine: { color: colors.cream, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  savedAddressMeta: { color: colors.muted, fontSize: 11.5, lineHeight: 18 },
  savedAddressPhone: { color: colors.muted, fontSize: 11.5, lineHeight: 18 },
  sameAddressOption: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkboxTick: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  sameAddressCopy: { flex: 1, gap: 2 },
  sameAddressTitle: { color: colors.cream, fontSize: 13, fontWeight: '800' },
  shippingAddressForm: { paddingTop: spacing.xs, gap: spacing.xs },
  newAddressForm: { width: '100%', alignSelf: 'stretch', padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.teal, backgroundColor: colors.surfaceSunken, gap: spacing.sm },
  newAddressTitle: { color: colors.cream, fontSize: 14, fontWeight: '900' },
  addressSelectField: { width: '100%', minWidth: 0, gap: 5 },
  selectFieldOpen: { zIndex: 100, elevation: 100 },
  select: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectText: { flex: 1, color: colors.cream, fontSize: 13.5 },
  selectPlaceholder: { color: colors.muted },
  selectChevron: { color: colors.teal, fontSize: 18, fontWeight: '900' },
  selectOptions: { position: 'absolute', top: 69, left: 0, right: 0, zIndex: 120, elevation: 120, height: 220, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  selectScroll: { height: 218, backgroundColor: colors.surface },
  selectScrollContent: { backgroundColor: colors.surface },
  selectOption: { paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  selectOptionActive: { backgroundColor: colors.tealTint },
  selectOptionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  selectOptionTextActive: { color: colors.cream, fontWeight: '900' },
  addressFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortAddressField: { flexGrow: 1, flexBasis: 180, minWidth: 0, gap: 5 },
  singleLineInput: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.cream, fontSize: 13.5 },
  addressFormActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  saveAddressButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  saveAddressText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' },
  cancelAddressButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  cancelAddressText: { color: colors.muted, fontSize: 11.5, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: { flexGrow: 1, flexBasis: 200, minHeight: 108, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken },
  optionCardActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.teal },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  optionTitle: { color: colors.cream, fontSize: 13.5, fontWeight: '800', marginTop: spacing.sm },
  optionCopy: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
  optionPrice: { color: colors.cream, fontSize: 13, fontWeight: '900', marginTop: 'auto', paddingTop: spacing.sm },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginTop: spacing.xs },
  addressInput: { minHeight: 72, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, color: colors.cream, fontSize: 13.5, textAlignVertical: 'top' },
  inputPlaceholder: { color: colors.muted },
  summary: { minWidth: 0, minHeight: 470, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  summaryDesktop: { flex: 0.65, minWidth: 300 },
  summaryMobile: { width: '100%', minHeight: 0, marginTop: spacing.md },
  summaryTitle: { color: colors.cream, fontSize: 16, fontWeight: '900', marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  summaryValue: { color: colors.cream, fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, marginTop: 2 },
  totalLabel: { color: colors.cream, fontSize: 14, fontWeight: '900' },
  totalValue: { color: colors.cream, fontSize: 21, fontWeight: '900' },
  savingsNote: { color: colors.success, fontSize: 12, fontWeight: '700' },
  paymentRow: { flexDirection: 'row', gap: spacing.sm },
  paymentButton: { flex: 1, minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  paymentActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  paymentText: { color: colors.muted, fontSize: 11.5, fontWeight: '800', textAlign: 'center' },
  paymentTextActive: { color: colors.teal },
  primaryButton: { minHeight: 46, paddingHorizontal: spacing.xl, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cta, marginTop: spacing.xs },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secureNote: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  disabled: { opacity: 0.62 },
  empty: { minHeight: 340, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.cream, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, maxWidth: 460, textAlign: 'center' },
  confirmationCard: { width: '100%', maxWidth: 480, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  confirmationItem: { flexGrow: 1, minWidth: 120, alignItems: 'center' },
  confirmationLabel: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  confirmationValue: { color: colors.cream, fontSize: 13, fontWeight: '900', marginTop: 3 },
});
