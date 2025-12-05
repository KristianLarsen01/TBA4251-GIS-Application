// src/components/layout/Header.jsx

export default function Header({ currentStep, totalSteps }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo-circle">⚽</div>
        <div className="topbar-title">
          <div className="topbar-app-name">MyGIS – Fotballbaner</div>
          <div className="topbar-subtitle">
            Analyse av tilgjengelighet for en vennegjeng i Trondheim
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
