import { useEffect, useRef } from 'react';
import './StatusOverlay.css';

// Mensaje central sobre el formulario: "loading" mientras se genera, "success" al terminar.
const StatusOverlay = ({ status, onReset }) => {
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

  if (!status) return null;
  const success = status.phase === 'success';

  return (
    <div className="status-overlay" role="dialog" aria-modal="true" aria-labelledby="status-overlay-title">
      <div className="status-card">
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
