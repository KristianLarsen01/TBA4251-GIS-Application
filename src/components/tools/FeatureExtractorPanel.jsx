/*
  Hensikt:
  Dette panelet lar brukeren “plukke ut” features basert på properties.
  Endring:
  - Når bruker velger property (key), genererer vi en dropdown med unike verdier fra laget.
  - Bruker kan fortsatt velge "Skriv inn selv …" for fritekst.

  Filtrering skjer fortsatt i utils/featureFilter.js (din regelmotor).
*/

import { useEffect, useMemo, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { filterFeatureCollection, listPropertyKeys } from "../../utils/featureFilter.js";

const OP_OPTIONS = [
  { value: "eq", label: "=", needsValue: true },
  { value: "neq", label: "≠", needsValue: true },
  { value: "contains", label: "inneholder", needsValue: true },
  { value: "gt", label: ">", needsValue: true },
  { value: "gte", label: "≥", needsValue: true },
  { value: "lt", label: "<", needsValue: true },
  { value: "lte", label: "≤", needsValue: true },
  { value: "exists", label: "har verdi", needsValue: false },
  { value: "missing", label: "mangler", needsValue: false },
];

const OP_TOOLTIPS = {
  eq: "Er lik",
  neq: "Er ikke lik",
  contains: "Tekstsøk (del av tekst)",
  gt: "Større enn (tall)",
  gte: "Større eller lik (tall)",
  lt: "Mindre enn (tall)",
  lte: "Mindre eller lik (tall)",
  exists: "Feltet finnes (og er ikke undefined)",
  missing: "Feltet mangler (undefined)",
};

const VALUE_LIMIT = 250; // maks unike verdier per key i dropdown (for å unngå gigantiske lister)
const CUSTOM_SENTINEL = "__custom__";

// Lager en stabil ID til regler
function ruleId() {
  return `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Hent unike values for en bestemt key i et FeatureCollection
function uniqueValuesForKey(fc, key, limit = VALUE_LIMIT) {
  if (!fc?.features?.length || !key) return [];
  const set = new Set();

  for (const f of fc.features) {
    const v = f?.properties?.[key];
    // "missing" / undefined tar vi ikke med som valg i dropdown
    if (v === undefined) continue;

    // null blir et faktisk valg (kan være relevant i noen datasett)
    const normalized = v === null ? "null" : String(v);
    set.add(normalized);

    if (set.size >= limit) break;
  }

  // Sorter for litt penere UX (tekstlig)
  return Array.from(set).sort((a, b) => a.localeCompare(b, "nb"));
}

function newRule(propertyKeys) {
  return {
    id: ruleId(),
    key: propertyKeys?.[0] || "",
    op: "eq",
    value: "",
    valueMode: "auto", // "auto" (dropdown) | "custom" (input)
  };
}

export default function FeatureExtractorPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const hasLayers = Array.isArray(layers) && layers.length > 0;

  const [layerId, setLayerId] = useState("");
  const [combine, setCombine] = useState("all"); // all | any
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok"); // ok | error

  // auto velg nyeste lag
  useEffect(() => {
    if (!hasLayers) {
      setLayerId("");
      return;
    }
    const stillValid = layers.some((l) => l.id === layerId);
    if (!stillValid) setLayerId(layers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === layerId),
    [layers, layerId]
  );

  const propertyKeys = useMemo(() => {
    const fc = selectedLayer?.data;
    if (!fc?.features?.length) return [];
    return listPropertyKeys(fc);
  }, [selectedLayer]);

  // Bygg en lookup: key -> [unike verdier]
  // NB: for store datasett kan dette bli tungt, men VALUE_LIMIT begrenser og holder det brukbart.
  const valuesByKey = useMemo(() => {
    const fc = selectedLayer?.data;
    if (!fc?.features?.length || !propertyKeys.length) return {};
    const map = {};
    for (const k of propertyKeys) {
      map[k] = uniqueValuesForKey(fc, k, VALUE_LIMIT);
    }
    return map;
  }, [selectedLayer, propertyKeys]);

  // reset regler ved lagbytte (og legg inn én default regel)
  useEffect(() => {
    if (!propertyKeys.length) {
      setRules([]);
      return;
    }
    setRules([newRule(propertyKeys)]);
  }, [layerId, propertyKeys.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRule = (id, patch) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const addRule = () => {
    setRules((prev) => [...prev, newRule(propertyKeys)]);
  };

  const handleRun = (e) => {
    // Jeg kjører filtrering, og oppretter nytt lag hvis jeg faktisk fikk treff.
    e.preventDefault();
    setStatus("");
    setStatusType("ok");

    if (!selectedLayer?.data) {
      setStatusType("error");
      setStatus("Fant ikke valgt lag.");
      return;
    }
    if (!propertyKeys.length) {
      setStatusType("error");
      setStatus("Dette laget har ingen properties å filtrere på.");
      return;
    }

    try {
      // (Valgfritt men nyttig) Stripp bort value for operators som ikke trenger verdi
      const normalizedRules = rules.map((r) => {
        const opMeta = OP_OPTIONS.find((o) => o.value === r.op);
        const needsValue = opMeta?.needsValue ?? true;
        return needsValue ? r : { ...r, value: "" };
      });

      const filtered = filterFeatureCollection(selectedLayer.data, normalizedRules, combine);

      const outCount = filtered?.features?.length ?? 0;
      if (outCount === 0) {
        setStatusType("error");
        setStatus("Ingen features matchet reglene. Prøv å endre verdi eller operator.");
        return; // IKKE addLayer
      }

      const nameBase = selectedLayer.name || "Lag";
      const newName = `Feature Extract (${nameBase})`;

      addLayer({
        id: `fx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: filtered,
      });

      setStatusType("ok");
      setStatus(
        `Nytt lag "${newName}" ble opprettet (${filtered.features.length} av ${selectedLayer.data.features.length} features).`
      );
    } catch (err) {
      console.error(err);
      setStatusType("error");
      setStatus(err?.message || "Filtrering feilet.");
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Feature Extractor</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!hasLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen lag i kartet</p>
          <p className="tool-panel-error-message">
            Dette verktøyet krever minst ett lag i kartet.
          </p>
          <p className="tool-panel-hint">
            Last opp eller tegn et lag for å bruke Feature Extractor.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Velg lag → velg property → velg verdi fra liste (eller skriv selv) → lag nytt lag med treff.
          </p>

          <form className="tool-panel-form" onSubmit={handleRun}>
            <div className="tool-field">
              <label htmlFor="fx-layer">Lag</label>
              <select
                id="fx-layer"
                value={layerId}
                onChange={(e) => setLayerId(e.target.value)}
                title="Velg hvilket lag du vil filtrere."
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <p className="tool-panel-hint">
                Kun properties i valgt lag blir tilgjengelig i reglene.
              </p>
            </div>

            <div className="tool-field">
              <label>Regler</label>

              <div className="fx-rules">
                {rules.map((r) => {
                  const opMeta = OP_OPTIONS.find((o) => o.value === r.op);
                  const needsValue = opMeta?.needsValue ?? true;

                  const valueOptions = valuesByKey?.[r.key] || [];
                  const canShowDropdown = needsValue && valueOptions.length > 0;

                  const showCustomInput =
                    !needsValue ? false : r.valueMode === "custom" || !canShowDropdown;

                  return (
                    <div key={r.id} className="fx-rule-row">
                      {/* KEY */}
                      <select
                        value={r.key}
                        onChange={(e) => {
                          const nextKey = e.target.value;
                          // Når key endres: reset value + tilbake til dropdown-modus
                          updateRule(r.id, { key: nextKey, value: "", valueMode: "auto" });
                        }}
                        disabled={!propertyKeys.length}
                        title="Velg hvilken property (felt/kolonne) du vil filtrere på."
                      >
                        {propertyKeys.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>

                      {/* OP */}
                      <select
                        value={r.op}
                        onChange={(e) => {
                          const nextOp = e.target.value;
                          const meta = OP_OPTIONS.find((o) => o.value === nextOp);
                          const nextNeedsValue = meta?.needsValue ?? true;

                          // Hvis operator ikke trenger verdi: null ut verdi + sett auto
                          updateRule(r.id, {
                            op: nextOp,
                            value: nextNeedsValue ? r.value : "",
                            valueMode: nextNeedsValue ? r.valueMode : "auto",
                          });
                        }}
                        title={OP_TOOLTIPS[r.op] || ""}
                      >
                        {OP_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>

                      {/* VALUE */}
                      {showCustomInput ? (
                        <input
                          type="text"
                          placeholder="Verdi"
                          value={r.value}
                          onChange={(e) => updateRule(r.id, { value: e.target.value })}
                          disabled={!needsValue}
                          className={!needsValue ? "fx-value-disabled" : ""}
                          title={
                            needsValue
                              ? "Skriv inn verdien som skal sammenlignes (tekst eller tall)."
                              : "Denne operatoren trenger ingen verdi."
                          }
                        />
                      ) : (
                        <select
                          value={r.value === "" ? "" : r.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === CUSTOM_SENTINEL) {
                              updateRule(r.id, { valueMode: "custom", value: "" });
                            } else {
                              updateRule(r.id, { valueMode: "auto", value: v });
                            }
                          }}
                          disabled={!needsValue}
                          title={
                            needsValue
                              ? "Velg en verdi fra laget. Velg “Skriv inn selv …” for fritekst."
                              : "Denne operatoren trenger ingen verdi."
                          }
                        >
                          <option value="">Velg verdi…</option>
                          {valueOptions.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                          <option value={CUSTOM_SENTINEL}>Skriv inn selv …</option>
                        </select>
                      )}

                      <button
                        type="button"
                        className="rule-remove-btn"
                        onClick={() => removeRule(r.id)}
                        title="Fjern regel"
                        disabled={rules.length <= 1}
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="fx-rule-footer">
                <button
                  type="button"
                  className="fx-add-rule"
                  onClick={addRule}
                  title="Legg til en ekstra regel."
                >
                  + Legg til regel
                </button>

                <div className="fx-combine">
                  <button
                    type="button"
                    className={`fx-pill ${combine === "all" ? "active" : ""}`}
                    onClick={() => setCombine("all")}
                    title="Alle regler må være sanne (AND)."
                  >
                    ALLE (AND)
                  </button>
                  <button
                    type="button"
                    className={`fx-pill ${combine === "any" ? "active" : ""}`}
                    onClick={() => setCombine("any")}
                    title="Minst én regel må være sann (OR)."
                  >
                    MINST ÉN (OR)
                  </button>
                </div>
              </div>

              <p className="tool-panel-hint">
                Tips: Hvis lista er lang, kan du velge “Skriv inn selv …” og lime inn verdien.
              </p>
            </div>

            <button type="submit" className="tool-panel-submit" title="Kjør filtreringen og lag nytt lag.">
              Utfør filter
            </button>
          </form>
        </>
      )}

      {status && (
        <p className={`tool-panel-status ${statusType === "error" ? "is-error" : ""}`}>
          {status}
        </p>
      )}
    </div>
  );
}
