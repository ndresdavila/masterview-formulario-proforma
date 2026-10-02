import React, { useMemo } from 'react';
import './DynamicRows.css';

export default function DynamicRows({ rows, setRows, addRow }) {

  const removeLastRow = () => {
    if (rows.length > 1) {
      setRows(rows.slice(0, -1));
    }
  };

  // Conserva coma y punto: 50,318.00 y 24978,00 son pesos reales.
  const handleNumericChange = (e, index, field) => {
    const cleaned = e.target.value.replace(/[^0-9.,]/g, "");
    const nr = [...rows];
    nr[index][field] = cleaned;
    setRows(nr);
  };

  return (
    <>
      {/* === CABECERAS === */}
      <div className="dynamic-rows-grid dynamic-rows-header border fw-bold text-center mb-0 mt-4 rounded-top align-items-center">
        <label className="py-2 m-0 small text-uppercase">Container / Seals</label>
        <label className="py-2 m-0 small text-uppercase">Pkgs</label>
        <label className="py-2 m-0 small text-uppercase">Description</label>
        <label className="py-2 m-0 small text-uppercase">Gross W.</label>
        <label className="py-2 m-0 small text-uppercase">Net W.</label>
        <label className="py-2 m-0 small text-uppercase">Meas.</label>
      </div>

      {/* === FILAS DINÁMICAS === */}
      {rows.map((row, index) => (
        <div key={index}
          className="dynamic-rows-grid border-start border-end border-bottom p-2 mb-0 row-card bg-white"
        >
          {/* Columna 1: Marks & Numbers + Container */}
          <div className="d-flex flex-column gap-1">

            <textarea
              className="form-control form-control-sm mb-1"
              style={{ height: "45px", resize: "none" }}
              placeholder="Container No."
              value={row.container}
              onChange={e => {
                const nr = [...rows];
                nr[index].container = e.target.value;
                setRows(nr);
              }}
            />

            <textarea
              className="form-control form-control-sm"
              style={{ height: "45px", resize: "none" }}
              placeholder="Seals No."
              value={row.seals}
              onChange={e => {
                const nr = [...rows];
                nr[index].seals = e.target.value;
                setRows(nr);
              }}
            />

          </div>

          {/* Number of packages */}
          <textarea
            className="form-control form-control-sm"
            style={{ height: "auto", resize: "none" }}
            placeholder="0"
            value={row.packages}
            onChange={e => handleNumericChange(e, index, "packages")}
          />

          {/* Description */}
          <textarea
            className="form-control form-control-sm"
            style={{ height: '125px', resize: 'none' }}
            placeholder="Description..."
            value={row.description}
            onChange={e => {
              const nr = [...rows];
              nr[index].description = e.target.value;
              setRows(nr);
            }}
          />

          {/* Gross Weight */}
          <textarea
            className="form-control form-control-sm"
            style={{ height: "auto", resize: "none" }}
            placeholder="0.00"
            value={row.grossWeight}
            onChange={e => handleNumericChange(e, index, "grossWeight")}
          />

          {/* Net Weight */}
          <textarea
            className="form-control form-control-sm"
            style={{ height: "auto", resize: "none" }}
            placeholder="0.00"
            value={row.netWeight}
            onChange={e => handleNumericChange(e, index, "netWeight")}
          />

          {/* Measurements */}
          <textarea
            className="form-control form-control-sm"
            style={{ height: "auto", resize: "none" }}
            placeholder="0.00"
            value={row.measurements}
            onChange={e => handleNumericChange(e, index, "measurements")}
          />

        </div>
      ))}

      {/* === BOTONES === */}
      <div className="my-3 d-flex gap-2 justify-content-end">
        {rows.length > 1 && (
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={removeLastRow}>
            <i className="bi bi-dash-circle me-1"></i> Borrar
          </button>
        )}
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={addRow}>
          <i className="bi bi-plus-circle me-1"></i> Agregar fila
        </button>
      </div>

      {/* === TABLA DE TOTALES REMOVIDA === */}

    </>
  );
}
