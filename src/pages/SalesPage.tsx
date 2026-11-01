import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, TextField, InputAdornment,
  Button, Stack, IconButton, MenuItem, Divider, Tooltip,
  Autocomplete, CircularProgress, Chip, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon, Delete as DeleteIcon,
  PointOfSale as POSIcon, Add as AddIcon, Remove as RemoveIcon,
  Person as PersonIcon, Phone as PhoneIcon, ShoppingCart as CartIcon,
  CheckCircle as CheckIcon, Palette as PaletteIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import PrintInvoice from '../components/billing/PrintInvoice';
import SaleDetailDialog from '../components/billing/SaleDetailDialog';
import { productsApi } from '../api/products';
import { salesApi } from '../api/sales';
import { ProductSearchResult, ProductVariant } from '../types/product.types';
import { BillItem, Sale, PaymentMethod } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash',          label: 'Cash',          icon: '💵' },
  { value: 'upi',           label: 'UPI',           icon: '📱' },
  { value: 'card',          label: 'Card',          icon: '💳' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
];

export default function SalesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [searchInput,    setSearchInput]    = useState('');
  const [searchResults,  setSearchResults]  = useState<ProductSearchResult[]>([]);
  const [searching,      setSearching]      = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cartItems,      setCartItems]      = useState<BillItem[]>([]);
  const [customerName,   setCustomerName]   = useState('');
  const [customerPhone,  setCustomerPhone]  = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState<PaymentMethod>('cash');
  const [amountPaid,     setAmountPaid]     = useState('');
  const [amountPaidEdited, setAmountPaidEdited] = useState(false);
  const [notes,          setNotes]          = useState('');
  const [commonDiscount, setCommonDiscount] = useState<string>('');
  const [submitting,     setSubmitting]     = useState(false);
  const [printSale,      setPrintSale]      = useState<Sale | null>(null);
  const [showBill,       setShowBill]       = useState(false);

  // ── Variant picker ─────────────────────────────────────────────────────────
  const [variantPickerProduct, setVariantPickerProduct] = useState<ProductSearchResult | null>(null);
  const [selectedVariantColor, setSelectedVariantColor] = useState<string>('');

  // ── Search ─────────────────────────────────────────────────────────────────
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

  // ── Cart logic ─────────────────────────────────────────────────────────────
  function addToCart(product: ProductSearchResult, variantColor?: string) {
    // If product has variants and no color selected yet, open picker
    if (product.variants && product.variants.length > 0 && !variantColor) {
      setVariantPickerProduct(product);
      setSelectedVariantColor(product.variants[0]?.color ?? '');
      return;
    }

    // Determine available stock
    let availableStock = product.currentStock;
    if (variantColor && product.variants?.length) {
      const variant = product.variants.find((v: ProductVariant) => v.color === variantColor);
      availableStock = variant?.quantity ?? 0;
    }

    if (availableStock <= 0) {
      enqueueSnackbar(`"${product.name}"${variantColor ? ` (${variantColor})` : ''} is out of stock`, { variant: 'warning' });
      return;
    }

    // Cart key = productId + optional color
    const cartKey = variantColor ? `${product._id}__${variantColor}` : product._id;
    const existing = cartItems.find((i) => i.productId === cartKey);

    if (existing) {
      if (existing.quantity >= availableStock) {
        enqueueSnackbar(`Only ${availableStock} units available`, { variant: 'warning' });
        return;
      }
      setCartItems((prev) => prev.map((i) => i.productId === cartKey
        ? { ...i, quantity: i.quantity + 1, lineTotal: calc(i.quantity + 1, i.unitPrice, i.discountAmount) } : i));
    } else {
      setCartItems((prev) => [...prev, {
        productId: cartKey,
        productName: product.name,
        sku: product.sku,
        variantColor,
        quantity: 1,
        unitPrice: product.sellingPrice,
        maxUnitPrice: product.sellingPrice,
        discountAmount: 0,
        lineTotal: product.sellingPrice,
        unit: product.unit,
        currentStock: availableStock,
      }]);
    }
    setSearchInput(''); setSearchResults([]);
  }

  function calc(qty: number, price: number, discountAmount: number) {
    const lineSubtotal = qty * price;
    const appliedDiscount = Math.min(Math.max(0, discountAmount), lineSubtotal);
    return parseFloat((lineSubtotal - appliedDiscount).toFixed(2));
  }
  function updateQty(id: string, qty: number) {
    setCartItems((p) => p.map((i) => {
      if (i.productId !== id) return i;
      const discountAmount = Math.min(i.discountAmount, qty * i.unitPrice);
      return { ...i, quantity: qty, discountAmount, lineTotal: calc(qty, i.unitPrice, discountAmount) };
    }));
  }
  function updatePrice(id: string, price: number) {
    setCartItems((p) => p.map((i) => {
      if (i.productId !== id) return i;
      const unitPrice = Math.min(Math.max(0, price), i.maxUnitPrice);
      const discountAmount = Math.min(i.discountAmount, i.quantity * unitPrice);
      return { ...i, unitPrice, discountAmount, lineTotal: calc(i.quantity, unitPrice, discountAmount) };
    }));
  }
  function updateDiscount(id: string, discountAmount: number) {
    setCartItems((p) => p.map((i) => i.productId === id ? {
      ...i,
      discountAmount,
      lineTotal: calc(i.quantity, i.unitPrice, discountAmount),
    } : i));
  }
  function removeItem(id: string) { setCartItems((p) => p.filter((i) => i.productId !== id)); }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal        = parseFloat(cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2));
  const discountTotal   = parseFloat(cartItems.reduce((s, i) => s + i.discountAmount, 0).toFixed(2));
  const commonDiscountAmt = parseFloat(Math.min(Math.max(parseFloat(commonDiscount) || 0, 0), Math.max(subtotal - discountTotal, 0)).toFixed(2));
  const grandTotal      = parseFloat((subtotal - discountTotal - commonDiscountAmt).toFixed(2));
  const paid         = Math.min(Math.max(parseFloat(amountPaid) || 0, 0), grandTotal);
  const balanceDue   = parseFloat((grandTotal - paid).toFixed(2));

  useEffect(() => {
    if (!amountPaidEdited) {
      setAmountPaid(String(grandTotal));
      return;
    }
    const enteredAmount = Number(amountPaid);
    if (amountPaid !== '' && Number.isFinite(enteredAmount) && enteredAmount > grandTotal) {
      setAmountPaid(String(grandTotal));
    }
  }, [amountPaid, amountPaidEdited, grandTotal]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleCreateBill() {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const sale = await salesApi.createSale({
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems.map((i) => ({
          productId: i.productId.includes('__') ? i.productId.split('__')[0] : i.productId,
          variantColor: i.variantColor,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discountAmount > 0 ? parseFloat(((i.discountAmount / (i.quantity * i.unitPrice)) * 100).toFixed(4)) : 0,
        })),
        commonDiscount: commonDiscountAmt > 0 ? commonDiscountAmt : undefined,
        paymentMethod, amountPaid: paid, notes: notes.trim() || undefined,
      });
      enqueueSnackbar(`Bill ${sale.invoiceNumber} created!`, { variant: 'success' });
      setPrintSale(sale);
      setCartItems([]); setCustomerName(''); setCustomerPhone(''); setNotes(''); setCommonDiscount(''); setAmountPaidEdited(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create bill';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally { setSubmitting(false); }
  }

  return (
    <Box>
      <PageHeader title="New Bill" subtitle="Create a sale invoice" />

      <Grid container spacing={2.5}>
        {/* ── LEFT: Search + Cart ── */}
        <Grid item xs={12} md={7}>

          {/* Search box */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <SearchIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">Search & Add Products</Typography>
            </Stack>
            <Autocomplete freeSolo options={searchResults}
              getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.name} (${o.sku})`)}
              inputValue={searchInput}
              onInputChange={(_, v, reason) => { if (reason !== 'reset') handleSearchChange(v); }}
              onChange={(_, v) => { if (v && typeof v !== 'string') addToCart(v); }}
              loading={searching}
              renderOption={(props, option) => {
                const o = option as ProductSearchResult;
                return (
                  <li {...props} key={o._id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%" py={0.5}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{o.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{o.sku}</Typography>
                          {o.brand && <Typography variant="caption" color="text.secondary">· {o.brand}</Typography>}
                          <Chip label={o.currentStock <= 0 ? 'Out of Stock' : `Stock: ${o.currentStock}`}
                            size="small" color={o.currentStock <= 0 ? 'error' : 'success'}
                            sx={{ height: 18, fontSize: 10, fontWeight: 600 }} />
                        </Stack>
                      </Box>
                      <Typography variant="body1" fontWeight={700} color="primary.main">{fmt(o.sellingPrice)}</Typography>
                    </Stack>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Type product name, SKU or brand…" size="small"
                  InputProps={{ ...params.InputProps,
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    endAdornment: searching ? <CircularProgress size={18} /> : params.InputProps.endAdornment,
                    sx: { borderRadius: 2 },
                  }} />
              )}
            />
          </Paper>

          {/* Cart */}
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {/* Cart header */}
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <CartIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">Cart</Typography>
                  {cartItems.length > 0 && (
                    <Chip label={`${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`}
                      size="small" color="primary" sx={{ fontWeight: 700, fontSize: 11 }} />
                  )}
                </Stack>
                {cartItems.length > 0 && (
                  <Button size="small" color="error" onClick={() => setCartItems([])} sx={{ fontSize: 11 }}>
                    Clear All
                  </Button>
                )}
              </Stack>
            </Box>

            {cartItems.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <CartIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" fontWeight={600} color="text.secondary">Cart is empty</Typography>
                <Typography variant="body2" color="text.disabled">Search and add products above</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: alpha(theme.palette.primary.main, 0.04), borderBottom: `2px solid ${theme.palette.divider}` }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                        <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Rate</th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', width: 92 }}>Disc. Amt</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: theme.palette.text.secondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>Total</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, idx) => (
                        <tr key={item.productId}
                          style={{ borderBottom: `1px solid ${theme.palette.divider}`, background: idx % 2 === 0 ? 'transparent' : alpha(theme.palette.primary.main, 0.02) }}>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography variant="body2" fontWeight={700}>{item.productName}</Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{item.sku}</Typography>
                              <Typography variant="caption" color="text.disabled">·</Typography>
                              <Typography variant="caption" color="text.secondary">{item.unit}</Typography>
                              {item.variantColor && (
                                <Chip
                                  label={item.variantColor}
                                  size="small"
                                  icon={<PaletteIcon style={{ fontSize: 10 }} />}
                                  sx={{ height: 16, fontSize: 9, fontWeight: 600 }}
                                />
                              )}
                              <Chip label={`${item.currentStock} left`} size="small"
                                color={item.currentStock <= item.quantity ? 'warning' : 'default'}
                                sx={{ height: 16, fontSize: 9 }} />
                            </Stack>
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <Stack direction="row" alignItems="center" spacing={0.25} justifyContent="center">
                              <IconButton size="small" onClick={() => item.quantity > 1 && updateQty(item.productId, item.quantity - 1)}
                                sx={{ width: 24, height: 24, border: 1, borderColor: 'divider' }}>
                                <RemoveIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                              <TextField value={item.quantity}
                                onChange={(e) => { const v = parseInt(e.target.value) || 1; if (v > item.currentStock) { enqueueSnackbar(`Max: ${item.currentStock}`, { variant: 'warning' }); return; } updateQty(item.productId, Math.max(1, v)); }}
                                size="small" type="number"
                                inputProps={{ min: 1, max: item.currentStock, style: { textAlign: 'center', width: 32, padding: '4px 2px', fontWeight: 700 } }}
                                sx={{ '& fieldset': { border: '1px solid', borderColor: 'divider' } }} />
                              <IconButton size="small" onClick={() => { if (item.quantity < item.currentStock) updateQty(item.productId, item.quantity + 1); else enqueueSnackbar(`Max: ${item.currentStock}`, { variant: 'warning' }); }}
                                sx={{ width: 24, height: 24, border: 1, borderColor: 'divider' }}>
                                <AddIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Stack>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField value={item.unitPrice} onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                              onBlur={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                              size="small" type="number"
                              inputProps={{ min: 0, max: item.maxUnitPrice, step: 0.01, style: { textAlign: 'right', padding: '4px 6px', width: 72, fontWeight: 600 } }} />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField value={item.discountAmount || ''} onChange={(e) => updateDiscount(item.productId, Math.min(item.quantity * item.unitPrice, Math.max(0, parseFloat(e.target.value) || 0)))}
                              onBlur={(e) => updateDiscount(item.productId, Math.min(item.quantity * item.unitPrice, Math.max(0, parseFloat(e.target.value) || 0)))}
                              size="small" type="number"
                              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                              inputProps={{ min: 0, max: item.quantity * item.unitPrice, step: 0.01, style: { textAlign: 'right', padding: '4px 2px', width: 50 } }} />
                          </td>
                          <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                            <Typography variant="body2" fontWeight={700} color="primary.main">{fmt(item.lineTotal)}</Typography>
                          </td>
                          <td style={{ padding: '4px' }}>
                            <Tooltip title="Remove">
                              <IconButton size="small" onClick={() => removeItem(item.productId)}
                                sx={{ '&:hover': { bgcolor: 'error.light', color: 'error.main' } }}>
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>

                {/* Cart footer totals */}
                <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.04), borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                    {/* Common discount input */}
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Common Discount:</Typography>
                      <TextField
                        value={commonDiscount}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d*\.?\d*$/.test(v)) setCommonDiscount(v);
                        }}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          const maxDiscount = Math.max(subtotal - discountTotal, 0);
                          setCommonDiscount(v > 0 ? String(Math.min(v, maxDiscount)) : '');
                        }}
                        size="small"
                        type="number"
                        placeholder="0"
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        inputProps={{ min: 0, max: Math.max(subtotal - discountTotal, 0), step: 0.01, style: { textAlign: 'right', padding: '4px 6px', width: 80 } }}
                        sx={{ maxWidth: 140 }}
                      />
                    </Stack>

                    {/* Totals */}
                    <Stack direction="row" spacing={3} alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                        <Typography variant="body2" fontWeight={600}>{fmt(subtotal)}</Typography>
                      </Stack>
                      {(discountTotal > 0 || commonDiscountAmt > 0) && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="success.main">Discount:</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main">-{fmt(discountTotal + commonDiscountAmt)}</Typography>
                        </Stack>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" fontWeight={700}>Total:</Typography>
                        <Typography variant="body1" fontWeight={700} color="primary.main">{fmt(grandTotal)}</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* ── RIGHT: Summary + Checkout ── */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', position: 'sticky', top: 80 }}>

            {/* Header */}
            <Box sx={{ px: 2.5, py: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <POSIcon />
                <Typography variant="subtitle1" fontWeight={700}>Bill Summary</Typography>
              </Stack>
            </Box>

            <Box sx={{ p: 2.5 }}>
              {/* Customer */}
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1} display="block" mb={1}>
                Customer
              </Typography>
              <Stack spacing={1.5} mb={2.5}>
                <TextField label="Customer Name" placeholder="Walk-in Customer" size="small" fullWidth
                  value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }} />
                <TextField label="Phone (optional)" size="small" fullWidth
                  value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }} />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Totals box */}
              <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, p: 2, mb: 2.5, border: 1, borderColor: alpha(theme.palette.primary.main, 0.12) }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmt(subtotal)}</Typography>
                  </Stack>
                  {discountTotal > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="success.main">Item Discounts</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">− {fmt(discountTotal)}</Typography>
                    </Stack>
                  )}
                  {commonDiscountAmt > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="success.main">Common Discount</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">− {fmt(commonDiscountAmt)}</Typography>
                    </Stack>
                  )}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1" fontWeight={700}>Grand Total</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">{fmt(grandTotal)}</Typography>
                  </Stack>
                </Stack>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Payment method chips */}
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1} display="block" mb={1}>
                Payment Method
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                {PAYMENT_METHODS.map((m) => (
                  <Chip key={m.value}
                    label={`${m.icon} ${m.label}`}
                    clickable
                    onClick={() => setPaymentMethod(m.value)}
                    color={paymentMethod === m.value ? 'primary' : 'default'}
                    variant={paymentMethod === m.value ? 'filled' : 'outlined'}
                    icon={paymentMethod === m.value ? <CheckIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                    sx={{ fontWeight: 600, mb: 0.5 }}
                  />
                ))}
              </Stack>

              {/* Amount paid */}
              <TextField label="Amount Paid (₹)" type="number" size="small" fullWidth
                value={amountPaid} onChange={(e) => {
                  const value = e.target.value;
                  setAmountPaidEdited(true);
                  if (value === '') {
                    setAmountPaid('');
                    return;
                  }
                  const numericValue = Number(value);
                  if (Number.isFinite(numericValue)) {
                    setAmountPaid(numericValue > grandTotal ? String(grandTotal) : value);
                  }
                }}
                onBlur={(e) => {
                  const numericValue = Number(e.target.value);
                  setAmountPaid(String(Math.min(Math.max(Number.isFinite(numericValue) ? numericValue : 0, 0), grandTotal)));
                }}
                inputProps={{ min: 0, max: grandTotal, step: 0.01 }} sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={() => setAmountPaid(String(grandTotal))} sx={{ fontSize: 11, minWidth: 0 }}>
                        Full
                      </Button>
                    </InputAdornment>
                  ),
                }} />

              {/* Balance / Change */}
              {(paid > 0 || grandTotal > 0) && (
                <Box sx={{
                  p: 1.5, borderRadius: 2, mb: 2,
                  bgcolor: balanceDue > 0 ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08),
                  border: 1,
                  borderColor: balanceDue > 0 ? 'error.light' : 'success.light',
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={700}
                      color={balanceDue > 0 ? 'error.main' : 'success.main'}>
                      {balanceDue < 0 ? 'Change to Return' : 'Balance Due'}
                    </Typography>
                    <Typography variant="body1" fontWeight={800}
                      color={balanceDue > 0 ? 'error.main' : 'success.main'}>
                      {balanceDue < 0 ? fmt(Math.abs(balanceDue)) : fmt(Math.max(0, balanceDue))}
                    </Typography>
                  </Stack>
                </Box>
              )}

              <TextField label="Notes (optional)" size="small" fullWidth multiline rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mb: 2.5 }} />

              <Button variant="contained" fullWidth size="large"
                disabled={cartItems.length === 0 || submitting}
                onClick={handleCreateBill}
                sx={{ py: 1.5, fontSize: 16, fontWeight: 700, borderRadius: 2 }}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <POSIcon />}>
                {submitting ? 'Creating Bill…' : cartItems.length === 0 ? 'Add Products to Bill' : `Create Bill · ${fmt(grandTotal)}`}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <SaleDetailDialog
        open={!!printSale}
        sale={printSale}
        onClose={() => setPrintSale(null)}
        onShowBill={() => setShowBill(true)}
      />

      <PrintInvoice
        open={showBill}
        sale={printSale}
        onClose={() => setShowBill(false)}
      />

      {/* ── Color Variant Picker Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!variantPickerProduct}
        onClose={() => setVariantPickerProduct(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PaletteIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Select Color</Typography>
              <Typography variant="caption" color="text.secondary">{variantPickerProduct?.name}</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1} mt={1}>
            {variantPickerProduct?.variants?.map((v: ProductVariant) => (
              <Box
                key={v.color}
                onClick={() => v.quantity > 0 && setSelectedVariantColor(v.color)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 2,
                  borderColor: selectedVariantColor === v.color ? 'primary.main' : 'divider',
                  bgcolor: selectedVariantColor === v.color ? 'primary.50' : 'transparent',
                  cursor: v.quantity > 0 ? 'pointer' : 'not-allowed',
                  opacity: v.quantity <= 0 ? 0.45 : 1,
                  transition: 'all 0.15s',
                  '&:hover': v.quantity > 0 ? { borderColor: 'primary.main', bgcolor: 'primary.50' } : {},
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PaletteIcon sx={{ fontSize: 18, color: selectedVariantColor === v.color ? 'primary.main' : 'text.secondary' }} />
                    <Typography variant="body2" fontWeight={600}>{v.color}</Typography>
                    {v.quantity <= 0 && <Chip label="Out of Stock" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />}
                  </Stack>
                  <Chip
                    label={`${v.quantity} left`}
                    size="small"
                    color={v.quantity <= 0 ? 'error' : v.quantity <= 5 ? 'warning' : 'success'}
                    sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setVariantPickerProduct(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedVariantColor}
            onClick={() => {
              if (variantPickerProduct && selectedVariantColor) {
                addToCart(variantPickerProduct, selectedVariantColor);
                setVariantPickerProduct(null);
              }
            }}
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
