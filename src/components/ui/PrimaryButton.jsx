// src/components/ui/PrimaryButton.jsx
export default function PrimaryButton({ children, variant = "primary", ...rest }) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}
