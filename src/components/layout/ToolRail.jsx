// src/components/layout/ToolRail.jsx

const tools = [
  { id: "upload", label: "Last opp", icon: "⬆️" },
  { id: "buffer", label: "Buffer", icon: "⭕" },
  { id: "intersect", label: "Intersect", icon: "⨂" },
  { id: "union", label: "Union", icon: "∪" },
  { id: "difference", label: "Difference", icon: "⊖" },
  { id: "clip", label: "Clip", icon: "✂️" },
  { id: "area-filter", label: "Area\nFilter", icon: "▢" },
  { id: "feature-extractor", label: "Feature\nExtractor", icon: "🔍" },
];

export default function ToolRail({ onUploadClick, onToolClick }) {
  return (
    <nav className="tool-rail">
      <div className="tool-rail-group">
        {tools.map((tool) => {
          const isUpload = tool.id === "upload";
          return (
            <button
              key={tool.id}
              className={`tool-rail-button ${
                isUpload ? "tool-rail-button-main" : ""
              }`}
              onClick={() =>
                isUpload ? onUploadClick?.() : onToolClick?.(tool.id)
              }
            >
              <span className="tool-rail-icon">{tool.icon}</span>
              <span className="tool-rail-label">
                {tool.label.split("\n").map((line, idx) => (
                  <span key={idx}>{line}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="tool-rail-footer">
        <span className="tool-rail-footer-text">
          Verktøyene representerer stegene i analysen. Senere kobles de til
          faktiske GIS-operasjoner.
        </span>
      </div>
    </nav>
  );
}
