"use client";

import { useState, useCallback } from "react";

// Hook for handling async actions with loading/error state and double-click protection.
// Usage:
//   const { run, loading, error } = useAsyncAction();
//   <button disabled={loading} onClick={() => run(() => api.doSomething())} />
export function useAsyncAction<T = void>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<T>): Promise<T | undefined> => {
    if (loading) return; // Prevent double-click
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      return result;
    } catch (err: any) {
      setError(err?.message || "Что-то пошло не так");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { run, loading, error, clearError: () => setError(null) };
}
