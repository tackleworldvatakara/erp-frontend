export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FilterState {
  search?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

import type { ReactNode } from 'react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
  roles?: string[];
}
