/*
  Hensikt:
  En enkel gjenbrukbar modal (dialog) med tittel, lukkeknapp, innhold og valgfri footer.
  Brukes der jeg vil ha en “pop-up” som ligger over resten av siden.

  Eksterne ting:
  - Ingen tredjepartsbibliotek her; dette er bare struktur + CSS-klasser.

  Min kode vs bibliotek:
  - Struktur og klasse-navn er skrevet av meg.
  - Selve “renderingen” av komponenten er rammeverk.
*/

export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
