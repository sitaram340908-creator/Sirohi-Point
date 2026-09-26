import type { CreateProductReviewInput } from '@/shared/contracts';
import { radius, spacing, type ThemeColors } from '@/shared/design-tokens';
import { formatMoney, priceIncludingGstInPaise } from '@/shared/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { ProductVisual } from '@/components/product-visual';
import { StarRating } from '@/components/star-rating';
import { createProductReview, deleteProductReview, getCatalog, getProductReviews } from '@/lib/api';
import { useAppState } from '@/state/app-context';
import { useAuth } from '@/state/auth-context';
import { useCustomerStyles as useThemedStyles } from '@/theme/customer-theme';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { addToCart, startBuyNow, toggleWishlist, wishlist, showNotice } = useAppState();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const reviews = useQuery({ queryKey: ['product-reviews', id], queryFn: () => getProductReviews(id), enabled: Boolean(id) });
  const reviewMutation = useMutation({
    mutationFn: (input: CreateProductReviewInput) => {
      if (!token) throw new Error('Sign in as a customer to write a review.');
      return createProductReview(token, id, input);
    },
    onSuccess: () => {
      setReviewFormOpen(false);
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      setReviewError('');
      void queryClient.invalidateQueries({ queryKey: ['product-reviews', id] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
  const reviewDeleteMutation = useMutation({
    mutationFn: (reviewId: string) => {
      if (!token) throw new Error('Sign in as a customer to delete your review.');
      return deleteProductReview(token, id, reviewId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['product-reviews', id] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (error) => setReviewError(error instanceof Error ? error.message : 'Unable to delete your review.'),
  });
  const product = catalog.data?.find((item) => item.id === id);
  const desktop = width >= 900;
  const visualSize = desktop ? 420 : Math.min(Math.max(width - spacing.lg * 2, 280), 420);

  if (catalog.isLoading) {
    return <AppShell><View style={styles.missing}><Text style={styles.missingTitle}>Loading product details…</Text></View></AppShell>;
  }

  if (!product) {
    return (
      <AppShell>
        <View style={styles.missing}>
          <Text style={styles.missingCode}>404</Text>
          <Text style={styles.missingTitle}>{catalog.isError ? 'Product details are unavailable.' : 'Product not found.'}</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace('/catalog')}>
            <Text style={styles.primaryText}>Return to catalog</Text>
          </Pressable>
        </View>
      </AppShell>
    );
  }

  const saved = wishlist.includes(product.id);
  const discount = product.compareAtPriceInPaise
    ? Math.round((1 - product.priceInPaise / product.compareAtPriceInPaise) * 100)
    : 0;
  const lowStock = product.stock > 0 && product.stock <= 10;
  const displayPrice = priceIncludingGstInPaise(product.priceInPaise, product.gstRate);
  const displayCompareAtPrice = product.compareAtPriceInPaise ? priceIncludingGstInPaise(product.compareAtPriceInPaise, product.gstRate) : undefined;

  function requireCustomer() {
    if (!user || user.role === 'CUSTOMER') return true;
    showNotice('Sign in as a customer to buy products.');
    router.replace('/customer/login' as never);
    return false;
  }

  function openReviewForm() {
    if (!user || user.role !== 'CUSTOMER') {
      router.push('/customer/login');
      return;
    }
    setReviewError('');
    setReviewFormOpen(current => !current);
  }

  function submitReview() {
    if (!user || user.role !== 'CUSTOMER' || !token) {
      router.push('/customer/login');
      return;
    }
    const comment = reviewComment.trim();
    if (comment.length < 10) {
      setReviewError('Please write at least 10 characters about this product.');
      return;
    }
    setReviewError('');
    reviewMutation.mutate({
      rating: reviewRating,
      ...(reviewTitle.trim() ? { title: reviewTitle.trim() } : {}),
      comment,
    });
  }

  function confirmDeleteReview(reviewId: string) {
    const message = 'Your review will be permanently removed.';
    const remove = () => reviewDeleteMutation.mutate(reviewId);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) remove();
      return;
    }
    Alert.alert('Delete your review?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <AppShell>
      <View style={styles.content}>
        <View style={styles.breadcrumb}>
          <Pressable onPress={() => router.push('/catalog')}><Text style={styles.breadcrumbLink}>All products</Text></Pressable>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <Pressable onPress={() => router.push({ pathname: '/catalog', params: { category: product.category } })}><Text style={styles.breadcrumbLink}>{product.category}</Text></Pressable>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <Text style={styles.breadcrumbText} numberOfLines={1}>{product.name}</Text>
        </View>

        <View style={[styles.columns, desktop && styles.columnsDesktop]}>
          <View style={styles.visualColumn}>
            <View style={[styles.visualFrame, { height: visualSize, minHeight: visualSize, maxHeight: visualSize }]}>
              <ProductVisual product={product} style={[styles.productVisual, { height: visualSize, minHeight: visualSize, maxHeight: visualSize }]} />
              {product.badge ? <Text style={styles.badge}>{product.badge}</Text> : null}
            </View>
          </View>

          <View style={[styles.details, !desktop && { marginTop: 15 }]}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text accessibilityRole="header" style={styles.title}>{product.name}</Text>
            <View style={styles.ratingRow}>
              <StarRating rating={product.rating} reviewCount={product.reviewCount} size={14} />
              <Text style={styles.ratingMeta}>·</Text>
              <Text style={styles.ratingMeta}>SKU {product.id.slice(-6).toUpperCase()}</Text>
            </View>

            <View style={styles.pricePanel}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatMoney(displayPrice)}</Text>
                {displayCompareAtPrice ? <Text style={styles.compare}>{formatMoney(displayCompareAtPrice)}</Text> : null}
                {discount ? <Text style={styles.saving}>{discount}% off</Text> : null}
              </View>
              <Text style={styles.taxNote}>GST {product.gstRate ?? 18}% included · GST invoice available</Text>
            </View>

            <Text style={styles.copy}>{product.description}</Text>

            <View style={styles.stockRow}>
              <View style={styles.stockDot} />
              <Text style={[styles.stock, lowStock && styles.stockLow]}>{lowStock ? `Only ${product.stock} left in stock` : 'In stock'}</Text>
              <Text style={styles.ratingMeta}>· {product.serviceAvailable ? 'Installation available' : 'Material only'}</Text>
            </View>

            <View style={styles.quantityRow}>
              <Text style={styles.controlLabel}>QUANTITY</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepButton} onPress={() => setQuantity((current) => Math.max(1, current - 1))}><Text style={styles.stepText}>−</Text></Pressable>
                <Text style={styles.quantity}>{quantity}</Text>
                <Pressable style={styles.stepButton} onPress={() => setQuantity((current) => Math.min(product.stock, current + 1))}><Text style={styles.stepText}>+</Text></Pressable>
              </View>
              <Text style={styles.lineTotalValue}>{formatMoney(displayPrice * quantity)}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${quantity} ${product.name} to cart`}
                style={styles.addButton}
                onPress={() => { if (requireCustomer()) addToCart(product, quantity); }}
              >
                <Text style={styles.addText}>Add to cart</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Buy ${quantity} ${product.name} now`}
                style={styles.buyButton}
                onPress={() => {
                  if (!requireCustomer()) return;
                  startBuyNow(product, quantity);
                  router.push('/cart');
                }}
              >
                <Text style={styles.buyText}>Buy now</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${saved ? 'Remove from' : 'Add to'} saved products`}
                style={[styles.saveButton, saved && styles.saveButtonActive]}
                onPress={() => toggleWishlist(product.id)}
              >
                <Text style={[styles.saveText, saved && styles.saveTextActive]}>{saved ? '♥' : '♡'}</Text>
              </Pressable>
            </View>

            {product.serviceAvailable ? (
              <Pressable style={styles.servicePanel} onPress={() => router.push('/services/nearby')}>
                <View style={styles.serviceBody}>
                  <Text style={styles.serviceTitle}>Need it installed? Book a verified specialist.</Text>
                  <Text style={styles.serviceCopy}>Share this product with the specialist when you book.</Text>
                </View>
                <Text style={styles.serviceLink}>View services →</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.specPanel}>
          <Text style={styles.specHeading}>Product details</Text>
          <SpecRow label="Brand" value={product.brand} />
          <SpecRow label="Category" value={product.category} />
          <SpecRow label="Seller" value="Verified · Sirohi Point fulfilment network" />
          <SpecRow label="Support" value="7 day support window" />
          <SpecRow label="Delivery" value="Time and charges confirmed at checkout" />
        </View>

        <View style={styles.reviewPanel}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewHeadingCopy}>
              <Text style={styles.specHeading}>Customer reviews</Text>
              <Text style={styles.reviewHint}>See what other customers think, or share your experience.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={openReviewForm} style={styles.reviewButton}>
              <Text style={styles.reviewButtonText}>{reviewFormOpen ? 'Close review' : 'Write a review'}</Text>
            </Pressable>
          </View>

          {reviewFormOpen && user?.role === 'CUSTOMER' ? (
            <View style={styles.reviewForm}>
              <Text style={styles.formLabel}>Your rating</Text>
              <View style={styles.ratingPicker}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} accessibilityRole="button" accessibilityLabel={star + ' star' + (star === 1 ? '' : 's')} onPress={() => setReviewRating(star)} style={styles.ratingChoice}>
                    <Text style={[styles.ratingChoiceText, star <= reviewRating && styles.ratingChoiceActive]}>★</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput accessibilityLabel="Review title" placeholder="Review title (optional)" placeholderTextColor={styles.input.color} value={reviewTitle} onChangeText={setReviewTitle} style={styles.reviewInput} maxLength={80} />
              <TextInput accessibilityLabel="Review comment" placeholder="Tell us about the quality, value, or delivery…" placeholderTextColor={styles.input.color} value={reviewComment} onChangeText={setReviewComment} style={[styles.reviewInput, styles.reviewCommentInput]} multiline maxLength={1000} />
              {reviewError || reviewMutation.error ? <Text style={styles.reviewError}>{reviewError || (reviewMutation.error instanceof Error ? reviewMutation.error.message : 'Unable to publish your review.')}</Text> : null}
              <Pressable accessibilityRole="button" disabled={reviewMutation.isPending} onPress={submitReview} style={[styles.submitReviewButton, reviewMutation.isPending && styles.disabledButton]}>
                <Text style={styles.submitReviewText}>{reviewMutation.isPending ? 'Publishing…' : 'Publish review'}</Text>
              </Pressable>
            </View>
          ) : null}

          {reviews.isLoading ? <Text style={styles.reviewHint}>Loading reviews…</Text> : null}
          {reviews.isError ? <Text style={styles.reviewError}>Reviews are unavailable right now.</Text> : null}
          {!reviews.isLoading && !reviews.isError && !reviews.data?.length ? <Text style={styles.reviewHint}>No reviews yet. Be the first to share your experience.</Text> : null}
          {reviews.data?.map(review => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewItemHeader}>
                <View style={styles.reviewAuthorRow}>
                  <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{review.customerName.slice(0, 1).toUpperCase()}</Text></View>
                  <View><Text style={styles.reviewAuthor}>{review.customerName}</Text><Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('en-IN')}</Text></View>
                </View>
                <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}<Text style={styles.reviewStarsMuted}>{'★'.repeat(5 - review.rating)}</Text></Text>
              </View>
              {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
              <Text style={styles.reviewComment}>{review.comment}</Text>
              {user?.role === 'CUSTOMER' && review.customerId === user.id ? (
                <Pressable accessibilityRole="button" disabled={reviewDeleteMutation.isPending} onPress={() => confirmDeleteReview(review.id)} style={[styles.deleteReviewButton, reviewDeleteMutation.isPending && styles.disabledButton]}>
                  <Text style={styles.deleteReviewText}>{reviewDeleteMutation.isPending ? 'Deleting…' : 'Delete your review'}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { width: '100%', maxWidth: 1500, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.xl },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, overflow: 'hidden' },
  breadcrumbLink: { color: colors.teal, fontSize: 12, fontWeight: '700' },
  breadcrumbDivider: { color: colors.muted, fontSize: 12 },
  breadcrumbText: { color: colors.muted, fontSize: 12, maxWidth: 220 },
  columns: { gap: spacing.xl },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  visualColumn: { flex: 0.8, minWidth: 0 },
  visualFrame: { height: 420, minHeight: 420, maxHeight: 420, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  productVisual: { width: '100%', height: 420, minHeight: 420, maxHeight: 420 },
  badge: { position: 'absolute', left: 0, top: spacing.md, color: '#FFFFFF', backgroundColor: colors.cta, borderTopRightRadius: radius.xs, borderBottomRightRadius: radius.xs, paddingHorizontal: spacing.md, paddingVertical: 5, fontSize: 11, fontWeight: '800' },
  details: { flex: 1, minWidth: 0, gap: spacing.sm },
  brand: { color: colors.teal, fontSize: 12.5, fontWeight: '800' },
  title: { color: colors.cream, fontSize: 25, lineHeight: 30, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  ratingMeta: { color: colors.muted, fontSize: 12 },
  pricePanel: { marginTop: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
  price: { color: colors.cream, fontSize: 30, fontWeight: '900' },
  compare: { color: colors.muted, fontSize: 14, textDecorationLine: 'line-through' },
  saving: { color: colors.success, fontSize: 14, fontWeight: '800' },
  taxNote: { color: colors.muted, fontSize: 11.5, marginTop: 4 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  stock: { color: colors.success, fontSize: 13, fontWeight: '800' },
  stockLow: { color: colors.danger },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  controlLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface },
  stepButton: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  stepText: { color: colors.cream, fontSize: 17, fontWeight: '700' },
  quantity: { color: colors.cream, width: 36, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  lineTotalValue: { color: colors.cream, fontSize: 16, fontWeight: '900', marginLeft: 'auto' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  addButton: { flexGrow: 1, minWidth: 160, minHeight: 46, paddingHorizontal: spacing.xl, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.cta, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.cta, fontSize: 14, fontWeight: '800' },
  buyButton: { flexGrow: 1, minWidth: 160, minHeight: 46, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  saveButton: { width: 46, height: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  saveButtonActive: { borderColor: colors.cta, backgroundColor: colors.copperTint },
  saveText: { color: colors.muted, fontSize: 18 },
  saveTextActive: { color: colors.cta },
  servicePanel: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSunken, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  serviceBody: { flex: 1, minWidth: 180 },
  serviceTitle: { color: colors.cream, fontSize: 13.5, fontWeight: '800' },
  serviceCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  serviceLink: { color: colors.teal, fontSize: 12.5, fontWeight: '800' },
  specPanel: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.lg, gap: 2, maxWidth: 720 },
  specHeading: { color: colors.cream, fontSize: 16, fontWeight: '900', marginBottom: spacing.xs },
  specRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line, gap: spacing.md },
  specLabel: { width: 120, color: colors.muted, fontSize: 12.5, fontWeight: '700' },
  specValue: { flex: 1, color: colors.cream, fontSize: 12.5, fontWeight: '600' },
  reviewPanel: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.lg, gap: spacing.md, maxWidth: 900 },
  reviewHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  reviewHeadingCopy: { flex: 1, minWidth: 220 },
  reviewHint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  reviewButton: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  reviewButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  reviewForm: { padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, gap: spacing.sm },
  formLabel: { color: colors.cream, fontSize: 12, fontWeight: '800' },
  ratingPicker: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.xs },
  ratingChoice: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ratingChoiceText: { color: colors.muted, fontSize: 24, lineHeight: 28 },
  ratingChoiceActive: { color: colors.cta },
  input: { color: colors.cream },
  reviewInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.cream, paddingHorizontal: spacing.md, fontSize: 13 },
  reviewCommentInput: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' },
  reviewError: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  submitReviewButton: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  submitReviewText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  disabledButton: { opacity: 0.55 },
  reviewItem: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, gap: spacing.xs },
  reviewItemHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.copperTint },
  reviewAvatarText: { color: colors.cta, fontSize: 14, fontWeight: '900' },
  reviewAuthor: { color: colors.cream, fontSize: 13, fontWeight: '900' },
  reviewDate: { color: colors.muted, fontSize: 11, marginTop: 2 },
  reviewStars: { color: colors.cta, fontSize: 15, letterSpacing: 1 },
  reviewStarsMuted: { color: colors.line },
  reviewTitle: { color: colors.cream, fontSize: 14, fontWeight: '900', marginTop: spacing.xs },
  reviewComment: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  deleteReviewButton: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.pill },
  deleteReviewText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  missing: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  missingCode: { color: colors.cta, fontSize: 38, fontWeight: '900' },
  missingTitle: { color: colors.cream, fontSize: 20, fontWeight: '900' },
  primaryButton: { minHeight: 44, paddingHorizontal: spacing.xl, borderRadius: radius.sm, backgroundColor: colors.cta, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
