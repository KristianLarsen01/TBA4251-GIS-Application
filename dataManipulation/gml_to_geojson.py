import json
import re
from lxml import etree
from pyproj import Transformer

# =========================================================
# 🔧 DET ENESTE DU ENDRES
# =========================================================
INPUT_GML = "dataManipulation/input/Basisdata_5001_Trondheim_5972_FKB-Arealbruk_GML.gml"
OUTPUT_GEOJSON = "dataManipulation/output/output.geojson"

# =========================================================
# 🔁 KOORDINATSYSTEM (enkelt)
# - prøver å lese EPSG fra GML (srsName)
# - hvis den ikke finner: antar EPSG:25832 (vanlig i Norge)
# - target er alltid EPSG:4326 (lon/lat) for webkart/Turf
# =========================================================
DEFAULT_SOURCE_EPSG = "EPSG:25832"
TARGET_EPSG = "EPSG:4326"

# GML 3.2 er vanlig, men vi bruker local-name() i XPath så prefix er ikke kritisk
GML32_ID = "{http://www.opengis.net/gml/3.2}id"
GML31_ID = "{http://www.opengis.net/gml}id"


def epsg_from_srsname(srs):
    """
    Prøver å hente EPSG-kode fra f.eks:
      EPSG:25832
      urn:ogc:def:crs:EPSG::25832
      http://www.opengis.net/def/crs/EPSG/0/25832
    """
    if not srs:
        return None
    srs = srs.strip()
    m = re.search(r"EPSG\s*:\s*(\d+)", srs, flags=re.IGNORECASE)
    if m:
        return f"EPSG:{m.group(1)}"
    m = re.search(r"EPSG(?:/|::)(\d+)", srs, flags=re.IGNORECASE)
    if m:
        return f"EPSG:{m.group(1)}"
    m = re.search(r"(\d{4,6})\s*$", srs)
    if m:
        return f"EPSG:{m.group(1)}"
    return None


def pick_transformer(root):
    """
    Finn første srsName i dokumentet, og lag transformer.
    Hvis ingen srsName: bruk DEFAULT_SOURCE_EPSG.
    """
    # Finn første element med srsName-attributt
    any_srs = root.xpath("(.//*[@srsName])[1]/@srsName")
    src = epsg_from_srsname(any_srs[0]) if any_srs else None
    src = src or DEFAULT_SOURCE_EPSG

    transformer = Transformer.from_crs(src, TARGET_EPSG, always_xy=True)
    return transformer, src


def parse_numbers(text):
    return [float(v) for v in (text or "").strip().split() if v.strip()]


def parse_coords(nums, transformer):
    """
    Støtter både 2D (x y x y ...) og 3D (x y z x y z ...)
    """
    if len(nums) < 2:
        return []
    dim = 3 if len(nums) % 3 == 0 else 2
    out = []
    for i in range(0, len(nums), dim):
        x = nums[i]
        y = nums[i + 1]
        lon, lat = transformer.transform(x, y)
        out.append([lon, lat])
    return out


def close_ring(coords):
    if coords and coords[0] != coords[-1]:
        coords.append(coords[0])
    return coords


def first(el, xpath_expr):
    res = el.xpath(xpath_expr)
    return res[0] if res else None


# ----------------- Geometri-parsing (robust, men enkel) -----------------

def parse_point(point_el, transformer):
    # gml:pos
    pos = first(point_el, ".//*[local-name()='pos']")
    if pos is not None and (pos.text or "").strip():
        nums = parse_numbers(pos.text)
        lon, lat = transformer.transform(nums[0], nums[1])
        return {"type": "Point", "coordinates": [lon, lat]}

    # gml:coordinates (eldre)
    coords_el = first(point_el, ".//*[local-name()='coordinates']")
    if coords_el is not None and (coords_el.text or "").strip():
        # "x,y x,y"
        parts = coords_el.text.strip().split()
        if parts:
            x, y = parts[0].split(",")[:2]
            lon, lat = transformer.transform(float(x), float(y))
            return {"type": "Point", "coordinates": [lon, lat]}

    return None


def parse_linestring_like(ls_el, transformer):
    # posList
    poslist = first(ls_el, ".//*[local-name()='posList']")
    if poslist is not None and (poslist.text or "").strip():
        nums = parse_numbers(poslist.text)
        coords = parse_coords(nums, transformer)
        return {"type": "LineString", "coordinates": coords}

    # repeated pos
    poses = ls_el.xpath(".//*[local-name()='pos']")
    if poses:
        coords = []
        for p in poses:
            if not (p.text or "").strip():
                continue
            nums = parse_numbers(p.text)
            lon, lat = transformer.transform(nums[0], nums[1])
            coords.append([lon, lat])
        return {"type": "LineString", "coordinates": coords}

    return None


def parse_polygon_like(poly_el, transformer):
    rings = []

    # exterior ring
    ext = first(poly_el, ".//*[local-name()='exterior']")
    if ext is None:
        return None
    ext_poslist = first(ext, ".//*[local-name()='posList']")
    if ext_poslist is None or not (ext_poslist.text or "").strip():
        return None

    ext_coords = close_ring(parse_coords(parse_numbers(ext_poslist.text), transformer))
    rings.append(ext_coords)

    # interior rings (holes)
    interiors = poly_el.xpath(".//*[local-name()='interior']")
    for interior in interiors:
        poslist = first(interior, ".//*[local-name()='posList']")
        if poslist is None or not (poslist.text or "").strip():
            continue
        rings.append(close_ring(parse_coords(parse_numbers(poslist.text), transformer)))

    return {"type": "Polygon", "coordinates": rings}


def parse_surface(surface_el, transformer):
    """
    FKB/GML bruker ofte gml:Surface med patches.
    Vi leter etter én ring med posList (ytterring).
    """
    # Finn første posList inne i surface (typisk LinearRing i patches)
    poslist = first(surface_el, ".//*[local-name()='posList']")
    if poslist is None or not (poslist.text or "").strip():
        return None
    outer = close_ring(parse_coords(parse_numbers(poslist.text), transformer))
    return {"type": "Polygon", "coordinates": [outer]}


def geometry_from_feature(feature_el, transformer):
    """
    Finn geometri uansett prefix/namespace.
    Støtter vanlige typer i FKB-ish GML.
    """
    # Multi* først
    multi_surface = first(feature_el, ".//*[local-name()='MultiSurface']")
    if multi_surface is not None:
        polys = []
        surfaces = multi_surface.xpath(".//*[local-name()='Surface']")
        for s in surfaces:
            g = parse_surface(s, transformer)
            if g and g["type"] == "Polygon":
                polys.append(g["coordinates"])
        if polys:
            return {"type": "MultiPolygon", "coordinates": polys}

    multi_curve = first(feature_el, ".//*[local-name()='MultiCurve']")
    if multi_curve is not None:
        lines = []
        curves = multi_curve.xpath(".//*[local-name()='Curve'] | .//*[local-name()='LineString']")
        for c in curves:
            g = parse_linestring_like(c, transformer)
            if g and g["type"] == "LineString":
                lines.append(g["coordinates"])
        if lines:
            return {"type": "MultiLineString", "coordinates": lines}

    # Enkelt-geometrier
    point_el = first(feature_el, ".//*[local-name()='Point']")
    if point_el is not None:
        return parse_point(point_el, transformer)

    ls_el = first(feature_el, ".//*[local-name()='LineString'] | .//*[local-name()='Curve']")
    if ls_el is not None:
        return parse_linestring_like(ls_el, transformer)

    poly_el = first(feature_el, ".//*[local-name()='Polygon']")
    if poly_el is not None:
        return parse_polygon_like(poly_el, transformer)

    surface_el = first(feature_el, ".//*[local-name()='Surface']")
    if surface_el is not None:
        return parse_surface(surface_el, transformer)

    return None


def feature_id(feature_el, fallback):
    return (
        feature_el.get(GML32_ID)
        or feature_el.get(GML31_ID)
        or fallback
    )


def find_feature_elements(root):
    """
    Finn features både i gml:featureMember og wfs:member (uansett namespace).
    """
    # gml:featureMember
    members = root.xpath(".//*[local-name()='featureMember']")
    if members:
        feats = []
        for m in members:
            # første element-barn er ofte selve feature
            children = [c for c in m if isinstance(c.tag, str)]
            if children:
                feats.append(children[0])
        return feats

    # wfs:member eller andre "*:member"
    members = root.xpath(".//*[local-name()='member']")
    feats = []
    for m in members:
        children = [c for c in m if isinstance(c.tag, str)]
        if children:
            feats.append(children[0])
    return feats

def strip_ns(tag):
    return tag.split("}", 1)[-1] if "}" in tag else tag

def extract_properties(feature_el):
    """
    Henter:
    - Leaf-tekstfelter (som før)
    - 'featureType' = elementnavnet til selve feature (veldig nyttig)
    - prøver å hente type/kode fra vanlige felt i FKB/GML
    """
    props = {}

    # featureType: navnet på feature-elementet (f.eks. ArealbrukFlate / Idrettsanlegg)
    props["featureType"] = strip_ns(feature_el.tag)

    # Ikke ta med geometri-subtreet
    geom = first(
        feature_el,
        ".//*[local-name()='Point' or local-name()='LineString' or local-name()='Polygon' "
        "or local-name()='Curve' or local-name()='Surface' "
        "or local-name()='MultiSurface' or local-name()='MultiCurve' or local-name()='MultiPoint' or local-name()='MultiPolygon']"
    )
    geom_nodes = set(geom.iter()) if geom is not None else set()

    # 1) Leaf-tekstfelter
    for el in feature_el.iter():
        if el is feature_el:
            continue
        if el in geom_nodes:
            continue
        if len(el) > 0:
            continue

        text = (el.text or "").strip()
        if not text:
            continue

        key = strip_ns(el.tag)

        # Kollisjonshåndtering
        if key in props and props[key] != text:
            i = 2
            while f"{key}_{i}" in props:
                i += 1
            props[f"{key}_{i}"] = text
        else:
            props[key] = text

        # Hvis feltet ser ut som "kode"/"type", legg det også i en mer standard nøkkel
        lk = key.lower()
        if lk in ("objekttype", "type", "arealtype", "arealbrukstype", "kode"):
            props.setdefault("typeLabel", text)

    # 2) Prøv å hente gml:name / gml:description (ofte fylt)
    gml_name = first(feature_el, ".//*[local-name()='name']")
    if gml_name is not None and (gml_name.text or "").strip():
        props.setdefault("name", gml_name.text.strip())

    gml_desc = first(feature_el, ".//*[local-name()='description']")
    if gml_desc is not None and (gml_desc.text or "").strip():
        props.setdefault("description", gml_desc.text.strip())

    # 3) Ta med "kode"-info hvis den ligger i attributter (codeSpace / href etc.)
    # (Vanlig: <app:arealbrukstype codeSpace="...">123</app:arealbrukstype>)
    for el in feature_el.iter():
        if el in geom_nodes:
            continue
        if not isinstance(el.tag, str):
            continue

        # ser etter codeSpace/xlink:href eller andre attributter
        for k, v in (el.attrib or {}).items():
            k2 = strip_ns(k).lower()
            if k2 in ("codespace", "href", "type", "kode"):
                base = strip_ns(el.tag)
                props.setdefault(f"{base}_{k2}", v)

                # Hvis dette elementet høres ut som en klassifisering: putt i typeLabel også
                base_l = base.lower()
                if any(s in base_l for s in ("type", "kode", "kategori", "areal", "formål", "idrett")):
                    props.setdefault("typeLabel", v)

    # 4) Hvis vi fortsatt ikke har en god "typeLabel", prøv en heuristikk:
    # velg første property som inneholder "type/kode" i nøkkelen
    if "typeLabel" not in props:
        for k, v in props.items():
            lk = k.lower()
            if any(s in lk for s in ("type", "kode", "kategori", "areal", "formål")) and isinstance(v, str):
                props["typeLabel"] = v
                break

    return props




def main():
    tree = etree.parse(INPUT_GML)
    root = tree.getroot()

    transformer, detected_src = pick_transformer(root)
    print(f"ℹ️ Bruker kilde-CRS: {detected_src}  →  {TARGET_EPSG}")

    feature_els = find_feature_elements(root)
    print(f"ℹ️ Fant {len(feature_els)} feature-elementer i fila")

    features = []
    skipped = 0

    for i, feat_el in enumerate(feature_els):
        geom = geometry_from_feature(feat_el, transformer)
        if geom is None:
            skipped += 1
            continue

        fid = feature_id(feat_el, f"feature_{i}")

        props = extract_properties(feat_el)
        props["id"] = fid  # behold id uansett

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": geom
        })

    geojson = {"type": "FeatureCollection", "features": features}

    with open(OUTPUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    print(f"✅ Skrev {len(features)} features til {OUTPUT_GEOJSON} (hoppet over {skipped})")


if __name__ == "__main__":
    main()
