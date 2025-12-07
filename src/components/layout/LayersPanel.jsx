// src/components/layout/LayersPanel.jsx
import { useLayers } from "../../context/LayersContext.jsx";

export default function LayersPanel({ onClose, highlight }) {
  const { layers, updateLayer, removeLayer, moveLayer } = useLayers();

  // Tomt panel
  if (!layers.length) {
    return (
      <div
        className={`layers-panel ${
          highlight ? "tour-highlight-layers" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="layers-header">
          <h3>Lag</h3>
          {onClose && (
            <button
              type="button"
              className="layers-close-btn"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
        <p className="layers-empty">Ingen lag lastet ennå.</p>
      </div>
    );
  }

  // Med lag
  return (
    <div
      className={`layers-panel ${
        highlight ? "tour-highlight-layers" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="layers-header">
        <h3>Lag</h3>
        <span className="layers-count">{layers.length}</span>
        {onClose && (
          <button
            type="button"
            className="layers-close-btn"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      <ul className="layers-list">
        {layers.map((layer, index) => (
          <li key={layer.id} className="layers-row">
            <input
              type="checkbox"
              checked={layer.visible !== false}
              onChange={(e) =>
                updateLayer(layer.id, { visible: e.target.checked })
              }
            />

            <input
              className="layers-name-input"
              value={layer.name}
              onChange={(e) =>
                updateLayer(layer.id, { name: e.target.value })
              }
            />

            <div className="layers-row-buttons">
              <button
                type="button"
                onClick={() => moveLayer(layer.id, "up")}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveLayer(layer.id, "down")}
                disabled={index === layers.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeLayer(layer.id)}
                title="Fjern lag"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
