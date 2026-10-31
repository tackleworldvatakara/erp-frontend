import React from 'react';
import Paper from '@mui/material/Paper';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const ExpensesPage: React.FC = () => (
  <>
    <PageHeader
      title="Expenses"
      subtitle="Track and categorize business expenses"
      breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Expenses' }]}
    />
    <Paper sx={{ py: 4 }}>
      <EmptyState
        icon={<AccountBalanceWalletIcon />}
        title="Expenses Module Coming Soon"
        description="This module is coming soon. Full implementation in Phase 2."
      />
    </Paper>
  </>
);

export default ExpensesPage;
