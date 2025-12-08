import { createContext, useContext, useMemo, useState } from "react";

const DrawingContext = createContext(null);

/**
 * Holder valgt tegneverktøy (punkt, linje, polygon) og sørger for
 * en enkel toggle mellom dem.
 */
export function DrawingProvider({ children }) {
  const [activeTool, setActiveTool] = useState(null);
  const [sessionId, setSessionId] = useState(0);

  const toggleTool = (tool) => {
    setActiveTool((prev) => {
      const next = prev === tool ? null : tool;
      setSessionId((id) => id + 1);
      return next;
    });
  };

  const stopDrawing = () => {
    setActiveTool(null);
    setSessionId((id) => id + 1);
  };

  const value = useMemo(
    () => ({ activeTool, sessionId, toggleTool, stopDrawing }),
    [activeTool, sessionId]
  );

  return (
    <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>
  );
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) {
    throw new Error("useDrawing must be used inside a DrawingProvider");
  }
  return ctx;
}
