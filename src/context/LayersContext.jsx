// src/context/LayersContext.jsx
import { createContext, useContext, useState } from "react";

const LayersContext = createContext(null);

export function LayersProvider({ children }) {
  const [layers, setLayers] = useState([]);

  const value = {
    layers,
    addLayer: (layer) => setLayers((prev) => [...prev, layer]),
    clearLayers: () => setLayers([]),
  };

  return (
    <LayersContext.Provider value={value}>{children}</LayersContext.Provider>
  );
}

export function useLayers() {
  const ctx = useContext(LayersContext);
  if (!ctx) {
    throw new Error("useLayers must be used inside a LayersProvider");
  }
  return ctx;
}
