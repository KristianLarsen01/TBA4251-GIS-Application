/*
  Hensikt:
  Denne fila holder styr på “hvilket tegneverktøy er aktivt nå?” (punkt/linje/polygon).
  Den fungerer som en liten global bryter, så både verktøylinja og kartet kan være enige.

  Eksterne biblioteker (hvorfor og hvordan):
  - React (rammeverket):
    - Context: en måte å dele tilstand “globalt” i komponenttreet, uten å sende props gjennom alt.
    - createContext/useContext: lager og leser den delte tilstanden.

  Min kode vs bibliotek:
  - Logikken rundt toggleTool/stopDrawing/sessionId er skrevet av meg.
  - Context/hook-mekanismen er bibliotek.
*/

import { createContext, useContext, useMemo, useState } from "react";

const DrawingContext = createContext(null);

// Jeg bruker en provider som deler “aktivt tegneverktøy” til resten av appen.
export function DrawingProvider({ children }) {
  const [activeTool, setActiveTool] = useState(null);
  const [sessionId, setSessionId] = useState(0);

  // Når brukeren trykker på samme verktøy igjen: slå det av.
  // Når brukeren bytter verktøy: slå på det nye.
  const toggleTool = (tool) => {
    setActiveTool((prev) => {
      const next = prev === tool ? null : tool;
      setSessionId((id) => id + 1);
      return next;
    });
  };

  // Praktisk “nødstopp” for tegning, brukt når man åpner paneler osv.
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
  // Jeg har en liten vakt som gir en tydelig feilmelding hvis provider mangler.
  const ctx = useContext(DrawingContext);
  if (!ctx) {
    throw new Error("useDrawing must be used inside a DrawingProvider");
  }
  return ctx;
}
