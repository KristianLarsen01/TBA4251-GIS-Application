// src/components/layout/MapContainer.jsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useLayers } from "../../context/LayersContext.jsx";
import { useDrawing } from "../../context/DrawingContext.jsx";

export default function MapContainer() {
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const dataLayerGroupRef = useRef(null);
  const sketchLayerRef = useRef(null);
  const verticesLayerRef = useRef(null);
  const drawingPointsRef = useRef([]);
  const activeToolRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [drawStatus, setDrawStatus] = useState("");
  const createdLayerNamesRef = useRef(new Set());
  const { layers, addLayer } = useLayers();
  const { activeTool, sessionId, stopDrawing } = useDrawing();

  /* ---------------- Kart-oppsett ---------------- */

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [63.4305, 10.3951],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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

  /* ---------------- Tegn lag etter layers-context ---------------- */

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

            const defaultFill = isBuffer ? 0.3 : 1.0;
            const fillOpacity =
              typeof layer.fillOpacity === "number"
                ? layer.fillOpacity
                : defaultFill;

            if (isPolygonGeom) {
              return {
                color,
                weight: isBuffer ? 1.5 : 1.2,
                fillColor: color,
                fillOpacity,
              };
            }

            if (isLineGeom) {
              return {
                color,
                weight: 3,
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

            return L.circleMarker(latlng, {
              radius: isBuffer ? 7 : 6,
              color,
              fillColor: color,
              weight: 1.5,
              fillOpacity,
            });
          },
        });

        geoJsonLayer.addTo(group);
      });
  }, [layers]);

  /* ---------------- Reager på bytte av tegneverktøy ---------------- */

  useEffect(() => {
    activeToolRef.current = activeTool;
    const map = mapRef.current;
    if (!map) return;

    if (activeTool) {
      map.doubleClickZoom.disable();
      // start ny navne-session når man begynner å tegne
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

  /* ---------------- Event handlers (klikk / dblklikk / tastatur) ---------------- */

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      const tool = activeToolRef.current;
      if (!tool) return;

      // Polygon: klikk nær startpunkt -> lukk
      const pts = drawingPointsRef.current;
      if (tool === "polygon" && pts.length >= 3) {
        const first = pts[0];
        const dist = map.distance(first, e.latlng);
        if (dist < 10) {
          finishDrawing();
          return;
        }
      }

      // Punkt, linje og polygon: legg til punkt i skissen
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

  /* ---------------- Hjelpefunksjoner for skisse ---------------- */

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

    // Små oransje prikker i alle punkter
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

    // Stiplet forhåndsvisning av linje/polygon
    const baseStyle = {
      color: "#f59e0b",
      weight: 2,
      dashArray: "6 6",
      fillOpacity: tool === "polygon" ? 0.08 : 0,
      fillColor: "#f59e0b",
    };

    if (tool === "point") {
      // ingen linjer mellom punkter for punktverktøy
      if (sketchLayerRef.current) {
        sketchLayerRef.current.remove();
        sketchLayerRef.current = null;
      }
      return;
    }

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

  /* ---------------- Lag ferdig geometri ---------------- */

  const finishDrawing = () => {
    const tool = activeToolRef.current;
    if (!tool) return;

    const points = drawingPointsRef.current;

    if (tool === "point" && points.length < 1) {
      setDrawStatus("Punktlag trenger minst ett punkt.");
      return;
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

    let baseName;
    let data;

    if (tool === "point") {
      baseName = "Punkt";

      const features = coords.map((c) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: c,
        },
      }));

      data = {
        type: "FeatureCollection",
        features,
      };
    } else if (tool === "line") {
      baseName = "Linje";

      data = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
          },
        ],
      };
    } else {
      baseName = "Polygon";

      data = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [[...coords, coords[0]]],
            },
          },
        ],
      };
    }

    const name = buildUniqueName(baseName);

    addLayer({
      id: `draw-${tool}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      data,
    });

    clearSketch();
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    setDrawStatus("");
    stopDrawing();
  };

  /* ---------------- HUD-tekst ---------------- */

  const helperText = {
    point:
      "Klikk i kartet for å legge til punkt. Trykk Enter eller ✓ for å lagre laget.",
    line:
      "Klikk for å legge til punkter. Dobbeltklikk, Enter eller ✓ for å fullføre linjen.",
    polygon:
      "Klikk for å tegne polygon. Klikk på startpunktet, dobbeltklikk, Enter eller ✓ for å lukke.",
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="map-container">
      <div
        ref={mapElRef}
        className={`leaflet-map-root ${activeTool ? "drawing-cursor" : ""}`}
      />

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

          {drawStatus && <div className="draw-hud-steps">{drawStatus}</div>}

          {!drawStatus && drawingPoints.length > 0 && (
            <div className="draw-hud-steps">
              <span>{`Punkter lagt til: ${drawingPoints.length}`}</span>
              <span>
                {activeTool === "point"
                  ? "Trykk Enter eller ✓ for å lagre laget."
                  : "Dobbeltklikk, Enter eller ✓ for å lagre laget."}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
