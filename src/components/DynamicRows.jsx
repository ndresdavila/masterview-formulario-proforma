import React, { useEffect, useRef } from 'react';
import AutoTextarea from './AutoTextarea';
import { cargoFieldsFromDescription } from '../utils/cargoFigures';
import './DynamicRows.css';

export default function DynamicRows({ rows, setRows, addRow }) {
  const previousCount = useRef(rows.length);
  const addButton = useRef(null);

  useEffect(() => {
    if (rows.length > previousCount.current) {
      addButton.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    previousCount.current = rows.length;
  }, [rows.length]);

  const updateField = (index, field, value) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
  };

  // Rellena bultos, pesos y measurement con lo que el cliente ya escribió en la
  // descripción, sin pisar un valor que el usuario haya cambiado a mano.
  const handleDescriptionChange = (index, description) => {
    const row = rows[index];
    const found = cargoFieldsFromDescription(description);
    const previous = row.autoFilled || {};
    const next = { ...row, description, autoFilled: found };
    for (const field of Object.keys(found)) {
      const current = String(row[field] ?? '');
      if (!current.trim() || current === previous[field]) next[field] = found[field];
    }
    setRows(rows.map((r, i) => (i === index ? next : r)));
  };

  const handleNumericChange = (e, index, field) => {
    updateField(index, field, e.target.value.replace(/[^0-9.,]/g, ''));
  };

  const removeRow = (index) => {
    if (rows.length < 2) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  return (
    <>
      {rows.map((row, index) => (
        <div
          key={row.id || index}
          className="party-block cargo-item mb-3"
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="cargo-item-title">Contenedor {index + 1}</span>
            {rows.length > 1 && (
              <button type="button" className="btn btn-sm cargo-remove-btn" onClick={() => removeRow(index)}>
                Quitar
              </button>
            )}
          </div>

          <div className="cargo-pair">
            <div>
              <label className="form-label cargo-field-label">
                Nº de contenedor<span className="req-star">*</span>
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="N.º de contenedor"
                value={row.container}
                onChange={(e) => updateField(index, 'container', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label cargo-field-label">
                Nº de sello / sellos<span className="req-star">*</span>
              </label>
              <AutoTextarea
                className="form-control form-control-sm"
                rows="1"
                placeholder="N.º de sellos"
                value={row.seals}
                onChange={(e) => updateField(index, 'seals', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label cargo-field-label">
              Descripción<span className="req-star">*</span>
            </label>
            <AutoTextarea
              className="form-control form-control-sm"
              rows="3"
              placeholder="Descripción..."
              style={{ resize: 'none' }}
              value={row.description}
              onChange={(e) => handleDescriptionChange(index, e.target.value)}
            />
          </div>

          <div className="cargo-weights mt-3">
            <div>
              <label className="form-label cargo-field-label">
                Nº de bultos<span className="req-star">*</span>
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="0"
                value={row.packages}
                onChange={(e) => handleNumericChange(e, index, 'packages')}
              />
            </div>
            <div>
              <label className="form-label cargo-field-label">
                Peso neto (kg)<span className="req-star">*</span>
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="0.00"
                value={row.netWeight}
                onChange={(e) => handleNumericChange(e, index, 'netWeight')}
              />
            </div>
            <div>
              <label className="form-label cargo-field-label">
                Peso bruto (kg)<span className="req-star">*</span>
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="0.00"
                value={row.grossWeight}
                onChange={(e) => handleNumericChange(e, index, 'grossWeight')}
              />
            </div>
            <div>
              <label className="form-label cargo-field-label">
                Measurement (m³)<span className="req-star">*</span>
              </label>
              <input
                className="form-control form-control-sm"
                placeholder="0.00"
                value={row.measurements}
                onChange={(e) => handleNumericChange(e, index, 'measurements')}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="d-flex justify-content-end mb-3">
        <button ref={addButton} type="button" className="btn btn-sm cargo-add-btn" onClick={addRow}>
          <i className="bi bi-plus-circle me-1"></i> Agregar contenedor
        </button>
      </div>
    </>
  );
}
