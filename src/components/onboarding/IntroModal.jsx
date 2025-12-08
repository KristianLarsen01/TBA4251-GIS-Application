// src/components/onboarding/IntroModal.jsx

export default function IntroModal({ step, onNext, onSkip }) {
  const isWelcome = step === 0;

  return (
    <>
      {/* Dimming-lag – ingen onClick her på intro */}
      <div className="tour-backdrop" />

      {/* Selve dialogboksen */}
      <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="tour-title">
          {isWelcome
            ? "Velkommen til fotballbane-analysen"
            : "Slik er GIS-applikasjonen bygget opp"}
        </h2>

        {isWelcome ? (
          <>
            <p>
              Du skal nå bruke et lite GIS-program for å finne den
              fotballbanen i Trondheim som er lettest å nå for en
              vennegjeng på ti personer.
            </p>
            <p>
              Underveis går du gjennom en kort veileder med oppgaver,
              samtidig som du bruker verktøyene i kartet.
            </p>
            <p>
              Før vi starter selve analysen tar vi en rask omvisning på
              hvordan siden er bygget opp.
            </p>
          </>
        ) : (
          <>
            <p>
              Applikasjonen består av fire hoveddeler som du snart får
              se nærmere på:
            </p>
            <ul>
              <li>
                <strong>Kartet</strong> i midten viser alle datasett du
                jobber med.
              </li>
              <li>
                <strong>Verktøylinja</strong> til venstre har knapper
                for buffer, intersect, clip, union og difference.
              </li>
              <li>
                <strong>Lagpanelet</strong> lar deg slå lag av/på, endre
                navn og rekkefølge.
              </li>
              <li>
                <strong>Oppgavepanelet</strong> til høyre guider deg
                gjennom analysen steg for steg.
              </li>
            </ul>
            <p>Klikk Neste for å få en kort fokusvisning av hver del.</p>
          </>
        )}

        <div className="tour-footer">
          {/* Hopp over skal først vises etter introen */}
          {(step > 1 && step < 6) && (
            <button className="btn btn-secondary" onClick={onSkip}>
              Hopp over
            </button>
          )}

          <button className="btn btn-primary" onClick={onNext}>
            Neste
          </button>
        </div>
      </div>
    </>
  );
}
