import { createContext, useContext } from 'react';

interface ColorModeContextValue {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  toggleColorMode: () => {},
  mode: 'light',
});

export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}
