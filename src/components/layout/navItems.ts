// Navigation items — icons imported and rendered in Sidebar.tsx
// This file exports typed nav item definitions without JSX.

export interface NavItemDef {
  id: string;
  label: string;
  path: string;
  iconName: string;
  roles?: string[];
}

export const navItemDefs: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', iconName: 'Dashboard' },
  { id: 'products', label: 'Products', path: '/products', iconName: 'Inventory' },
  { id: 'categories', label: 'Categories', path: '/categories', iconName: 'Category' },

  { id: 'sales', label: 'Billing', path: '/sales', iconName: 'PointOfSale' },
  { id: 'sales-history', label: 'Sales History', path: '/sales/history', iconName: 'Receipt' },
  { id: 'returns', label: 'Returns', path: '/returns', iconName: 'AssignmentReturn' },

  { id: 'reports', label: 'Reports', path: '/reports', iconName: 'BarChart' },
  {
    id: 'users',
    label: 'Users & Roles',
    path: '/users',
    iconName: 'ManageAccounts',
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    iconName: 'Settings',
    roles: ['admin', 'manager'],
  },
];
