/*
  Hensikt:
  Denne fila styrer den lille “omvisningen” (touren) i appen.
  Den bestemmer hvilket steg brukeren er på, og hvilke deler av UI som skal
  fremheves (kart, verktøy, lagpanel, oppgavepanel).

  Eksterne ting (hvorfor og hvordan):
  - useState: lagrer hvilket steg jeg er på.
  - useEffect: kjører kode når steget endrer seg, slik at jeg kan åpne/lukke panelene automatisk.

  Min kode vs bibliotek:
  - Steg-logikken og highlight-flagga er skrevet av meg.
  - Hook-mekanismen (useState/useEffect) er rammeverk.
*/

import { useEffect, useState } from "react";

/**
 * Håndterer all logikk rundt tour/onboarding:
 * - hvilket steg jeg er på
 * - hvilke deler som skal highlightes
 * - hvilke paneler (lag/oppgave) som skal være åpne
 */
export function useTour({ setLayersOpen, setTasksOpen }) {
  // 0 = velkomst, 1 = layout, 2 = kart, 3 = verktøy,
  // 4 = lagpanel, 5 = oppgavepanel, 6 = avslutning, null = av
  const [tourStep, setTourStep] = useState(0);

  // Jeg åpner/lukker panelene automatisk så riktig del blir synlig.
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
    // Gå til neste steg, og stopp touren når jeg er ferdig.
    setTourStep((step) => {
      if (step === null) return null;
      if (step >= 6) return null;
      return step + 1;
    });
  };

  const skipTour = () => {
    // “Null” betyr: tour er av.
    setTourStep(null);
  };

  const startTour = () => {
    // Starter på kart-steget (jeg hopper over velkomst/layout når man restarter).
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
