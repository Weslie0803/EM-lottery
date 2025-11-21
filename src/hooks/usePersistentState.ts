import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

export function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, [defaultValue, key]);

  const [value, setValue] = useState<T>(() => readValue());

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
