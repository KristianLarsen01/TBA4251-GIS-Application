// src/components/layout/Sidebar.jsx
import { useLayers } from "../../context/LayersContext.jsx";

export default function Sidebar() {
  const { layers } = useLayers();

  return (
    <aside className="sidebar">
      <h3>Lag</h3>
      {layers.length === 0 ? (
        <p className="sidebar-empty">Ingen lag lastet.</p>
      ) : (
        <ul className="layer-list">
          {layers.map((layer) => (
            <li key={layer.id}>{layer.name}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
