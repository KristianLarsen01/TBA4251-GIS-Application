/*
  Hensikt:
  Denne fila er “lag-banken” i appen: her lagrer jeg alle GeoJSON-lag som vises i kartet,
  og funksjoner for å legge til, endre, flytte, skjule og slette lag.

  Hvorfor dette er en egen context:
  Når jeg jobber med kart, trenger både kart-komponenten, lagpanelet og verktøy-panelene
  tilgang til samme lagliste. I stedet for å sende props gjennom mange komponenter,
  bruker jeg Context i React.

  Eksterne biblioteker (hvorfor og hvordan):
  - React (rammeverket):
    - Context: deler data (layers-lista) til mange komponenter samtidig.
    - createContext/useContext: lager/leser contexten.
    - useState: lagrer layers-lista og valg i minnet.

  Min kode vs bibliotek:
  - All logikk rundt layers-lista (addLayer/updateLayer/removeFeature osv.) er skrevet av meg.
  - Context/hook-mekanismen er bibliotek.
*/

import { createContext, useContext, useState } from "react";

const LayersContext = createContext(null);

// Jeg bruker en enkel fargepalett så nye lag får fornuftige farger uten at jeg må velge alt manuelt.
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

// Jeg sørger for stabile feature-id’er og gjør MultiPoint redigerbart per punkt.
// Hvorfor: Når jeg skal klikke/velge/slette enkeltobjekter i Leaflet, er det veldig
// praktisk at hvert objekt har en stabil id. Mange GeoJSON-filer har ikke id,
// derfor lager jeg en “fallback”.
function ensureFeatureIds(fc, layerId) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return fc;

  const out = [];

  fc.features.forEach((f, idx) => {
    const propsBase = { ...(f.properties || {}) };
    const geom = f?.geometry;

    if (!geom) return;

    // MultiPoint -> eksploder til Point-features (for sletting av enkeltpunkt)
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

  // Legg til nytt lag. Jeg setter default-verdier (synlig, farge, fillOpacity),
  // og jeg sørger for at data har id’er der det mangler.
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
    // “patch” betyr at jeg bare oppdaterer feltene jeg får inn.
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const toggleVisibility = (id) => {
    // Klikk “øye” i lagpanelet: synlig <-> skjult.
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? { ...layer, visible: layer.visible === false ? true : false }
          : layer
      )
    );
  };

  const removeLayer = (id) => {
    // Slett hele laget fra lista.
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setEditableLayerId((curr) => (curr === id ? null : curr));
  };

  const moveLayer = (id, direction) => {
    // Flytt lag opp/ned i lista. Rekkefølgen påvirker hva som tegnes “øverst”.
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
    // Rydd alt (brukes f.eks. når man vil starte “på nytt”).
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

    // Hvis jeg endte opp med å tømme laget i edit-modus: avslutt edit
    setEditableLayerId((curr) => (curr === layerId ? null : curr));
  };

  // Slett mange features. Hvis laget blir tomt -> fjern hele laget.
  const removeFeatures = (layerId, featureIds) => {
    // Jeg bruker dette ved multiselect-sletting (Enter) i kartet.
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

    // Hvis laget i edit ble tømt (eller uansett), nullstill edit på samme lag
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
  // Jeg har en liten sikkerhetssjekk her.
  const ctx = useContext(LayersContext);
  if (!ctx) throw new Error("useLayers must be used inside a LayersProvider");
  return ctx;
}
