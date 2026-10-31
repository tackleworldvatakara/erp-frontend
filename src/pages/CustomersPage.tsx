import React from 'react';
import Paper from '@mui/material/Paper';
import PeopleIcon from '@mui/icons-material/People';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const CustomersPage: React.FC = () => (
  <>
    <PageHeader
      title="Customers"
      subtitle="Manage your customer database and balances"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Customers' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<PeopleIcon />}
        title="Customers Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default CustomersPage;
