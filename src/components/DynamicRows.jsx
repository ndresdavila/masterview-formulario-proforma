import React, { useMemo } from 'react';

export default function DynamicRows({ rows, setRows, addRow }) {

  const removeLastRow = () => {
    if (rows.length > 1) {
      setRows(rows.slice(0, -1));
    }
  };

  // === Cálculo de totales ===
  const totals = useMemo(() => {
    let totalPackages = 0;
    let totalGross = 0;
    let totalMeasurements = 0;

    rows.forEach(r => {
      totalPackages += Number(r.packages || 0);
      totalGross += Number(r.grossWeight || 0);
      totalMeasurements += Number(r.measurements || 0);
    });

    return {
      packages: totalPackages,
      gross: totalGross,
      measurements: totalMeasurements
    };
  }, [rows]);


  // === Handler para valores numéricos ===
  const handleNumericChange = (e, index, field) => {
    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
    const nr = [...rows];
    nr[index][field] = cleaned;
    setRows(nr);
  };

  return (
    <>
      {/* === CABECERAS === */}
      <div className="d-grid border bg-primary-subtle fw-bold text-center mb-0 mt-4 rounded-top"
        style={{ gridTemplateColumns: '2fr 1fr 3fr 1fr 1fr 1fr' }}
      >
        <label className="border py-1 m-0">Marks & Numbers /<br /> Container Numbers</label>
        <label className="border py-1 m-0">No. of packages (individual)</label>
        <label className="border py-1 m-0">Description of packages & goods</label>
        <label className="border py-1 m-0">Gross Weight</label>
        <label className="border py-1 m-0">Net Weight</label>
        <label className="border py-1 m-0">Measurements</label>
      </div>

      {/* === FILAS DINÁMICAS === */}
      {rows.map((row, index) => (
        <div key={index}
          className="border p-2 mb-2"
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr 1fr 1fr 1fr', gap: '6px' }}
        >
          {/* Columna 1: Marks & Numbers + Container */}
          <div className="d-flex flex-column">

            <textarea
              className="form-control mb-1"
              style={{ height: '60px', resize: 'none' }}
              placeholder="Marks & Numbers"
              value={row.marks}
              onChange={e => {
                const nr = [...rows];
                nr[index].marks = e.target.value;
                setRows(nr);
              }}
            />

            <textarea
              className="form-control mb-1"
              style={{ height: "90px", resize: "none", verticalAlign: "top" }}
              placeholder="Container Numbers"
              value={row.container}
              onChange={e => {
                const nr = [...rows];
                nr[index].container = e.target.value;
                setRows(nr);
              }}
            />

          </div>

          {/* Number of packages */}
          <textarea
            className="form-control"
            style={{ height: "60px", resize: "none", paddingTop: "4px" }}
            placeholder="0"
            value={row.packages}
            onChange={e => handleNumericChange(e, index, "packages")}
          />

          {/* Description */}
          <textarea
            className="form-control resize-none"
            style={{ height: '160px' }}
            placeholder="Description here..."
            value={row.description}
            onChange={e => {
              const nr = [...rows];
              nr[index].description = e.target.value;
              setRows(nr);
            }}
          />

          {/* Gross Weight */}
          <textarea
            className="form-control"
            style={{ height: "60px", resize: "none", paddingTop: "4px" }}
            placeholder="0"
            value={row.grossWeight}
            onChange={e => handleNumericChange(e, index, "grossWeight")}
          />

          {/* Net Weight */}
          <textarea
            className="form-control"
            style={{ height: "60px", resize: "none", paddingTop: "4px" }}
            placeholder="0"
            value={row.netWeight}
            onChange={e => handleNumericChange(e, index, "netWeight")}
          />

          {/* Measurements */}
          <textarea
            className="form-control"
            style={{ height: "60px", resize: "none", paddingTop: "4px" }}
            placeholder="0"
            value={row.measurements}
            onChange={e => handleNumericChange(e, index, "measurements")}
          />

        </div>
      ))}

      {/* === BOTONES === */}
      <div className="my-3 d-flex gap-2">
        <button type="button" className="btn btn-success" onClick={addRow}>Agregar fila</button>
        {rows.length > 1 && (
          <button type="button" className="btn btn-danger" onClick={removeLastRow}>Borrar fila</button>
        )}
      </div>

      {/* === TABLA DE TOTALES === */}
      <div className="border rounded p-2 mb-4">
        <div className="d-grid fw-bold text-center mb-2"
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
        >
          <div className="border p-2">
            Total Number of Packages:
            <div className="fw-normal fs-5 mt-1">{totals.packages}</div>
          </div>

          <div className="border p-2">
            Total Gross Weight:
            <div className="fw-normal fs-5 mt-1">{totals.gross} KGB</div>
          </div>

          <div className="border p-2">
            Total Measurement:
            <div className="fw-normal fs-5 mt-1">{totals.measurements} CBM</div>
          </div>
        </div>
      </div>
    </>
  );
}