"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

type TVModeContextType = {
  isTVMode: boolean;
  toggleTVMode: () => void;
  currentStreamIndex: number;
  streamCount: number;
  setStreamCount: (n: number) => void;
};

const TVModeContext = createContext<TVModeContextType>({
  isTVMode: false,
  toggleTVMode: () => {},
  currentStreamIndex: 0,
  streamCount: 0,
  setStreamCount: () => {},
});

export function TVModeProvider({ children }: { children: ReactNode }) {
  const [isTVMode, setIsTVMode] = useState(false);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const cycleRef = useRef<NodeJS.Timeout | null>(null);

  const toggleTVMode = useCallback(() => {
    if (!isTVMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsTVMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsTVMode(false);
    }
  }, [isTVMode]);

  // Sync with fullscreen exit via Escape
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsTVMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-cycle streams in TV mode
  useEffect(() => {
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (isTVMode && streamCount > 1) {
      cycleRef.current = setInterval(() => {
        setCurrentStreamIndex((prev) => (prev + 1) % streamCount);
      }, 15_000);
    } else {
      setCurrentStreamIndex(0);
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [isTVMode, streamCount]);

  return (
    <TVModeContext.Provider value={{ isTVMode, toggleTVMode, currentStreamIndex, streamCount, setStreamCount }}>
      {children}
    </TVModeContext.Provider>
  );
}

export const useTVMode = () => useContext(TVModeContext);
