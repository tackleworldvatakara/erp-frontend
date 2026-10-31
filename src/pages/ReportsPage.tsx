import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, Chip, CircularProgress,
  Tab, Tabs, TextField, MenuItem, Divider, Alert,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, TrendingFlat,
  BarChart as BarChartIcon, Inventory2, ShoppingBag,
  LocalAtm, Percent, Receipt,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, PieChart, Pie,
  Cell, Legend,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import {
  reportsApi, SummaryReport, TrendPoint, TopProduct,
  PaymentBreakdown, StockValuation,
} from '../api/reports';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

const PIE_COLORS = ['#1a3a5c', '#e67e22', '#27ae60', '#2980b9', '#8e44ad', '#c0392b'];

const PERIODS = [
  { label: 'Today',      value: 'today' },
  { label: 'Yesterday',  value: 'yesterday' },
  { label: 'This Week',  value: 'this_week' },
  { label: 'Last Week',  value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year',  value: 'this_year' },
  { label: 'Custom',     value: 'custom' },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  growth?: number | null;
  loading?: boolean;
}

function StatCard({ title, value, sub, icon, color, growth, loading }: StatCardProps) {
  return (
    <Paper sx={{ p: 2.5, borderLeft: 4, borderColor: color, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          {loading
            ? <CircularProgress size={22} />
            : <Typography variant="h5" fontWeight={700}>{value}</Typography>}
          {sub && !loading && (
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          )}
        </Box>
        <Box sx={{ color, opacity: 0.85, ml: 1 }}>{icon}</Box>
      </Stack>
      {growth !== undefined && growth !== null && !loading && (
        <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
          {growth > 0
            ? <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
            : growth < 0
            ? <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
            : <TrendingFlat sx={{ fontSize: 16, color: 'text.secondary' }} />}
          <Typography
            variant="caption"
            color={growth > 0 ? 'success.main' : growth < 0 ? 'error.main' : 'text.secondary'}
            fontWeight={600}
          >
            {growth > 0 ? '+' : ''}{growth}% vs prev period
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>{title}</Typography>
      {children}
    </Paper>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [period, setPeriod]       = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [tab, setTab]             = useState(0);

  const [summary, setSummary]               = useState<SummaryReport | null>(null);
  const [trend, setTrend]                   = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts]       = useState<TopProduct[]>([]);
  const [payBreakdown, setPayBreakdown]     = useState<PaymentBreakdown[]>([]);
  const [stockVal, setStockVal]             = useState<StockValuation | null>(null);
  const [loading, setLoading]               = useState(false);
  const [stockLoading, setStockLoading]     = useState(false);

  const load = useCallback(async () => {
    if (period === 'custom' && (!startDate || !endDate)) return;
    setLoading(true);
    try {
      const sd = period === 'custom' ? startDate : undefined;
      const ed = period === 'custom' ? endDate   : undefined;
      const [s, t, tp, pb] = await Promise.all([
        reportsApi.getSummary(period, sd, ed),
        reportsApi.getTrend(period, sd, ed),
        reportsApi.getTopProducts(period, sd, ed),
        reportsApi.getPaymentBreakdown(period, sd, ed),
      ]);
      setSummary(s);
      setTrend(t);
      setTopProducts(tp);
      setPayBreakdown(pb);
    } catch {
      // errors shown per-section
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 3 && !stockVal) {
      setStockLoading(true);
      reportsApi.getStockValuation()
        .then(setStockVal)
        .finally(() => setStockLoading(false));
    }
  }, [tab, stockVal]);

  const isCustom = period === 'custom';

  return (
    <Box>
      <PageHeader title="Reports & Analytics" subtitle="Business performance at a glance" />

      {/* ── Period selector ── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select size="small" label="Period" value={period}
            onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 160 }}
          >
            {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </TextField>

          {isCustom && (
            <>
              <TextField size="small" label="Start Date" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField size="small" label="End Date" type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </>
          )}

          {loading && <CircularProgress size={22} />}

          {summary && (
            <Typography variant="caption" color="text.secondary">
              {new Date(summary.period.start).toLocaleDateString('en-IN')} →{' '}
              {new Date(summary.period.end).toLocaleDateString('en-IN')}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* ── Tabs ── */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Overview" />
        <Tab label="Sales Trend" />
        <Tab label="Products" />
        <Tab label="Stock" />
      </Tabs>

      {/* ════════════════════ TAB 0 — Overview ════════════════════ */}
      {tab === 0 && (
        <Stack spacing={3}>
          {/* Summary cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Revenue" value={summary ? fmt(summary.revenue) : '—'}
                sub={`${summary?.orders ?? 0} orders`} icon={<LocalAtm sx={{ fontSize: 36 }} />}
                color="primary.main" growth={summary?.revenueGrowth ?? null} loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Gross Profit" value={summary ? fmt(summary.grossProfit) : '—'}
                sub={summary ? `Margin: ${summary.grossMargin}%` : ''}
                icon={<TrendingUp sx={{ fontSize: 36 }} />} color="success.main" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Cost of Goods" value={summary ? fmt(summary.cogs) : '—'}
                sub="Total purchase cost" icon={<ShoppingBag sx={{ fontSize: 36 }} />}
                color="warning.main" loading={loading} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Avg Order Value" value={summary ? fmt(summary.avgOrderValue) : '—'}
                sub={`${summary?.itemsSold ?? 0} items sold`} icon={<Receipt sx={{ fontSize: 36 }} />}
                color="info.main" loading={loading} />
            </Grid>
          </Grid>

          {/* P&L Summary */}
          <Section title="Profit & Loss Summary">
            {loading
              ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
              : summary
              ? (
                <Box>
                  <Stack spacing={0} divider={<Divider />}>
                    {[
                      { label: 'Gross Revenue',     value: summary.revenue,      color: 'text.primary',  bold: false },
                      { label: '(-) Discounts',      value: -summary.discount,    color: 'error.main',    bold: false },
                      { label: 'Net Revenue',        value: summary.revenue - summary.discount, color: 'text.primary', bold: true },
                      { label: '(-) Cost of Goods',  value: -summary.cogs,        color: 'error.main',    bold: false },
                      { label: 'Gross Profit',       value: summary.grossProfit,  color: summary.grossProfit >= 0 ? 'success.main' : 'error.main', bold: true },
                    ].map((row) => (
                      <Stack key={row.label} direction="row" justifyContent="space-between" py={1.25} px={1}>
                        <Typography variant="body2" fontWeight={row.bold ? 700 : 400}>{row.label}</Typography>
                        <Typography variant="body2" fontWeight={row.bold ? 700 : 400} color={row.color}>
                          {row.value < 0 ? `- ${fmt(Math.abs(row.value))}` : fmt(row.value)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Box mt={2} p={1.5} sx={{ bgcolor: summary.grossProfit >= 0 ? 'success.light' : 'error.light', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body1" fontWeight={700} color={summary.grossProfit >= 0 ? 'success.dark' : 'error.dark'}>
                        Gross Profit Margin
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color={summary.grossProfit >= 0 ? 'success.dark' : 'error.dark'}>
                        {summary.grossMargin}%
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              )
              : <Typography color="text.secondary" textAlign="center">No data for selected period</Typography>
            }
          </Section>

          {/* Payment breakdown pie */}
          <Section title="Payment Method Breakdown">
            {loading
              ? <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
              : payBreakdown.length === 0
              ? <Typography color="text.secondary" textAlign="center" py={3}>No payment data</Typography>
              : (
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={payBreakdown} dataKey="total" nameKey="method"
                          cx="50%" cy="50%" outerRadius={80} label={({ method, percent }) =>
                            `${method.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}>
                          {payBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartTooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.5}>
                      {payBreakdown.map((p, i) => (
                        <Stack key={p.method} direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <Typography variant="body2" textTransform="capitalize">
                              {p.method.replace('_', ' ')}
                            </Typography>
                          </Stack>
                          <Stack alignItems="flex-end">
                            <Typography variant="body2" fontWeight={600}>{fmt(p.total)}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.count} orders</Typography>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              )
            }
          </Section>
        </Stack>
      )}

      {/* ════════════════════ TAB 1 — Sales Trend ════════════════════ */}
      {tab === 1 && (
        <Stack spacing={3}>
          <Section title="Revenue & Profit Trend">
            {loading
              ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              : trend.length === 0
              ? <Typography color="text.secondary" textAlign="center" py={4}>No data for selected period</Typography>
              : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a3a5c" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1a3a5c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27ae60" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#27ae60" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <RechartTooltip
                      formatter={(v: number, name: string) => [fmtDec(v), name === 'revenue' ? 'Revenue' : 'Profit']}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                    <Legend formatter={(v) => v === 'revenue' ? 'Revenue' : 'Gross Profit'} />
                    <Area type="monotone" dataKey="revenue" stroke="#1a3a5c" strokeWidth={2} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="profit"  stroke="#27ae60" strokeWidth={2} fill="url(#colorPro)" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </Section>

          <Section title="Daily Orders">
            {loading
              ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              : trend.length === 0
              ? <Typography color="text.secondary" textAlign="center" py={4}>No data</Typography>
              : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RechartTooltip
                      labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                    <Bar dataKey="orders" fill="#e67e22" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Section>
        </Stack>
      )}

      {/* ════════════════════ TAB 2 — Products ════════════════════ */}
      {tab === 2 && (
        <Stack spacing={3}>
          <Section title="Top Products by Revenue">
            {loading
              ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              : topProducts.length === 0
              ? <Typography color="text.secondary" textAlign="center" py={4}>No sales data for selected period</Typography>
              : (
                <>
                  {/* Bar chart */}
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topProducts.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                      <YAxis type="category" dataKey="productName" tick={{ fontSize: 11 }} width={130}
                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v} />
                      <RechartTooltip formatter={(v: number, name: string) => [fmtDec(v), name === 'revenue' ? 'Revenue' : 'Profit']} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#1a3a5c" radius={[0, 4, 4, 0]} name="Revenue" />
                      <Bar dataKey="profit"  fill="#27ae60" radius={[0, 4, 4, 0]} name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>

                  <Divider />

                  {/* Table */}
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #eee', background: '#f8f9fa' }}>
                          {['#', 'Product', 'SKU', 'Qty Sold', 'Revenue', 'COGS', 'Profit', 'Margin'].map((h) => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: h === '#' || h === 'Qty Sold' ? 'center' : 'right', textTransform: 'uppercase', fontSize: 11, color: '#718096' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={p.productId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ textAlign: 'center', padding: '8px 10px', color: '#718096' }}>{i + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.productName}</td>
                            <td style={{ padding: '8px 10px', color: '#718096' }}>{p.sku}</td>
                            <td style={{ textAlign: 'center', padding: '8px 10px' }}>{p.qtySold}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>{fmtDec(p.revenue)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px', color: '#e74c3c' }}>{fmtDec(p.cogs)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: p.profit >= 0 ? '#27ae60' : '#e74c3c' }}>{fmtDec(p.profit)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>
                              <Chip label={`${p.margin}%`} size="small"
                                color={p.margin >= 30 ? 'success' : p.margin >= 10 ? 'warning' : 'error'}
                                sx={{ fontWeight: 700, fontSize: 11 }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </>
              )
            }
          </Section>
        </Stack>
      )}

      {/* ════════════════════ TAB 3 — Stock ════════════════════ */}
      {tab === 3 && (
        <Stack spacing={3}>
          {stockLoading
            ? <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
            : stockVal
            ? (
              <>
                {/* Stock value summary cards */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <StatCard title="Stock at Cost" value={fmt(stockVal.totalCostValue)}
                      sub={`${stockVal.items.length} products`}
                      icon={<Inventory2 sx={{ fontSize: 36 }} />} color="primary.main" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StatCard title="Stock at Selling Price" value={fmt(stockVal.totalSaleValue)}
                      sub="If all stock is sold"
                      icon={<BarChartIcon sx={{ fontSize: 36 }} />} color="info.main" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StatCard title="Potential Profit" value={fmt(stockVal.potentialProfit)}
                      sub="Sale value minus cost"
                      icon={<Percent sx={{ fontSize: 36 }} />} color="success.main" />
                  </Grid>
                </Grid>

                {/* Low stock alert */}
                {stockVal.items.filter((i) => i.isLowStock).length > 0 && (
                  <Alert severity="warning">
                    {stockVal.items.filter((i) => i.isLowStock).length} product(s) are at or below minimum stock threshold.
                  </Alert>
                )}

                {/* Stock table */}
                <Section title="Stock Valuation — All Products">
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #eee', background: '#f8f9fa' }}>
                          {['Product', 'SKU', 'Stock', 'Cost Price', 'Sell Price', 'Cost Value', 'Sale Value', 'Status'].map((h) => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: ['Product', 'SKU'].includes(h) ? 'left' : 'right', textTransform: 'uppercase', fontSize: 11, color: '#718096', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stockVal.items.map((item) => (
                          <tr key={item.sku} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: '8px 10px', color: '#718096' }}>{item.sku}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600,
                              color: item.currentStock <= 0 ? '#e74c3c' : item.isLowStock ? '#f39c12' : 'inherit' }}>
                              {item.currentStock}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>{fmtDec(item.purchaseCost)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>{fmtDec(item.sellingPrice)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>{fmtDec(item.costValue)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600 }}>{fmtDec(item.saleValue)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>
                              {item.currentStock <= 0
                                ? <Chip label="Out of Stock" size="small" color="error" />
                                : item.isLowStock
                                ? <Chip label="Low Stock" size="small" color="warning" />
                                : <Chip label="In Stock" size="small" color="success" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #ddd', background: '#f8f9fa' }}>
                          <td colSpan={5} style={{ padding: '10px', fontWeight: 700 }}>Total</td>
                          <td style={{ textAlign: 'right', padding: '10px', fontWeight: 700 }}>{fmt(stockVal.totalCostValue)}</td>
                          <td style={{ textAlign: 'right', padding: '10px', fontWeight: 700 }}>{fmt(stockVal.totalSaleValue)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </Box>
                </Section>
              </>
            )
            : <Typography color="text.secondary" textAlign="center" py={4}>Failed to load stock data</Typography>
          }
        </Stack>
      )}
    </Box>
  );
}
