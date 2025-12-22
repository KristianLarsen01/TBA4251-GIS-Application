#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import os
from collections import defaultdict
from typing import Dict, List, Tuple, Optional


def read_shapes(shapes_path: str) -> Dict[str, List[Tuple[int, float, float]]]:
    """
    Returns dict: shape_id -> list of (sequence, lon, lat) sorted by sequence.
    Keeps ONLY what we need for geometry.
    """
    shapes: Dict[str, List[Tuple[int, float, float]]] = defaultdict(list)

    with open(shapes_path, "r", encoding="utf-8-sig", newline="") as f:
      reader = csv.DictReader(f)
      required = {"shape_id", "shape_pt_sequence", "shape_pt_lat", "shape_pt_lon"}
      missing = required - set(reader.fieldnames or [])
      if missing:
          raise ValueError(f"shapes.txt mangler kolonner: {missing}")

      for row in reader:
          sid = row["shape_id"].strip()
          seq = int(row["shape_pt_sequence"])
          lat = float(row["shape_pt_lat"])
          lon = float(row["shape_pt_lon"])
          shapes[sid].append((seq, lon, lat))

    # sort each shape by sequence
    for sid in list(shapes.keys()):
        shapes[sid].sort(key=lambda t: t[0])

    return shapes


def read_stops(stops_path: str) -> List[dict]:
    """
    Returns a list of stop features (GeoJSON Feature objects).
    Keeps ONLY what we need: stop_id, stop_name, geometry.
    """
    feats: List[dict] = []

    with open(stops_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"stop_id", "stop_name", "stop_lat", "stop_lon"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"stops.txt mangler kolonner: {missing}")

        for row in reader:
            stop_id = row["stop_id"].strip()
            stop_name = (row.get("stop_name") or "").strip()
            lat = float(row["stop_lat"])
            lon = float(row["stop_lon"])

            feats.append({
                "type": "Feature",
                "properties": {
                    "stop_id": stop_id,
                    "stop_name": stop_name,
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
            })

    return feats


def read_routes_min(routes_path: str) -> Dict[str, dict]:
    """
    Reads routes.txt and returns route metadata dict by route_id.
    Keeps ONLY what you likely need for analysis/labels.
    NOTE: Without trips.txt, we can't map route_id <-> shape_id.
    """
    out: Dict[str, dict] = {}

    with open(routes_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"route_id", "route_short_name", "route_type"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            # routes can vary; if missing, we just skip metadata
            return out

        for row in reader:
            rid = row["route_id"].strip()
            out[rid] = {
                "route_id": rid,
                "route_short_name": (row.get("route_short_name") or "").strip(),
                "route_type": (row.get("route_type") or "").strip(),
            }

    return out


def write_geojson(path: str, features: List[dict]) -> None:
    fc = {"type": "FeatureCollection", "features": features}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False)


def make_routes_geojson(
    shapes: Dict[str, List[Tuple[int, float, float]]],
    # Optional mapping if you can provide it later: shape_id -> route_id
    shape_to_route: Optional[Dict[str, str]] = None,
    route_meta_by_id: Optional[Dict[str, dict]] = None,
) -> List[dict]:
    feats: List[dict] = []
    shape_to_route = shape_to_route or {}
    route_meta_by_id = route_meta_by_id or {}

    for shape_id, pts in shapes.items():
        if len(pts) < 2:
            # skip degenerate shapes
            continue

        coords = [[lon, lat] for (_seq, lon, lat) in pts]

        props = {
            "shape_id": shape_id,
        }

        # If we have mapping, attach minimal route properties
        rid = shape_to_route.get(shape_id)
        if rid:
            props["route_id"] = rid
            meta = route_meta_by_id.get(rid)
            if meta:
                # keep only minimal
                props["route_short_name"] = meta.get("route_short_name", "")
                props["route_type"] = meta.get("route_type", "")

        feats.append({
            "type": "Feature",
            "properties": props,
            "geometry": {"type": "LineString", "coordinates": coords},
        })

    return feats


def main():
    import argparse

    ap = argparse.ArgumentParser(
        description="Convert GTFS shapes+stops (+ optional route metadata) to GeoJSON."
    )
    ap.add_argument("--shapes", required=True, help="Path to shapes.txt")
    ap.add_argument("--stops", required=True, help="Path to stops.txt")
    ap.add_argument("--routes", required=False, help="Path to routes.txt (optional metadata)")
    ap.add_argument("--outdir", default=".", help="Output directory")
    ap.add_argument(
        "--shape_to_route",
        required=False,
        help=(
            "Optional CSV mapping shape_id,route_id if you have it. "
            "Normally built from trips.txt; you can generate it separately."
        ),
    )
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    shapes = read_shapes(args.shapes)
    stops_features = read_stops(args.stops)

    route_meta = read_routes_min(args.routes) if args.routes else {}

    # Optional mapping file: shape_id,route_id
    mapping: Dict[str, str] = {}
    if args.shape_to_route:
        with open(args.shape_to_route, "r", encoding="utf-8-sig", newline="") as f:
            r = csv.DictReader(f)
            if not r.fieldnames or "shape_id" not in r.fieldnames or "route_id" not in r.fieldnames:
                raise ValueError("shape_to_route CSV må ha kolonnene: shape_id,route_id")
            for row in r:
                mapping[row["shape_id"].strip()] = row["route_id"].strip()

    routes_features = make_routes_geojson(
        shapes=shapes,
        shape_to_route=mapping,
        route_meta_by_id=route_meta,
    )

    routes_out = os.path.join(args.outdir, "routes.geojson")
    stops_out = os.path.join(args.outdir, "stops.geojson")

    write_geojson(routes_out, routes_features)
    write_geojson(stops_out, stops_features)

    print(f"Skrev: {routes_out} ({len(routes_features)} features)")
    print(f"Skrev: {stops_out} ({len(stops_features)} features)")


if __name__ == "__main__":
    main()
