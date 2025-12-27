/*
  Hensikt:
  En liten knapp-komponent som gir meg konsistent styling.
  variant bestemmer om knappen ser “primary” eller “secondary” ut.

  Eksterne ting:
  - Ingen tredjepartsbibliotek her; dette er bare en wrapper rundt <button>.

  Min kode vs bibliotek:
  - Klasse-navn og props-oppsett er skrevet av meg.
  - Selve komponent-systemet er rammeverk.
*/

export default function PrimaryButton({ children, variant = "primary", ...rest }) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}
