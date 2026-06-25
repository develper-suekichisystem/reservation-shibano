import { createContext, useContext, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface LoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  showLoading: () => {},
  hideLoading: () => {},
  withLoading: async (fn) => fn(),
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const loading = count > 0;

  const showLoading = () => setCount(c => c + 1);
  const hideLoading = () => setCount(c => Math.max(0, c - 1));

  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    showLoading();
    try {
      return await fn();
    } finally {
      hideLoading();
    }
  }

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, withLoading }}>
      {children}
      {loading && <LoadingSpinner variant="overlay" />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
