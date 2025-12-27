/*
  Hensikt:
  Dette er startpunktet for hele appen. Her “kobler jeg på” App-komponenten
  til HTML-siden (div-en som heter "root").

  Eksterne biblioteker (hvorfor og hvordan):
  - React / ReactDOM:
    - React er UI-rammeverket som lar meg bygge siden som komponenter.
    - ReactDOM kobler komponentene til HTML-siden ("root") og starter appen.
    - StrictMode er en utviklingssjekk som kan gjøre at noe kjører ekstra ganger i dev.
  - Leaflet CSS: Leaflet er kartbiblioteket jeg bruker i kart-komponenten.
    CSS-en må importeres her, ellers blir kart-knapper/ikoner stylet feil.

  Min kode vs bibliotek:
  - Oppsettet (providers + App) er min kode.
  - React/ReactDOM og Leaflet sin CSS er bibliotek.
*/

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { LayersProvider } from "./context/LayersContext.jsx";
import { DrawingProvider } from "./context/DrawingContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LayersProvider>
      <DrawingProvider>
        <App />
      </DrawingProvider>
    </LayersProvider>
  </React.StrictMode>
);
