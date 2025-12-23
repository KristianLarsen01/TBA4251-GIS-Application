// src/components/layout/LayersPanel.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useLayers } from "../../context/LayersContext.jsx";

const TOUR_DEMO_LAYERS = [
  {
    id: "__tour_demo_layer_1__",
    name: "Demolag 1",
    color: "#22c55e",
    fillOpacity: 0.7,
    visible: true,
    __isTourDemo: true,
  },
  {
    id: "__tour_demo_layer_2__",
    name: "Demolag 2",
    color: "#3b82f6",
    fillOpacity: 0.55,
    visible: false,
    __isTourDemo: true,
  },
  {
    id: "__tour_demo_layer_3__",
    name: "Demolag 3",
    color: "#f59e0b",
    fillOpacity: 0.85,
    visible: true,
    __isTourDemo: true,
  },
];

export default function LayersPanel({
  onClose,
  highlight,
  tourStep,
  onEnterEditMode,
}) {
  const {
    layers,
    updateLayer,
    removeLayer,
    moveLayer,
    toggleVisibility,
    editableLayerId,
    setEditableLayerId,
  } = useLayers();

  const showTourDemoLayer = tourStep === 4;

  const displayLayers = useMemo(() => {
    if (showTourDemoLayer) return [...TOUR_DEMO_LAYERS, ...(layers || [])];
    return layers || [];
  }, [showTourDemoLayer, layers]);

  const [localColors, setLocalColors] = useState({});
  const [localOpacity, setLocalOpacity] = useState({});
  const [localNames, setLocalNames] = useState({});
  const colorTimersRef = useRef({});
  const opacityTimersRef = useRef({});

  // Demo “redigering” kun for UI
  const [demoEditableId, setDemoEditableId] = useState(null);

  useEffect(() => {
    setLocalColors((prev) => {
      const next = {};
      displayLayers.forEach((l) => {
        next[l.id] = prev[l.id] ?? l.color ?? "#3388ff";
      });
      return next;
    });

    setLocalOpacity((prev) => {
      const next = {};
      displayLayers.forEach((l) => {
        const fromLayer =
          typeof l.fillOpacity === "number" ? l.fillOpacity : 0.7;
        const prevVal = prev[l.id];
        next[l.id] = typeof prevVal === "number" ? prevVal : fromLayer;
      });
      return next;
    });

    setLocalNames((prev) => {
      const next = {};
      displayLayers.forEach((l) => {
        next[l.id] = prev[l.id] ?? l.name ?? "";
      });
      return next;
    });
  }, [displayLayers]);

  // Demo: lag 1 starter “låst” i intro
  useEffect(() => {
    if (showTourDemoLayer) setDemoEditableId("__tour_demo_layer_1__");
    else setDemoEditableId(null);
  }, [showTourDemoLayer]);

  const handleColorChange = (layerId, value, isDemo) => {
    setLocalColors((prev) => ({ ...prev, [layerId]: value }));
    if (isDemo) return;

    if (colorTimersRef.current[layerId]) clearTimeout(colorTimersRef.current[layerId]);
    colorTimersRef.current[layerId] = setTimeout(() => {
      updateLayer(layerId, { color: value });
    }, 120);
  };

  const handleOpacityChange = (layerId, value, isDemo) => {
    const pct = Number(value);
    const clamped = Math.min(100, Math.max(0, pct));
    const normalized = clamped / 100;

    setLocalOpacity((prev) => ({ ...prev, [layerId]: normalized }));
    if (isDemo) return;

    if (opacityTimersRef.current[layerId]) clearTimeout(opacityTimersRef.current[layerId]);
    opacityTimersRef.current[layerId] = setTimeout(() => {
      updateLayer(layerId, { fillOpacity: normalized });
    }, 120);
  };

  if (!displayLayers.length) {
    return (
      <div
        className={`layers-panel ${highlight ? "tour-highlight-layers" : ""}`}
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
      className={`layers-panel ${highlight ? "tour-highlight-layers" : ""}`}
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

      <ul className="layers-list">
        {displayLayers.map((layer, index) => {
          const isDemo = layer.__isTourDemo === true;

          const isTop = index === 0;
          const isBottom = index === displayLayers.length - 1;

          const upDisabled = isTop;
          const downDisabled = isBottom;

          const isDemoEditing = isDemo && demoEditableId === layer.id;
          const isRealEditing = !isDemo && editableLayerId === layer.id;
          const isEditing = isDemo ? isDemoEditing : isRealEditing;

          const colorValue = localColors[layer.id] ?? layer.color ?? "#3388ff";
          const opacityValue = Math.round(
            100 * (localOpacity[layer.id] ?? layer.fillOpacity ?? 0.7)
          );

          return (
            <li key={layer.id} className="layers-row">
              <input
                type="color"
                className="layers-color-input"
                value={colorValue}
                onChange={(e) => handleColorChange(layer.id, e.target.value, isDemo)}
              />

              <button
                type="button"
                className={`layer-visibility-toggle ${layer.visible === false ? "hidden" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDemo) return;
                  toggleVisibility(layer.id);
                }}
                title={layer.visible === false ? "Vis lag" : "Skjul lag"}
              >
                {layer.visible === false ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#888" strokeWidth="2" />
                    <path d="M4 20L20 4" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="#444" strokeWidth="2" />
                  </svg>
                )}
              </button>

              <input
                className="layers-name-input"
                value={localNames[layer.id] ?? ""}
                onChange={(e) =>
                  setLocalNames((prev) => ({ ...prev, [layer.id]: e.target.value }))
                }
                onBlur={(e) => {
                  if (isDemo) return;
                  updateLayer(layer.id, { name: e.target.value });
                }}
              />

              <div className="layers-opacity-wrapper">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={opacityValue}
                  onChange={(e) => handleOpacityChange(layer.id, e.target.value, isDemo)}
                  className="layers-opacity-input"
                />
                <span className="layers-opacity-percent">%</span>
              </div>

              <div className="layers-row-buttons">
                <button
                  onClick={() => {
                    if (upDisabled) return;
                    if (isDemo) return;
                    moveLayer(layer.id, "up");
                  }}
                  disabled={upDisabled}
                  title="Flytt opp"
                >
                  ↑
                </button>

                <button
                  onClick={() => {
                    if (downDisabled) return;
                    if (isDemo) return;
                    moveLayer(layer.id, "down");
                  }}
                  disabled={downDisabled}
                  title="Flytt ned"
                >
                  ↓
                </button>

                <button
                  type="button"
                  title={isEditing ? "Avslutt redigering" : "Rediger lag (klikk polygon for å slette)"}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (isDemo) {
                      setDemoEditableId((prev) => (prev === layer.id ? null : layer.id));
                      return;
                    }

                    const entering = editableLayerId !== layer.id;
                    if (entering) onEnterEditMode?.(); // ✅ lukk paneler før edit

                    setEditableLayerId(entering ? layer.id : null);
                  }}
                >
                  {isEditing ? "🔒" : "✏️"}
                </button>

                <button
                  onClick={() => {
                    if (isDemo) return;
                    removeLayer(layer.id);
                  }}
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
