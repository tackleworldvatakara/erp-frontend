import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, InputAdornment, Chip, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Tooltip,
  CircularProgress, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Divider, Popover,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon, ToggleOn as ToggleOnIcon, ToggleOff as ToggleOffIcon,
  Inventory2 as InventoryIcon, Close as CloseIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { productsApi } from '../api/products';
import { categoriesApi } from '../api/categories';
import { Product } from '../types/product.types';

const UNITS = ['piece', 'pair', 'box', 'kg', 'meter', 'liter', 'set', 'roll'] as const;

const productSchema = z.object({
  name:             z.string().min(1, 'Product name is required'),
  sku:              z.string().min(1, 'SKU is required'),
  category:         z.string().optional(),
  brand:            z.string().optional(),
  unit:             z.enum(UNITS),
  purchaseCost:     z.coerce.number().min(1, 'Purchase cost is required'),
  sellingPrice:     z.coerce.number().min(1, 'Selling price is required'),
  currentStock:     z.coerce.number().min(1, 'Opening stock is required'),
  minStockThreshold:z.coerce.number().min(1, 'Low stock threshold is required'),
  description:      z.string().optional(),
});
type ProductFormData = z.infer<typeof productSchema>;

function generateSKU(name: string) {
  const p = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
  return `${p}${Math.floor(1000 + Math.random() * 9000)}`;
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

const STATUS_FILTERS = [
  { label: 'All',          value: '' },
  { label: 'Active',      value: 'active' },
  { label: 'Inactive',    value: 'inactive' },
  { label: 'Low Stock',    value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Name (A to Z)', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Name (Z to A)', sortBy: 'name', sortOrder: 'desc' },
  { label: 'Price (Low to High)', sortBy: 'sellingPrice', sortOrder: 'asc' },
  { label: 'Price (High to Low)', sortBy: 'sellingPrice', sortOrder: 'desc' },
  { label: 'Stock (Low to High)', sortBy: 'currentStock', sortOrder: 'asc' },
  { label: 'Stock (High to Low)', sortBy: 'currentStock', sortOrder: 'desc' },
] as const;

// ── Field label helper ────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">
      {children}{required && <span style={{ color: '#e53e3e' }}> *</span>}
    </Typography>
  );
}

export default function ProductsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [products,       setProducts]       = useState<Product[]>([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter,    setBrandFilter]    = useState('');
  const [unitFilter,     setUnitFilter]     = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortBy,         setSortBy]         = useState('createdAt');
  const [sortOrder,      setSortOrder]      = useState<'asc' | 'desc'>('desc');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const isFilterOpen = Boolean(filterAnchorEl);

  const [page,           setPage]           = useState(0);
  const [rowsPerPage,    setRowsPerPage]    = useState(20);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editProduct,    setEditProduct]    = useState<Product | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState<Product | null>(null);
  const [categoryOptions,setCategoryOptions]= useState<string[]>([]);

  const activeFilterCount = (statusFilter ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (brandFilter.trim() ? 1 : 0) +
    (unitFilter ? 1 : 0) +
    (minPriceFilter !== '' ? 1 : 0) +
    (maxPriceFilter !== '' ? 1 : 0) +
    (sortBy !== 'createdAt' || sortOrder !== 'desc' ? 1 : 0);

  function handleClearAllFilters() {
    setStatusFilter('');
    setCategoryFilter('');
    setBrandFilter('');
    setUnitFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(0);
  }

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'piece', purchaseCost: undefined, sellingPrice: undefined, currentStock: undefined, minStockThreshold: undefined },
  });
  const nameValue = watch('name');

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getProducts({
        search: search || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        brand: brandFilter.trim() || undefined,
        unit: unitFilter || undefined,
        minPrice: minPriceFilter !== '' ? Number(minPriceFilter) : undefined,
        maxPrice: maxPriceFilter !== '' ? Number(maxPriceFilter) : undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch {
      enqueueSnackbar('Failed to load products', { variant: 'error' });
    } finally { setLoading(false); }
  }, [
    search,
    statusFilter,
    categoryFilter,
    brandFilter,
    unitFilter,
    minPriceFilter,
    maxPriceFilter,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
    enqueueSnackbar,
  ]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    categoriesApi.getAll().then((c) => setCategoryOptions(c.map((x) => x.name))).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPage(0), 350);
    return () => clearTimeout(t);
  }, [search, brandFilter, minPriceFilter, maxPriceFilter]);

  // ── Dialog open ───────────────────────────────────────────────────────────────
  function openAdd() {
    setEditProduct(null);
    reset({ unit: 'piece', purchaseCost: undefined, sellingPrice: undefined, currentStock: undefined, minStockThreshold: undefined, name: '', sku: '', category: '', brand: '', description: '' });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    reset({ name: p.name, sku: p.sku, category: p.category ?? '', brand: p.brand ?? '', unit: p.unit, purchaseCost: p.purchaseCost, sellingPrice: p.sellingPrice, currentStock: p.currentStock, minStockThreshold: p.minStockThreshold, description: p.description ?? '' });
    setDialogOpen(true);
  }

  function handleNameBlur() {
    if (!watch('sku') && nameValue) setValue('sku', generateSKU(nameValue));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function onSubmit(data: ProductFormData) {
    setSaving(true);
    try {
      if (editProduct) {
        await productsApi.updateProduct(editProduct._id, data);
        enqueueSnackbar('Product updated', { variant: 'success' });
      } else {
        await productsApi.createProduct(data);
        enqueueSnackbar('Product created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await productsApi.deleteProduct(deleteTarget._id);
      enqueueSnackbar('Product deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }

  async function handleToggleStatus(product: Product) {
    const nextStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await productsApi.updateProduct(product._id, { status: nextStatus });
      enqueueSnackbar(`Product ${nextStatus === 'active' ? 'activated' : 'deactivated'}`, { variant: 'success' });
      fetchProducts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update product status';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog and inventory"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Product
          </Button>
        }
      />

      {/* Filters Bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        mb={activeFilterCount > 0 ? 1.5 : 2.5}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} flexWrap="wrap" flex={1}>
          <TextField
            size="small"
            placeholder="Search by name, SKU or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, maxWidth: { sm: 360 } }}
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

          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                clickable
                size="small"
                color={statusFilter === f.value ? 'primary' : 'default'}
                variant={statusFilter === f.value ? 'filled' : 'outlined'}
                onClick={() => {
                  setStatusFilter(statusFilter === f.value && f.value !== '' ? '' : f.value);
                  setPage(0);
                }}
                sx={{ fontWeight: 600, height: 32 }}
              />
            ))}

            {/* Filter Button */}
            <Button
              variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
              size="small"
              startIcon={<TuneIcon fontSize="small" />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                height: 32,
                px: 1.5,
                fontSize: '0.8125rem',
                borderColor: activeFilterCount > 0 ? 'primary.main' : 'divider',
                boxShadow: 'none',
                ...(activeFilterCount > 0
                  ? {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark', boxShadow: 'none' },
                    }
                  : {
                      color: 'text.primary',
                      bgcolor: 'background.paper',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }),
              }}
            >
              Filter
              {activeFilterCount > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.75,
                    px: 0.7,
                    py: 0.1,
                    borderRadius: '10px',
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {activeFilterCount}
                </Box>
              )}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" mb={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Filtered by:
          </Typography>
          {statusFilter && (
            <Chip
              size="small"
              label={`Status: ${statusFilter === 'low_stock' ? 'Low Stock' : statusFilter === 'out_of_stock' ? 'Out of Stock' : statusFilter === 'in_stock' ? 'In Stock' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
              onDelete={() => { setStatusFilter(''); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            />
          )}
          {categoryFilter && (
            <Chip
              size="small"
              label={`Category: ${categoryFilter}`}
              onDelete={() => { setCategoryFilter(''); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            />
          )}
          {brandFilter.trim() && (
            <Chip
              size="small"
              label={`Brand: ${brandFilter}`}
              onDelete={() => { setBrandFilter(''); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            />
          )}
          {unitFilter && (
            <Chip
              size="small"
              label={`Unit: ${unitFilter}`}
              onDelete={() => { setUnitFilter(''); setPage(0); }}
              sx={{ borderRadius: 1.5, textTransform: 'capitalize' }}
            />
          )}
          {(minPriceFilter || maxPriceFilter) && (
            <Chip
              size="small"
              label={`Price: ₹${minPriceFilter || '0'} - ${maxPriceFilter ? '₹' + maxPriceFilter : 'Max'}`}
              onDelete={() => { setMinPriceFilter(''); setMaxPriceFilter(''); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            />
          )}
          {(sortBy !== 'createdAt' || sortOrder !== 'desc') && (
            <Chip
              size="small"
              label={`Sorted: ${SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder)?.label || 'Custom'}`}
              onDelete={() => { setSortBy('createdAt'); setSortOrder('desc'); setPage(0); }}
              sx={{ borderRadius: 1.5 }}
            />
          )}
          <Button
            size="small"
            variant="text"
            color="error"
            onClick={handleClearAllFilters}
            sx={{ textTransform: 'none', fontSize: 12, p: 0.5, minWidth: 'auto', fontWeight: 600 }}
          >
            Clear all
          </Button>
        </Stack>
      )}

      {/* Filter Popover */}
      <Popover
        open={isFilterOpen}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 360,
            maxWidth: '92vw',
            borderRadius: 2.5,
            p: 2.5,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            border: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>
              Filters & Sort
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} active`}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
              />
            )}
          </Stack>
          <IconButton size="small" onClick={() => setFilterAnchorEl(null)} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={2}>
          {/* Category */}
          <Box>
            <FieldLabel>Category</FieldLabel>
            <TextField
              select
              fullWidth
              size="small"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value=""><em>All Categories</em></MenuItem>
              {categoryOptions.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Stock Status */}
          <Box>
            <FieldLabel>Product / Stock Status</FieldLabel>
            <TextField
              select
              fullWidth
              size="small"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="in_stock">In Stock</MenuItem>
              <MenuItem value="low_stock">Low Stock</MenuItem>
              <MenuItem value="out_of_stock">Out of Stock</MenuItem>
            </TextField>
          </Box>

          {/* Brand */}
          <Box>
            <FieldLabel>Brand / Manufacturer</FieldLabel>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. Vega, MRF"
              value={brandFilter}
              onChange={(e) => { setBrandFilter(e.target.value); setPage(0); }}
            />
          </Box>

          {/* Unit */}
          <Box>
            <FieldLabel>Unit of Measure</FieldLabel>
            <TextField
              select
              fullWidth
              size="small"
              value={unitFilter}
              onChange={(e) => { setUnitFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value=""><em>All Units</em></MenuItem>
              {UNITS.map((u) => (
                <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Price Range */}
          <Box>
            <FieldLabel>Selling Price Range (₹)</FieldLabel>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                fullWidth
                size="small"
                placeholder="Min"
                type="number"
                value={minPriceFilter}
                onChange={(e) => { setMinPriceFilter(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0 }}
              />
              <Typography variant="body2" color="text.secondary">to</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Max"
                type="number"
                value={maxPriceFilter}
                onChange={(e) => { setMaxPriceFilter(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0 }}
              />
            </Stack>
          </Box>

          {/* Sort By */}
          <Box>
            <FieldLabel>Sort By</FieldLabel>
            <TextField
              select
              fullWidth
              size="small"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(0);
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={`${opt.sortBy}:${opt.sortOrder}`} value={`${opt.sortBy}:${opt.sortOrder}`}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1.5} justifyContent="space-between">
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={activeFilterCount === 0}
            onClick={handleClearAllFilters}
            sx={{ textTransform: 'none' }}
          >
            Reset All
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setFilterAnchorEl(null)}
            sx={{ textTransform: 'none', px: 2.5 }}
          >
            Done
          </Button>
        </Stack>
      </Popover>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <TableContainer
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {['Product', 'SKU', 'Category', 'Unit', 'Cost', 'Price', 'Stock', 'Product Status', ''].map((h) => (
                  <TableCell key={h} sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap', py: 1.5, fontSize: 13 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Stack alignItems="center" spacing={1}>
                      <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" variant="body2">
                        {search ? 'No products match your search' : 'No products yet — add your first product'}
                      </Typography>
                      {!search && (
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
                          Add Product
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p, i) => (
                  <TableRow
                    key={p._id}
                    hover
                    sx={{
                      bgcolor: i % 2 === 0 ? 'transparent' : (theme.palette.mode === 'light' ? '#fafafa' : '#1a1a1a'),
                      '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#f0f4ff' : '#1e2a3a' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                      {p.brand && <Typography variant="caption" color="text.secondary">{p.brand}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip label={p.sku} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{p.category || <span style={{ color: '#aaa' }}>—</span>}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{p.unit}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{fmtCurrency(p.purchaseCost)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">{fmtCurrency(p.sellingPrice)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}
                        color={p.currentStock <= 0 ? 'error.main' : p.currentStock <= p.minStockThreshold ? 'warning.main' : 'success.main'}>
                        {p.currentStock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.status === 'active' ? 'Active' : 'Inactive'}
                        size="small"
                        color={p.status === 'active' ? 'success' : 'default'}
                        sx={{ fontWeight: 600, minWidth: 78 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}
                            sx={{ '&:hover': { bgcolor: 'primary.light', color: 'primary.main' } }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={p.status === 'active' ? 'Deactivate' : 'Activate'}>
                          <IconButton size="small" onClick={() => handleToggleStatus(p)}
                            sx={{
                              color: p.status === 'active' ? 'success.main' : 'warning.main',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                color: p.status === 'active' ? 'success.dark' : 'warning.dark',
                              },
                            }}>
                            {p.status === 'active'
                              ? <ToggleOffIcon sx={{ fontSize: 20 }} />
                              : <ToggleOnIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </Tooltip>
                        {!p.hasSalesHistory && (
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(p)}
                              sx={{ '&:hover': { bgcolor: 'error.light', color: 'error.main' } }}>
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
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

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>

        {/* Header */}
        <Box sx={{ px: 3, pt: 3, pb: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <InventoryIcon />
              <Box>
                <Typography variant="h6" fontWeight={700}>{editProduct ? 'Edit Product' : 'Add New Product'}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {editProduct ? `Editing: ${editProduct.name}` : 'Fill in the product details below'}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setDialogOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>

            {/* Section: Basic Info */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack spacing={2.5} mb={3}>
              <Controller name="name" control={control} render={({ field }) => (
                <Box>
                  <FieldLabel required>Product Name</FieldLabel>
                  <TextField {...field} fullWidth size="small" placeholder="e.g. Road Wheel 45mm"
                    error={!!errors.name} helperText={errors.name?.message}
                    onBlur={() => { field.onBlur(); handleNameBlur(); }} />
                </Box>
              )} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="sku" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel required>SKU / Product Code</FieldLabel>
                    <TextField {...field} fullWidth size="small" placeholder="Auto-generated if blank"
                      error={!!errors.sku} helperText={errors.sku?.message || 'Unique identifier for this product'}
                      InputProps={{ sx: { fontFamily: 'monospace' } }} />
                  </Box>
                )} />
                <Controller name="unit" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel required>Unit of Measure</FieldLabel>
                    <TextField {...field} select fullWidth size="small">
                      {UNITS.map((u) => <MenuItem key={u} value={u} sx={{ textTransform: 'capitalize' }}>{u}</MenuItem>)}
                    </TextField>
                  </Box>
                )} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller name="category" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel>Category</FieldLabel>
                    <TextField {...field} select fullWidth size="small">
                      <MenuItem value=""><em style={{ color: '#aaa' }}>— None —</em></MenuItem>
                      {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                  </Box>
                )} />
                <Controller name="brand" control={control} render={({ field }) => (
                  <Box flex={1}>
                    <FieldLabel>Brand / Manufacturer</FieldLabel>
                    <TextField {...field} fullWidth size="small" placeholder="e.g. Vega, MRF" />
                  </Box>
                )} />
              </Stack>
            </Stack>

            {/* Section: Pricing */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Pricing
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <Controller name="purchaseCost" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel required>Purchase Cost (₹)</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.purchaseCost} helperText={errors.purchaseCost?.message || 'What you paid the supplier'}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }} />
                </Box>
              )} />
              <Controller name="sellingPrice" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel required>Selling Price (₹)</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.sellingPrice} helperText={errors.sellingPrice?.message || 'Price charged to customers'}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }} />
                </Box>
              )} />
              {/* Profit margin preview */}
              {watch('sellingPrice') > 0 && watch('purchaseCost') >= 0 && (
                <Box flex={1} sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, width: '100%' }}>
                    <Typography variant="caption" color="success.dark" fontWeight={600}>
                      Margin:{' '}
                      {watch('sellingPrice') > 0
                        ? `${(((watch('sellingPrice') - watch('purchaseCost')) / watch('sellingPrice')) * 100).toFixed(1)}%`
                        : '—'}
                    </Typography>
                    <Typography variant="body2" color="success.dark" fontWeight={700}>
                      Profit: ₹{(watch('sellingPrice') - watch('purchaseCost')).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>

            {/* Section: Stock */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Stock
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <Controller name="currentStock" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel required>{editProduct ? 'Current Stock' : 'Opening Stock'}</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    error={!!errors.currentStock} helperText={editProduct ? 'Changing this creates a stock adjustment record' : 'Initial quantity in stock'}
                    inputProps={{ min: 0 }} />
                </Box>
              )} />
              <Controller name="minStockThreshold" control={control} render={({ field }) => (
                <Box flex={1}>
                  <FieldLabel required>Low Stock Alert Threshold</FieldLabel>
                  <TextField {...field} fullWidth size="small" type="number"
                    helperText="Alert when stock falls to or below this" inputProps={{ min: 0 }} />
                </Box>
              )} />
            </Stack>

            {/* Section: Description */}
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.2}>
              Description
            </Typography>
            <Divider sx={{ mb: 2, mt: 0.5 }} />

            <Controller name="description" control={control} render={({ field }) => (
              <TextField {...field} fullWidth size="small" multiline rows={3}
                placeholder="Optional product notes, specifications or details…" />
            )} />
          </Box>
        </DialogContent>

        {/* Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ minWidth: 100 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}
              sx={{ minWidth: 140 }}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving…' : editProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
