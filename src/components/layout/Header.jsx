// src/components/layout/Header.jsx

export default function Header({ currentStep, totalSteps }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo-circle">⚽</div>
        <div className="topbar-title">
          <div className="topbar-app-name">FootyGIS</div>
          <div className="topbar-subtitle">

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
