\
# FootyGIS (TBA4251)

FootyGIS er en liten GIS-applikasjon i nettleseren der jeg kan laste inn GeoJSON-lag, tegne egne lag i kartet, og kjøre enkle analyseverktøy (Buffer, Clip, Difference, Intersect, Union, Dissolve, Feature Extractor og Area Filter).

Målet i oppgavene er å bruke GIS-verktøyene til å vurdere leiligheter i Trondheim opp mot tilgang til fotballbaner.

## Kom i gang

### 1) Krav

- Bruk Google Chrome
- Bruk PC (gjerne en større skjerm)

### 2) Link til nettsiden

https://kristianlarsen01.github.io/TBA4251-GIS-Application/ 

## Bruk av apptlikasjonen

### Last opp data

- Trykk **Last opp** i verktøylinja (venstre)
- Velg én eller flere `.geojson`-filer
- Lagene dukker opp i kartet og i **Lag-panelet** (høyre)

### Tegn egne lag

- Bruk **Punkt**, **Linje** eller **Polygon** i verktøylinja
- Klikk i kartet for å legge til punkter
- Trykk **Enter** (eller ✓ i HUD-en) for å fullføre

### Analyseverktøy (kort forklart)

- **Feature Extractor**: filtrer features basert på properties (f.eks. `featureType = SportIdrettPlass`)
- **Area Filter**: filtrer polygoner på areal (m²), og legger `area_m2` i properties
- **Buffer**: lag en buffer (i meter) rundt geometrien
- **Clip**: klipp lag mot en polygon-maske
- **Difference (A − B)**: trekk Lag B fra Lag A
- **Intersect (A ∩ B)**: finn overlapp-området
- **Union (A + B)**: slå sammen to polygonlag
- **Dissolve**: slå sammen interne grenser i ett polygonlag (evt. per property)

### Lagpanelet

I **Lag-panelet** kan du endre navn, farge, gjennomsiktighet, rekkefølge og synlighet. Du kan også gå inn i redigeringsmodus for å markere og slette features direkte i kartet.

## Viktig å vite

- **Appen lagrer ikke til disk**: Ved refresh resettes tilstanden.
- **Små skjermer**: På mindre skjermer kan panelene havne over hverandre. Det fungerer fortsatt, men er enklere på en større PC-skjerm.

## Struktur i repoet (kort)

- `src/` – klientkode (UI, contexts, verktøy-paneler og GIS-funksjoner)
- `public/` – statiske filer (bilder til oppgaver, data-map, thumbs)
- `dataManipulation/` – Python-scripts brukt til å klargjøre/konvertere data (engangsbruk)

## Biblioteker jeg bruker (og hvorfor)

- **React**: UI-rammeverket. Jeg bruker det for å bygge siden som komponenter, og for at UI kan oppdatere seg når state endrer seg (f.eks. hvilke paneler som er åpne, og hvilke lag som finnes).
- **Vite**: rask utviklingsserver og bygg
- **Leaflet**: selve kartet i nettleseren
- **Mapbox tiles**: bakgrunnskart (via tile-URL)
- **Turf.js**: geometri-operasjoner (buffer/clip/union/difference/intersect osv.)
- **proj4**: reprojisering av GeoJSON fra EPSG:25832 → EPSG:4326 når nødvendig

## Data-klargjøring (valgfritt)

I `dataManipulation/` ligger scripts som ble brukt til å konvertere/klargjøre rådata til GeoJSON og til å lage bilder. Appen trenger ikke at du kjører disse for å fungere – de er mest for å forklare hvordan datasett ble laget.
