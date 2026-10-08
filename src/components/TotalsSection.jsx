import React from 'react';
import AutoTextarea from './AutoTextarea';
import { formatAmount, parseAmount } from '../utils/amount';
import { readSummaryFigures, sameAmount } from '../utils/summaryCheck';
import './TotalsSection.css';

function checkLine(summary, found, expectedRaw) {
    if (!String(summary || '').trim()) return null;
    const expected = parseAmount(expectedRaw);
    if (found == null) return { ok: false, text: 'No aparece en el texto' };
    if (expected == null || !sameAmount(found, expected)) {
        return { ok: false, text: `En el texto: ${formatAmount(found)}` };
    }
    return { ok: true, text: 'Coincide' };
}

function TotalFigure({ label, value, unit, status }) {
    const shown = value || (unit ? '0.0' : '0');
    return (
        <div className="totals-figure">
            <span className="totals-caption">{label}</span>
            <div className="totals-value">{unit ? `${shown} ${unit}` : shown}</div>
            {status && (
                <div className={status.ok ? 'totals-check ok' : 'totals-check bad'}>{status.text}</div>
            )}
        </div>
    );
}

export default function TotalsSection({
    globalMarks, setGlobalMarks,
    cargoSummary, setCargoSummary,
    sumPackages, sumNet, sumGross, sumCbm,
}) {
    const found = readSummaryFigures(cargoSummary);

    return (
        <>
            <div className="party-block mb-3">
                <div className="summary-split">
                    <div>
                        <label className="totals-caption">Marks and Numbers <span className="opt-tag">(Opcional)</span></label>
                        <AutoTextarea
                            className="form-control"
                            rows="8"
                            placeholder="Ingrese las marcas"
                            value={globalMarks}
                            onChange={(e) => setGlobalMarks(e.target.value)}
                            style={{ resize: 'none' }}
                        />
                    </div>
                    <div>
                        <label className="totals-caption">Descripción<span className="req-star">*</span></label>
                        <AutoTextarea
                            className="form-control"
                            rows="8"
                            placeholder="Ingrese el resumen"
                            value={cargoSummary}
                            onChange={(e) => setCargoSummary(e.target.value)}
                            style={{ resize: 'none' }}
                        />
                    </div>
                </div>
            </div>

            <div className="totals-info mb-3">
                <div className="totals-info-grid">
                    <TotalFigure
                        label="Total packages"
                        value={sumPackages}
                        status={checkLine(cargoSummary, found.packages, sumPackages)}
                    />
                    <TotalFigure
                        label="Total net weight"
                        value={sumNet}
                        unit="KG"
                        status={checkLine(cargoSummary, found.net, sumNet)}
                    />
                    <TotalFigure
                        label="Total gross weight"
                        value={sumGross}
                        unit="KG"
                        status={checkLine(cargoSummary, found.gross, sumGross)}
                    />
                    <TotalFigure
                        label="Measurement"
                        value={sumCbm}
                        unit="CBM"
                    />
                </div>
            </div>
        </>
    );
}
