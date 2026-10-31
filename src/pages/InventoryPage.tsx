import React from 'react';
import Paper from '@mui/material/Paper';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const InventoryPage: React.FC = () => (
  <>
    <PageHeader
      title="Inventory"
      subtitle="Stock management and movement history"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Inventory' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<WarehouseIcon />}
        title="Inventory Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default InventoryPage;
