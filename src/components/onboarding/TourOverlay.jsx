import { useState } from "react";

export default function TourOverlay({ step, onNext, onSkip }) {
  const [isClosing, setIsClosing] = useState(false);

  let title = "";
  let body = [];

  switch (step) {
    case 2:
      title = "Kartet";
      body = [
        "Midt på siden har du selve kartet.",
        "Her vises Trondheim og alle datasett du laster inn.",
        "Panning og zoom fungerer som i andre webkart (dra og scroll).",
      ];
      break;
    case 3:
      title = "Verktøylinja";
      body = [
        "Til venstre har du verktøylinja.",
        "Her finner du blant annet Buffer, Intersect, Clip, Union og Difference.",
        "Disse verktøyene bruker du gjennom oppgavene når analysen skal gjennomføres.",
      ];
      break;
    case 4:
      title = "Lagpanelet";
      body = [
        "Øverst til høyre finner du Lag-panelet.",
        "Her kan du:",
        "• slå lag av og på",
        "• gi lagene mer forståelige navn",
        "• flytte lag opp og ned for å endre rekkefølge i kartet.",
      ];
      break;
    case 5:
      title = "Oppgavepanelet";
      body = [
        "Til høyre kan du åpne Oppgave-panelet.",
        "Det fungerer som en liten veileder som beskriver hvert steg i analysen.",
        "Du kan når som helst skjule det med Oppgave-knappen for å få mer kartplass.",
      ];
      break;
    case 6:
      title = "Klar til å starte analysen";
      body = [
        "Nå har du sett hvor de viktigste delene av applikasjonen ligger.",
        "Videre følger du oppgavene i veilederen for å gjennomføre analysen.",
        "",
        "Hvis du vil se denne omvisningen på nytt senere, kan du trykke på",
        "knappen «Omvisning» nederst i verktøylinja.",
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
