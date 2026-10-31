import React, { ReactNode } from 'react';
import { SnackbarProvider as NotistackProvider, useSnackbar, OptionsObject } from 'notistack';

interface AppSnackbarProviderProps {
  children: ReactNode;
}

export const AppSnackbarProvider: React.FC<AppSnackbarProviderProps> = ({ children }) => {
  return (
    <NotistackProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      autoHideDuration={4000}
    >
      {children}
    </NotistackProvider>
  );
};

export interface AppSnackbar {
  success: (message: string, options?: OptionsObject) => void;
  error: (message: string, options?: OptionsObject) => void;
  warning: (message: string, options?: OptionsObject) => void;
  info: (message: string, options?: OptionsObject) => void;
}

export function useAppSnackbar(): AppSnackbar {
  const { enqueueSnackbar } = useSnackbar();
  return {
    success: (message, opts) => enqueueSnackbar(message, { variant: 'success', ...opts }),
    error: (message, opts) => enqueueSnackbar(message, { variant: 'error', ...opts }),
    warning: (message, opts) => enqueueSnackbar(message, { variant: 'warning', ...opts }),
    info: (message, opts) => enqueueSnackbar(message, { variant: 'info', ...opts }),
  };
}

export default AppSnackbarProvider;
