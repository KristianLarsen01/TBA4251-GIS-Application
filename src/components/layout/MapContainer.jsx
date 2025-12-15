// src/components/layout/MapContainer.jsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useLayers } from "../../context/LayersContext.jsx";
import { useDrawing } from "../../context/DrawingContext.jsx";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const BASEMAPS = [
  {
    id: "streets",
    name: "Mapbox Streets",
    label: "Standard",
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
  {
    id: "navday",
    name: "Mapbox Navigation Day",
    label: "Navigasjon",
    url: `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
  {
    id: "outdoors",
    name: "Mapbox Outdoors",
    label: "Turkart",
    url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
  {
    id: "light",
    name: "Mapbox Light",
    label: "Lyst",
    url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
  {
    id: "dark",
    name: "Mapbox Dark",
    label: "Mørkt",
    url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
  {
    id: "satellite",
    name: "Satellitt",
    label: "Satellitt",
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
    maxZoom: 19,
  },
];


export default function MapContainer() {
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const dataLayerGroupRef = useRef(null);
  const baseLayerRef = useRef(null);

  const sketchLayerRef = useRef(null);
  const verticesLayerRef = useRef(null);
  const drawingPointsRef = useRef([]);
  const activeToolRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [drawStatus, setDrawStatus] = useState("");

  const createdLayerNamesRef = useRef(new Set());
  const basemapSwitcherRef = useRef(null);

  const { layers, addLayer, editableLayerId, removeFeatures } = useLayers();
  const { activeTool, sessionId, stopDrawing } = useDrawing();

  // Nytt: aktivt bakgrunnskart + om menyen er åpen
  const [activeBasemapId, setActiveBasemapId] = useState(BASEMAPS[0].id);
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false);

  // 🆕 Multi-select sletting i aktivt edit-lag
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]); // array av ids

  useEffect(() => {
    setSelectedFeatureIds([]);
  }, [editableLayerId]);

  useEffect(() => {
  const shouldHandle =
    editableLayerId && !activeToolRef.current && !activeTool && selectedFeatureIds.length > 0;

  if (!shouldHandle) return;

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setSelectedFeatureIds([]);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      removeFeatures(editableLayerId, selectedFeatureIds);
      setSelectedFeatureIds([]);
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [editableLayerId, activeTool, selectedFeatureIds, removeFeatures]);

  /* -------------------------------------------------------
     Init kart (uten bakgrunnskart – det styres i egen effekt)
  -------------------------------------------------------- */
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [63.4305, 10.3951],
      zoom: 12,
      zoomControl: true,
    });

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    dataLayerGroupRef.current = group;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      dataLayerGroupRef.current = null;
    };
  }, []);

    // Lukk basemap-meny hvis man klikker utenfor
  useEffect(() => {
    if (!basemapMenuOpen) return;

    const handleClickOutside = (event) => {
      if (!basemapSwitcherRef.current) return;
      if (!basemapSwitcherRef.current.contains(event.target)) {
        setBasemapMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [basemapMenuOpen]);


  /* -------------------------------------------------------
     Bakgrunnskart: bytt når activeBasemapId endres
  -------------------------------------------------------- */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const bm =
      BASEMAPS.find((b) => b.id === activeBasemapId) || BASEMAPS[0];

    // Fjern forrige bakgrunnskart
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }

    // Legg til valgt bakgrunnskart
    const base = L.tileLayer(bm.url, {
      maxZoom: bm.maxZoom ?? 19,
      attribution: bm.attribution,
    }).addTo(map);

    baseLayerRef.current = base;
  }, [mapReady, activeBasemapId]);

  /* -------------------------------------------------------
     Tegn alle datalag (GeoJSON) oppå bakgrunnskartet
  -------------------------------------------------------- */
  useEffect(() => {
    const map = mapRef.current;
    const group = dataLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    layers
      .filter((l) => l.visible !== false)
      .forEach((layer) => {
        const color = layer.color || "#2563eb";
        const nameLower = (layer.name || "").toLowerCase();
        const isBuffer = nameLower.includes("_buffer_");

        const geoJsonLayer = L.geoJSON(layer.data, {
          style: (feature) => {
            const geomType = feature?.geometry?.type || "";
            const isPolygonGeom = geomType.includes("Polygon");
            const isLineGeom = geomType.includes("LineString");

            const fid = feature?.properties?.id ?? feature?.properties?.__fid;
            const isSelected = selectedFeatureIds.includes(fid);
            const isEditable = editableLayerId === layer.id && !activeToolRef.current;

            const defaultFill = isBuffer ? 0.3 : 1.0;
            const fillOpacity =
              typeof layer.fillOpacity === "number"
                ? layer.fillOpacity
                : defaultFill;

            if (isPolygonGeom) {
              return {
                color,
                weight: isSelected ? 4 : isEditable ? 2.2 : isBuffer ? 1.5 : 1.2,
                fillColor: color,
                fillOpacity,
              };
            }

            if (isLineGeom) {
              return {
                color,
                weight: isSelected ? 6 : 3,
                fillOpacity: 0,
              };
            }

            return {
              color,
              weight: 2,
            };
          },

          pointToLayer: (feature, latlng) => {
            const defaultFill = isBuffer ? 0.4 : 1.0;
            const fillOpacity =
              typeof layer.fillOpacity === "number"
                ? layer.fillOpacity
                : defaultFill;

            const fid = feature?.properties?.id ?? feature?.properties?.__fid;
            const isSelected = selectedFeatureIds.includes(fid);
            const isEditable = editableLayerId === layer.id && !activeToolRef.current;

            return L.circleMarker(latlng, {
              radius: isSelected ? 9 : isBuffer ? 7 : 6,
              color,
              fillColor: color,
              weight: isSelected ? 3 : isEditable ? 2.2 : 1.5,
              fillOpacity,
            });
          },

          onEachFeature: (feature, leafletLayer) => {
            const isEditable = editableLayerId === layer.id && !activeToolRef.current;
            if (!isEditable) return;

            leafletLayer.on("click", () => {
              const fid = feature?.properties?.id ?? feature?.properties?.__fid;
              if (!fid) return;

              setSelectedFeatureIds((prev) =>
                prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid]
              );
            });
          },

        });

        // ✅ VIKTIG: addTo må være her inne
        geoJsonLayer.addTo(group);
      });
    }, [layers, editableLayerId, selectedFeatureIds, removeFeatures]);




  /* -------------------------------------------------------
     Tegneverktøy – lytte på klikk/dobbelklikk/tastatur
  -------------------------------------------------------- */
  useEffect(() => {
    activeToolRef.current = activeTool;
    const map = mapRef.current;
    if (!map) return;

    if (activeTool) {
      map.doubleClickZoom.disable();
      createdLayerNamesRef.current = new Set(
        layers
          .map((l) => l.name)
          .filter(Boolean)
          .map((n) => n.toLowerCase())
      );
    } else {
      map.doubleClickZoom.enable();
    }

    clearSketch();
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    setDrawStatus("");
  }, [activeTool, sessionId, layers]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      const tool = activeToolRef.current;
      if (!tool) return;

      if (tool === "point") {
        pushPoint(e.latlng);
        return;
      }

      const pts = drawingPointsRef.current;
      if (tool === "polygon" && pts.length >= 3) {
        const first = pts[0];
        const dist = map.distance(first, e.latlng);
        if (dist < 10) {
          finishDrawing();
          return;
        }
      }

      pushPoint(e.latlng);
    };

    const handleDblClick = () => {
      const tool = activeToolRef.current;
      if (tool === "line" || tool === "polygon") {
        finishDrawing();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearSketch();
        drawingPointsRef.current = [];
        setDrawingPoints([]);
        setDrawStatus("");
        stopDrawing();
      }

      if (event.key === "Enter") {
        const tool = activeToolRef.current;
        if (tool === "line" || tool === "polygon" || tool === "point") {
          event.preventDefault();
          finishDrawing();
        }
      }
    };

    map.on("click", handleClick);
    map.on("dblclick", handleDblClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      map.off("click", handleClick);
      map.off("dblclick", handleDblClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mapReady, stopDrawing]);

  /* -------------------------------------------------------
     Tegnehjelpere
  -------------------------------------------------------- */

  const pushPoint = (latlng) => {
    drawingPointsRef.current = [...drawingPointsRef.current, latlng];
    setDrawingPoints(drawingPointsRef.current);
    setDrawStatus("");
    drawSketch();
  };

  const clearSketch = () => {
    const map = mapRef.current;
    if (!map) return;

    if (sketchLayerRef.current) {
      sketchLayerRef.current.remove();
      sketchLayerRef.current = null;
    }

    if (verticesLayerRef.current) {
      verticesLayerRef.current.remove();
      verticesLayerRef.current = null;
    }
  };

  const drawSketch = () => {
    const map = mapRef.current;
    if (!map) return;

    const points = drawingPointsRef.current;
    if (!points.length) {
      clearSketch();
      return;
    }

    const tool = activeToolRef.current;
    if (!tool) return;

    if (!verticesLayerRef.current) {
      verticesLayerRef.current = L.layerGroup().addTo(map);
    }

    verticesLayerRef.current.clearLayers();
    points.forEach((p) =>
      L.circleMarker(p, {
        radius: 5,
        color: "#f59e0b",
        weight: 2,
        fillColor: "#fef3c7",
        fillOpacity: 0.9,
      }).addTo(verticesLayerRef.current)
    );

    // ✅ Punkt-verktøy: IKKE tegn linje/polygon mellom punktene   
    if (tool === "point") {
      if (sketchLayerRef.current) {
        sketchLayerRef.current.remove();
        sketchLayerRef.current = null;
      }
      return;
    }

    const baseStyle = {
      color: "#f59e0b",
      weight: 2,
      dashArray: "6 6",
      fillOpacity: tool === "polygon" ? 0.08 : 0,
      fillColor: "#f59e0b",
    };

    if (sketchLayerRef.current) {
      if (tool === "polygon") {
        sketchLayerRef.current.setLatLngs([points]);
      } else {
        sketchLayerRef.current.setLatLngs(points);
      }
    } else {
      sketchLayerRef.current =
        tool === "polygon"
          ? L.polygon(points, baseStyle)
          : L.polyline(points, baseStyle);
      sketchLayerRef.current.addTo(map);
    }
  };

  const finishDrawing = () => {
    const tool = activeToolRef.current;
    if (!tool) return;

    const points = drawingPointsRef.current;

    if (tool === "point") {
      if (points.length < 1) {
        setDrawStatus("Du må plassere minst ett punkt.");
        return;
      }
    }

    if (tool === "line" && points.length < 2) {
      setDrawStatus("Linje trenger minst to punkter.");
      return;
    }

    if (tool === "polygon" && points.length < 3) {
      setDrawStatus("Polygon trenger minst tre punkter.");
      return;
    }

    createLayerFromPoints(points, tool);
  };

  const buildUniqueName = (base) => {
    let candidate = base;
    let idx = 1;
    while (createdLayerNamesRef.current.has(candidate.toLowerCase())) {
      candidate = `${base}${idx}`;
      idx += 1;
    }
    createdLayerNamesRef.current.add(candidate.toLowerCase());
    return candidate;
  };

  const createLayerFromPoints = (points, tool) => {
    if (!points.length) return;

    const coords = points.map(({ lat, lng }) => [lng, lat]);

    let geometry;
    let baseName;

    if (tool === "point") {
      geometry = {
        type: "MultiPoint",
        coordinates: coords,
      };
      baseName = "Punkter";
    } else if (tool === "line") {
      geometry = { type: "LineString", coordinates: coords };
      baseName = "Linje";
    } else {
      geometry = {
        type: "Polygon",
        coordinates: [[...coords, coords[0]]],
      };
      baseName = "Polygon";
    }

    const name = buildUniqueName(baseName);

    addLayer({
      id: `draw-${tool}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
      name,
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry,
          },
        ],
      },
    });

    clearSketch();
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    setDrawStatus("");
    stopDrawing();
  };

  const helperText = {
    point:
      "Klikk i kartet for å plassere punkter. Alle punkter i denne sesjonen havner i samme lag.",
    line: "Klikk for å legge til punkter. Dobbeltklikk eller Enter for å fullføre linjen.",
    polygon:
      "Klikk for å tegne polygon. Klikk på startpunktet, dobbeltklikk eller Enter for å lukke.",
  };

  const activeBasemap =
    BASEMAPS.find((b) => b.id === activeBasemapId) || BASEMAPS[0];

  return (
    <div className="map-container">
      <div
        ref={mapElRef}
        className={`leaflet-map-root ${activeTool ? "drawing-cursor" : ""}`}
      />

      {/* 🆕 Edit-slett HUD (app-stil) */}
      {editableLayerId && selectedFeatureIds.length > 0 && !activeTool && (
        <div className="draw-hud" onClick={(e) => e.stopPropagation()}>
          <div className="draw-hud-header">
            <div className="draw-hud-title">
              <span role="img" aria-hidden>🗑️</span>
              <span>{`Valgt: ${selectedFeatureIds.length}`}</span>
            </div>

            <div className="draw-hud-actions">
              <button
                type="button"
                className="draw-hud-icon-button confirm"
                onClick={() => {
                  removeFeatures(editableLayerId, selectedFeatureIds);
                  setSelectedFeatureIds([]);
                }}
                title="Slett valgte (Enter)"
                aria-label="Slett valgte"
              >
                ✓
              </button>

              <button
                type="button"
                className="draw-hud-icon-button cancel"
                onClick={() => setSelectedFeatureIds([])}
                title="Tøm markering (Esc)"
                aria-label="Tøm markering"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="draw-hud-body">
            Klikk for å velge/flere. Enter sletter. Esc avbryter.
          </div>
        </div>
      )}

      {/* Tegne-HUD */}
      {activeTool && (
        <div className="draw-hud" onClick={(e) => e.stopPropagation()}>
          <div className="draw-hud-header">
            <div className="draw-hud-title">
              <span role="img" aria-hidden>
                {activeTool === "point"
                  ? "●"
                  : activeTool === "line"
                  ? "〰️"
                  : "▲"}
              </span>
              <span>
                {activeTool === "point"
                  ? "Punkt"
                  : activeTool === "line"
                  ? "Linje"
                  : "Polygon"}
              </span>
            </div>

            <div className="draw-hud-actions">
              {/* ✓ – fullfør */}
              <button
                type="button"
                className="draw-hud-icon-button confirm"
                onClick={finishDrawing}
                aria-label="Fullfør tegning og lagre laget"
                disabled={
                  (activeTool === "point" && drawingPoints.length < 1) ||
                  (activeTool === "line" && drawingPoints.length < 2) ||
                  (activeTool === "polygon" && drawingPoints.length < 3)
                }
              >
                ✓
              </button>

              {/* ✕ – avbryt */}
              <button
                type="button"
                className="draw-hud-icon-button cancel"
                onClick={() => {
                  clearSketch();
                  drawingPointsRef.current = [];
                  setDrawingPoints([]);
                  setDrawStatus("");
                  stopDrawing();
                }}
                aria-label="Avbryt tegning"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="draw-hud-body">{helperText[activeTool]}</div>

          {drawStatus && (
            <div className="draw-hud-steps">{drawStatus}</div>
          )}

          {!drawStatus &&
            drawingPoints.length > 0 &&
            activeTool !== "point" && (
              <div className="draw-hud-steps">
                <span>{`Punkter lagt til: ${drawingPoints.length}`}</span>
                <span>Dobbeltklikk eller Enter for å lagre laget.</span>
              </div>
            )}
        </div>
      )}

      {/* Bakgrunnskart-knapp nederst til høyre – knapp flyttes opp når menyen er åpen */}
      <div
        className={`basemap-switcher ${basemapMenuOpen ? "menu-open" : ""}`}
        ref={basemapSwitcherRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MENYEN – alltid rendret, synlighet styres med CSS/transition */}
        <div className="basemap-menu">
          <div className="basemap-menu-grid">
            {BASEMAPS.map((bm) => (
              <button
                key={bm.id}
                type="button"
                className="basemap-menu-item"
                onClick={() => {
                  setActiveBasemapId(bm.id);
                }}
                title={bm.name}
              >
                <div
                  className={`basemap-thumb basemap-thumb-menu basemap-thumb--${bm.id} ${
                    bm.id === activeBasemapId ? "selected" : ""
                  }`}
                />
                <span className="basemap-menu-label">
                  {bm.id === "streets"
                    ? "Standard"
                    : bm.id === "navday"
                    ? "Navigasjon"
                    : bm.id === "outdoors"
                    ? "Turkart"
                    : bm.id === "light"
                    ? "Lyst"
                    : bm.id === "dark"
                    ? "Mørkt"
                    : "Satellitt"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hovedknappen – alltid nede i hjørnet, skyves opp når .menu-open */}
        <button
          type="button"
          className="basemap-toggle"
          onClick={() => setBasemapMenuOpen((open) => !open)}
          title={activeBasemap.name}
        >
          <div
            className={`basemap-thumb basemap-thumb-active basemap-thumb--${activeBasemap.id}`}
          />
        </button>
      </div>
    </div>
  );
}

