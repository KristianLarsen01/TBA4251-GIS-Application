// src/context/LayersContext.jsx
import { createContext, useContext, useState } from "react";

const LayersContext = createContext(null);

const COLOR_PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#17becf",
];

// Sørg for stabile feature-id + gjør MultiPoint redigerbart per punkt
function ensureFeatureIds(fc, layerId) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return fc;

  const out = [];

  fc.features.forEach((f, idx) => {
    const propsBase = { ...(f.properties || {}) };
    const geom = f?.geometry;

    if (!geom) return;

    // 🔥 MultiPoint -> eksploder til Point-features (for sletting av enkeltpunkt)
    if (geom.type === "MultiPoint" && Array.isArray(geom.coordinates)) {
      geom.coordinates.forEach((coord, j) => {
        const props = { ...propsBase };

        // Lag helt unik id per punkt
        const fallback = `${layerId}-mp-${idx}-${j}`;
        if (!props.id && !props.__fid) props.__fid = fallback;
        if (!props.id && props.__fid) props.id = props.__fid;

        // Hold gjerne på indeks (kan være nyttig i debug)
        props.__mp_index = j;

        out.push({
          type: "Feature",
          properties: props,
          geometry: { type: "Point", coordinates: coord },
        });
      });
      return;
    }

    // Vanlig feature: sikre id
    const props = { ...propsBase };
    const fallback = `${layerId}-feat-${idx}`;
    if (!props.id && !props.__fid) props.__fid = fallback;
    if (!props.id && props.__fid) props.id = props.__fid;

    out.push({ ...f, properties: props });
  });

  return { ...fc, features: out };
}

export function LayersProvider({ children }) {
  const [layers, setLayers] = useState([]);
  const [editableLayerId, setEditableLayerId] = useState(null);

  const addLayer = (layer) => {
    setLayers((prev) => {
      const idx = prev.length % COLOR_PALETTE.length;
      const color = layer.color ?? COLOR_PALETTE[idx];
      const fillOpacity =
        typeof layer.fillOpacity === "number" ? layer.fillOpacity : 0.7;

      const id = layer.id;
      const data = ensureFeatureIds(layer.data, id);

      return [
        ...prev,
        {
          visible: true,
          color,
          fillOpacity,
          ...layer,
          data,
        },
      ];
    });
  };

  const updateLayer = (id, patch) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const toggleVisibility = (id) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? { ...layer, visible: layer.visible === false ? true : false }
          : layer
      )
    );
  };

  const removeLayer = (id) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setEditableLayerId((curr) => (curr === id ? null : curr));
  };

  const moveLayer = (id, direction) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev.slice();
      const newArr = prev.slice();
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= newArr.length) return prev.slice();
      const tmp = newArr[idx];
      newArr[idx] = newArr[swapWith];
      newArr[swapWith] = tmp;
      return newArr;
    });
  };

  const clearLayers = () => {
    setLayers([]);
    setEditableLayerId(null);
  };

  // ✅ Slett én feature. Hvis laget blir tomt -> fjern hele laget.
  const removeFeature = (layerId, featureId) => {
    setLayers((prev) => {
      const next = prev.flatMap((l) => {
        if (l.id !== layerId) return [l];

        const fc = ensureFeatureIds(l.data, l.id);
        const nextFeatures = (fc.features || []).filter((f) => {
          const fid = f?.properties?.id ?? f?.properties?.__fid;
          return fid !== featureId;
        });

        // Hvis ingen features igjen: fjern laget helt
        if (nextFeatures.length === 0) return [];

        return [{ ...l, data: { ...fc, features: nextFeatures } }];
      });

      return next;
    });

    // Hvis vi endte opp med å tømme laget i edit-modus: avslutt edit
    setEditableLayerId((curr) => (curr === layerId ? null : curr));
  };

  // ✅ Slett mange features. Hvis laget blir tomt -> fjern hele laget.
const removeFeatures = (layerId, featureIds) => {
  const ids = new Set(featureIds);

  setLayers((prev) => {
    const next = prev.flatMap((l) => {
      if (l.id !== layerId) return [l];

      const fc = ensureFeatureIds(l.data, l.id);
      const nextFeatures = (fc.features || []).filter((f) => {
        const fid = f?.properties?.id ?? f?.properties?.__fid;
        return !ids.has(fid);
      });

      if (nextFeatures.length === 0) return []; // fjern laget helt

      return [{ ...l, data: { ...fc, features: nextFeatures } }];
    });

    return next;
  });

  // hvis laget i edit ble tømt (eller uansett), nullstill edit på samme lag
  setEditableLayerId((curr) => (curr === layerId ? null : curr));
};


  const value = {
    layers,
    addLayer,
    updateLayer,
    removeLayer,
    moveLayer,
    clearLayers,
    toggleVisibility,

    editableLayerId,
    setEditableLayerId,
    removeFeature,
    removeFeatures,
  };

  return <LayersContext.Provider value={value}>{children}</LayersContext.Provider>;
}

export function useLayers() {
  const ctx = useContext(LayersContext);
  if (!ctx) throw new Error("useLayers must be used inside a LayersProvider");
  return ctx;
}
