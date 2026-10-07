import { useState, useCallback, useRef } from "react";

export function useHistoryState<T>(initialState: T | (() => T)) {
  const [present, setPresent] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<T>(present);

  // Push state to history stack
  const setWithHistory = useCallback((action: T | ((prev: T) => T), immediate: boolean = false) => {
    setPresent((prev) => {
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      if (next === prev) return prev;

      if (immediate) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (lastCommittedRef.current !== prev) {
          pastRef.current = [...pastRef.current.slice(-50), lastCommittedRef.current];
        }
        pastRef.current = [...pastRef.current.slice(-50), prev];
        futureRef.current = [];
        lastCommittedRef.current = next;
      } else {
        // Debounce continuous typing (400ms)
        if (!debounceTimerRef.current) {
          lastCommittedRef.current = prev;
        } else {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
          pastRef.current = [...pastRef.current.slice(-50), lastCommittedRef.current];
          futureRef.current = [];
          lastCommittedRef.current = next;
          debounceTimerRef.current = null;
        }, 400);
      }

      return next;
    });
  }, []);

  // Flush any pending debounce to history
  const flushHistory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      pastRef.current = [...pastRef.current.slice(-50), lastCommittedRef.current];
      futureRef.current = [];
      lastCommittedRef.current = present;
    }
  }, [present]);

  const undo = useCallback(() => {
    flushHistory();
    if (pastRef.current.length === 0) return;

    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [present, ...futureRef.current.slice(0, 50)];
    lastCommittedRef.current = previous;
    setPresent(previous);
  }, [flushHistory, present]);

  const redo = useCallback(() => {
    flushHistory();
    if (futureRef.current.length === 0) return;

    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(-50), present];
    lastCommittedRef.current = next;
    setPresent(next);
  }, [flushHistory, present]);

  const resetHistory = useCallback((newState: T) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pastRef.current = [];
    futureRef.current = [];
    lastCommittedRef.current = newState;
    setPresent(newState);
  }, []);

  return {
    state: present,
    setState: setWithHistory,
    undo,
    redo,
    resetHistory,
  };
}
