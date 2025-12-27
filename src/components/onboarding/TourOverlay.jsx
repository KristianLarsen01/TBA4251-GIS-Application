/*
  Hensikt:
  Dette er “omvisningskortet” (tour overlay) som dukker opp og forklarer UI-et steg for steg.
  Den viser tekst for steg 2–6, og lar brukeren gå videre eller avslutte.

  Eksterne ting:
  - Jeg bruker useState for å trigge en liten lukk-animasjon før jeg faktisk lukker.

  Min kode vs bibliotek:
  - Tekstinnhold, step-switch og animasjons-timing er skrevet av meg.
  - useState og oppdatering av UI er rammeverk.
*/

import { useState } from "react";

export default function TourOverlay({ step, onNext, onSkip }) {
  const [isClosing, setIsClosing] = useState(false);

  let title = "";
  let body = [];

  switch (step) {
    // Jeg har gjort det slik at hvert case er ett “kapittel” i omvisningen.
    case 2:
      title = "Kartet";
      body = [
        "Midt på siden har du selve kartet.",
        "Her vises Trondheim og alle datasett du laster inn.",
        "Panning og zoom fungerer som i andre webkart (dra og scroll).",
        "Nederst til høyre kan du endre bakgrunnskartet til det som passer deg best under de forskjellige oppgavene.",
      ];
      break;
    case 3:
      title = "Verktøylinja";
      body = [
        "Til venstre har du verktøylinja.",
        "Her finner du tre tegneverktøy samt verktøy for å laste opp data og utføre analyser.",
        "Disse verktøyene bruker du gjennom oppgavene når analysen skal gjennomføres.",
        "Nederst har du en knapp for å starte omvisningen på nytt når som helst.",

      ];
      break;
    case 4:
      title = "Lagpanelet";
      body = [
        "Øverst til høyre finner du Lag-panelet.",
        "Her kan du:",
        "• endre farge",
        "• slå lag av og på",
        "• gi lagene nye navn",
        "• endre gjennomsiktighet",
        "• flytte lag opp og ned for å endre rekkefølge i kartet.",
        "• redigere lagene (f.eks. slette noen polygoner i et polygonlag).",
        "• slette laget helt.",
      ];
      break;
    case 5:
      title = "Oppgavepanelet";
      body = [
        "Til høyre kan du åpne Oppgave-panelet.",
        "Det fungerer som en liten veileder som beskriver hvert steg i analysen.",
        "Du kan når som helst skjule det med oppgave-knappen for å få mer kartplass.",
      ];
      break;
    case 6:
      title = "Klar til å starte analysen";
      body = [
        "Nå har du sett hvor de viktigste delene av applikasjonen ligger.",
        "Videre følger du oppgavene i veilederen for å gjennomføre analysen.",
        "",
        "Hvis du vil se denne omvisningen på nytt senere, kan du trykke på knappen «Omvisning» nederst i verktøylinja.",
      ];
      break;
    default:
      return null;
  }

  // Felles lukkefunksjon – animasjon på ALLE steg
  const closeWithAnimation = () => {
    if (isClosing) return; // unngå dobbel trigger
    setIsClosing(true);

    setTimeout(() => {
      onSkip();
    }, 800); // samme som CSS-duration
  };

  const handlePrimaryClick = () => {
    if (step === 6) {
      // "Start analysen" → avslutt tour med animasjon
      closeWithAnimation();
    } else {
      // "Neste" → bare gå videre
      onNext();
    }
  };

  const handleBackdropClick = () => {
    // Klikk utenfor → samme som "Hopp over"
    closeWithAnimation();
  };

  return (
    <>
      {/* Dimming-lag */}
      <div className="tour-backdrop" onClick={handleBackdropClick} />

      {/* Dialogboksen */}
      <div
        className={
          "tour-card" + (isClosing ? " tour-card-closing" : "")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="tour-title">{title}</h2>
        {body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}

        <div className="tour-footer">
          {step !== 6 && (
            <button
              className="btn btn-secondary"
              onClick={closeWithAnimation}
            >
              Hopp over
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handlePrimaryClick}
          >
            {step === 6 ? "Avslutt gjennomgang" : "Neste"}
          </button>
        </div>
      </div>
    </>
  );
}
