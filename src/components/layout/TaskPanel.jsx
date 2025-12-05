// src/components/layout/TaskPanel.jsx
import PrimaryButton from "../ui/PrimaryButton.jsx";

export default function TaskPanel({ task, index, total, onNext, onPrev }) {
  if (!task) return null;

  return (
    <aside className="task-panel">
      <div className="task-panel-header">
        <h2>Fotballbane-analysen</h2>
        <p className="task-panel-intro">
          En vennegjeng på ti personer vil spille fotball i Trondheim. Din
          oppgave er å finne den banen som er lettest å nå totalt sett – ved å
          kombinere gang, sykkel og kollektiv. Oppgavene til høyre leder deg
          gjennom analysen steg for steg.
        </p>
      </div>

      <div className="task-stepper">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            className={`task-stepper-dot ${
              i === index ? "task-stepper-dot-active" : ""
            }`}
            onClick={() => {
              if (i < total && i >= 0) {
                // lar deg hoppe mellom oppgaver
                onNext && i > index && onNext();
                onPrev && i < index && onPrev();
              }
            }}
            disabled
          />
        ))}
      </div>

      <div className="task-panel-content">
        <h3 className="task-panel-title">{task.title}</h3>
        <p className="task-panel-goal">
          <strong>Mål:</strong> {task.goal}
        </p>

        <div className="task-panel-body">
          {task.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="task-panel-footer">
        <PrimaryButton
          variant="secondary"
          onClick={onPrev}
          disabled={index === 0}
        >
          Forrige
        </PrimaryButton>
        <span className="task-panel-progress">
          Oppgave {index + 1} av {total}
        </span>
        <PrimaryButton
          variant="primary"
          onClick={onNext}
          disabled={index === total - 1}
        >
          {index === total - 1 ? "Ferdig" : "Neste"}
        </PrimaryButton>
      </div>
    </aside>
  );
}
