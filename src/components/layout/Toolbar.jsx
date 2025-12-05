// src/components/layout/Toolbar.jsx
import PrimaryButton from "../ui/PrimaryButton.jsx";

const tools = [
  { id: "upload", label: "Last opp data" },
  { id: "buffer", label: "Buffer" },
  { id: "intersect", label: "Intersect" },
  { id: "union", label: "Union" },
  { id: "difference", label: "Difference" },
  { id: "clip", label: "Clip" },
  { id: "area-filter", label: "Area Filter" },
  { id: "feature-extractor", label: "Feature Extractor" },
];

export default function Toolbar({ onUploadClick, onToolClick }) {
  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <PrimaryButton
          key={tool.id}
          variant={tool.id === "upload" ? "primary" : "secondary"}
          onClick={() =>
            tool.id === "upload"
              ? onUploadClick()
              : onToolClick?.(tool.id)
          }
        >
          {tool.label}
        </PrimaryButton>
      ))}
    </div>
  );
}
