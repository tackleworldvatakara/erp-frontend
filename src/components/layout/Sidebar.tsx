import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuthStore } from '../../store/authStore';
// Single source of truth for nav items — no local copy
import { navItemDefs } from './navItems';

export const DRAWER_WIDTH = 260;
export const COLLAPSED_WIDTH = 72;

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <DashboardIcon />,
  Inventory: <InventoryIcon />,
  Warehouse: <WarehouseIcon />,
  PointOfSale: <PointOfSaleIcon />,
  Receipt: <ReceiptIcon />,
  People: <PeopleIcon />,
  ShoppingCart: <ShoppingCartIcon />,
  LocalShipping: <LocalShippingIcon />,
  AssignmentReturn: <AssignmentReturnIcon />,
  AccountBalanceWallet: <AccountBalanceWalletIcon />,
  BarChart: <BarChartIcon />,
  ManageAccounts: <ManageAccountsIcon />,
  Settings: <SettingsIcon />,
  Category: <CategoryIcon />,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
  /** Controlled collapse state — owned by AppShell on desktop */
  collapsed: boolean;
  /** Called when the collapse toggle button is clicked */
  onCollapsedChange: (next: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  variant = 'permanent',
  collapsed,
  onCollapsedChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const appName = import.meta.env.VITE_APP_NAME || import.meta.env.VITE_SHOP_NAME || 'Industrial ERP';

  // In temporary (mobile) mode the drawer is always full-width and never collapsed
  const effectiveCollapsed = variant === 'temporary' ? false : collapsed;
  const width = effectiveCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  const visibleItems = navItemDefs.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleNavClick = (path: string) => {
    navigate(path);
    if (variant === 'temporary') onClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'primary.main',
        color: 'white',
        width,
        transition: 'width 0.2s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          px: effectiveCollapsed ? 1 : 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {!effectiveCollapsed && (
          <Typography
            variant="body2"
            fontWeight={700}
            noWrap
            sx={{ color: 'white', fontSize: '0.78rem', lineHeight: 1.3, flex: 1, minWidth: 0 }}
          >
            {appName}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={() => onCollapsedChange(!collapsed)}
          sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white' } }}
        >
          {effectiveCollapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* Nav items */}
      <List sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;

          const button = (
            <ListItemButton
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              selected={isActive}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 1.5,
                minHeight: 44,
                px: effectiveCollapsed ? 1 : 1.5,
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                color: 'rgba(255,255,255,0.8)',
                '& .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.8)' },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: effectiveCollapsed ? 0 : 36,
                  mr: effectiveCollapsed ? 0 : 1.5,
                }}
              >
                {iconMap[item.iconName]}
              </ListItemIcon>
              {!effectiveCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              )}
            </ListItemButton>
          );

          return effectiveCollapsed ? (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <span>{button}</span>
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* User section */}
      <Box sx={{ p: effectiveCollapsed ? 1 : 2 }}>
        {effectiveCollapsed ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Avatar
              sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.8rem' }}
            >
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </Avatar>
            <Tooltip title="Logout" placement="right">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{ color: 'rgba(255,255,255,0.8)' }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{ color: 'white' }}
                >
                  {user?.name ?? 'User'}
                </Typography>
                <Chip
                  label={user?.role ?? ''}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                />
              </Box>
            </Stack>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                px: 1,
                color: 'rgba(255,255,255,0.8)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontSize: '0.8rem' }}
              />
            </ListItemButton>
          </Stack>
        )}
      </Box>
    </Box>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 0.2s ease',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          border: 'none',
          transition: 'width 0.2s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
