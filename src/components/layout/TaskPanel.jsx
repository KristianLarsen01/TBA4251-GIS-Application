/*
  Hensikt:
  Dette er oppgavepanelet til høyre. Det viser én oppgave om gangen, med tekst,
  lenker og bilder. Brukeren kan bla Forrige/Neste.

  Endring:
  - Panelet er ment å ha fast høyde via CSS.
  - Innholdsdelen får en wrapper som kan scrolle, slik at footer aldri flytter seg.
*/

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
      className={`task-panel task-panel--fixed ${highlight ? "tour-highlight-tasks" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="task-panel-header-row">
        <div>
          <p className="task-panel-progress-label"></p>
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

      {/* ✅ Scroll-container: resten av panelet er layoutet så footer er stabil */}
      <div className="task-panel-scroll">
        <div className="task-panel-content">
          <h3 className="task-panel-title">{task.title}</h3>

          {task.goal && (
            <p className="task-panel-goal">
              <strong>Mål:</strong> {task.goal}
            </p>
          )}

          <div className="task-panel-body">
            {task.content?.map((item, i) => {
              if (typeof item === "string") return <p key={i}>{item}</p>;

              if (item?.type === "link") {
                return (
                  <p key={i}>
                    {item.prefix}{" "}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-panel-link"
                    >
                      {item.text}
                    </a>
                    .
                  </p>
                );
              }

              if (item?.type === "image") {
                return (
                  <figure key={i} className="task-panel-image-wrapper">
                    <img
                      src={item.src}
                      alt={item.alt || ""}
                      className="task-panel-image"
                    />
                    {item.caption && (
                      <figcaption className="task-panel-image-caption">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>

      <div className="task-panel-footer">
        <PrimaryButton variant="secondary" onClick={onPrev} disabled={index === 0}>
          Forrige
        </PrimaryButton>

        <span className="task-panel-progress">
          Oppgave {index + 1} / {total}
        </span>

        <PrimaryButton
          variant="primary"
          onClick={() => {
            if (index === total - 1) {
              onClose?.();
              return;
            }
            onNext();
          }}
        >
          {index === total - 1 ? "Ferdig" : "Neste"}
        </PrimaryButton>
      </div>
    </aside>
  );
}
