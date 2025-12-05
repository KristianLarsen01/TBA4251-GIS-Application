// src/components/task/TaskModal.jsx
import Modal from "../ui/Modal.jsx";
import PrimaryButton from "../ui/PrimaryButton.jsx";

export default function TaskModal({
  task,
  index,
  total,
  onClose,
  onNext,
  onPrev,
}) {
  if (!task) return null;

  const footer = (
    <div className="task-modal-footer">
      <PrimaryButton variant="secondary" onClick={onPrev} disabled={index === 0}>
        Forrige oppgave
      </PrimaryButton>
      <span className="task-progress">
        Oppgave {index + 1} av {total}
      </span>
      <PrimaryButton
        variant="primary"
        onClick={onNext}
        disabled={index === total - 1}
      >
        {index === total - 1 ? "Avslutt" : "Neste oppgave"}
      </PrimaryButton>
    </div>
  );

  return (
    <Modal title={task.title} onClose={onClose} footer={footer}>
      <p className="task-goal">
        <strong>Mål:</strong> {task.goal}
      </p>
      {task.content.map((paragraph, i) => (
        <p key={i} className="task-paragraph">
          {paragraph}
        </p>
      ))}
    </Modal>
  );
}
