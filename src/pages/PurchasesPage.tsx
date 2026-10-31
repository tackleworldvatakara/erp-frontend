import React from 'react';
import Paper from '@mui/material/Paper';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const PurchasesPage: React.FC = () => (
  <>
    <PageHeader
      title="Purchases"
      subtitle="Manage purchase orders and supplier receipts"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Purchases' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<ShoppingCartIcon />}
        title="Purchases Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default PurchasesPage;
