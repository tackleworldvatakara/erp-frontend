import React, { useRef } from 'react';
import {
  Box, Button, Dialog, DialogContent, IconButton, Stack, Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AssignmentReturn as ReturnIcon,
  Block as CancelIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { Sale } from '../../types/sale.types';

interface PrintInvoiceProps {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
  onReturn?: () => void;
  onCancel?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

export default function PrintInvoice({ open, sale, onClose, onReturn, onCancel }: PrintInvoiceProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const shopName        = import.meta.env.VITE_SHOP_NAME || import.meta.env.VITE_APP_NAME || 'My Shop';
  const shopAddress     = import.meta.env.VITE_SHOP_ADDRESS as string | undefined;
  const shopPhone       = import.meta.env.VITE_SHOP_PHONE as string | undefined;
  const shopWorkingDays = import.meta.env.VITE_SHOP_WORKING_DAYS as string | undefined;
  const shopWorkingHours= import.meta.env.VITE_SHOP_WORKING_HOURS as string | undefined;

  // ── Print as PDF ────────────────────────────────────────────────────────────
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Allow pop-ups for this site to print the receipt.');
      return;
    }
    void import('../../utils/receiptPdf')
      .then(({ printReceiptPdf }) =>
        printReceiptPdf(sale, shopName, shopAddress, shopPhone, shopWorkingDays, shopWorkingHours, printWindow)
      )
      .catch((error: unknown) => {
        console.error('Receipt printing failed:', error);
        printWindow.close();
        const detail = error instanceof Error ? `\n${error.message}` : '';
        window.alert(`Could not prepare the receipt for printing.${detail}`);
      });
  };

  // ── Download as Image ──────────────────────────────────────────────────────
  const handlePrintImage = async () => {
    const el = printAreaRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${sale.invoiceNumber}.png`;
      link.click();
    } catch (err) {
      console.error('Image download failed:', err);
      window.alert('Could not download receipt as image.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ sx: { width: '80mm', maxWidth: 'calc(100vw - 40px)', m: 1, position: 'relative', overflow: 'visible' } }}
    >
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Stack className="receipt-toolbar" direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 1.25 }}>
          <Button startIcon={<PdfIcon />} variant="contained" size="small" onClick={handlePrintPdf}
            sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
            Print as PDF
          </Button>
          <Button startIcon={<ImageIcon />} variant="outlined" size="small" onClick={handlePrintImage}
            sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
            Download as Image
          </Button>
          {onReturn && sale.status === 'confirmed' && (
            <Button startIcon={<ReturnIcon />} size="small" onClick={onReturn}>Return Items</Button>
          )}
          {onCancel && sale.status === 'confirmed' && (
            <Button startIcon={<CancelIcon />} color="error" size="small" onClick={onCancel}>Cancel Bill</Button>
          )}
        </Stack>

        <Box ref={printAreaRef} id="invoice-print-area" className="thermal-receipt">
          {sale.status === 'cancelled' && (
            <div style={{ color: '#c62828', textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>
              CANCELLED BILL
            </div>
          )}
          <header className="receipt-header">
            <h1>{shopName}</h1>
            {shopAddress && shopAddress.split('\\n').map((line: string, i: number) => (
              <div key={i}>{line}</div>
            ))}
            {shopPhone && <div>Tel: {shopPhone}</div>}
          </header>

          <div className="receipt-rule" />
          <section className="receipt-meta">
            <div><strong>Bill No:</strong> {sale.invoiceNumber}</div>
            <div><strong>Date:</strong> {new Date(sale.invoiceDate).toLocaleString('en-IN', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}</div>
            <div><strong>Customer:</strong> {sale.customerName || 'Walk-in Customer'}</div>
            <div><strong>Payment:</strong> {sale.paymentMethod.replace('_', ' ').toUpperCase()}</div>
          </section>

          <div className="receipt-rule" />
          <table className="receipt-items">
            <thead>
              <tr><th>Item</th><th>Qty</th><th className="receipt-money">Amount</th></tr>
            </thead>
            {sale.items.map((item, i) => (
              <tbody key={i} className="receipt-item">
                <tr><td colSpan={3} className="receipt-product">{item.productName}</td></tr>
                <tr className="receipt-item-detail">
                  <td>{item.sku} · {item.unit}</td>
                  <td>{item.quantity}</td>
                  <td className="receipt-money">{fmt(item.lineTotal)}</td>
                </tr>
                <tr className="receipt-item-detail receipt-rate">
                  <td colSpan={2}>{item.quantity} × {fmt(item.unitPrice)}{item.discountAmount > 0 ? ` · Disc ${fmt(item.discountAmount)}` : ''}</td>
                  <td />
                </tr>
              </tbody>
            ))}
          </table>

          <div className="receipt-rule" />
          <section className="receipt-totals">
            <div><span>Subtotal</span><strong>{fmt(sale.subtotal)}</strong></div>
            {sale.discountTotal > 0 && <div><span>Discount</span><strong>- {fmt(sale.discountTotal)}</strong></div>}
            <div className="receipt-grand-total"><span>Grand Total</span><strong>{fmt(sale.grandTotal)}</strong></div>
            <div><span>Amount Paid</span><strong>{fmt(sale.paidAmount)}</strong></div>
            {sale.balanceDue > 0 && <div><span>Balance Due</span><strong>{fmt(sale.balanceDue)}</strong></div>}
          </section>

          {sale.notes && <div className="receipt-notes"><strong>Note:</strong> {sale.notes}</div>}
          {(shopWorkingDays || shopWorkingHours) && (
            <div className="receipt-hours">
              <div><strong>WORKING TIME</strong></div>
              {shopWorkingDays && <div>{shopWorkingDays}</div>}
              {shopWorkingHours && <div>{shopWorkingHours}</div>}
            </div>
          )}
          <footer className="receipt-footer">Thank You for Shopping!</footer>
        </Box>
      </DialogContent>

      <Tooltip title="Close invoice">
        <IconButton
          aria-label="Close invoice"
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: -12,
            right: -12,
            zIndex: 1,
            width: 28,
            height: 28,
            p: 0.25,
            border: 1,
            borderColor: 'grey.400',
            borderRadius: '50%',
            bgcolor: 'grey.200',
            color: 'grey.800',
            '&:hover': { bgcolor: 'grey.300' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>

      <style>{`
        .thermal-receipt {
          box-sizing: border-box;
          width: 80mm;
          padding: 4mm;
          background: #fff;
          color: #111;
          font: 10pt/1.3 Arial, sans-serif;
        }
        .receipt-header { text-align: center; }
        .receipt-header h1 { margin: 0 0 1mm; font-size: 12pt; line-height: 1.15; font-weight: 800; text-transform: uppercase; white-space: nowrap; }
        .receipt-hours { margin-top: 3mm; padding-top: 2mm; border-top: 1px dashed #888; text-align: center; font-size: 8pt; line-height: 1.25; }
        .receipt-rule { margin: 2.5mm 0; border-top: 1px dashed #555; }
        .receipt-meta { display: grid; gap: 1mm; font-size: 9pt; overflow-wrap: anywhere; }
        .receipt-items { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9pt; }
        .receipt-items th { padding: 1.5mm 0; border-bottom: 1px solid #555; text-align: left; }
        .receipt-items th:nth-child(2), .receipt-item-detail td:nth-child(2) { width: 11mm; text-align: center; }
        .receipt-items th:last-child, .receipt-money { width: 24mm; text-align: right; white-space: nowrap; }
        .receipt-item + .receipt-item { border-top: 1px dotted #bbb; }
        .receipt-product { padding-top: 2mm; font-weight: 700; overflow-wrap: anywhere; }
        .receipt-item-detail td { padding: .5mm 0; overflow-wrap: anywhere; }
        .receipt-rate { color: #444; font-size: 8pt; }
        .receipt-totals { display: grid; gap: 1mm; font-size: 9pt; }
        .receipt-totals > div { display: flex; justify-content: space-between; gap: 3mm; }
        .receipt-grand-total { padding-top: 1.5mm; border-top: 1px solid #555; font-size: 12pt; font-weight: 800; }
        .receipt-notes { margin-top: 3mm; padding-top: 2mm; border-top: 1px dotted #888; font-size: 8pt; overflow-wrap: anywhere; }
        .receipt-footer { margin-top: 4mm; text-align: center; font-size: 9pt; font-weight: 700; }
        @media print {
          @page { margin: 0; }
          html, body, #root { width: 80mm !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area { position: fixed !important; left: 0 !important; top: 0 !important; z-index: 999999 !important; width: 80mm !important; max-width: 80mm !important; margin: 0 !important; padding: 4mm !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; }
          #invoice-print-area * { color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-toolbar { display: none !important; }
        }
      `}</style>
    </Dialog>
  );
}
