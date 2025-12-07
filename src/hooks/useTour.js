// src/hooks/useTour.js
import { useEffect, useState } from "react";

/**
 * Håndterer all logikk rundt tour/onboarding:
 * - hvilket steg vi er på
 * - hvilke deler som skal highlightes
 * - hvilke paneler (lag/oppgave) som skal være åpne
 */
export function useTour({ setLayersOpen, setTasksOpen }) {
  // 0 = velkomst, 1 = layout, 2 = kart, 3 = verktøy,
  // 4 = lagpanel, 5 = oppgavepanel, 6 = avslutning, null = av
  const [tourStep, setTourStep] = useState(0);

  // Åpne/lukk paneler avhengig av steg i touren
  useEffect(() => {
    if (tourStep === null) {
      setLayersOpen(false);
      setTasksOpen(true);
      return;
    }

    if (tourStep < 4) {
      setLayersOpen(false);
      setTasksOpen(false);
    } else if (tourStep === 4) {
      setLayersOpen(true);
      setTasksOpen(false);
    } else if (tourStep === 5) {
      setLayersOpen(false);
      setTasksOpen(true);
    } else if (tourStep === 6) {
      setLayersOpen(false);
      setTasksOpen(false);
    }
  }, [tourStep, setLayersOpen, setTasksOpen]);

  const advanceTour = () => {
    setTourStep((step) => {
      if (step === null) return null;
      if (step >= 6) return null;
      return step + 1;
    });
  };

  const skipTour = () => {
    setTourStep(null);
  };

  const startTour = () => {
    setTourStep(2);
  };

  const tourActive = tourStep !== null;

  // === highlight-flagg ===
  const highlightMap = tourStep === 2;
  const highlightTools = tourStep === 3;
  const highlightLayers = tourStep === 4;
  const highlightTasks = tourStep === 5;

  return {
    tourStep,
    tourActive,
    highlightMap,
    highlightTools,
    highlightLayers,
    highlightTasks,
    advanceTour,
    skipTour,
    startTour,
  };
}
