import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, TextField, IconButton, Button,
  Autocomplete, CircularProgress, Divider, MenuItem,
  Paper, Tooltip, InputAdornment, alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { Sale, PaymentMethod, UpdateSaleInput } from '../../types/sale.types';
import { ProductSearchResult } from '../../types/product.types';
import { productsApi } from '../../api/products';
import { salesApi } from '../../api/sales';

interface EditItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** flat ₹ discount for the whole line (matches SalesPage discountAmount) */
  discountAmount: number;
  lineTotal: number;
}

interface EditSaleDialogProps {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
  onSaved: (updated: Sale) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',          label: 'Cash' },
  { value: 'upi',           label: 'UPI' },
  { value: 'card',          label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

function calcLine(quantity: number, unitPrice: number, discountAmount: number): number {
  const lineSubtotal = quantity * unitPrice;
  const applied = Math.min(Math.max(0, discountAmount), lineSubtotal);
  return parseFloat((lineSubtotal - applied).toFixed(2));
}

export default function EditSaleDialog({ open, sale, onClose, onSaved }: EditSaleDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [customerName,   setCustomerName]   = useState('');
  const [customerPhone,  setCustomerPhone]  = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>('cash');
  const [amountPaid,     setAmountPaid]     = useState('');
  const [notes,          setNotes]          = useState('');
  const [items,          setItems]          = useState<EditItem[]>([]);
  const [commonDiscount, setCommonDiscount] = useState('');
  const [saving,         setSaving]         = useState(false);

  // Product search
  const [searchInput,   setSearchInput]   = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching,     setSearching]     = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Populate form from sale ───────────────────────────────────────────────
  useEffect(() => {
    if (!open || !sale) return;
    setCustomerName(sale.customerName || '');
    setCustomerPhone('');
    setPaymentMethod(sale.paymentMethod as PaymentMethod);
    setNotes(sale.notes || '');

    const mappedItems = sale.items.map((item) => ({
      productId: item.product as string,
      productName: item.productName,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount ?? 0,
      lineTotal: item.lineTotal,
    }));
    setItems(mappedItems);

    // Back-calculate common discount: total discount on sale minus sum of per-item discounts
    const itemDiscSum = parseFloat(
      mappedItems.reduce((s, i) => s + i.discountAmount, 0).toFixed(2)
    );
    const common = parseFloat(((sale.discountTotal ?? 0) - itemDiscSum).toFixed(2));
    setCommonDiscount(common > 0 ? String(common) : '');

    // Set amount paid to the full grand total by default (matches actual paid)
    setAmountPaid(String(sale.paidAmount));

    setSearchInput('');
    setSearchResults([]);
  }, [open, sale]);

  // ── Product search ────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 1) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await productsApi.searchProducts(value.trim())); }
      catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  // ── Item manipulation ─────────────────────────────────────────────────────
  function addProduct(product: ProductSearchResult) {
    const existing = items.find((i) => i.productId === product._id);
    if (existing) {
      const newQty = existing.quantity + 1;
      setItems((prev) =>
        prev.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: newQty, lineTotal: calcLine(newQty, i.unitPrice, i.discountAmount) }
            : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discountAmount: 0,
          lineTotal: product.sellingPrice,
        },
      ]);
    }
    setSearchInput('');
    setSearchResults([]);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const disc = Math.min(i.discountAmount, qty * i.unitPrice);
        return { ...i, quantity: qty, discountAmount: disc, lineTotal: calcLine(qty, i.unitPrice, disc) };
      })
    );
  }

  function updateUnitPrice(productId: string, price: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const p = Math.max(0, price);
        const disc = Math.min(i.discountAmount, i.quantity * p);
        return { ...i, unitPrice: p, discountAmount: disc, lineTotal: calcLine(i.quantity, p, disc) };
      })
    );
  }

  function updateItemDiscount(productId: string, discountAmount: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const maxDisc = i.quantity * i.unitPrice;
        const disc = Math.min(Math.max(0, discountAmount), maxDisc);
        return { ...i, discountAmount: disc, lineTotal: calcLine(i.quantity, i.unitPrice, disc) };
      })
    );
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal        = parseFloat(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2));
  const itemDiscTotal   = parseFloat(items.reduce((s, i) => s + i.discountAmount, 0).toFixed(2));
  const commonDiscAmt   = parseFloat(
    Math.min(Math.max(parseFloat(commonDiscount) || 0, 0), Math.max(subtotal - itemDiscTotal, 0)).toFixed(2)
  );
  const grandTotal      = parseFloat((subtotal - itemDiscTotal - commonDiscAmt).toFixed(2));
  const paidNum         = Math.min(Math.max(parseFloat(amountPaid) || 0, 0), grandTotal);
  const balanceDue      = parseFloat((grandTotal - paidNum).toFixed(2));

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!sale) return;
    if (items.length === 0) {
      enqueueSnackbar('At least one item is required', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateSaleInput = {
        customerName: customerName.trim() || 'Walk-in Customer',
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        paymentMethod,
        amountPaid: paidNum,
        notes: notes.trim() || undefined,
        commonDiscount: commonDiscAmt > 0 ? commonDiscAmt : 0,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          // convert flat ₹ discount back to % for the backend schema
          discount: i.quantity * i.unitPrice > 0
            ? parseFloat(((i.discountAmount / (i.quantity * i.unitPrice)) * 100).toFixed(4))
            : 0,
        })),
      };
      const updated = await salesApi.updateSale(sale._id, payload);
      enqueueSnackbar('Bill updated successfully', { variant: 'success' });
      onSaved(updated);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update bill';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!sale) return null;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          pt: 2.5,
          px: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
            <EditIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={750} lineHeight={1.2}>
              Edit Bill — {sale.invoiceNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              Modify items, quantities, pricing or payment details
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={saving} aria-label="Close"
          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>

        {/* ── Customer ─────────────────────────────────────────────────── */}
        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Customer Details</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
          <TextField label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            size="small" fullWidth placeholder="Walk-in Customer" />
          <TextField label="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            size="small" fullWidth />
        </Stack>

        <Divider sx={{ mb: 2.5 }} />

        {/* ── Item search ──────────────────────────────────────────────── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2" fontWeight={700}>Items</Typography>
          <Typography variant="caption" color="text.secondary">Search to add products</Typography>
        </Stack>

        <Autocomplete
          inputValue={searchInput}
          onInputChange={(_, v) => handleSearchChange(v)}
          options={searchResults}
          getOptionLabel={(o) => `${o.name} (${o.sku})`}
          filterOptions={(x) => x}
          loading={searching}
          onChange={(_, product) => { if (product) addProduct(product); }}
          size="small"
          sx={{ mb: 2 }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search product by name or SKU to add…"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                    {params.InputProps.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {searching && <CircularProgress size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option._id}>
              <Stack direction="row" justifyContent="space-between" width="100%" spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.sku}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2" fontWeight={600} color="primary.main">{fmt(option.sellingPrice)}</Typography>
                  <Typography variant="caption" color={option.currentStock > 0 ? 'success.main' : 'error.main'}>
                    Stock: {option.currentStock}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        />

        {/* ── Items table ──────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center', borderStyle: 'dashed', mb: 2.5 }}>
            <Typography color="text.secondary" variant="body2">
              No items. Search for a product above to add one.
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 0 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{
                    background: alpha(theme.palette.primary.main, 0.05),
                    borderBottom: `2px solid ${theme.palette.divider}`,
                  }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Product
                    </th>
                    <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 120 }}>
                      Qty
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 130 }}>
                      Rate
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>
                      Total
                    </th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.productId}
                      style={{
                        borderBottom: idx < items.length - 1 ? `1px solid ${theme.palette.divider}` : undefined,
                        background: idx % 2 === 0 ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
                      }}
                    >
                      {/* Product */}
                      <td style={{ padding: '10px 16px' }}>
                        <Typography variant="body2" fontWeight={700}>{item.productName}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {item.sku} · {item.unit}
                        </Typography>
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => updateQty(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            sx={{ width: 26, height: 26, border: 1, borderColor: 'divider' }}
                          >
                            <RemoveIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                          <TextField
                            value={item.quantity}
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) updateQty(item.productId, v); }}
                            size="small" type="number"
                            inputProps={{ min: 1, style: { textAlign: 'center', padding: '4px 2px', width: 32, fontWeight: 700 } }}
                            sx={{ '& fieldset': { border: '1px solid', borderColor: 'divider' } }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => updateQty(item.productId, item.quantity + 1)}
                            sx={{ width: 26, height: 26, border: 1, borderColor: 'divider' }}
                          >
                            <AddIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Stack>
                      </td>

                      {/* Rate */}
                      <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                        <TextField
                          value={item.unitPrice}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateUnitPrice(item.productId, v); }}
                          onBlur={(e) => { const v = parseFloat(e.target.value) || 0; updateUnitPrice(item.productId, v); }}
                          size="small" type="number"
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', padding: '4px 6px', width: 72, fontWeight: 600 } }}
                          sx={{ '& fieldset': { border: '1px solid', borderColor: 'divider' } }}
                        />
                      </td>

                      {/* Line total */}
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700} color="primary.main">
                          {fmt(item.lineTotal)}
                        </Typography>
                      </td>

                      {/* Remove */}
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <Tooltip title="Remove item">
                          <IconButton
                            size="small"
                            onClick={() => removeItem(item.productId)}
                            sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.light' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* ── Footer: Common Discount + Totals ─────────────────────── */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderTop: `2px solid ${theme.palette.divider}`,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                gap={1.5}
                flexWrap="wrap"
              >
                {/* Common discount */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    Common Discount:
                  </Typography>
                  <TextField
                    value={commonDiscount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setCommonDiscount(v);
                    }}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      const max = Math.max(subtotal - itemDiscTotal, 0);
                      setCommonDiscount(v > 0 ? String(Math.min(v, max)) : '');
                    }}
                    size="small"
                    placeholder="0"
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', padding: '4px 6px', width: 80 } }}
                    sx={{ maxWidth: 150, '& fieldset': { border: '1px solid', borderColor: 'divider' } }}
                  />
                </Stack>

                {/* Totals summary */}
                <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                  <Stack direction="row" spacing={0.75} alignItems="baseline">
                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(subtotal)}</Typography>
                  </Stack>
                  {(itemDiscTotal > 0 || commonDiscAmt > 0) && (
                    <Stack direction="row" spacing={0.75} alignItems="baseline">
                      <Typography variant="body2" color="success.main" fontWeight={600}>Discount:</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        − {fmt(itemDiscTotal + commonDiscAmt)}
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={0.75} alignItems="baseline">
                    <Typography variant="body1" fontWeight={700}>Total:</Typography>
                    <Typography variant="body1" fontWeight={800} color="primary.main">{fmt(grandTotal)}</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        )}

        <Divider sx={{ my: 2.5 }} />

        {/* ── Payment + Summary ────────────────────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
          {/* Payment */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary"
              sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
              Payment Details
            </Typography>
            <Stack spacing={2}>
              <TextField select label="Payment Method" value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                size="small" fullWidth>
                {PAYMENT_METHODS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Amount Paid"
                value={amountPaid}
                onChange={(e) => {
                  const v = e.target.value;
                  setAmountPaid(v);
                }}
                onBlur={(e) => {
                  const v = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), grandTotal);
                  setAmountPaid(String(v));
                }}
                size="small" type="number" fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={() => setAmountPaid(String(grandTotal))} sx={{ fontSize: 11, minWidth: 0 }}>
                        Full
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField label="Notes (optional)" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small" multiline rows={2} fullWidth />
            </Stack>
          </Paper>

          {/* Summary */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary"
              sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
              Summary
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2" fontWeight={600}>{fmt(subtotal)}</Typography>
              </Stack>
              {itemDiscTotal > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Item Discounts</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">− {fmt(itemDiscTotal)}</Typography>
                </Stack>
              )}
              {commonDiscAmt > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Common Discount</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">− {fmt(commonDiscAmt)}</Typography>
                </Stack>
              )}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2" fontWeight={700}>Grand Total</Typography>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">{fmt(grandTotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">{fmt(paidNum)}</Typography>
              </Stack>
              {balanceDue > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Balance Due</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main">{fmt(balanceDue)}</Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || items.length === 0}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
