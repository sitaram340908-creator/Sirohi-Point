import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

import { paymentChannelLabel, type OrderDetails } from '../shared/contracts';

export interface OrderBillData {
  order: OrderDetails;
  customer: { name: string; email: string; phone?: string | null; gstin?: string };
}

const pageWidth = 595;
const pageHeight = 842;
const margin = 42;
const businessName = 'SIROHI HARDWARE AND ELECTRICS POINT';
const businessGstin = '09IEUPS1490Q1Z2';

function pdfText(value: string) {
  // The built-in PDF font supports WinAnsi only. Replacing unsupported glyphs
  // keeps an order with unusual product characters from corrupting the bill.
  return value.replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(paise: number) {
  return `INR ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wrap(value: string, width: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function loadLogoImage(): { width: number; height: number; data: Buffer } | null {
  const candidates = [
    resolve(process.cwd(), 'apps/client/assets/images/logo_sirohi.png'),
    resolve(process.cwd(), '../client/assets/images/logo_sirohi.png'),
    resolve(__dirname, '../../../client/assets/images/logo_sirohi.png'),
    resolve(__dirname, '../../../../client/assets/images/logo_sirohi.png'),
  ];
  let png: Buffer | null = null;
  for (const candidate of candidates) {
    try { png = readFileSync(candidate); break; } catch { /* try the next deployment path */ }
  }
  if (!png || png.readUInt32BE(0) !== 0x89504e47) return null;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const chunk = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      if (chunk[8] !== 8 || chunk[9] === undefined || ![2, 6].includes(chunk[9])) return null;
      colorType = chunk[9]; interlace = chunk[12];
    } else if (type === 'IDAT') idat.push(chunk);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  if (!width || !height || interlace !== 0 || !idat.length) return null;
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idat));
  const decoded = Buffer.alloc(height * stride);
  let source = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[source++];
    const rowStart = row * stride;
    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? decoded[rowStart + index - bytesPerPixel] : 0;
      const above = row > 0 ? decoded[rowStart - stride + index] : 0;
      const aboveLeft = row > 0 && index >= bytesPerPixel ? decoded[rowStart - stride + index - bytesPerPixel] : 0;
      const value = raw[source++];
      if (filter === 0) decoded[rowStart + index] = value;
      else if (filter === 1) decoded[rowStart + index] = (value + left) & 255;
      else if (filter === 2) decoded[rowStart + index] = (value + above) & 255;
      else if (filter === 3) decoded[rowStart + index] = (value + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) {
        const estimate = left + above - aboveLeft;
        const pa = Math.abs(estimate - left); const pb = Math.abs(estimate - above); const pc = Math.abs(estimate - aboveLeft);
        decoded[rowStart + index] = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? above : aboveLeft)) & 255;
      } else return null;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const sourcePixel = pixel * bytesPerPixel;
    const targetPixel = pixel * 3;
    rgb[targetPixel] = decoded[sourcePixel];
    rgb[targetPixel + 1] = decoded[sourcePixel + 1];
    rgb[targetPixel + 2] = decoded[sourcePixel + 2];
  }
  return { width, height, data: deflateSync(rgb) };
}

/** Creates a compact, dependency-free PDF so invoices can be streamed from the API. */
export function createOrderBillPdf({ order, customer }: OrderBillData): Buffer {
  const itemSubtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPriceInPaise, 0);
  const discount = 0;
  const subtotal = order.subtotalInPaise ?? itemSubtotal;
  const tax = order.taxInPaise ?? 0;
  const deliveryCharge = Math.max(0, order.totalInPaise - subtotal - tax + (order.discountInPaise ?? discount));
  const paymentLabel = order.paymentMethod === 'ONLINE'
    ? `PAID (Online - ${paymentChannelLabel(order.paymentChannel)})`
    : 'COD (Pay on delivery)';
  const pages: string[][] = [];
  const logo = loadLogoImage();
  let page: string[] = [];
  let y = pageHeight - margin;
  const pushPage = () => { pages.push(page); page = []; y = pageHeight - margin; };
  const line = (text: string, x = margin, size = 10, font = 'F1') => {
    page.push(`BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`);
    y -= size + 5;
  };
  const textAt = (text: string, x: number, top: number, size = 9, font = 'F1') => {
    page.push(`BT /${font} ${size} Tf ${x} ${top - size} Td (${pdfText(text)}) Tj ET`);
  };
  const tableRow = (values: string[], widths: number[], top: number, header = false) => {
    const rowHeight = Math.max(25, ...values.map((value, index) => wrap(value, Math.max(5, Math.floor(widths[index] / 5.2))).length * 12 + 10));
    const bottom = top - rowHeight;
    let x = margin;
    page.push(`0.78 G 0.5 w ${margin} ${top} m ${pageWidth - margin} ${top} l S`);
    page.push(`0.78 G 0.5 w ${margin} ${bottom} m ${pageWidth - margin} ${bottom} l S`);
    for (const width of widths) {
      page.push(`0.78 G 0.5 w ${x} ${top} m ${x} ${bottom} l S`);
      x += width;
    }
    page.push(`0.78 G 0.5 w ${x} ${top} m ${x} ${bottom} l S`);
    x = margin;
    values.forEach((value, index) => {
      const lines = wrap(value, Math.max(5, Math.floor(widths[index] / 5.2)));
      lines.forEach((item, lineIndex) => textAt(item, x + 6, top - 6 - lineIndex * 12, header ? 8.5 : 8.5, header ? 'F1' : 'F1'));
      x += widths[index];
    });
    return bottom;
  };
  const rule = () => { page.push(`0.78 G 0.5 w ${margin} ${y} m ${pageWidth - margin} ${y} l S`); y -= 12; };
  const header = () => {
    if (logo) page.push('q /GS1 gs 285 0 0 285 155 255 cm /Im1 Do Q');
    if (logo) page.push('q 32 0 0 32 42 790 cm /Im1 Do Q');
    y -= 24;
    line(businessName, margin, 13, 'F1');
    rule();
    textAt(`Company GSTIN : ${businessGstin}`, 365, pageHeight - margin - 48, 8.5);
    textAt('+91 9058036895', 365, pageHeight - margin - 62, 8.5);
    textAt('info@sirohipoint.com', 365, pageHeight - margin - 76, 8.5);
    wrap('SHYAMPUR JATT, SALARPUR ROAD, HAPUR, UTTAR PRADESH 245205', 32)
      .forEach((value, index) => textAt(value, 365, pageHeight - margin - 90 - index * 11, 7.5));
  };
  const ensure = (height: number) => {
    if (y - height < margin) {
      pushPage();
      header();
    }
  };
  header();
  line(`Order ID: ${order.id}`, margin, 10);
  line(`Bill date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin, 10);
  if (order.showInvoiceNumber && order.invoiceNumber) line(`Invoice Number: ${order.invoiceNumber}`, margin, 10);
  line(`Payment: ${paymentLabel}`, margin, 10);
  line(`Order status: ${order.status.replace(/_/g, ' ')}`, margin, 10);
  if (order.buyerSegment === 'B2B') line(`GSTIN: ${customer.gstin ?? 'Not applicable'}`, margin, 10);
  y -= 5;
  ensure(330);
  const customerTop = y;
  const billingLines = [customer.name, customer.email, ...(customer.phone ? [`Phone: ${customer.phone}`] : []), ...(customer.gstin ? [`GSTIN: ${customer.gstin}`] : []), ...wrap(order.billingAddress, 40)];
  const shippingLines = wrap(order.shippingAddress, 40);
  const customerHeight = Math.max(108, 44 + Math.max(billingLines.length, shippingLines.length) * 12);
  page.push(`0.78 G 0.5 w ${margin} ${customerTop} m ${pageWidth - margin} ${customerTop} l S`);
  page.push(`0.78 G 0.5 w ${margin} ${customerTop - customerHeight} m ${pageWidth - margin} ${customerTop - customerHeight} l S`);
  page.push(`0.78 G 0.5 w ${pageWidth / 2} ${customerTop} m ${pageWidth / 2} ${customerTop - customerHeight} l S`);
  page.push(`0.78 G 0.5 w ${margin} ${customerTop - 22} m ${pageWidth - margin} ${customerTop - 22} l S`);
  textAt('Billing To', margin + 7, customerTop - 6, 9, 'F1');
  textAt('Shipping Address', pageWidth / 2 + 7, customerTop - 6, 9, 'F1');
  billingLines.forEach((value, index) => textAt(value, margin + 7, customerTop - 30 - index * 12, 8.5));
  shippingLines.forEach((value, index) => textAt(value, pageWidth / 2 + 7, customerTop - 30 - index * 12, 8.5));
  y = customerTop - customerHeight - 18;
  ensure(50);
  textAt('PRODUCT DETAILS', margin, y, 10, 'F1');
  y -= 16;
  const widths = [25, 112, 42, 30, 38, 62, 62, 72, 68];
  y = tableRow(['Sr.', 'Description', 'HSN', 'Qty', 'GST %', 'Unit Price', 'GST Amount', 'Delivery Charge', 'Total'], widths, y, true);
  for (const item of order.items) {
    const lineBase = item.quantity * item.unitPriceInPaise;
    const lineTax = item.taxInPaise || Math.round(lineBase * (item.taxRate ?? 18) / 100);
    const lineDeliveryCharge = item.quantity * (item.deliveryChargeInPaise ?? 5000);
    const rowValues = [String(order.items.indexOf(item) + 1), item.productName, item.hsnCode ?? '-', String(item.quantity), `${item.taxRate ?? 18}%`, money(item.unitPriceInPaise), money(lineTax), money(lineDeliveryCharge), money(lineBase + lineTax + lineDeliveryCharge)];
    const needed = Math.max(25, wrap(item.productName, 22).length * 12 + 10);
    ensure(needed + 20);
    y = tableRow(rowValues, widths, y);
  }
  ensure(125);
  y -= 14;
  const totalsTop = y;
  const totalsRows = [['Total quantity', String(order.itemCount)], ['Item subtotal', money(order.subtotalInPaise ?? itemSubtotal)], ['Discount', `-${money(order.discountInPaise ?? discount)}`]];
  if (order.taxType === 'IGST') totalsRows.push(['IGST', money(order.igstInPaise ?? 0)]);
  else if (order.taxType === 'CGST_SGST') { totalsRows.push(['CGST', money(order.cgstInPaise ?? 0)]); totalsRows.push(['SGST', money(order.sgstInPaise ?? 0)]); }
  totalsRows.push(['Total GST', money(order.taxInPaise ?? 0)]);
  totalsRows.push(['Total delivery charges', money(deliveryCharge)]);
  totalsRows.push(['AMOUNT PAYABLE', money(order.totalInPaise)]);
  const totalsHeight = totalsRows.length * 20;
  page.push(`0.78 G 0.5 w 300 ${totalsTop} m ${pageWidth - margin} ${totalsTop} l S`);
  page.push(`0.78 G 0.5 w 300 ${totalsTop - totalsHeight} m ${pageWidth - margin} ${totalsTop - totalsHeight} l S`);
  page.push(`0.78 G 0.5 w 420 ${totalsTop} m 420 ${totalsTop - totalsHeight} l S`);
  totalsRows.forEach(([label, value], index) => { const rowTop = totalsTop - index * 20; page.push(`0.78 G 0.5 w 300 ${rowTop - 20} m ${pageWidth - margin} ${rowTop - 20} l S`); textAt(label, 307, rowTop - 5, label === 'AMOUNT PAYABLE' ? 9.5 : 8.5, label === 'AMOUNT PAYABLE' ? 'F1' : 'F1'); textAt(value, 427, rowTop - 5, label === 'AMOUNT PAYABLE' ? 9.5 : 8.5, 'F1'); });
  y = totalsTop - totalsHeight - 16;
  ensure(45);
  rule();
  line('This is a computer-generated order bill.', margin, 8);
  line(`Thank you for shopping with ${businessName}.`, margin, 8);
  const signatureLineY = y - 2;
  page.push(`0.78 G 0.5 w 390 ${signatureLineY} m 553 ${signatureLineY} l S`);
  textAt('Signature', 445, signatureLineY - 8, 8.5);
  pushPage();

  const streams = pages.map((content) => content.join('\n'));
  const pageBase = logo ? 6 : 4;
  const pageObjects = streams.map((_, index) => pageBase + index * 2);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjects.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  if (logo) {
    objects.push('<< /Type /ExtGState /ca 0.10 /CA 0.10 >>');
    const imageData = logo.data.toString('hex');
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${imageData.length + 1} >>\nstream\n${imageData}>\nendstream`);
  }
  streams.forEach((stream, index) => {
    const pageObject = pageBase + index * 2;
    const contentObject = pageObject + 1;
    const resources = logo ? '/Font << /F1 3 0 R >> /XObject << /Im1 5 0 R >> /ExtGState << /GS1 4 0 R >>' : '/Font << /F1 3 0 R >>';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << ${resources} >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
