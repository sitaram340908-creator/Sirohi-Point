import type { Product } from '@/shared/contracts';

export function cartQuantityError(product: Product, quantity: number, business: boolean): string | null {
  const minimum = business ? product.minimumB2BQuantity ?? 1 : 1;
  if (!Number.isInteger(quantity) || quantity < minimum || quantity > 100000) return `${product.name}: quantity must be a whole number between ${minimum} and 100000.`;
  if (quantity > product.stock && !(business && product.allowB2BBackorder)) return `${product.name}: only ${product.stock} units are available.`;
  return null;
}

