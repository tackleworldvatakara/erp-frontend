import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, TextField, InputAdornment, Stack, Chip, IconButton, Tooltip,
  Dialog, DialogContent, DialogTitle, Typography, Divider, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  CircularProgress, MenuItem, Checkbox, Alert,
} from '@mui/material';
import {
  AssignmentReturn as ReturnIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Add as AddIcon,
  CurrencyRupee as RupeeIcon,
  CheckCircle as SuccessIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { returnsApi } from '../api/returns';
import {
  CustomerReturn,
  ReturnStats,
  SaleReturnableInfo,
  ReturnItemCondition,
} from '../types/return.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Approved', value: 'approved' },
  { label: 'Draft', value: 'draft' },
  { label: 'Rejected', value: 'rejected' },
];

const REFUND_METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'store_credit'];

const RETURN_REASONS = [
  'Defective / Damaged',
  'Wrong Item Purchased / Shipped',
  'Customer Changed Mind',
  'Not Satisfied with Quality',
  'Size / Specification Mismatch',
  'Other',
];

function ReturnStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'success' | 'info' | 'warning' | 'error' }> = {
    completed: { label: 'Completed', color: 'success' },
    approved:  { label: 'Approved',  color: 'info' },
    draft:     { label: 'Draft',     color: 'warning' },
    rejected:  { label: 'Rejected',  color: 'error' },
  };
  const s = map[status] ?? { label: status, color: 'info' as const };
  return <Chip label={s.label} size="small" color={s.color} sx={{ fontWeight: 700, minWidth: 80 }} />;
}

function ConditionBadge({ condition }: { condition: ReturnItemCondition }) {
  const map: Record<ReturnItemCondition, { label: string; color: 'success' | 'error' | 'warning' }> = {
    resellable:       { label: 'Resellable (Restocked)', color: 'success' },
    damaged:          { label: 'Damaged (Discard)',     color: 'error' },
    supplier_return:  { label: 'Supplier Return',      color: 'warning' },
  };
  const c = map[condition] ?? { label: condition, color: 'warning' as const };
  return <Chip label={c.label} size="small" color={c.color} variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />;
}

interface ReturnItemSelection {
  selected: boolean;
  quantity: number;
  condition: ReturnItemCondition;
  reason: string;
}

export default function ReturnsPage() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();

  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [stats, setStats] = useState<ReturnStats | null>(null);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState<CustomerReturn | null>(null);

  // Create Return Form State
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saleInfo, setSaleInfo] = useState<SaleReturnableInfo | null>(null);
  const [itemSelections, setItemSelections] = useState<Record<string, ReturnItemSelection>>({});
  const [refundMethod, setRefundMethod] = useState('cash');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch list & stats
  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await returnsApi.getReturns({
        search: search || undefined,
        status: statusFilter || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      });
      setReturns(res.data);
      setTotal(res.pagination.total);
    } catch {
      enqueueSnackbar('Failed to load returns', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, rowsPerPage, enqueueSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await returnsApi.getReturnStats();
      setStats(data);
    } catch {
      // Ignore stats error
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle invoiceId query parameter (e.g. from Sales History)
  useEffect(() => {
    const inv = searchParams.get('invoiceId');
    if (inv) {
      setInvoiceLookup(inv);
      handleLookupInvoice(inv);
      setCreateDialogOpen(true);
    }
  }, [searchParams]);

  // Invoice Lookup for Create Return
  async function handleLookupInvoice(customInv?: string) {
    const inv = (customInv || invoiceLookup).trim();
    if (!inv) {
      enqueueSnackbar('Please enter an invoice number', { variant: 'warning' });
      return;
    }

    setLookingUp(true);
    try {
      const info = await returnsApi.getSaleReturnableInfo(inv);
      setSaleInfo(info);
      setRefundMethod(info.sale.paymentMethod || 'cash');

      // Initialize selections for each item
      const initial: Record<string, ReturnItemSelection> = {};
      info.items.forEach((item) => {
        initial[item.productId] = {
          selected: item.returnableQuantity > 0,
          quantity: item.returnableQuantity > 0 ? 1 : 0,
          condition: 'resellable',
          reason: RETURN_REASONS[0],
        };
      });
      setItemSelections(initial);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invoice not found';
      enqueueSnackbar(msg, { variant: 'error' });
      setSaleInfo(null);
    } finally {
      setLookingUp(false);
    }
  }

  function handleOpenCreate() {
    setInvoiceLookup('');
    setSaleInfo(null);
    setItemSelections({});
    setReturnNotes('');
    setCreateDialogOpen(true);
  }

  // Calculate refund sum in create modal
  const computedRefundTotal = saleInfo
    ? saleInfo.items.reduce((acc, item) => {
        const sel = itemSelections[item.productId];
        if (sel && sel.selected && sel.quantity > 0) {
          return acc + sel.quantity * item.unitPrice;
        }
        return acc;
      }, 0)
    : 0;

  const totalRestockedCount = saleInfo
    ? saleInfo.items.reduce((acc, item) => {
        const sel = itemSelections[item.productId];
        if (sel && sel.selected && sel.condition === 'resellable') {
          return acc + (sel.quantity || 0);
        }
        return acc;
      }, 0)
    : 0;

  async function handleConfirmReturn() {
    if (!saleInfo) return;

    const returnItemsPayload = saleInfo.items
      .filter((item) => itemSelections[item.productId]?.selected && itemSelections[item.productId]?.quantity > 0)
      .map((item) => {
        const sel = itemSelections[item.productId];
        return {
          saleItem: item.saleItemId,
          product: item.productId,
          quantity: sel.quantity,
          unitPrice: item.unitPrice,
          condition: sel.condition,
          returnReason: sel.reason,
        };
      });

    if (returnItemsPayload.length === 0) {
      enqueueSnackbar('Please select at least one item to return', { variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await returnsApi.createReturn({
        originalSale: saleInfo.sale._id,
        items: returnItemsPayload,
        refundMethod,
        notes: returnNotes.trim() || undefined,
        status: 'completed',
        refundStatus: 'completed',
      });

      enqueueSnackbar(`Return ${res.returnNumber} processed successfully!`, { variant: 'success' });
      setCreateDialogOpen(false);
      fetchReturns();
      fetchStats();
      setViewReturn(res);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to process return';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <PageHeader
        title="Returns"
        subtitle="Process customer sales returns, manage inventory restock, and issue refunds"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Process Return
          </Button>
        }
      />

      {/* KPI Stats Cards */}
      <Grid container spacing={2} mb={3} alignItems="stretch">
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 112,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' },
            }}
          >
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} noWrap display="block">
                    TOTAL RETURNS
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, mb: 0.5, lineHeight: 1.2 }} noWrap>
                    {stats?.totalReturns ?? 0}
                  </Typography>
                  <Typography variant="caption" color="success.main" fontWeight={600} noWrap display="block">
                    {stats?.completedCount ?? 0} completed
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    ml: 1.5,
                  }}
                >
                  <ReturnIcon sx={{ fontSize: 24 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 112,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' },
            }}
          >
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} noWrap display="block">
                    TOTAL REFUNDED
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="error.main" sx={{ mt: 0.5, mb: 0.5, lineHeight: 1.2 }} noWrap>
                    {fmt(stats?.totalRefundAmount ?? 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap display="block">
                    Total refunds issued
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                    color: 'error.main',
                    ml: 1.5,
                  }}
                >
                  <RupeeIcon sx={{ fontSize: 24 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 112,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' },
            }}
          >
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} noWrap display="block">
                    RESTOCKED ITEMS
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main" sx={{ mt: 0.5, mb: 0.5, lineHeight: 1.2 }} noWrap>
                    {stats?.resellableRestockedQty ?? 0} units
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap display="block">
                    Restocked to inventory
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    color: 'success.main',
                    ml: 1.5,
                  }}
                >
                  <InventoryIcon sx={{ fontSize: 24 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 112,
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' },
            }}
          >
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} noWrap display="block">
                    ITEMS RETURNED
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 0.5, mb: 0.5, lineHeight: 1.2 }} noWrap>
                    {stats?.totalItemsReturned ?? 0} lines
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap display="block">
                    Across all returns
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    ml: 1.5,
                  }}
                >
                  <SuccessIcon sx={{ fontSize: 24 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Stack direction="row" mb={2.5}>
        <TextField
          size="small"
          placeholder="Search by return #, invoice #, or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            ...(search ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
            } : {}),
          }}
        />
      </Stack>

      {/* Returns Data Table */}
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
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 2, fontSize: 12.5, width: { md: '15%' } }}>
                  RETURN #
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '13%' } }}>
                  DATE & TIME
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  INVOICE #
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '14%' } }}>
                  CUSTOMER
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '14%' } }}>
                  ITEMS
                </TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '12%' } }}>
                  REFUND AMOUNT
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '9%' } }}>
                  METHOD
                </TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 700, py: 1.5, px: 1.5, fontSize: 12.5, width: { md: '11%' } }}>
                  STATUS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <ReturnIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" variant="body2">
                        {search ? 'No returns match your search query' : 'No return records found'}
                      </Typography>
                      {!search && (
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                          Process First Return
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((r, i) => (
                  <TableRow
                    key={r._id}
                    hover
                    onClick={() => setViewReturn(r)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                    }}
                  >
                    <TableCell sx={{ px: 2 }}>
                      <Chip
                        label={r.returnNumber}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'primary.main',
                          borderColor: 'primary.light',
                          fontSize: 11,
                          height: 24,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12.5 }}>
                        {new Date(r.returnDate || r.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
                        {new Date(r.returnDate || r.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12.5 }}>
                        {r.originalSale?.invoiceNumber ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ fontSize: 12.5 }}
                        title={r.customer?.name || r.originalSale?.customerName || 'Walk-in Customer'}
                      >
                        {r.customer?.name || r.originalSale?.customerName || 'Walk-in Customer'}
                      </Typography>
                      {r.customer?.phone && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
                          {r.customer.phone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12.5 }}>
                        {r.items.reduce((s, it) => s + it.quantity, 0)} units ({r.items.length} items)
                      </Typography>
                      <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="nowrap">
                        {r.items.some((it) => it.condition === 'resellable') && (
                          <Chip label="Restocked" size="small" color="success" variant="outlined" sx={{ fontSize: 9.5, height: 18, fontWeight: 600 }} />
                        )}
                        {r.items.some((it) => it.condition === 'damaged') && (
                          <Chip label="Damaged" size="small" color="error" variant="outlined" sx={{ fontSize: 9.5, height: 18, fontWeight: 600 }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ px: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} color="error.main" noWrap sx={{ fontSize: 13 }}>
                        {fmt(r.totalRefund)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1.5 }}>
                      <Chip
                        label={(r.refundMethod || 'CASH').toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: 10, height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ px: 1.5 }}>
                      <ReturnStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      {/* ── Process Return Modal ──────────────────────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ReturnIcon />
              <Box>
                <Typography variant="h6" fontWeight={700}>Process Customer Return</Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Lookup original sale invoice, select return items, restock inventory, and issue refund
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setCreateDialogOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          {/* Step 1: Invoice Lookup */}
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
            1. Invoice Lookup
          </Typography>
          <Divider sx={{ mb: 2, mt: 0.5 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2.5}>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter original invoice number (e.g. INV-00001)"
              value={invoiceLookup}
              onChange={(e) => setInvoiceLookup(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLookupInvoice(); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleLookupInvoice()}
              disabled={lookingUp || !invoiceLookup.trim()}
              sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
            >
              {lookingUp ? <CircularProgress size={18} color="inherit" /> : 'Find Invoice'}
            </Button>
          </Stack>

          {/* Invoice Header Details */}
          {saleInfo && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Invoice #</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>{saleInfo.sale.invoiceNumber}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="subtitle2">{fmtDate(saleInfo.sale.invoiceDate)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Customer</Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {saleInfo.sale.customerName || saleInfo.sale.customer?.name || 'Walk-in Customer'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Grand Total</Typography>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                    {fmt(saleInfo.sale.grandTotal)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Step 2: Item Selection */}
          {saleInfo && (
            <>
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
                2. Select Items to Return
              </Typography>
              <Divider sx={{ mb: 2, mt: 0.5 }} />

              {saleInfo.isFullyReturned ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  All items in this invoice have already been returned.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell padding="checkbox">Return</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Sold / Ret.</TableCell>
                        <TableCell align="center" sx={{ width: 100 }}>Return Qty</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell align="right">Refund</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {saleInfo.items.map((item) => {
                        const sel = itemSelections[item.productId] || {
                          selected: false,
                          quantity: 0,
                          condition: 'resellable',
                          reason: RETURN_REASONS[0],
                        };
                        const disabled = item.returnableQuantity <= 0;

                        return (
                          <TableRow key={item.productId} sx={{ opacity: disabled ? 0.5 : 1 }}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                disabled={disabled}
                                checked={sel.selected}
                                onChange={(e) => {
                                  setItemSelections((prev) => ({
                                    ...prev,
                                    [item.productId]: {
                                      ...sel,
                                      selected: e.target.checked,
                                      quantity: e.target.checked && sel.quantity === 0 ? 1 : sel.quantity,
                                    },
                                  }));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {item.sku} • {fmt(item.unitPrice)}/{item.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {item.soldQuantity} sold
                              </Typography>
                              {item.previouslyReturned > 0 && (
                                <Typography variant="caption" color="warning.main" display="block">
                                  ({item.previouslyReturned} already ret.)
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <TextField
                                size="small"
                                type="number"
                                disabled={!sel.selected || disabled}
                                value={sel.quantity}
                                onChange={(e) => {
                                  const val = Math.min(
                                    item.returnableQuantity,
                                    Math.max(1, parseInt(e.target.value) || 0)
                                  );
                                  setItemSelections((prev) => ({
                                    ...prev,
                                    [item.productId]: { ...sel, quantity: val },
                                  }));
                                }}
                                inputProps={{ min: 1, max: item.returnableQuantity, style: { textAlign: 'center' } }}
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                size="small"
                                disabled={!sel.selected || disabled}
                                value={sel.condition}
                                onChange={(e) => {
                                  setItemSelections((prev) => ({
                                    ...prev,
                                    [item.productId]: { ...sel, condition: e.target.value as ReturnItemCondition },
                                  }));
                                }}
                                sx={{ minWidth: 130 }}
                              >
                                <MenuItem value="resellable">Resellable (Stock +)</MenuItem>
                                <MenuItem value="damaged">Damaged</MenuItem>
                                <MenuItem value="supplier_return">Supplier Return</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                select
                                size="small"
                                disabled={!sel.selected || disabled}
                                value={sel.reason}
                                onChange={(e) => {
                                  setItemSelections((prev) => ({
                                    ...prev,
                                    [item.productId]: { ...sel, reason: e.target.value },
                                  }));
                                }}
                                sx={{ minWidth: 150 }}
                              >
                                {RETURN_REASONS.map((r) => (
                                  <MenuItem key={r} value={r}>{r}</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700}>
                                {fmt(sel.selected ? sel.quantity * item.unitPrice : 0)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Step 3: Refund Method & Notes */}
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
                3. Refund & Settlement
              </Typography>
              <Divider sx={{ mb: 2, mt: 0.5 }} />

              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">
                    Refund Method
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    {REFUND_METHODS.map((m) => (
                      <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>
                        {m.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">
                    Notes / Remarks
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Optional notes regarding the return"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </Grid>
              </Grid>

              {/* Summary Card */}
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Total Refund Amount: {fmt(computedRefundTotal)}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {totalRestockedCount} resellable item(s) will be automatically added back to inventory stock.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleConfirmReturn}
                    disabled={submitting || computedRefundTotal <= 0}
                    sx={{ mt: { xs: 1.5, sm: 0 }, px: 3, fontWeight: 700 }}
                  >
                    {submitting ? 'Processing…' : 'Confirm Return & Refund'}
                  </Button>
                </Stack>
              </Paper>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Return Details & Voucher Modal ───────────────────────────────── */}
      <Dialog
        open={!!viewReturn}
        onClose={() => setViewReturn(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {viewReturn && (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                Return Voucher — {viewReturn.returnNumber}
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" onClick={() => setViewReturn(null)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
              {/* Return voucher header */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Return Number</Typography>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {viewReturn.returnNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Original Invoice</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {viewReturn.originalSale?.invoiceNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Return Date</Typography>
                  <Typography variant="subtitle2">{fmtDate(viewReturn.returnDate || viewReturn.createdAt)}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box mt={0.5}><ReturnStatusBadge status={viewReturn.status} /></Box>
                </Grid>
              </Grid>

              {/* Items Table */}
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Returned Items</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Return Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell>Condition</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Refund Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewReturn.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {it.product?.name ?? 'Product'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {it.product?.sku}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={700}>{it.quantity}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{fmt(it.unitPrice)}</Typography>
                        </TableCell>
                        <TableCell>
                          <ConditionBadge condition={it.condition} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {it.returnReason || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            {fmt(it.quantity * it.unitPrice)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Refund breakdown */}
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Refund Method</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                    {viewReturn.refundMethod}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">Refund Status</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize', color: 'success.main' }}>
                    {viewReturn.refundStatus}
                  </Typography>
                </Stack>
                {viewReturn.notes && (
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{viewReturn.notes}</Typography>
                  </Stack>
                )}
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={700}>Total Refund</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.main">
                    {fmt(viewReturn.totalRefund)}
                  </Typography>
                </Stack>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
