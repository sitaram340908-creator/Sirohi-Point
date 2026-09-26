import type { PaymentChannel, Product } from '@/shared/contracts';
import { createContext, useContext, useEffect, useMemo, useState, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/state/auth-context';
import { cartQuantityError } from '@/lib/cart-rules';

export interface CustomerOrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceInPaise: number;
}

export interface CustomerOrder {
  id: string;
  createdAt: string;
  status: 'CONFIRMED' | 'ACCEPTED' | 'PACKED' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  totalInPaise: number;
  itemCount: number;
  deliveryMode: 'standard' | 'express';
  paymentMethod: 'COD' | 'ONLINE';
  paymentChannel?: PaymentChannel;
  address: string;
  cancellationReason?: string;
  items: CustomerOrderItem[];
}

type NewCustomerOrder = Omit<CustomerOrder, 'id' | 'createdAt' | 'status'>;

interface StoredAppState {
  carts: Record<string, Record<string, number>>;
  wishlist: string[];
}

interface AppContextValue {
  cart: Record<string, number>;
  cartCount: number;
  wishlist: string[];
  buyNowProduct: Product | null;
  buyNowQuantity: number;
  notice: string | null;
  addToCart(product: Product, quantity?: number): void;
  startBuyNow(product: Product, quantity?: number): void;
  setBuyNowQuantity(quantity: number): void;
  clearBuyNow(): void;
  decrement(productId: string, minimum?: number): void;
  setQuantity(product: Product, quantity: number): void;
  removeItem(productId: string): void;
  toggleWishlist(productId: string): void;
  clearCart(): void;
  placeOrder(input: NewCustomerOrder, orderId?: string, clearCurrentCart?: boolean): CustomerOrder;
  dismissNotice(): void;
  showNotice(message: string): void;
}

const STORAGE_KEY = 'sirohi-point-customer-v1';
const SHARED_CART_SCOPE = 'shared';
const AppContext = createContext<AppContextValue | null>(null);

function readStoredState(): StoredAppState | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAppState> & { cart?: Record<string, number> };
    const storedCarts = parsed.carts && typeof parsed.carts === 'object'
      ? parsed.carts
      : { guest: parsed.cart ?? {} };
    const sharedCart = Object.values(storedCarts).reduce<Record<string, number>>((merged, storedCart) => {
      if (!storedCart || typeof storedCart !== 'object') return merged;
      Object.entries(storedCart).forEach(([productId, quantity]) => {
        if (typeof quantity === 'number' && quantity > 0) {
          merged[productId] = (merged[productId] ?? 0) + quantity;
        }
      });
      return merged;
    }, {});
    return {
      carts: { [SHARED_CART_SCOPE]: sharedCart },
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
    };
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const cartScope = SHARED_CART_SCOPE;
  const [carts, setCarts] = useState<Record<string, Record<string, number>>>({});
  const cartsRef = useRef(carts);
  const updateCarts = (next: Record<string, Record<string, number>>) => { cartsRef.current = next; setCarts(next); };
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [buyNowProduct, setBuyNowProduct] = useState<Product | null>(null);
  const [buyNowQuantity, setBuyNowQuantity] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readStoredState();
      if (stored) {
        updateCarts(stored.carts);
        setWishlist(stored.wishlist);
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const state: StoredAppState = { carts, wishlist };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* The current session cart remains usable if storage is unavailable. */ }
  }, [carts, hydrated, wishlist]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const cart = carts[cartScope] ?? {};
  const value = useMemo<AppContextValue>(() => ({
    cart,
    cartCount: Object.values(cart).reduce((total, quantity) => total + quantity, 0),
    wishlist,
    buyNowProduct,
    buyNowQuantity,
    notice,
    addToCart(product, quantity = 1) {
      if (user && !['CUSTOMER', 'BUSINESS'].includes(user.role)) { setNotice('Sign in with a buyer account to add products.'); return; }
      const current = cartsRef.current;
      const nextQuantity = (current[cartScope]?.[product.id] ?? 0) + quantity;
      const error = cartQuantityError(product, nextQuantity, user?.role === 'BUSINESS');
      if (error) { setNotice(error); return; }
      updateCarts({ ...current, [cartScope]: { ...current[cartScope], [product.id]: nextQuantity } });
      setNotice(`${quantity > 1 ? `${quantity} × ` : ''}${product.name} added to your cart.`);
    },
    startBuyNow(product, quantity = 1) {
      setBuyNowProduct(product);
      setBuyNowQuantity(quantity);
    },
    setBuyNowQuantity(quantity) {
      setBuyNowQuantity(quantity);
    },
    clearBuyNow() {
      setBuyNowProduct(null);
      setBuyNowQuantity(1);
    },
    decrement(productId, minimum = 1) {
      const current = cartsRef.current;
      const nextCart = { ...current[cartScope] };
      if ((nextCart[productId] ?? 0) <= minimum) { setNotice(`Minimum quantity is ${minimum}. Use Remove to delete this item.`); return; }
      nextCart[productId] -= 1;
      updateCarts({ ...current, [cartScope]: nextCart });
    },
    setQuantity(product, quantity) {
      const error = cartQuantityError(product, quantity, user?.role === 'BUSINESS');
      if (error) { setNotice(error); return; }
      const current = cartsRef.current;
      updateCarts({ ...current, [cartScope]: { ...current[cartScope], [product.id]: quantity } });
    },
    removeItem(productId) {
      const current = cartsRef.current;
      const nextCart = { ...current[cartScope] };
      delete nextCart[productId];
      updateCarts({ ...current, [cartScope]: nextCart });
    },
    toggleWishlist(productId) {
      setWishlist((current) => {
        const saved = current.includes(productId);
        setNotice(saved ? 'Removed from saved products.' : 'Saved for later.');
        return saved ? current.filter((id) => id !== productId) : [...current, productId];
      });
    },
    clearCart() {
      updateCarts({ ...cartsRef.current, [cartScope]: {} });
    },
    placeOrder(input, orderId, clearCurrentCart = true) {
      const order: CustomerOrder = {
        ...input,
        id: orderId ?? String(Math.floor(100000000000 + Math.random() * 900000000000)),
        createdAt: new Date().toISOString(),
        status: 'CONFIRMED',
      };
      if (clearCurrentCart) updateCarts({ ...cartsRef.current, [cartScope]: {} });
      setNotice(`Order ${order.id} submitted for admin approval.`);
      return order;
    },
    dismissNotice() {
      setNotice(null);
    },
    showNotice(message) {
      setNotice(message);
    },
  }), [buyNowProduct, buyNowQuantity, cart, cartScope, notice, wishlist, user]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
