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
            ? "Velkommen til FootyGIS!"
            : "Slik er GIS-applikasjonen bygget opp"}
        </h2>

        {isWelcome ? (
          <>
            <p>
              Du har nettopp kommet inn på drømmestudiet ved NTNU og skal finne en leilighet til leie.
              På Finn.no fant du 100 leiligheter som skal leies ut,
              og du er ekstra interessert i 10 av dem. 
              Din store interesse for å spille fotball 
              gjør at du ønsker å finne den beste beliggenheten med tanke på fotballbaner.
            </p>
            <p>
              Underveis går du gjennom en kort veileder med oppgaver,
              samtidig som du bruker verktøyene i kartet.
            </p>
            <p>
              Før vi starter selve analysen tar vi en rask omvisning på
              hvordan siden er bygget opp.
            </p>
            <p>
              Applikasjonen er laget og testet med Google Chrome, og jeg vil derfor anbefale å bruke denne nettleseren. 
              Den fungerer best på større PC-skjermer. På mindre skjermer kan panelene havne over hverandre.
            </p>
             <p>
              <strong>OBS: Siden lagres ikke, den resettes ved refresh.</strong> 
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
                for å tegne i kartet, laste opp data og utføre analyser.
              </li>
              <li>
                <strong>Lagpanelet</strong> lar deg endre innstillinger og redigere de forskjellige lagene.
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
