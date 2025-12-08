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
