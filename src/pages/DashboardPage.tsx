import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, Stack, Button, CircularProgress,
  Chip, Divider, alpha,
} from '@mui/material';
import {
  PointOfSale as POSIcon, Add as AddIcon,
  TrendingUp, TrendingDown, Inventory2, Warning, ShoppingBag,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../api/sales';
import { DashboardStats, Sale } from '../types/sale.types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  loading?: boolean;
  trend?: 'up' | 'down' | null;
}

function StatCard({ title, value, subtitle, icon, color, bgColor, loading, trend }: StatCardProps) {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider', height: '100%',
      position: 'relative', overflow: 'hidden',
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: color,
      },
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>{title}</Typography>
          {loading
            ? <CircularProgress size={26} sx={{ color }} />
            : <Typography variant="h4" fontWeight={800} color="text.primary" lineHeight={1.1}>{value}</Typography>}
          <Stack direction="row" spacing={0.5} alignItems="center" mt={0.75}>
            {trend && !loading && (
              trend === 'up'
                ? <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                : <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
            )}
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Stack>
        </Box>
        <Box sx={{
          width: 52, height: 52, borderRadius: 2.5, bgcolor: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          '& svg': { fontSize: 26, color },
        }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Payment badge ─────────────────────────────────────────────────────────────
function PayBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
    paid: { label: 'Paid', color: 'success' },
    partial: { label: 'Partial', color: 'warning' },
    unpaid: { label: 'Unpaid', color: 'error' },
  };
  const s = map[status] ?? { label: status, color: 'error' as const };
  return <Chip label={s.label} size="small" color={s.color} sx={{ fontWeight: 700, minWidth: 64 }} />;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  const [stats, setStats]             = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    salesApi.getDashboardStats()
      .then(({ stats: s, recentSales: r }) => { setStats(s); setRecentSales(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards: StatCardProps[] = [
    {
      title: "Today's Sales",
      value: stats?.todaySales ?? 0,
      subtitle: 'transactions today',
      icon: <ShoppingBag />,
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
      trend: stats && stats.todaySales > 0 ? 'up' : null,
    },
    {
      title: "Today's Revenue",
      value: stats ? fmt(stats.todayRevenue) : '—',
      subtitle: 'collected today',
      icon: <TrendingUp />,
      color: '#27ae60',
      bgColor: alpha('#27ae60', 0.1),
      trend: stats && stats.todayRevenue > 0 ? 'up' : null,
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts ?? 0,
      subtitle: 'active in catalog',
      icon: <Inventory2 />,
      color: '#2980b9',
      bgColor: alpha('#2980b9', 0.1),
      trend: null,
    },
    {
      title: 'Low Stock Alerts',
      value: stats?.lowStockCount ?? 0,
      subtitle: 'need restocking',
      icon: <Warning />,
      color: stats?.lowStockCount ? '#e67e22' : '#27ae60',
      bgColor: alpha(stats?.lowStockCount ? '#e67e22' : '#27ae60', 0.1),
      trend: stats?.lowStockCount ? 'down' : null,
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3.5}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" startIcon={<POSIcon />} onClick={() => navigate('/sales')}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}>
            New Bill
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/products')}
            sx={{ borderRadius: 2, fontWeight: 600, px: 2 }}>
            Add Product
          </Button>
        </Stack>
      </Stack>

      {/* Stat cards */}
      <Grid container spacing={2.5} mb={3.5}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Sales */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        {/* Table header */}
        <Box sx={{ px: 3, py: 2, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <POSIcon sx={{ color: 'white', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} color="white">Recent Sales</Typography>
              {!loading && recentSales.length > 0 && (
                <Chip label={recentSales.length} size="small"
                  sx={{ bgcolor: alpha('#fff', 0.2), color: 'white', fontWeight: 700, fontSize: 11 }} />
              )}
            </Stack>
            <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/sales/history')}
              sx={{ color: 'white', fontWeight: 600, fontSize: 12, opacity: 0.85, '&:hover': { opacity: 1, bgcolor: alpha('#fff', 0.1) } }}>
              View All
            </Button>
          </Stack>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : recentSales.length === 0 ? (
          <Box py={8} textAlign="center">
            <ShoppingBag sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">No sales yet</Typography>
            <Typography variant="body2" color="text.disabled" mb={2}>Create your first bill to get started</Typography>
            <Button variant="contained" startIcon={<POSIcon />} onClick={() => navigate('/sales')}>
              Create New Bill
            </Button>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: alpha(theme.palette.primary.main, 0.04), borderBottom: `2px solid ${theme.palette.divider}` }}>
                  {['Invoice #', 'Customer', 'Total', 'Status', 'Date'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: h === 'Total' || h === 'Date' ? 'right' : 'left',
                      fontSize: 12, fontWeight: 700, color: theme.palette.text.secondary,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale, i) => (
                  <tr key={sale._id}
                    onClick={() => navigate('/sales/history')}
                    style={{
                      borderBottom: i < recentSales.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                      background: i % 2 === 0 ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = alpha(theme.palette.primary.main, 0.05))}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : alpha(theme.palette.primary.main, 0.02))}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <Typography variant="body2" fontWeight={800} color={theme.palette.primary.main}
                        sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>
                        {sale.invoiceNumber}
                      </Typography>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <Typography variant="body2" fontWeight={600}>{sale.customerName}</Typography>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700}>{fmt(sale.grandTotal)}</Typography>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <PayBadge status={sale.paymentStatus} />
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(sale.invoiceDate).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        {!loading && recentSales.length > 0 && (
          <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/sales/history')}
              sx={{ fontWeight: 600, fontSize: 12 }}>
              View full sales history
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
