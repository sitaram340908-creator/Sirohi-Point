import { formatMoney } from "@sirohi/domain";
import type { CustomerAddress, CustomerAddressInput } from "@sirohi/contracts";
import type { ThemeColors } from "@sirohi/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { createElement, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  PortalButton,
  PortalCard,
  PortalShell,
  StatusBadge,
} from "@/components/business/business-ui";
import { CartQuantity } from "@/components/business/business-quantity";
import { cartQuantityError } from "@/lib/cart-rules";
import { ProductVisual } from "@/components/business/business-products";
import {
  getB2BProduct,
  getCustomerAddresses,
  initiateRazorpayPayment,
  saveCustomerAddress,
  submitOrder,
  verifyRazorpayPayment,
} from "@/lib/api";
import { ADDRESS_LABEL_OPTIONS, INDIAN_STATE_OPTIONS } from "@/lib/address-options";
import { useAppState } from "@/state/app-context";
import { useAuth } from "@/state/auth-context";
import { useBusinessStyles } from "@/theme/business-theme";

interface RazorpayCheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayCheckoutInstance {
  open(): void;
  on(event: "payment.failed", handler: () => void): void;
}
interface RazorpayCheckoutConstructor {
  new (options: {
    key: string;
    amount: number;
    currency: "INR";
    name: string;
    description: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color: string };
    handler(response: RazorpayCheckoutSuccess): void;
    modal?: { ondismiss?: () => void };
  }): RazorpayCheckoutInstance;
}
declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutConstructor;
  }
}
function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined")
    return Promise.reject(
      new Error("Razorpay checkout is available only in a web browser."),
    );
  if (window.Razorpay) return Promise.resolve();
  const existing = document.getElementById(
    "razorpay-checkout-js",
  ) as HTMLScriptElement | null;
  if (existing)
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay checkout.")),
        { once: true },
      );
    });
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export default function BusinessCartScreen() {
  const router = useRouter();
  const styles = useBusinessStyles(createStyles);
  const { cart, clearCart, showNotice } = useAppState();
  const { token, user } = useAuth();
  const priceVisible = user?.role === "BUSINESS" && Boolean(token);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string | null>(null);
  const [addingShippingAddress, setAddingShippingAddress] = useState(false);
  const [shippingAddressForm, setShippingAddressForm] = useState<BusinessAddressForm | null>(null);
  const [savingShippingAddress, setSavingShippingAddress] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<BusinessAddressForm | null>(
    null,
  );
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const cartIds = Object.keys(cart).sort();
  const catalogQuery = useQuery({
    queryKey: ["catalog", "b2b", "cart", user?.id, cartIds],
    queryFn: () =>
      Promise.all(cartIds.map((id) => getB2BProduct(token ?? undefined, id))),
    enabled:
      Boolean(cartIds.length) &&
      (!user || (user.role === "BUSINESS" && Boolean(token))),
  });
  const addressesQuery = useQuery({
    queryKey: ["business-addresses", user?.id],
    queryFn: () => getCustomerAddresses(token!),
    enabled: user?.role === "BUSINESS" && Boolean(token),
  });
  const products = catalogQuery.data ?? [];
  const savedAddresses = addressesQuery.data ?? [];
  const selectedAddress = addingAddress
    ? null
    : (savedAddresses.find((item) => item.id === selectedAddressId) ??
      savedAddresses.find((item) => item.isDefault) ??
      savedAddresses[0] ??
      null);
  const selectedShippingAddress = addingShippingAddress
    ? null
    : (savedAddresses.find((item) => item.id === selectedShippingAddressId) ?? null);
  const showNewAddressForm =
    user?.role === "BUSINESS" &&
    (addingAddress ||
      (!addressesQuery.isLoading && savedAddresses.length === 0));
  const showNewShippingAddressForm =
    user?.role === "BUSINESS" &&
    (addingShippingAddress || (!addressesQuery.isLoading && savedAddresses.length === 0));
  const items = useMemo(
    () =>
      products
        .filter((product) => (cart[product.id] ?? 0) > 0)
        .map((product) => ({ product, quantity: cart[product.id] ?? 0 })),
    [cart, products],
  );
  const codAvailable =
    items.length > 0 &&
    items.every(({ product }) => product.codAvailable !== false);
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.product.b2bPriceInPaise ?? item.product.priceInPaise) *
        item.quantity,
    0,
  );

  useEffect(() => {
    if (showNewAddressForm && !addressForm) {
      setAddressForm({
        label: "Site",
        name: user?.name ?? "",
        line1: "",
        houseNumber: "",
        city: "",
        state: "",
        postalCode: "",
        phone: user?.phone ?? "",
        alternatePhone: "",
        isDefault: savedAddresses.length === 0,
      });
    }
  }, [
    addressForm,
    savedAddresses.length,
    showNewAddressForm,
    user?.name,
    user?.phone,
  ]);

  useEffect(() => {
    if (showNewShippingAddressForm && !shippingAddressForm) {
      setShippingAddressForm({
        label: "Site",
        name: user?.name ?? "",
        line1: "",
        houseNumber: "",
        city: "",
        state: "",
        postalCode: "",
        phone: user?.phone ?? "",
        alternatePhone: "",
        isDefault: false,
      });
    }
  }, [shippingAddressForm, showNewShippingAddressForm, user?.name, user?.phone]);

  useEffect(() => {
    if (!codAvailable && paymentMethod === "COD") setPaymentMethod("ONLINE");
  }, [codAvailable, paymentMethod]);

  function setAddressField<K extends keyof BusinessAddressForm>(
    key: K,
    value: BusinessAddressForm[K],
  ) {
    setAddressForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function setShippingAddressField(
    key: Exclude<keyof BusinessAddressForm, "isDefault">,
    value: string,
  ) {
    setShippingAddressForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  async function saveBusinessAddress(): Promise<CustomerAddress | null> {
    if (!addressForm || !token || user?.role !== "BUSINESS") return null;
    if (
      addressForm.label.trim().length < 2 ||
      addressForm.line1.trim().length < 10 ||
      addressForm.city.trim().length < 2
    ) {
      showNotice("Please complete the address label, street, and city.");
      return null;
    }
    setSavingAddress(true);
    try {
      const saved = await saveCustomerAddress(token, {
        ...addressForm,
        label: addressForm.label.trim(),
        name: addressForm.name?.trim() || undefined,
        line1: addressForm.line1.trim(),
        houseNumber: addressForm.houseNumber?.trim() || undefined,
        city: addressForm.city.trim(),
        state: addressForm.state?.trim() || undefined,
        postalCode: addressForm.postalCode?.trim() || undefined,
        phone: addressForm.phone?.trim() || undefined,
        alternatePhone: addressForm.alternatePhone?.trim() || undefined,
      });
      await addressesQuery.refetch();
      setSelectedAddressId(saved.id);
      setAddingAddress(false);
      setAddressForm(null);
      showNotice("Address saved and selected for billing.");
      return saved;
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Unable to save this address.",
      );
      return null;
    } finally {
      setSavingAddress(false);
    }
  }

  async function saveBusinessShippingAddress(): Promise<CustomerAddress | null> {
    if (!shippingAddressForm || !token || user?.role !== "BUSINESS") return null;
    if (shippingAddressForm.label.trim().length < 2 || shippingAddressForm.line1.trim().length < 10 || shippingAddressForm.city.trim().length < 2) {
      showNotice("Please complete the shipping address label, street, and city.");
      return null;
    }
    setSavingShippingAddress(true);
    try {
      const saved = await saveCustomerAddress(token, {
        ...shippingAddressForm,
        label: shippingAddressForm.label.trim(),
        name: shippingAddressForm.name?.trim() || undefined,
        line1: shippingAddressForm.line1.trim(),
        houseNumber: shippingAddressForm.houseNumber?.trim() || undefined,
        city: shippingAddressForm.city.trim(),
        state: shippingAddressForm.state?.trim() || undefined,
        postalCode: shippingAddressForm.postalCode?.trim() || undefined,
        phone: shippingAddressForm.phone?.trim() || undefined,
        alternatePhone: shippingAddressForm.alternatePhone?.trim() || undefined,
        isDefault: false,
      });
      await addressesQuery.refetch();
      setSelectedShippingAddressId(saved.id);
      setAddingShippingAddress(false);
      setShippingAddressForm(null);
      showNotice("Shipping address saved and selected.");
      return saved;
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to save this shipping address.");
      return null;
    } finally {
      setSavingShippingAddress(false);
    }
  }

  return (
    <PortalShell
      eyebrow="YOUR BULK CART"
      title={
        submittedOrderId ? "Your order is in." : "One cart. More possibilities."
      }
      copy="Review your essentials, choose a delivery address, and send your business order for approval."
      actions={
        <PortalButton
          label="Back to catalogue"
          secondary
          onPress={() => router.push("/business/catalog" as never)}
        />
      }
    >
      {submittedOrderId ? (
        <PortalCard
          title="Waiting for admin approval"
          copy="Your order has been received. Our team will review it before packing and delivery. Follow its progress in My orders."
        >
          <View style={styles.confirmation}>
            <Text style={styles.confirmationLabel}>ORDER REFERENCE</Text>
            <Text style={styles.confirmationValue}>{submittedOrderId}</Text>
          </View>
          <PortalButton
            label="View business orders"
            onPress={() => router.push("/business/orders" as never)}
          />
          <PortalButton
            label="Shop more products"
            secondary
            onPress={() => {
              setSubmittedOrderId(null);
              router.push("/business/catalog" as never);
            }}
          />
        </PortalCard>
      ) : catalogQuery.isLoading ? (
        <PortalCard
          title="Loading bulk cart"
          copy="Getting your latest wholesale prices and product details."
        />
      ) : catalogQuery.isError ? (
        <PortalCard
          title="Bulk cart unavailable"
          copy={
            catalogQuery.error instanceof Error
              ? catalogQuery.error.message
              : "Unable to load B2B products from the backend."
          }
        >
          <PortalButton
            label="Clear unavailable items"
            danger
            onPress={clearCart}
          />
          <PortalButton
            label="Retry"
            onPress={() => void catalogQuery.refetch()}
          />
        </PortalCard>
      ) : !items.length ? (
        <PortalCard
          title="Your bulk cart is empty"
          copy="Add products from the B2B catalogue to start a procurement request."
        >
          <PortalButton
            label="Browse B2B catalogue"
            onPress={() => router.push("/business/catalog" as never)}
          />
        </PortalCard>
      ) : (
        <View style={styles.columns}>
          <PortalCard
            style={styles.itemsCard}
            title={`${items.length} product${items.length === 1 ? "" : "s"} in this request`}
          >
            <View style={styles.list}>
              {items.map(({ product, quantity }) => {
                const unit = product.b2bPriceInPaise ?? product.priceInPaise;
                const minimum = product.minimumB2BQuantity ?? 1;
                return (
                  <View key={product.id} style={styles.item}>
                    <ProductVisual product={product} compact />
                    <View style={styles.itemBody}>
                      <Text style={styles.name}>{product.name}</Text>
                      <Text style={styles.meta}>
                        {quantity} units · {priceVisible ? `${formatMoney(unit)} per unit` : "Price hidden"}
                      </Text>
                      <Text style={styles.meta}>
                        MOQ {minimum} · {product.stock} available
                      </Text>
                      {quantity > product.stock ? (
                        <StatusBadge
                          label="Backorder quantity will be reviewed"
                          tone="warning"
                        />
                      ) : null}
                    </View>
                    <View style={styles.itemActions}>
                      {priceVisible ? <Text style={styles.lineTotal}>{formatMoney(unit * quantity)}</Text> : <PortalButton label="Reveal Price" compact onPress={() => router.push("/business/login" as never)} />}
                      <CartQuantity
                        product={product}
                        quantity={quantity}
                        business
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            <PortalButton label="Clear bulk cart" danger onPress={clearCart} />
            <View style={styles.fulfilmentCard}>
            <View style={styles.deliveryHeader}>
              <View>
                <Text style={styles.fieldLabel}>BILLING ADDRESS</Text>
                <Text style={styles.deliveryCopy}>
                  Choose a saved billing address or add a new one.
                </Text>
              </View>
              {savedAddresses.length > 0 && !showNewAddressForm ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.addAddressButton}
                  onPress={() => setAddingAddress(true)}
                >
                  <Text style={styles.addAddressText}>+ Add address</Text>
                </Pressable>
              ) : null}
            </View>
            {addressesQuery.isLoading ? (
              <Text style={styles.deliveryCopy}>Loading saved addresses…</Text>
            ) : null}
            {addressesQuery.isError ? (
              <Text style={styles.addressError}>
                Unable to load saved addresses. You can add one below.
              </Text>
            ) : null}
            {savedAddresses.length ? (
              <View style={styles.addressOptions}>
                {savedAddresses.map((savedAddress) => (
                  <BusinessSavedAddressOption
                    key={savedAddress.id}
                    address={savedAddress}
                    selected={
                      !showNewAddressForm &&
                      selectedAddress?.id === savedAddress.id
                    }
                    onPress={() => {
                      setSelectedAddressId(savedAddress.id);
                      setAddingAddress(false);
                    }}
                    styles={styles}
                  />
                ))}
              </View>
            ) : null}
            {showNewAddressForm && addressForm ? (
              <View style={styles.newAddressForm}>
                <Text style={styles.newAddressTitle}>
                  {savedAddresses.length
                    ? "Add another billing address"
                    : "Add your first billing address"}
                </Text>
                <BusinessAddressFields form={addressForm} onChange={setAddressField} styles={styles} />
                <View style={styles.addressFormActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={savingAddress}
                    style={[
                      styles.saveAddressButton,
                      savingAddress && styles.disabled,
                    ]}
                    onPress={() => void saveBusinessAddress()}
                  >
                    {savingAddress ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveAddressText}>
                        Save &amp; use this address
                      </Text>
                    )}
                  </Pressable>
                  {savedAddresses.length ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingAddress}
                      style={styles.cancelAddressButton}
                      onPress={() => {
                        setAddingAddress(false);
                        setAddressForm(null);
                      }}
                    >
                      <Text style={styles.cancelAddressText}>Cancel</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: shippingSameAsBilling }}
              onPress={() => setShippingSameAsBilling((value) => !value)}
              style={styles.sameAddressOption}
            >
              <View style={[styles.checkbox, shippingSameAsBilling && styles.checkboxChecked]}>
                {shippingSameAsBilling ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
              <View style={styles.sameAddressCopy}>
                <Text style={styles.sameAddressTitle}>Shipping address same as billing address</Text>
                <Text style={styles.deliveryCopy}>Uncheck to enter a different shipping address.</Text>
              </View>
            </Pressable>
            {!shippingSameAsBilling ? (
              <View style={styles.shippingAddressForm}>
                <View style={styles.deliveryHeader}>
                  <View><Text style={styles.newAddressTitle}>Shipping address</Text><Text style={styles.deliveryCopy}>Choose a saved address or add a new one.</Text></View>
                  {savedAddresses.length > 0 && !showNewShippingAddressForm ? <Pressable accessibilityRole="button" style={styles.addAddressButton} onPress={() => setAddingShippingAddress(true)}><Text style={styles.addAddressText}>+ Add new address</Text></Pressable> : null}
                </View>
                {savedAddresses.map((savedAddress) => <BusinessSavedAddressOption key={`shipping-${savedAddress.id}`} address={savedAddress} selected={!showNewShippingAddressForm && selectedShippingAddress?.id === savedAddress.id} onPress={() => { setSelectedShippingAddressId(savedAddress.id); setAddingShippingAddress(false); }} styles={styles} />)}
                {showNewShippingAddressForm && shippingAddressForm ? <View style={styles.newAddressForm}><Text style={styles.newAddressTitle}>Add new shipping address</Text><BusinessAddressFields form={shippingAddressForm} onChange={setShippingAddressField} styles={styles} /><View style={styles.addressFormActions}><Pressable accessibilityRole="button" disabled={savingShippingAddress} style={[styles.saveAddressButton, savingShippingAddress && styles.disabled]} onPress={() => void saveBusinessShippingAddress()}>{savingShippingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAddressText}>Save &amp; use this address</Text>}</Pressable>{savedAddresses.length ? <Pressable accessibilityRole="button" disabled={savingShippingAddress} style={styles.cancelAddressButton} onPress={() => { setAddingShippingAddress(false); setShippingAddressForm(null); }}><Text style={styles.cancelAddressText}>Cancel</Text></Pressable> : null}</View></View> : null}
              </View>
            ) : null}
            </View>
          </PortalCard>
          <PortalCard
            style={styles.summaryCard}
            title="Order summary"
            copy={priceVisible ? "Your wholesale subtotal. Final pricing and availability are confirmed when you submit." : "Sign in with your business account to reveal wholesale pricing."}
          >
            <View style={styles.summaryRow}>
              <Text style={styles.meta}>Products</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.meta}>Total units</Text>
              <Text style={styles.summaryValue}>
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
            {priceVisible ? <View style={styles.summaryRow}>
              <Text style={styles.meta}>Estimated subtotal</Text>
              <Text style={styles.total}>{formatMoney(total)}</Text>
            </View> : <PortalButton label="Reveal Price" onPress={() => router.push("/business/login" as never)} />}
            <View style={styles.addressLegacyHidden}>
            <View style={styles.deliveryHeader}>
              <View>
                <Text style={styles.fieldLabel}>BILLING ADDRESS</Text>
                <Text style={styles.deliveryCopy}>
                  Choose a saved billing address or add a new one.
                </Text>
              </View>
              {savedAddresses.length > 0 && !showNewAddressForm ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.addAddressButton}
                  onPress={() => setAddingAddress(true)}
                >
                  <Text style={styles.addAddressText}>+ Add address</Text>
                </Pressable>
              ) : null}
            </View>
            {addressesQuery.isLoading ? (
              <Text style={styles.deliveryCopy}>Loading saved addresses…</Text>
            ) : null}
            {addressesQuery.isError ? (
              <Text style={styles.addressError}>
                Unable to load saved addresses. You can add one below.
              </Text>
            ) : null}
            {savedAddresses.length ? (
              <View style={styles.addressOptions}>
                {savedAddresses.map((savedAddress) => (
                  <BusinessSavedAddressOption
                    key={savedAddress.id}
                    address={savedAddress}
                    selected={
                      !showNewAddressForm &&
                      selectedAddress?.id === savedAddress.id
                    }
                    onPress={() => {
                      setSelectedAddressId(savedAddress.id);
                      setAddingAddress(false);
                    }}
                    styles={styles}
                  />
                ))}
              </View>
            ) : null}
            {showNewAddressForm && addressForm ? (
              <View style={styles.newAddressForm}>
                <Text style={styles.newAddressTitle}>
                  {savedAddresses.length
                    ? "Add another billing address"
                    : "Add your first billing address"}
                </Text>
                <BusinessAddressFields form={addressForm} onChange={setAddressField} styles={styles} />
                <View style={styles.addressFormActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={savingAddress}
                    style={[
                      styles.saveAddressButton,
                      savingAddress && styles.disabled,
                    ]}
                    onPress={() => void saveBusinessAddress()}
                  >
                    {savingAddress ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveAddressText}>
                        Save &amp; use this address
                      </Text>
                    )}
                  </Pressable>
                  {savedAddresses.length ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingAddress}
                      style={styles.cancelAddressButton}
                      onPress={() => {
                        setAddingAddress(false);
                        setAddressForm(null);
                      }}
                    >
                      <Text style={styles.cancelAddressText}>Cancel</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: shippingSameAsBilling }}
              onPress={() => setShippingSameAsBilling((value) => !value)}
              style={styles.sameAddressOption}
            >
              <View style={[styles.checkbox, shippingSameAsBilling && styles.checkboxChecked]}>
                {shippingSameAsBilling ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
              <View style={styles.sameAddressCopy}>
                <Text style={styles.sameAddressTitle}>Shipping address same as billing address</Text>
                <Text style={styles.deliveryCopy}>Uncheck to enter a different shipping address.</Text>
              </View>
            </Pressable>
            {!shippingSameAsBilling ? (
              <View style={styles.shippingAddressForm}>
                <View style={styles.deliveryHeader}>
                  <View><Text style={styles.newAddressTitle}>Shipping address</Text><Text style={styles.deliveryCopy}>Choose a saved address or add a new one.</Text></View>
                  {savedAddresses.length > 0 && !showNewShippingAddressForm ? <Pressable accessibilityRole="button" style={styles.addAddressButton} onPress={() => setAddingShippingAddress(true)}><Text style={styles.addAddressText}>+ Add new address</Text></Pressable> : null}
                </View>
                {savedAddresses.map((savedAddress) => <BusinessSavedAddressOption key={`shipping-${savedAddress.id}`} address={savedAddress} selected={!showNewShippingAddressForm && selectedShippingAddress?.id === savedAddress.id} onPress={() => { setSelectedShippingAddressId(savedAddress.id); setAddingShippingAddress(false); }} styles={styles} />)}
                {showNewShippingAddressForm && shippingAddressForm ? <View style={styles.newAddressForm}><Text style={styles.newAddressTitle}>Add new shipping address</Text><BusinessAddressFields form={shippingAddressForm} onChange={setShippingAddressField} styles={styles} /><View style={styles.addressFormActions}><Pressable accessibilityRole="button" disabled={savingShippingAddress} style={[styles.saveAddressButton, savingShippingAddress && styles.disabled]} onPress={() => void saveBusinessShippingAddress()}>{savingShippingAddress ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveAddressText}>Save &amp; use this address</Text>}</Pressable>{savedAddresses.length ? <Pressable accessibilityRole="button" disabled={savingShippingAddress} style={styles.cancelAddressButton} onPress={() => { setAddingShippingAddress(false); setShippingAddressForm(null); }}><Text style={styles.cancelAddressText}>Cancel</Text></Pressable> : null}</View></View> : null}
              </View>
            ) : null}
            </View>
            <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
            <View style={styles.paymentRow}>
              {codAvailable ? (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: paymentMethod === "COD" }}
                onPress={() => setPaymentMethod("COD")}
                style={[
                  styles.paymentButton,
                  paymentMethod === "COD" && styles.paymentActive,
                ]}
              >
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === "COD" && styles.paymentTextActive,
                  ]}
                >
                  Pay on delivery
                </Text>
              </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: paymentMethod === "ONLINE" }}
                onPress={() => setPaymentMethod("ONLINE")}
                style={[
                  styles.paymentButton,
                  paymentMethod === "ONLINE" && styles.paymentActive,
                ]}
              >
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === "ONLINE" && styles.paymentTextActive,
                  ]}
                >
                  Pay online
                </Text>
              </Pressable>
            </View>
            {!codAvailable ? (
              <Text style={styles.deliveryCopy}>
                Cash on delivery is unavailable for one or more products in this request. Online payment is available.
              </Text>
            ) : null}
            <PortalButton
              disabled={submitting || savingAddress}
              label={submitting ? "Submitting…" : paymentMethod === "ONLINE" ? "Continue to Razorpay" : "Place order"}
              onPress={() => void submitBulkOrder()}
            />
            <PortalButton
              label="View business orders"
              secondary
              onPress={() => router.push("/business/orders" as never)}
            />
            {submitting ? (
              <ActivityIndicator color={styles.spinner.color} />
            ) : null}
          </PortalCard>
        </View>
      )}
    </PortalShell>
  );

  async function submitBulkOrder() {
    if (submitting) return;
    for (const { product, quantity } of items) {
      const error = cartQuantityError(product, quantity, true);
      if (error) {
        showNotice(error);
        return;
      }
    }
    if (paymentMethod === "COD" && !codAvailable) {
      showNotice(
        "Cash on delivery is unavailable for one or more products in this request.",
      );
      setPaymentMethod("ONLINE");
      return;
    }
    if (!user || !token || user.role !== "BUSINESS") {
      showNotice(
        "Sign in with a business account before submitting a bulk order.",
      );
      router.push("/business/login" as never);
      return;
    }
    let chosenAddress = selectedAddress;
    if (!chosenAddress && showNewAddressForm)
      chosenAddress = await saveBusinessAddress();
    if (!chosenAddress) {
      showNotice("Please choose or add a business billing address.");
      return;
    }
    const billingAddress = formatBusinessDeliveryAddress(chosenAddress);
    let chosenShippingAddress = selectedShippingAddress;
    if (!shippingSameAsBilling && !chosenShippingAddress && showNewShippingAddressForm) chosenShippingAddress = await saveBusinessShippingAddress();
    if (!shippingSameAsBilling && !chosenShippingAddress) { showNotice("Please choose or add a shipping address."); return; }
    const resolvedShippingAddress = shippingSameAsBilling ? billingAddress : formatBusinessDeliveryAddress(chosenShippingAddress!);
    const input = {
      items: items.map(({ product, quantity }) => ({
        productId: product.id,
        quantity,
      })),
      billingAddress,
      shippingSameAsBilling,
      ...(shippingSameAsBilling ? {} : { shippingAddress: resolvedShippingAddress }),
      paymentMethod,
    };
    setSubmitting(true);
    try {
      if (paymentMethod === "ONLINE") {
        if (Platform.OS !== "web")
          throw new Error(
            "Razorpay checkout is currently available on the web version of the app.",
          );
        const payment = await initiateRazorpayPayment(token, input);
        await loadRazorpayCheckout();
        if (!window.Razorpay)
          throw new Error("Razorpay checkout did not load.");
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: "Sirohi Point Business",
          description: "Business order payment",
          order_id: payment.razorpayOrderId,
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone ?? undefined,
          },
          theme: { color: "#0F766E" },
          handler: (response) =>
            void completeRazorpayPayment(response, payment.razorpayOrderId),
          modal: { ondismiss: () => setSubmitting(false) },
        });
        checkout.on("payment.failed", () => {
          setSubmitting(false);
          showNotice(
            "Razorpay payment failed. Your bulk cart is still available.",
          );
        });
        checkout.open();
        return;
      }
      const summary = await submitOrder(token, input);
      clearCart();
      setSubmittedOrderId(summary.id);
      showNotice(`Bulk order ${summary.id} sent for admin approval.`);
    } catch (reason) {
      showNotice(
        reason instanceof Error
          ? reason.message
          : "Unable to submit the bulk order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function completeRazorpayPayment(
    response: RazorpayCheckoutSuccess,
    razorpayOrderId: string,
  ) {
    if (!token || response.razorpay_order_id !== razorpayOrderId) {
      showNotice("Razorpay returned an invalid payment order.");
      return;
    }
    setSubmitting(true);
    try {
      const payment = await verifyRazorpayPayment(token, {
        razorpayOrderId,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      if (payment.state !== "COMPLETED" || !payment.orderId)
        throw new Error(
          "Razorpay payment was not captured. Your bulk cart is still available.",
        );
      clearCart();
      setSubmittedOrderId(payment.orderId);
      showNotice(
        `Bulk order ${payment.orderId} paid and sent for admin approval.`,
      );
    } catch (reason) {
      showNotice(
        reason instanceof Error
          ? reason.message
          : "Unable to verify the Razorpay payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }
}

type BusinessAddressForm = CustomerAddressInput;

function BusinessAddressSelect({ label, value, options, onChange, styles }: {
  label: string;
  value: string;
  options: readonly string[];
  onChange(value: string): void;
  styles: ReturnType<typeof createStyles>;
}) {
  if (Platform.OS === "web") {
    return <View style={styles.addressSelectField}><Text style={styles.fieldLabel}>{label}</Text>{createElement("select", { value, onChange: (event: unknown) => onChange((event as { currentTarget: { value: string } }).currentTarget.value), "aria-label": `Select ${label.toLowerCase()}`, style: { width: "100%", minHeight: 42, padding: "0 10px", borderRadius: 8, border: `1px solid ${styles.singleLineInput.borderColor}`, backgroundColor: styles.singleLineInput.backgroundColor, color: styles.singleLineInput.color, fontSize: 13 } }, options.map((option) => createElement("option", { key: option, value: option, style: { color: "#182D45", backgroundColor: "#FFFFFF" } }, option)))}</View>;
  }
  const [open, setOpen] = useState(false);
  return <View style={[styles.addressSelectField, open && styles.selectFieldOpen]}><Text style={styles.fieldLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Select ${label.toLowerCase()}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.select}><Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>{value || `Select ${label.toLowerCase()}`}</Text><Text style={styles.selectChevron}>{open ? "⌃" : "⌄"}</Text></Pressable>{open ? <View style={styles.selectOptions}><ScrollView style={styles.selectScroll} contentContainerStyle={styles.selectScrollContent} nestedScrollEnabled>{options.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => { onChange(option); setOpen(false); }} style={[styles.selectOption, value === option && styles.selectOptionActive]}><Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]} numberOfLines={1}>{value === option ? "✓ " : ""}{option}</Text></Pressable>)}</ScrollView></View> : null}</View>;
}

function BusinessAddressFields({ form, onChange, styles }: {
  form: BusinessAddressForm;
  onChange(key: Exclude<keyof BusinessAddressForm, "isDefault">, value: string): void;
  styles: ReturnType<typeof createStyles>;
}) {
  return <><BusinessAddressSelect label="LABEL" value={form.label} options={ADDRESS_LABEL_OPTIONS} onChange={(value) => onChange("label", value)} styles={styles} /><Text style={styles.fieldLabel}>CONTACT NAME</Text><TextInput accessibilityLabel="Business contact name" value={form.name ?? ""} onChangeText={(value) => onChange("name", value)} placeholder="Recipient name" placeholderTextColor={styles.placeholder.color} style={styles.singleLineInput} /><Text style={styles.fieldLabel}>FLAT / HOUSE / BUILDING</Text><TextInput accessibilityLabel="House or building" value={form.houseNumber ?? ""} onChangeText={(value) => onChange("houseNumber", value)} placeholder="Flat/House/building name" placeholderTextColor={styles.placeholder.color} style={styles.singleLineInput} /><View style={styles.addressFieldRow}><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>CITY</Text><TextInput accessibilityLabel="Business city" value={form.city} onChangeText={(value) => onChange("city", value)} placeholder="City" placeholderTextColor={styles.placeholder.color} style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PIN CODE</Text><TextInput accessibilityLabel="Business PIN code" value={form.postalCode ?? ""} onChangeText={(value) => onChange("postalCode", value)} placeholder="PIN code" placeholderTextColor={styles.placeholder.color} keyboardType="number-pad" style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><BusinessAddressSelect label="STATE" value={form.state ?? ""} options={INDIAN_STATE_OPTIONS} onChange={(value) => onChange("state", value)} styles={styles} /></View></View><View style={styles.addressFieldRow}><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>PRIMARY PHONE</Text><TextInput accessibilityLabel="Business phone number" value={form.phone ?? ""} onChangeText={(value) => onChange("phone", value)} placeholder="Your phone number" placeholderTextColor={styles.placeholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View><View style={styles.shortAddressField}><Text style={styles.fieldLabel}>ALTERNATIVE PHONE (OPTIONAL)</Text><TextInput accessibilityLabel="Alternative business phone" value={form.alternatePhone ?? ""} onChangeText={(value) => onChange("alternatePhone", value)} placeholder="Backup number" placeholderTextColor={styles.placeholder.color} keyboardType="phone-pad" style={styles.singleLineInput} /></View></View><Text style={styles.fieldLabel}>STREET / AREA / LANDMARK</Text><TextInput accessibilityLabel="Business street, area and landmark" value={form.line1} onChangeText={(value) => onChange("line1", value)} placeholder="Street, area and landmark" placeholderTextColor={styles.placeholder.color} multiline style={styles.addressInput} /></>;
}

function formatBusinessDeliveryAddress(address: CustomerAddress) {
  return [
    address.name,
    address.houseNumber,
    address.line1,
    address.city,
    address.state,
    address.postalCode,
    address.phone ? `Primary phone: ${address.phone}` : undefined,
    address.alternatePhone
      ? `Alternative phone: ${address.alternatePhone}`
      : undefined,
  ]
    .filter(Boolean)
    .join(", ");
}

function BusinessSavedAddressOption({
  address,
  selected,
  onPress,
  styles,
}: {
  address: CustomerAddress;
  selected: boolean;
  onPress(): void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.savedAddressOption,
        selected && styles.savedAddressOptionActive,
      ]}
    >
      <View style={styles.savedAddressTop}>
        <View style={[styles.radio, selected && styles.radioActive]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <Text style={styles.savedAddressLabel}>{address.label}</Text>
        {address.isDefault ? (
          <Text style={styles.defaultAddressLabel}>DEFAULT</Text>
        ) : null}
      </View>
      {address.name ? (
        <Text style={styles.savedAddressLine}>{address.name}</Text>
      ) : null}
      <Text style={styles.savedAddressLine}>
        {[address.houseNumber, address.line1].filter(Boolean).join(", ")}
      </Text>
      <Text style={styles.savedAddressMeta}>
        {[address.city, address.state, address.postalCode]
          .filter(Boolean)
          .join(", ")}
      </Text>
      {address.phone ? (
        <Text style={styles.savedAddressPhone}>
          Primary phone · {address.phone}
        </Text>
      ) : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    columns: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      gap: 24,
    },
    itemsCard: { flexGrow: 1.6, flexShrink: 1, flexBasis: 560 },
    summaryCard: { flexGrow: 1, flexShrink: 1, flexBasis: 340 },
    list: { gap: 0 },
    item: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    itemBody: { flex: 1, minWidth: 170, gap: 4 },
    itemActions: { alignItems: "flex-end", gap: 6 },
    name: { color: colors.cream, fontSize: 14, fontWeight: "900" },
    meta: { color: colors.muted, fontSize: 13 },
    lineTotal: { color: colors.cream, fontSize: 14, fontWeight: "900" },
    remove: { color: colors.danger, fontSize: 13, fontWeight: "800" },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    summaryValue: { color: colors.cream, fontSize: 13, fontWeight: "900" },
    total: { color: colors.cream, fontSize: 28, fontWeight: "900" },
    fieldLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    deliveryHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    deliveryCopy: {
      color: colors.muted,
      fontSize: 11.5,
      lineHeight: 18,
      marginTop: 3,
    },
    addAddressButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teal,
      alignItems: "center",
      justifyContent: "center",
    },
    addAddressText: { color: colors.teal, fontSize: 11, fontWeight: "900" },
    addressError: { color: colors.danger, fontSize: 11.5, lineHeight: 18 },
    addressOptions: { gap: 8 },
    savedAddressOption: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceSunken,
      gap: 4,
    },
    savedAddressOptionActive: {
      borderColor: colors.teal,
      backgroundColor: colors.tealTint,
    },
    savedAddressTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: { borderColor: colors.teal },
    radioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.teal,
    },
    savedAddressLabel: {
      color: colors.cream,
      fontSize: 12.5,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    defaultAddressLabel: {
      color: colors.teal,
      fontSize: 8,
      fontWeight: "900",
      marginLeft: "auto",
    },
    savedAddressLine: {
      color: colors.cream,
      fontSize: 12.5,
      fontWeight: "700",
      lineHeight: 18,
    },
    savedAddressMeta: { color: colors.muted, fontSize: 11, lineHeight: 17 },
    savedAddressPhone: { color: colors.muted, fontSize: 11, lineHeight: 17 },
    fulfilmentCard: {
      width: "100%",
      alignSelf: "stretch",
      marginTop: 4,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: 8,
    },
    sameAddressOption: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingTop: 4,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: { backgroundColor: colors.teal, borderColor: colors.teal },
    checkboxTick: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    sameAddressCopy: { flex: 1, gap: 2 },
    sameAddressTitle: { color: colors.cream, fontSize: 13, fontWeight: "800" },
    shippingAddressForm: { gap: 6, paddingTop: 2 },
    newAddressForm: {
      width: "100%",
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.teal,
      backgroundColor: colors.surfaceSunken,
      gap: 8,
    },
    newAddressTitle: { color: colors.cream, fontSize: 14, fontWeight: "900" },
    addressLegacyHidden: { display: "none" },
    addressSelectField: { width: "100%", minWidth: 0, gap: 5 },
    selectFieldOpen: { zIndex: 100, elevation: 100 },
    select: {
      minHeight: 42,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceRaised,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    selectText: { flex: 1, color: colors.cream, fontSize: 13 },
    selectPlaceholder: { color: colors.muted },
    selectChevron: { color: colors.teal, fontSize: 18, fontWeight: "900" },
    selectOptions: {
      position: "absolute",
      top: 67,
      left: 0,
      right: 0,
      zIndex: 120,
      elevation: 120,
      maxHeight: 220,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    selectScroll: { maxHeight: 218, backgroundColor: colors.surfaceRaised },
    selectScrollContent: { backgroundColor: colors.surfaceRaised },
    selectOption: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    selectOptionActive: { backgroundColor: colors.tealTint },
    selectOptionText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
    selectOptionTextActive: { color: colors.cream, fontWeight: "900" },
    addressFieldRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    shortAddressField: { flexGrow: 1, flexBasis: 140, minWidth: 0, gap: 5 },
    singleLineInput: {
      minHeight: 42,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceRaised,
      color: colors.cream,
      fontSize: 13,
    },
    addressFormActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    saveAddressButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.teal,
      alignItems: "center",
      justifyContent: "center",
    },
    saveAddressText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "900" },
    cancelAddressButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelAddressText: {
      color: colors.muted,
      fontSize: 11.5,
      fontWeight: "800",
    },
    disabled: { opacity: 0.65 },
    addressInput: {
      minHeight: 106,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceSunken,
      color: colors.cream,
      fontSize: 14,
      textAlignVertical: "top",
    },
    placeholder: { color: colors.muted },
    paymentRow: { flexDirection: "row", gap: 8 },
    paymentButton: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceSunken,
      alignItems: "center",
      justifyContent: "center",
    },
    paymentActive: {
      borderColor: colors.teal,
      backgroundColor: colors.tealTint,
    },
    paymentText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },
    paymentTextActive: { color: colors.teal },
    spinner: { color: colors.teal },
    confirmation: {
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceSunken,
      gap: 4,
    },
    confirmationLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    confirmationValue: { color: colors.cream, fontSize: 17, fontWeight: "900" },
  });
