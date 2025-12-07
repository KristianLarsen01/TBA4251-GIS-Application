// src/components/layout/TaskPanel.jsx
import PrimaryButton from "../ui/PrimaryButton.jsx";

export default function TaskPanel({
  task,
  index,
  total,
  onNext,
  onPrev,
  onClose,
  highlight,
}) {
  if (!task) return null;

  return (
    <aside
      className={`task-panel ${
        highlight ? "tour-highlight-tasks" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="task-panel-header-row">
        <div>

          <p className="task-panel-progress-label">

          </p>
        </div>

        {onClose && (
          <button
            type="button"
            className="task-panel-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <div className="task-panel-content">
        <h3 className="task-panel-title">{task.title}</h3>

        {task.goal && (
          <p className="task-panel-goal">
            <strong>Mål:</strong> {task.goal}
          </p>
        )}

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
          Oppgave {index + 1} / {total}
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
