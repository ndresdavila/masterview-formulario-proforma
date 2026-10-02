import React from 'react';
import './TotalsSection.css';

function refChange(refs, setRefs, key) {
    return (e) => setRefs({ ...refs, [key]: e.target.value });
}

export default function TotalsSection({
    globalMarks, setGlobalMarks,
    observations, setObservations,
    refs, setRefs,
    sumPackages, sumNet, sumGross, sumCbm,
}) {
    return (
        <div className="mt-4">
            <div className="totals-section-container">
                <div className="totals-col-1 d-flex flex-column gap-3">
                    <div>
                        <label className="form-label fw-bold small text-uppercase text-secondary">Marcas</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Opcional. Shipper, producto, origen, lote, grado…"
                            value={globalMarks}
                            onChange={(e) => setGlobalMarks(e.target.value)}
                            style={{ resize: 'none' }}
                        />
                    </div>
                </div>

                <div className="totals-col-2 border rounded p-3 bg-light d-flex flex-column justify-content-center gap-2">
                    <div>
                        <div className="text-secondary small text-uppercase">Total bultos</div>
                        <div className="fs-4 fw-bold text-primary">{sumPackages || '—'}</div>
                    </div>
                    <div className="small text-secondary">
                        <div>Neto {sumNet || '—'}</div>
                        <div>Bruto {sumGross || '—'}</div>
                        <div>CBM {sumCbm || '—'}</div>
                    </div>
                </div>

                <div className="totals-col-3">
                    <label className="form-label fw-bold small text-uppercase text-secondary">Notas de carga</label>
                    <textarea
                        className="form-control h-100"
                        placeholder="Opcional. Ej. 2 x 20 DRY, EXPRESS RELEASE"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        style={{ resize: 'none', minHeight: '120px' }}
                    />
                </div>
            </div>

            <h6 className="mt-4 mb-2 text-secondary text-uppercase fw-bold" style={{ fontSize: '0.85rem' }}>Referencias</h6>
            <div className="row g-2">
                {[
                    ['dae', 'DAE', '028-2026-…'],
                    ['hs_code', 'HS / P.A.', '180100 o 1604.19.00'],
                    ['fda', 'FDA', 'Opcional'],
                    ['contract', 'Contrato', 'CO. P…'],
                    ['invoice', 'Factura', 'Opcional'],
                    ['lote', 'Lote', 'Opcional'],
                ].map(([key, label, placeholder]) => (
                    <div className="col-md-4" key={key}>
                        <label className="form-label fw-bold small text-uppercase text-secondary">{label}</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={placeholder}
                            value={refs[key]}
                            onChange={refChange(refs, setRefs, key)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
