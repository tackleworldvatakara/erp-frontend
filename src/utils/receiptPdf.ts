import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { Sale } from '../types/sale.types';

pdfMake.addVirtualFileSystem(pdfFonts);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

export async function printReceiptPdf(
  sale: Sale,
  shopName: string,
  shopAddress: string | undefined,
  shopPhone: string | undefined,
  shopWorkingDays: string | undefined,
  shopWorkingHours: string | undefined,
  printWindow: Window | null,
): Promise<void> {
  const pageWidthPoints = (80 * 72) / 25.4;
  const contentWidthPoints = pageWidthPoints - 24;
  const makeRule = (): Content => ({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidthPoints, y2: 0, lineWidth: 0.5 }],
    margin: [0, 6, 0, 6],
  });

  const itemRows: TableCell[][] = sale.items.map((item) => ([
    {
      text: [
        { text: item.productName, bold: true },
        {
          text: `\n${item.sku} - ${item.unit}\n${item.quantity} x ${fmt(item.unitPrice)}${item.discountAmount > 0 ? ` - Disc ${fmt(item.discountAmount)}` : ''}`,
          fontSize: 7,
          color: '#555555',
        },
      ],
    },
    { text: String(item.quantity), alignment: 'center' },
    { text: fmt(item.lineTotal), alignment: 'right', bold: true },
  ]));

  const totalsRows: TableCell[][] = [
    [{ text: 'Subtotal' }, { text: fmt(sale.subtotal), alignment: 'right' }],
  ];
  if (sale.discountTotal > 0) {
    totalsRows.push([
      { text: 'Discount', color: '#178447' },
      { text: `- ${fmt(sale.discountTotal)}`, alignment: 'right', color: '#178447' },
    ]);
  }
  totalsRows.push(
    [{ text: 'Grand Total', bold: true, fontSize: 12 }, { text: fmt(sale.grandTotal), alignment: 'right', bold: true, fontSize: 12 }],
    [{ text: 'Amount Paid' }, { text: fmt(sale.paidAmount), alignment: 'right', bold: true }],
  );
  if (sale.balanceDue > 0) {
    totalsRows.push([
      { text: 'Balance Due', bold: true },
      { text: fmt(sale.balanceDue), alignment: 'right', bold: true },
    ]);
  }

  const content: Content[] = [
    { text: shopName.toUpperCase(), alignment: 'center', bold: true, fontSize: 12, margin: [0, 0, 0, 2] },
  ];
  if (shopAddress) {
    shopAddress.split('\\n').forEach((line) => {
      content.push({ text: line, alignment: 'center' });
    });
  }
  if (shopPhone) content.push({ text: `Tel: ${shopPhone}`, alignment: 'center' });
  content.push(makeRule());
  content.push({ text: [{ text: 'Bill No: ', bold: true }, sale.invoiceNumber] });
  content.push({ text: [{ text: 'Date: ', bold: true }, new Date(sale.invoiceDate).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })] });
  content.push({ text: [{ text: 'Customer: ', bold: true }, sale.customerName || 'Walk-in Customer'] });
  content.push({ text: [{ text: 'Payment: ', bold: true }, sale.paymentMethod.replace('_', ' ').toUpperCase()] });
  content.push(makeRule());
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 24, 62],
      body: [
        [{ text: 'Item', bold: true }, { text: 'Qty', alignment: 'center', bold: true }, { text: 'Amount', alignment: 'right', bold: true }],
        ...itemRows,
      ],
    },
    layout: 'lightHorizontalLines',
  });
  content.push(makeRule());
  content.push({ table: { widths: ['*', 72], body: totalsRows }, layout: 'noBorders' });
  if (sale.notes) {
    content.push({
      text: [{ text: 'Note: ', bold: true }, sale.notes],
      fontSize: 7,
      margin: [0, 8, 0, 0],
    });
  }
  content.push(makeRule());
  content.push({ text: 'WORKING TIME', alignment: 'center', bold: true, fontSize: 8 });
  if (shopWorkingDays) content.push({ text: shopWorkingDays, alignment: 'center', fontSize: 8 });
  if (shopWorkingHours) content.push({ text: shopWorkingHours, alignment: 'center', fontSize: 8 });
  content.push({ text: 'Thank You for Shopping!', alignment: 'center', bold: true, margin: [0, 8, 0, 0] });

  const docDefinition: TDocumentDefinitions = {
    info: { title: `Bill ${sale.invoiceNumber}`, author: shopName },
    pageSize: { width: pageWidthPoints, height: 'auto' },
    pageMargins: [12, 12, 12, 12],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    content,
  };

  await pdfMake.createPdf(docDefinition).print(printWindow);
}
