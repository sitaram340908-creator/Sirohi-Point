import type { Product } from './contracts';
//
export interface PaintEstimateInput {
  widthFeet: number;
  heightFeet: number;
  coats: number;
  coveragePerLitre?: number;
  wastagePercent?: number;
  pricePerLitreInPaise?: number;
}
//
export interface PaintEstimate {
  areaSquareFeet: number;
  litres: number;
  estimatedCostInPaise: number;
}
//
export function calculatePaintEstimate(input: PaintEstimateInput): PaintEstimate {
  const coverage = input.coveragePerLitre ?? 95;
  const wastage = 1 + (input.wastagePercent ?? 10) / 100;
  const price = input.pricePerLitreInPaise ?? 52000;
  const areaSquareFeet = Math.max(0, input.widthFeet) * Math.max(0, input.heightFeet);
  const litres = Math.max(1, Math.ceil(((areaSquareFeet * Math.max(1, input.coats)) / coverage) * wastage));
//
  return {
    areaSquareFeet,
    litres,
    estimatedCostInPaise: litres * price,
  };
}
//
export interface CartLine {
  product: Product;
  quantity: number;
}
//
export function calculateCartTotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => {
    const quantity = Math.max(0, line.quantity);
    const subtotalInPaise = line.product.priceInPaise * quantity;
    const taxInPaise = Math.round(subtotalInPaise * (line.product.gstRate ?? 18) / 100);
    return total + subtotalInPaise + taxInPaise;
  }, 0);
}
//
export function formatMoney(amountInPaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

export function priceIncludingGstInPaise(basePriceInPaise: number, gstRate = 18): number {
  return basePriceInPaise + Math.round(basePriceInPaise * gstRate / 100);
}
//
