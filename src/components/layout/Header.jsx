/*
  Hensikt:
  Dette er topp-linja (header) i appen. Den viser navn/logo og hvilken oppgave
  brukeren er på akkurat nå.

  Eksterne ting:
  - Ingen tredjepartsbibliotek her; dette er bare en liten UI-komponent.

  Min kode vs bibliotek:
  - Oppsettet og teksten her er skrevet av meg.
  - Selve komponent-systemet (at props gir ny visning) er rammeverk.
*/

export default function Header({ currentStep, totalSteps }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo-circle">⚽</div>
        <div className="topbar-title">
          <div className="topbar-app-name">FootyGIS</div>
          <div className="topbar-subtitle">
            {/* Bevisst tom: jeg har valgt en ren toppbar uten ekstra undertittel */}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <span className="topbar-step-label">Pågående oppgave</span>
        <span className="topbar-step-value">
          {currentStep} / {totalSteps}
        </span>
      </div>
    </header>
  );
}
