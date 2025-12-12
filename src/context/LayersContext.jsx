// src/context/LayersContext.jsx
import { createContext, useContext, useState } from "react";

const LayersContext = createContext(null);

// Enkel palett som går på rundgang
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

export function LayersProvider({ children }) {
  const [layers, setLayers] = useState([]);

  const addLayer = (layer) => {
    setLayers((prev) => {
      const idx = prev.length % COLOR_PALETTE.length;
      const color = layer.color ?? COLOR_PALETTE[idx];
      const fillOpacity =
        typeof layer.fillOpacity === "number" ? layer.fillOpacity : 0.7;

      return [
        ...prev,
        {
          visible: true,
          color,
          fillOpacity,
          ...layer,
        },
      ];
    });
  };

  const updateLayer = (id, patch) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
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

  const clearLayers = () => setLayers([]);

  const value = {
    layers,
    addLayer,
    updateLayer,
    removeLayer,
    moveLayer,
    clearLayers,
    toggleVisibility,
  };

  return (
    <LayersContext.Provider value={value}>
      {children}
    </LayersContext.Provider>
  );
}

export function useLayers() {
  const ctx = useContext(LayersContext);
  if (!ctx) {
    throw new Error("useLayers must be used inside a LayersProvider");
  }
  return ctx;
}
