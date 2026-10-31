import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders the correct label for a known status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders the correct label for "paid" status', () => {
    render(<StatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders the raw status string for an unknown status', () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText('custom_status')).toBeInTheDocument();
  });

  it('uses a custom statusMap when provided', () => {
    const customMap = {
      special: { label: 'Special Label', color: 'info' as const },
    };
    render(<StatusBadge status="special" statusMap={customMap} />);
    expect(screen.getByText('Special Label')).toBeInTheDocument();
  });
});
