import React from 'react';
import Paper from '@mui/material/Paper';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const SuppliersPage: React.FC = () => (
  <>
    <PageHeader
      title="Suppliers"
      subtitle="Manage suppliers and payment terms"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Suppliers' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<LocalShippingIcon />}
        title="Suppliers Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default SuppliersPage;
