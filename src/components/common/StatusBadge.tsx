import React from 'react';
import Chip, { ChipProps } from '@mui/material/Chip';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
}

const defaultStatusMap: Record<string, StatusConfig> = {
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Inactive', color: 'default' },
  archived: { label: 'Archived', color: 'error' },
  draft: { label: 'Draft', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  returned: { label: 'Returned', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  unpaid: { label: 'Unpaid', color: 'error' },
  partial: { label: 'Partial', color: 'warning' },
  ordered: { label: 'Ordered', color: 'info' },
  received: { label: 'Received', color: 'success' },
  partially_received: { label: 'Partial', color: 'warning' },
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  completed: { label: 'Completed', color: 'success' },
};

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, StatusConfig>;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusMap }) => {
  const map = { ...defaultStatusMap, ...(statusMap ?? {}) };
  const config = map[status] ?? { label: status, color: 'default' as const };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="filled"
    />
  );
};

export default StatusBadge;
