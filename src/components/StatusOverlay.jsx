import { useEffect, useRef } from 'react';
import './StatusOverlay.css';

// Mensaje central sobre el formulario: "loading" mientras se genera, "success" al terminar.
// El de éxito se cierra con la X, con Escape o con un clic fuera, y el formulario queda como estaba.
const StatusOverlay = ({ status, onReset, onClose }) => {
  const resetRef = useRef(null);

  useEffect(() => {
    if (!status) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [status]);

  useEffect(() => {
    if (status?.phase === 'success') resetRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (status?.phase !== 'success') return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, onClose]);

  if (!status) return null;
  const success = status.phase === 'success';

  return (
    <div
      className="status-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-overlay-title"
      onClick={success ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div className="status-card">
        {success ? (
          <button type="button" className="status-close" aria-label="Cerrar y volver al formulario" onClick={onClose}>
            &times;
          </button>
        ) : null}
        {success ? (
          <svg className="status-check" viewBox="0 0 52 52" aria-hidden="true">
            <circle className="status-check-circle" cx="26" cy="26" r="24" />
            <path className="status-check-mark" d="M15 27l7 7 15-15" />
          </svg>
        ) : (
          <div className="status-spinner" aria-hidden="true" />
        )}
        <h2 id="status-overlay-title" className="status-title" aria-live="polite">{status.message}</h2>
        {status.detail ? <p className="status-detail">{status.detail}</p> : null}
        {success ? (
          <div className="status-actions">
            <button ref={resetRef} type="button" className="btn generate-btn px-4" onClick={onReset}>
              Limpiar formulario y crear otra proforma
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatusOverlay;
