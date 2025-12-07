import { createContext, useContext, useState } from "react";

const LayersContext = createContext(null);

export function LayersProvider({ children }) {
  const [layers, setLayers] = useState([]);

  const addLayer = (layer) => {
    setLayers((prev) => [
      ...prev,
      {
        visible: true,
        ...layer,
      },
    ]);
  };

  const updateLayer = (id, patch) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
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
