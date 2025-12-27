/*
  Hensikt:
  Denne fila er en liten “filter-motor” for Feature Extractor-verktøyet.
  Den lar meg filtrere GeoJSON-features basert på properties:
  - finnes/mangler
  - lik/ulik
  - inneholder tekst
  - større/mindre enn (for tall)

  Eksterne biblioteker (hvorfor og hvordan):
  - Ingen. Dette er ren JavaScript-logikk.

  Min kode vs bibliotek:
  - Hele denne fila er skrevet av meg.
*/

export function listPropertyKeys(fc) {
  if (!fc?.features?.length) return [];
  const keys = new Set();
  for (const f of fc.features) {
    const p = f?.properties;
    if (!p) continue;
    Object.keys(p).forEach((k) => keys.add(k));
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function isNumberLike(v) {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") return Number.isFinite(Number(v));
  return false;
}

function normalize(v) {
  // for string comparisons
  if (v === null || v === undefined) return "";
  return String(v);
}

function evalRule(propValue, op, value) {
  // propValue = feature.properties[key]
  // value = input string
  const pv = propValue;

  switch (op) {
    case "exists":
      return pv !== undefined;
    case "missing":
      return pv === undefined;

    case "eq":
      return normalize(pv) === value;
    case "neq":
      return normalize(pv) !== value;

    case "contains":
      return normalize(pv).toLowerCase().includes((value || "").toLowerCase());

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!isNumberLike(pv) || !isNumberLike(value)) return false;
      const a = Number(pv);
      const b = Number(value);
      if (op === "gt") return a > b;
      if (op === "gte") return a >= b;
      if (op === "lt") return a < b;
      return a <= b;
    }

    default:
      return false;
  }
}

export function filterFeatureCollection(fc, rules, combine = "all") {
  if (!fc || fc.type !== "FeatureCollection") {
    throw new Error("Ugyldig FeatureCollection.");
  }
  const cleanRules = (rules || []).filter((r) => r?.key && r?.op);
  if (!cleanRules.length) {
    throw new Error("Legg til minst én regel.");
  }

  const out = [];
  for (const f of fc.features) {
    const props = f?.properties || {};

    const checks = cleanRules.map((r) => {
      const pv = props[r.key];
      const needsValue =
        !["exists", "missing"].includes(r.op);

      if (needsValue && (r.value === "" || r.value === null || r.value === undefined)) {
        return false;
      }
      return evalRule(pv, r.op, String(r.value ?? ""));
    });

    const pass = combine === "any" ? checks.some(Boolean) : checks.every(Boolean);
    if (pass) out.push(f);
  }

  return { type: "FeatureCollection", features: out };
}
