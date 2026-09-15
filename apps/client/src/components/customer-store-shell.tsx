import type { ThemeColors } from '@sirohi/design-tokens';
import { usePathname, useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Image, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/state/auth-context';
import { useAppState } from '@/state/app-context';
import { useCustomerStyles } from '@/theme/customer-theme';
import { useAppTheme } from '@/theme/theme-context';
import { TopBrands } from '@/components/top-brands';
import { FooterSocialLinks } from '@/components/footer-social-links';
import { CustomerPaintCalculator } from '@/components/customer-paint-calculator';
import { CustomerB2BOrdersSection } from '@/components/customer-b2b-orders-section';
import { getSearchHistory, addSearchTerm, removeSearchTerm } from '@/lib/search-history';
import { FloatingContactActions } from '@/components/floating-contact-actions';

export const shopCategories = ['Hardware', 'Electrical', 'Electronics', 'Paint', 'PVC & Plumbing', 'Sanitary'];
const bottomNavItems = [
  { label: 'Home', href: '/', icon: { ios: 'house.fill', android: 'home', web: 'home' } },
  { label: 'Shop', href: '/catalog', icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' } },
  { label: 'My orders', href: '/dashboard', icon: { ios: 'receipt.fill', android: 'receipt_long', web: 'receipt_long' } },
  { label: 'Account', href: '/dashboard', icon: { ios: 'person.fill', android: 'person', web: 'person' } },
] as const;

export function CustomerStoreShell({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const styles = useCustomerStyles(createStyles);
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ q?: string; category?: string; tab?: string }>();
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const compact = width < 600;
  const { user } = useAuth();
  const { cartCount, notice, dismissNotice } = useAppState();
  const { resolvedTheme, toggleTheme } = useAppTheme();
  const [searchOpen, setSearchOpen] = useState(Boolean(params.q));
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  useEffect(() => { if (params.q) setSearchOpen(true); }, [params.q]);
  const signedIn = user?.role === 'CUSTOMER';
  function go(href: string, query?: Record<string, string>) { router.push(query ? { pathname: href as never, params: query } : href as never); }
  const searchBar = <SearchBarWithHistory go={go} styles={styles} />;
  const footer = <>{pathname === '/' ? <CustomerPaintCalculator compact={compact} /> : null}<TopBrands />{pathname === '/' ? <CustomerB2BOrdersSection compact={compact} onPress={() => go('/business')} /> : null}<View style={styles.footer}><Pressable accessibilityRole="button" accessibilityLabel={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`} onPress={toggleTheme} style={styles.footerThemeToggle}><Text style={styles.footerThemeToggleText}>{resolvedTheme === 'dark' ? '☀ Light mode' : '◐ Dark mode'}</Text></Pressable><View style={styles.footerInner}>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>CONTACT</Text><Text style={styles.footerCopy}>+91 9058036895</Text><Text style={styles.footerCopy}>info@sirohipoint.com</Text><Text style={styles.footerCopy}>SHYAMPUR JATT, SALARPUR ROAD, HAPUR, UTTAR PRADESH 245205</Text><Text style={styles.footerCopy}>sirohipoint.com</Text><FooterSocialLinks /></View>
    <View style={styles.footerBrand}><Text style={styles.footerWordmark}>SIROHI POINT<Text style={styles.orange}>.</Text></Text><Text style={styles.footerStatement}>Good finds. Great projects.</Text><Text style={styles.footerCopy}>Materials, home essentials and expert help. All in one place.</Text><Pressable accessibilityRole="link" onPress={() => go('/catalog')}><Text style={styles.footerCta}>Find your next essential  ↗</Text></Pressable></View>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>COMPANY</Text><Pressable accessibilityRole="link" onPress={() => go('/company', { section: 'about-us' })}><Text style={styles.footerLink}>About Us</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/company', { section: 'contact-us' })}><Text style={styles.footerLink}>Contact Us</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/catalog')}><Text style={styles.footerLink}>All Products</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/company', { section: 'store-locator' })}><Text style={styles.footerLink}>Store Locator</Text></Pressable></View>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>POLICIES</Text><Pressable accessibilityRole="link" onPress={() => go('/terms')}><Text style={styles.footerLink}>Terms &amp; Conditions</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/privacy')}><Text style={styles.footerLink}>Privacy Policy</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/refund')}><Text style={styles.footerLink}>Refund &amp; Cancellation Policy</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/shipping')}><Text style={styles.footerLink}>Shipping Policy</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/warranty')}><Text style={styles.footerLink}>Warranty</Text></Pressable></View>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>THE SHOP</Text>{shopCategories.map(category => <Pressable key={category} accessibilityRole="link" onPress={() => go('/catalog', { category })}><Text style={styles.footerLink}>{category === 'PVC & Plumbing' ? 'PVC PIPE' : category}</Text></Pressable>)}</View>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>YOUR SIROHI</Text>{[['My orders', '/dashboard', 'orders'], ['My account', '/dashboard', 'account'], ['Saved products', '/catalog', ''], ['Shopping cart', '/cart', ''], ['Help & support', '/dashboard', 'support']].map(([label, href, tab]) => <Pressable key={label} accessibilityRole="link" onPress={() => go(href === '/dashboard' && !signedIn ? '/customer/login' : href, tab ? { tab } : label === 'Saved products' ? { saved: '1' } : undefined)}><Text style={styles.footerLink}>{label}</Text></Pressable>)}</View>
    <View style={styles.footerColumn}><Text style={styles.footerHeading}>A LITTLE EXTRA HELP</Text><Text style={styles.footerCopy}>Make the most of your materials with a specialist for your project.</Text><Pressable accessibilityRole="link" onPress={() => go('/services/nearby')}><Text style={styles.footerCta}>Find a technician  →</Text></Pressable></View>
  </View><View style={styles.footerBottom}><Text style={styles.footerSmall}>© {new Date().getFullYear()} Sirohi Point. Built for everyday projects.</Text><Text style={styles.footerSmall}>GST-ready checkout  ·  Pay on delivery</Text></View></View></>;
  const body = <>{children}{footer}</>;
  return <><Head><title>Sirohi Point | Essentials for every project</title></Head><SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
    <View style={styles.header}><View style={[styles.headerRow, !desktop && styles.headerRowMobile, !desktop && { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Sirohi Point customer home" onPress={() => go('/')} style={[styles.brand, !desktop && styles.brandMobile, !desktop && { flex: 1, minWidth: 0, width: 'auto', flexShrink: 1 }]}><View style={[styles.brandLogoFrame, compact && styles.brandLogoFrameCompact]}><Image source={require('../../assets/images/logo_sirohi.png')} style={styles.logo} resizeMode="contain" /></View><View style={{ minWidth: 0, flexShrink: 1 }}><Text numberOfLines={1} style={[styles.brandName, compact && { fontSize: 16 } ]}>SIROHI POINT<Text style={styles.orange}>.</Text></Text><Text numberOfLines={1} style={[styles.brandCaption, compact && { fontSize: 8 } ]}>EVERY PROJECT STARTS HERE</Text></View></Pressable>
      {desktop ? searchBar : null}
      <View style={[styles.actions, !desktop && styles.actionsMobile, !desktop && { width: 'auto', marginLeft: 0, flexShrink: 0, flexWrap: 'nowrap', gap: 8 }]}>
        {compact ? <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close search' : 'Open search'} accessibilityState={{ expanded: searchOpen }} onPress={() => { setSearchOpen((open) => !open); setAuthMenuOpen(false); }} style={[styles.register, { width: 44, height: 44, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' }]}><SymbolView name={{ ios: searchOpen ? 'xmark' : 'magnifyingglass', android: searchOpen ? 'close' : 'search', web: searchOpen ? 'close' : 'search' }} tintColor={styles.navText.color} size={21} /></Pressable> : null}
        {signedIn && !desktop ? <Pressable accessibilityRole="link" accessibilityLabel="My account" onPress={() => go('/dashboard', { tab: 'account' })} style={[styles.register, compact && { width: 44, height: 44, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' }]}>{compact ? <SymbolView name={{ ios: 'person', android: 'person', web: 'person' }} size={21} tintColor={styles.actionText.color} /> : <Text style={styles.actionText}>My account</Text>}</Pressable> : null}
        {!signedIn && !desktop ? <Pressable accessibilityRole="button" accessibilityLabel={authMenuOpen ? 'Close account options' : 'Open account options'} accessibilityState={{ expanded: authMenuOpen }} onPress={() => { setAuthMenuOpen((open) => !open); setSearchOpen(false); }} style={[styles.register, { width: 44, height: 44, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' }]}><SymbolView name={{ ios: authMenuOpen ? 'xmark' : 'person.crop.circle', android: authMenuOpen ? 'close' : 'account_circle', web: authMenuOpen ? 'close' : 'account_circle' }} size={22} tintColor={styles.actionText.color} /></Pressable> : null}
        {!signedIn && desktop ? <><Pressable accessibilityRole="link" accessibilityLabel="Sign in" onPress={() => go('/customer/login')} style={styles.register}><Text style={styles.actionText}>Sign in</Text></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Register" onPress={() => go('/customer/signup')} style={[styles.register, styles.registerPrimary]}><Text style={[styles.actionText, styles.registerPrimaryText]}>Register</Text></Pressable></> : null}
        {desktop && signedIn ? <><Pressable accessibilityRole="link" onPress={() => go('/dashboard', { tab: 'orders' })} style={styles.action}><Text style={styles.muted}>Track & manage</Text><Text style={styles.actionText}>My orders</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/dashboard', { tab: 'account' })} style={styles.action}><Text style={styles.muted} numberOfLines={1}>{`Hello, ${user.name.split(' ')[0]}`}</Text><Text style={styles.actionText}>Account</Text></Pressable></> : null}
        <Pressable accessibilityRole="link" accessibilityLabel={`Shopping cart, ${cartCount} items`} onPress={() => go('/cart')} style={[styles.cart, !desktop && { flexShrink: 0 }, compact && { paddingHorizontal: 8, gap: 5 }]}><SymbolView name={{ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }} size={22} tintColor="#FFFFFF" />{desktop ? <Text style={styles.cartText}>Cart</Text> : null}<Text style={styles.cartCount}>{cartCount}</Text></Pressable>
      </View></View>
      {!desktop && !signedIn && authMenuOpen ? <View style={styles.mobileAuthMenu}><View style={styles.mobileAuthMenuInner}><Text style={styles.mobileAuthTitle}>Continue with your account</Text><View style={styles.mobileAuthActions}><Pressable accessibilityRole="link" style={[styles.mobileAuthButton, styles.registerPrimary]} onPress={() => { setAuthMenuOpen(false); go('/customer/signup'); }}><Text style={styles.registerPrimaryText}>Create account</Text></Pressable><Pressable accessibilityRole="link" style={styles.mobileAuthButton} onPress={() => { setAuthMenuOpen(false); go('/customer/login'); }}><Text style={styles.actionText}>Sign in</Text></Pressable></View></View></View> : null}
      {!desktop && (!compact || searchOpen) ? <View style={styles.mobileSearch}>{searchBar}</View> : null}
    </View>
    <View style={styles.nav}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.navInner, { justifyContent: 'flex-start' }, !desktop && styles.navInnerMobile]}><Pressable accessibilityRole="link" onPress={() => go('/')} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.navText}>Home</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/catalog')} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.allCategories}>All categories</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/catalog')} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.navText}>Filter by categories</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/catalog', { deals: '1' })} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.navText}>Today’s deals ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/services/nearby')} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.navText}>Find a technician</Text></Pressable><Pressable accessibilityRole="link" onPress={() => go('/business/catalog')} style={[styles.navLink, !desktop && styles.navLinkMobile]}><Text style={styles.navText}>Explore bulk products</Text></Pressable></ScrollView></View>
    <View style={styles.body}>{scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}</View>
    {!desktop ? <View style={styles.bottomNav}>{bottomNavItems.map(({ label, href, icon }) => { const active = pathname === href && (href !== '/dashboard' || (params.tab ?? 'orders') === (label === 'My orders' ? 'orders' : 'account')); return <Pressable accessibilityRole="link" accessibilityState={{ selected: active }} key={label} style={styles.bottomLink} onPress={() => go(href === '/dashboard' && !signedIn ? '/customer/login' : href, href === '/dashboard' && signedIn ? { tab: label === 'My orders' ? 'orders' : 'account' } : undefined)}><SymbolView name={icon} size={18} tintColor={active ? styles.activeText.color : styles.navText.color} /><Text style={[styles.navText, active && styles.activeText]}>{label}</Text></Pressable>; })}</View> : null}
    {notice ? <Pressable accessibilityRole="alert" onPress={dismissNotice} style={[styles.toast, !desktop && { bottom: 68 }]}><Text style={styles.cartText}>{notice}   ×</Text></Pressable> : null}
  </SafeAreaView><FloatingContactActions /></>;
}

function SearchBarWithHistory({ go, styles }: { go(href: string, query?: Record<string, string>): void; styles: ReturnType<typeof createStyles> }) {
  const params = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(params.q ?? '');
  const [history, setHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const showHistory = focused && history.length > 0 && search.trim() === '';

  useEffect(() => { setHistory(getSearchHistory()); }, []);
  useEffect(() => { if (params.q !== undefined) setSearch(params.q); }, [params.q]);

  function handleSubmit() {
    const trimmed = search.trim();
    if (trimmed) {
      setHistory(addSearchTerm(trimmed));
    }
    Keyboard.dismiss();
    setFocused(false);
    go('/catalog', trimmed ? { q: trimmed } : undefined);
  }

  function handleSelect(term: string) {
    setSearch(term);
    inputRef.current?.focus();
  }

  function handleRemove(term: string) {
    setHistory(removeSearchTerm(term));
  }

  return (
    <View style={[styles.search, { overflow: 'visible' }]}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Search products, brands and categories"
        placeholder="What are you looking for today?"
        placeholderTextColor={styles.muted.color}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={handleSubmit}
        onFocus={() => { setFocused(true); setHistory(getSearchHistory()); }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        returnKeyType="search"
        autoCapitalize="none"
        style={styles.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Search store" onPress={() => { inputRef.current?.focus(); handleSubmit(); }} style={styles.searchButton}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor="#FFFFFF" size={22} />
      </Pressable>
      {showHistory ? (
        <View style={styles.historyDropdown}>
          <Text style={styles.historyTitle}>Recent searches</Text>
          {history.map((term) => (
            <View key={term} style={styles.historyRow}>
              <Pressable onPress={() => handleSelect(term)} style={styles.historyItem}>
                <SymbolView name={{ ios: 'clock', android: 'history', web: 'history' }} tintColor={styles.muted.color} size={14} />
                <Text style={styles.historyText} numberOfLines={1}>{term}</Text>
              </Pressable>
              <Pressable onPress={() => handleRemove(term)} style={styles.historyRemove} accessibilityLabel={`Remove ${term} from history`}>
                <Text style={styles.historyRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) => {
  const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.ink }, announcement: { backgroundColor: c.primary, paddingVertical: 9, paddingHorizontal: 28, flexDirection: 'row', justifyContent: 'space-between' }, announcementText: { color: '#EAF1F7', fontSize: 12, lineHeight: 18 }, header: { backgroundColor: c.header, position: 'relative', zIndex: 100 }, headerRow: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 28, flexWrap: 'wrap' }, headerRowMobile: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMobile: { width: '100%', flexShrink: 0 }, brandLogoFrame: { width: 40, height: 40, flexShrink: 0, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, brandLogoFrameCompact: { width: 34, height: 34 }, logo: { width: '100%', height: '100%' }, brandName: { fontSize: 19, fontWeight: '900', color: c.textPrimary, letterSpacing: -0.7 }, orange: { color: c.copperBright }, brandCaption: { color: c.muted, fontSize: 10, letterSpacing: 1.2, marginTop: 3 }, search: { flex: 1, minWidth: 100, flexDirection: 'row', minHeight: 48, borderWidth: 1, borderColor: c.line, backgroundColor: c.surfaceRaised, borderRadius: 12, overflow: 'visible' }, input: { flex: 1, minWidth: 0, paddingHorizontal: 16, color: c.textPrimary, fontSize: 14 }, searchButton: { width: 50, backgroundColor: c.cta, justifyContent: 'center', alignItems: 'center' }, historyDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, zIndex: 9999, overflow: 'hidden', shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 10 }, historyTitle: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, color: c.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 }, historyRow: { flexDirection: 'row', alignItems: 'center' }, historyItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 40 }, historyText: { flex: 1, color: c.textPrimary, fontSize: 13, fontWeight: '600' }, historyRemove: { paddingHorizontal: 14, paddingVertical: 10 }, historyRemoveText: { color: c.muted, fontSize: 18, fontWeight: '600' }, mobileSearch: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row' }, mobileAuthMenu: { paddingHorizontal: 16, paddingBottom: 12 }, mobileAuthMenuInner: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, gap: 10 }, mobileAuthTitle: { color: c.textPrimary, fontSize: 13, fontWeight: '800' }, mobileAuthActions: { flexDirection: 'row', gap: 8 }, mobileAuthButton: { flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }, actions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }, actionsMobile: { width: '100%', marginLeft: 0, justifyContent: 'flex-end', gap: 8, flexWrap: 'nowrap' }, action: { minHeight: 44, justifyContent: 'center', maxWidth: 150 }, actionText: { color: c.textPrimary, fontSize: 14, fontWeight: '700' }, muted: { color: c.muted, fontSize: 12, marginBottom: 4 }, register: { paddingHorizontal: 12, minHeight: 42, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: c.line }, registerPrimary: { backgroundColor: c.cta, borderColor: c.cta }, registerPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, cart: { minHeight: 46, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.primary, paddingHorizontal: 13, borderRadius: 10 }, cartText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, cartCount: { color: '#FFFFFF', backgroundColor: c.cta, borderRadius: 12, minWidth: 22, textAlign: 'center', padding: 3, fontSize: 12, fontWeight: '800' }, nav: { backgroundColor: c.header, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }, navInner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 12 }, navInnerMobile: { justifyContent: 'flex-start', paddingHorizontal: 8 }, navLink: { minHeight: 50, paddingHorizontal: 16, justifyContent: 'center' }, navLinkMobile: { minHeight: 48, paddingHorizontal: 12 }, navText: { color: c.textPrimary, fontSize: 14, fontWeight: '600' }, allCategories: { color: c.textPrimary, fontSize: 14, fontWeight: '800' }, activeText: { color: c.cta, fontWeight: '800', fontSize: 14 }, body: { flex: 1 }, scroll: { flexGrow: 1 }, bottomNav: { backgroundColor: c.header, borderTopWidth: 1, borderColor: c.line, flexDirection: 'row', paddingBottom: 4 }, bottomLink: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 }, toast: { position: 'absolute', bottom: 20, left: 20, right: 20, maxWidth: 560, alignSelf: 'center', borderRadius: 12, padding: 20, backgroundColor: c.primary }, footer: { backgroundColor: '#111827', marginTop: 32, paddingHorizontal: 28, paddingTop: 52 }, footerInner: { maxWidth: 1384, alignSelf: 'center', width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 40, paddingBottom: 44 }, footerBrand: { flexGrow: 1.5, flexBasis: 280, gap: 14 }, footerWordmark: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' }, footerStatement: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' }, footerCopy: { color: '#CBD5E1', fontSize: 14, lineHeight: 23, maxWidth: 290 }, footerColumn: { flexGrow: 1, flexBasis: 170, gap: 14 }, footerHeading: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, footerLink: { color: '#E0E7FF', fontSize: 14 }, footerCta: { color: '#A5B4FC', fontSize: 14, fontWeight: '700', paddingVertical: 8 }, footerBottom: { borderTopWidth: 1, borderColor: '#334155', paddingVertical: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, maxWidth: 1384, alignSelf: 'center', width: '100%' }, footerSmall: { color: '#94A3B8', fontSize: 12, lineHeight: 18, }, footerThemeToggle: { minHeight: 38, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' }, footerThemeToggleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  });
  styles.footerThemeToggle = StyleSheet.flatten([styles.footerThemeToggle, { alignSelf: 'flex-start', marginBottom: 28 }]);
  return styles;
};
