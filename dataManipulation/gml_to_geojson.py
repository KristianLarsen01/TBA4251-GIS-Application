import json
from lxml import etree
from pyproj import Transformer

# ---- KONFIG ----
INPUT_GML = "dataManipulation/input/Basisdata_5001_Trondheim_5972_FKB-Veg_GML.gml"              # bytt til din fil
OUTPUT_GEOJSON = "dataManipulation/output/veier_trondheim.geojson"

# EPSG:5972 -> WGS84 (lat/lon)
transformer = Transformer.from_crs("EPSG:5972", "EPSG:4326", always_xy=True)

# Namespaces fra fila di
NS = {
    "gml": "http://www.opengis.net/gml/3.2",
    "app": "http://skjema.geonorge.no/SOSI/produktspesifikasjon/FKB-Veg/5.1",
}

def parse_poslist(poslist_text):
    """
    GML posList: x y z x y z ...
    Returnerer liste med (lon, lat) i WGS84.
    """
    nums = [float(v) for v in poslist_text.strip().split()]
    coords = []
    # posList er 3D: x y z
    for i in range(0, len(nums), 3):
        x = nums[i]
        y = nums[i + 1]
        # z = nums[i + 2]  # vi ignorerer høyde
        lon, lat = transformer.transform(x, y)
        coords.append([lon, lat])
    return coords

def main():
    tree = etree.parse(INPUT_GML)
    root = tree.getroot()

    features = []

    # Finn alle LineString-geometrier under app:grense
    lines = root.xpath(".//app:grense/gml:LineString", namespaces=NS)

    for idx, line in enumerate(lines):
        poslist = line.find("gml:posList", namespaces=NS)
        if poslist is None or not poslist.text:
            continue

        coords = parse_poslist(poslist.text)

        feature = {
            "type": "Feature",
            "properties": {
                "id": line.get("{http://www.opengis.net/gml/3.2}id", f"line_{idx}")
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
        }
        features.append(feature)

    fc = {
        "type": "FeatureCollection",
        "features": features,
    }

    with open(OUTPUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, indent=2)

    print(f"Skrev {len(features)} linjer til {OUTPUT_GEOJSON}")

if __name__ == "__main__":
    main()
