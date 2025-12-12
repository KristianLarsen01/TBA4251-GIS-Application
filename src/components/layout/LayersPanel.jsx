// src/components/layout/LayersPanel.jsx
import { useState, useEffect, useRef } from "react";
import { useLayers } from "../../context/LayersContext.jsx";

export default function LayersPanel({ onClose, highlight }) {
  const { layers, updateLayer, removeLayer, moveLayer, toggleVisibility } = useLayers();
  const [localColors, setLocalColors] = useState({});
  const [localOpacity, setLocalOpacity] = useState({});
  const colorTimersRef = useRef({});
  const opacityTimersRef = useRef({});
  const [localNames, setLocalNames] = useState({});


  // Sync lokale verdier når layers endres
  useEffect(() => {
  setLocalColors((prev) => {
    const next = {};
    layers.forEach((l) => {
      next[l.id] = prev[l.id] ?? l.color ?? "#3388ff";
    });
    return next;
  });

  setLocalOpacity((prev) => {
    const next = {};
    layers.forEach((l) => {
      const fromLayer =
        typeof l.fillOpacity === "number" ? l.fillOpacity : 0.7;
      const prevVal = prev[l.id];
      next[l.id] =
        typeof prevVal === "number" ? prevVal : fromLayer;
    });
    return next;
  });

  // 🆕 sync navn
  setLocalNames((prev) => {
    const next = {};
    layers.forEach((l) => {
      next[l.id] = prev[l.id] ?? l.name ?? "";
    });
    return next;
  });
}, [layers]);


  const handleColorChange = (layerId, value) => {
    setLocalColors((prev) => ({ ...prev, [layerId]: value }));

    if (colorTimersRef.current[layerId]) {
      clearTimeout(colorTimersRef.current[layerId]);
    }

    colorTimersRef.current[layerId] = setTimeout(() => {
      updateLayer(layerId, { color: value });
    }, 120);
  };

  const handleOpacityChange = (layerId, value) => {
    const pct = Number(value);
    const clamped = Math.min(100, Math.max(0, pct));
    const normalized = clamped / 100;

    setLocalOpacity((prev) => ({ ...prev, [layerId]: normalized }));

    if (opacityTimersRef.current[layerId]) {
      clearTimeout(opacityTimersRef.current[layerId]);
    }

    opacityTimersRef.current[layerId] = setTimeout(() => {
      updateLayer(layerId, { fillOpacity: normalized });
    }, 120);
  };

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
            <button className="layers-close-btn" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <p className="layers-empty">Ingen lag lastet ennå.</p>
      </div>
    );
  }

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
          <button className="layers-close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="layers-column-header">
        <span className="layers-col-label layers-col-color">Farge</span>
        <span className="layers-col-label layers-col-visible">Synlig</span>
        <span className="layers-col-label layers-col-name">Navn</span>
        <span className="layers-col-label layers-col-opacity">Gjennomsiktighet</span>
        <span className="layers-col-label layers-col-actions">
          Rekkef./slett
        </span>
      </div>


      <ul className="layers-list">
        {layers.map((layer, index) => {
          const colorValue =
            localColors[layer.id] ?? layer.color ?? "#3388ff";
          const opacityValue = Math.round(
            100 *
              (localOpacity[layer.id] ??
                layer.fillOpacity ??
                0.7)
          );

          return (
            <li key={layer.id} className="layers-row">
              {/* Farge */}
              <input
                type="color"
                className="layers-color-input"
                value={colorValue}
                onChange={(e) =>
                  handleColorChange(layer.id, e.target.value)
                }
              />

              {/* Synlighet */}
              <button
                type="button"
                className={`layer-visibility-toggle ${
                  layer.visible === false ? "hidden" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation(); 
                  toggleVisibility(layer.id);
                }}
                title={layer.visible === false ? "Vis lag" : "Skjul lag"}
              >
                {layer.visible === false ? (
                  // SKJULT (ingen creepy øye)
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#888" strokeWidth="2" />
                    <path d="M4 20L20 4" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  // SYNLIG
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#444" strokeWidth="2" />
                  </svg>
                )}
              </button>



              {/* Navn */}
              <input
                className="layers-name-input"
                value={localNames[layer.id] ?? ""}
                onChange={(e) =>
                  setLocalNames((prev) => ({
                    ...prev,
                    [layer.id]: e.target.value,
                  }))
                }
                onBlur={(e) =>
                  updateLayer(layer.id, { name: e.target.value })
                }
              />

              {/* Opacity */}
              <div className="layers-opacity-wrapper">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={opacityValue}
                  onChange={(e) =>
                    handleOpacityChange(layer.id, e.target.value)
                  }
                  className="layers-opacity-input"
                />
                <span className="layers-opacity-percent">%</span>
              </div>

              {/* Knappene */}
              <div className="layers-row-buttons">
                <button
                  onClick={() => moveLayer(layer.id, "up")}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveLayer(layer.id, "down")}
                  disabled={index === layers.length - 1}
                >
                  ↓
                </button>
                <button
                  onClick={() => removeLayer(layer.id)}
                  title="Fjern lag"
                >
                  🗑
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
