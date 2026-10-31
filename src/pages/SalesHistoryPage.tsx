import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, Stack, Chip, IconButton, Tooltip,
  Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon, Visibility as ViewIcon, Receipt as ReceiptIcon, CalendarToday,
  WarningAmber as WarningIcon, Block as CancelBillIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import PrintInvoice from '../components/billing/PrintInvoice';
import SaleDetailDialog from '../components/billing/SaleDetailDialog';
import { salesApi } from '../api/sales';
import { Sale } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const DATE_FILTERS = [
  { label: 'All',        value: 'all' },
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom',     value: 'custom' },
];

function getDateRange(filter: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  if (filter === 'today') return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
  if (filter === 'week')  return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString() };
  if (filter === 'month') return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  if (filter === 'custom' && customStart) return {
    startDate: new Date(customStart).toISOString(),
    ...(customEnd && { endDate: new Date(new Date(customEnd).setHours(23, 59, 59, 999)).toISOString() }),
  };
  return {};
}

function PaymentBadge({ status, saleStatus }: { status: string; saleStatus: Sale['status'] }) {
  if (saleStatus === 'cancelled') {
    return <Chip label="Cancelled" size="small" color="error" sx={{ fontWeight: 700, minWidth: 72 }} />;
  }
  const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
    paid:    { label: 'Paid',    color: 'success' },
    partial: { label: 'Partial', color: 'warning' },
    unpaid:  { label: 'Unpaid',  color: 'error' },
  };
  const s = map[status] ?? { label: status, color: 'error' as const };
  return <Chip label={s.label} size="small" color={s.color} sx={{ fontWeight: 700, minWidth: 72 }} />;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    cash: '#27ae60', upi: '#8e44ad', card: '#2980b9', bank_transfer: '#e67e22',
  };
  const label = method.replace('_', ' ').toUpperCase();
  const color = colors[method] ?? '#666';
  return (
    <Chip label={label} size="small" variant="outlined"
      sx={{ fontWeight: 700, fontSize: 10, color, borderColor: color, minWidth: 64 }} />
  );
}

export default function SalesHistoryPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [sales,        setSales]        = useState<Sale[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [dateFilter,   setDateFilter]   = useState('all');
  const [page,         setPage]         = useState(0);
  const [rowsPerPage,  setRowsPerPage]  = useState(20);
  const [viewSale,     setViewSale]     = useState<Sale | null>(null);
  const [showBill,     setShowBill]     = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');

  const fetchSales = useCallback(async () => {
    if (dateFilter === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      const range = getDateRange(dateFilter, customStart, customEnd);
      const res = await salesApi.getSales({ search: search || undefined, ...range, page: page + 1, pageSize: rowsPerPage });
      setSales(res.data);
      setTotal(res.pagination.total);
    } catch { enqueueSnackbar('Failed to load sales', { variant: 'error' }); }
    finally { setLoading(false); }
  }, [search, dateFilter, customStart, customEnd, page, rowsPerPage, enqueueSnackbar]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { const t = setTimeout(() => setPage(0), 350); return () => clearTimeout(t); }, [search]);

  const handleCancelBill = async () => {
    if (!viewSale || viewSale.status !== 'confirmed' || cancelling) return;
    if (!cancelReason.trim()) return;
    setCancelling(true);
    try {
      const cancelled = await salesApi.cancelSale(viewSale._id, cancelReason.trim());
      setViewSale(cancelled);
      setCancelConfirmOpen(false);
      setCancelReason('');
      enqueueSnackbar('Bill cancelled and stock restored', { variant: 'success' });
      await fetchSales();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Could not cancel bill';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Sales History" subtitle="View and manage all past invoices" />

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2.5} alignItems={{ sm: 'center' }} flexWrap="wrap">
        <TextField
          size="small" placeholder="Search invoice # or customer…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 270 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {DATE_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} size="small" clickable
              color={dateFilter === f.value ? 'primary' : 'default'}
              variant={dateFilter === f.value ? 'filled' : 'outlined'}
              onClick={() => { setDateFilter(f.value); setPage(0); }}
              icon={f.value !== 'all' ? <CalendarToday sx={{ fontSize: '12px !important' }} /> : undefined}
            />
          ))}
        </Stack>

        {/* Custom date pickers */}
        {dateFilter === 'custom' && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <TextField size="small" type="date" label="From" value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            <TextField size="small" type="date" label="To" value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          </Stack>
        )}

        {!loading && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {total} invoice{total !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Table size="small" sx={{ width: '100%', tableLayout: { md: 'fixed', xs: 'auto' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 2, fontSize: 12.5, width: { md: '12%' } }}>
                  INVOICE #
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '15%' } }}>
                  CUSTOMER
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1, fontSize: 12.5, width: { md: '7%' } }}>
                  ITEMS
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  TOTAL
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  PAID
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1, fontSize: 12.5, width: { md: '9%' } }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  DATE
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" variant="body2">
                        {search ? 'No invoices match your search' : 'No sales yet'}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s, i) => (
                  <TableRow
                    key={s._id}
                    hover
                    sx={{
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewSale(s)}
                  >
                    <TableCell sx={{ px: 2 }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main" noWrap sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>
                        {s.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12.5 }} title={s.customerName}>
                        {s.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1 }}>
                      <Chip label={s.items.length} size="small" variant="outlined" sx={{ minWidth: 28, height: 22, fontSize: 11, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: 13 }}>
                        {fmt(s.grandTotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1.5 }}>
                      <Typography variant="body2" color="success.main" fontWeight={600} noWrap sx={{ fontSize: 12.5 }}>
                        {fmt(s.paidAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1 }}>
                      <PaymentBadge status={s.paymentStatus} saleStatus={s.status} />
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12 }}>
                        {new Date(s.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10.5 }}>
                        {new Date(s.invoiceDate).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      {/* ── Invoice View Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={cancelConfirmOpen}
        onClose={() => { if (!cancelling) { setCancelConfirmOpen(false); setCancelReason(''); } }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'error.light', color: 'error.dark', display: 'grid', placeItems: 'center' }}>
            <WarningIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={750}>Cancel this bill?</Typography>
            <Typography variant="body2" color="text.secondary">This action will update your stock.</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">INVOICE</Typography>
                <Typography fontWeight={700}>{viewSale?.invoiceNumber}</Typography>
              </Box>
              <Typography fontWeight={750}>{viewSale ? fmt(viewSale.grandTotal) : ''}</Typography>
            </Stack>
          </Paper>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
            Cancelling returns the sold quantities to inventory and marks this invoice as cancelled. You can still view or print it from Sales History.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Reason for cancellation"
            placeholder="e.g. Customer requested cancellation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            error={cancelReason.trim() === ''}
            helperText={cancelReason.trim() === '' ? 'Reason is required' : ''}
            sx={{ mt: 2 }}
            disabled={cancelling}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button disabled={cancelling} onClick={() => { setCancelConfirmOpen(false); setCancelReason(''); }} variant="outlined" color="inherit">Keep Bill</Button>
          <Button disabled={cancelling || !cancelReason.trim()} onClick={handleCancelBill} variant="contained" color="error" startIcon={<CancelBillIcon />}>
            {cancelling ? 'Cancelling…' : 'Cancel Bill'}
          </Button>
        </DialogActions>
      </Dialog>

      <SaleDetailDialog
        open={!!viewSale}
        sale={viewSale}
        onClose={() => setViewSale(null)}
        onShowBill={() => setShowBill(true)}
        onReturn={() => {
          if (!viewSale) return;
          const inv = viewSale.invoiceNumber;
          setViewSale(null);
          navigate(`/returns?invoiceId=${inv}`);
        }}
        onCancel={() => setCancelConfirmOpen(true)}
      />

      <PrintInvoice
        open={showBill}
        sale={viewSale}
        onClose={() => setShowBill(false)}
      />
    </Box>
  );
}
