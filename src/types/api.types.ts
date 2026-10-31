export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string; errors?: unknown[] };

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}>;

export interface ApiError {
  message: string;
  errors?: unknown[];
  statusCode?: number;
}
