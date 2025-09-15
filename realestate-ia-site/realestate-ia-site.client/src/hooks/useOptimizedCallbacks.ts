import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook de debounce otimizado para performance
 * Evita re-renders desnecessários e melhora a responsividade
 */
export function useDebounce<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef<T>(callback);

  // Atualizar callback ref quando deps mudarem
  callbackRef.current = callback;

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]) as T;

  // Cleanup no unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Auto cleanup
  useEffect(() => cleanup, [cleanup]);

  return debouncedCallback;
}

/**
 * Hook de throttle para limitação de frequência
 */
export function useThrottle<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef<T>(callback);

  callbackRef.current = callback;

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall.current;

    if (timeSinceLastCall >= delay) {
      lastCall.current = now;
      callbackRef.current(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callbackRef.current(...args);
      }, delay - timeSinceLastCall);
    }
  }, [delay, ...deps]) as T;

  return throttledCallback;
}