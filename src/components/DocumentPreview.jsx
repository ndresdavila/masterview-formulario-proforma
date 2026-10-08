import React from 'react';
import './DocumentPreview.css';
import logoImg from '../assets/logo.png';
import { containerDescription, summaryDescription } from '../utils/proformaText';
import { formatWeight } from '../utils/amount';

const DocumentPreview = ({ data }) => {
    const containerRef = React.useRef(null);
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        const calculateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                // Standard A4 width in pixels (approx) + padding margin
                const targetBaseWidth = 850; // 210mm is ~794px, adding buffer

                // Keep 80% width logic relative to container, 
                // BUT we want the page to be fixed width and scaled down.
                // New logic: Fit 794px into available width with some margin.
                // Circle handle is ~44px wide, overlaps ~15px. Need more buffer than 20px.
                // Standard padding 20px + extra safety for handle = 40px per side => 80px total.
                const availableWidth = containerWidth - 80;
                let newScale = availableWidth / 794;

                // Cap scale at 1.0 (don't zoom in too much on huge screens)
                if (newScale > 1) newScale = 1;

                setScale(newScale);
            }
        };

        const observer = new ResizeObserver(calculateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
            calculateScale(); // Initial cal
        }

        return () => observer.disconnect();
    }, []);

    const {
        shipper,
        consignee,
        notify_party,
        second_notify,
        booking_number,
        vessel,
        voy_number,
        port_of_loading,
        port_of_discharge,
        rows = [],
        globalMarks,
        cargoSummary,
        sums = {},
        place_of_delivery,
        bill_of_lading_number,
        freight_payable,
        issue_date,
        shipped_on_board,
    } = data;

    return (
        <div className="document-preview-container" ref={containerRef}>
            <div
                className="bl-page"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: `-${(1 - scale) * 1123}px` // Compensate for vertical space if needed, approx A4 height
                    // Actually, let's just use simple scaling and let flexbox handle position
                }}
            >
                <div className="bl-border-container">

                    {/* HEADER ROW */}
                    <div className="bl-header-row">
                        <div className="bl-header-left">
                            <div className="bl-title-box">
                                <h3 className="bl-title">BILL OF LADING</h3>
                                <div className="bl-subtitle">(CONTINUED FROM REVERSE SIDE)</div>
                            </div>
                        </div>
                        <div className="bl-header-right">
                            <div className="bl-sub-header">FOR EITHER COMBINED TRANSPORT OR PORT TO PORT SHIPMENT</div>
                        </div>
                    </div>

                    {/* GRID SECTION 1 */}
                    <div className="bl-grid-section-1">
                        {/* Shipper */}
                        <div className="bl-cell bl-shipper">
                            <span className="bl-label">Shipper</span>
                            <div className="bl-content-area">{shipper}</div>
                        </div>

                        {/* Booking & BL No */}
                        <div className="bl-cell bl-booking">
                            <span className="bl-label">Booking No.</span>
                            <div className="bl-content-area">{booking_number}</div>
                        </div>
                        <div className="bl-cell bl-bl-no">
                            <span className="bl-label">Bill of Lading No.</span>
                            <div className="bl-content-area">{bill_of_lading_number}</div>
                        </div>

                        {/* Consignee */}
                        <div className="bl-cell bl-consignee">
                            <div className="bl-dotted-separator"></div>
                            <span className="bl-label">Consignee</span>
                            <div className="bl-content-area">{consignee}</div>
                        </div>

                        {/* LOGO AREA (Spans nicely) */}
                        <div className="bl-cell bl-logo-area">
                            <div className="logo-placeholder">
                                <img src={logoImg} alt="Masterview Logo" className="bl-logo-img" />
                                <div className="bl-company-name">MASTERVIEW S.A.</div>
                                <div className="bl-slogan">Your cargo, our commitment</div>
                            </div>
                        </div>

                        {/* Notify Party */}
                        <div className="bl-cell bl-notify">
                            <div className="bl-dotted-separator"></div>
                            <span className="bl-label">Notify Party</span>
                            <div className="bl-content-area" style={{ whiteSpace: 'pre-wrap' }}>
                                {notify_party}
                                {second_notify ? `\n\nSecond Notify:\n${second_notify}` : ''}
                            </div>
                        </div>
                    </div>

                    {/* TRANSIT DETAILS */}
                    <div className="bl-grid-transit">
                        <div className="bl-cell bl-pre-carriage">
                            <span className="bl-label">Pre-Carriage by *</span>
                        </div>
                        <div className="bl-cell bl-receipt">
                            <span className="bl-label">Place of Receipt *</span>
                        </div>

                        <div className="bl-cell bl-vessel">
                            <span className="bl-label">Vessel</span>
                            <div className="bl-content-inline">{vessel}</div>
                        </div>
                        <div className="bl-cell bl-voy">
                            <span className="bl-label">Voy Nº</span>
                            <div className="bl-content-inline">{voy_number}</div>
                        </div>
                        <div className="bl-cell bl-pol">
                            <span className="bl-label">Port of Loading</span>
                            <div className="bl-content-inline">{port_of_loading}</div>
                        </div>

                        <div className="bl-cell bl-pod">
                            <span className="bl-label">Port of Discharge</span>
                            <div className="bl-content-inline">{port_of_discharge}</div>
                        </div>
                        <div className="bl-cell bl-del">
                            <span className="bl-label">Place of Delivery *</span>
                            <div className="bl-content-inline">{place_of_delivery}</div>
                        </div>
                    </div>

                    {/* GOODS TABLE HEADER */}
                    <div className="bl-goods-header">
                        <div className="bl-col bl-marks-header">Marks & Nos / <br /> Containers Nos</div>
                        <div className="bl-col bl-pkgs-header">Nº of Pkgs</div>
                        <div className="bl-col bl-desc-header">Description of Packages and Goods</div>
                        <div className="bl-col bl-gross-header">Gross Weight <br /> (kg.)</div>
                        <div className="bl-col bl-meas-header">Measurement <br /> (m³)</div>
                    </div>

                    {/* GOODS TABLE CONTENT */}
                    <div className="bl-goods-content">
                        {rows.map((row, idx) => (
                            <div className="bl-goods-row" key={idx}>
                                <div className="bl-col bl-marks-content">
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{row.marks}</div>

                                    {(row.container || row.seals) && (
                                        <div style={{ marginTop: '10px' }}>
                                            {row.container && (
                                                <div style={{ marginBottom: '4px' }}>
                                                    <strong>CONTAINER:</strong> <br />
                                                    {row.container}
                                                </div>
                                            )}
                                            {row.seals && (
                                                <div>
                                                    <strong>SEALS:</strong> <br />
                                                    {row.seals}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="bl-col bl-pkgs-content">{row.packages}</div>
                                <div className="bl-col bl-desc-content" style={{ whiteSpace: 'pre-wrap' }}>
                                    {row.description}
                                    {weightLines(row).map((line) => `\n${line}`).join('')}
                                </div>
                                <div className="bl-col bl-gross-content">{formatWeight(row.grossWeight)}</div>
                                <div className="bl-col bl-meas-content">{row.measurements}</div>
                            </div>
                        ))}

                        {/* TOTALS ROW */}
                        <div className="bl-goods-row" style={{ borderTop: '1px solid #000' }}>
                            <div className="bl-col bl-marks-content">
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {globalMarks ? (
                                        <>
                                            <strong>MARCAS:</strong>
                                            <div style={{ marginTop: '2px' }}>{globalMarks}</div>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                            <div className="bl-col bl-pkgs-content">{sums.packages}</div>
                            <div className="bl-col bl-desc-content">
                                <div style={{ fontSize: '8pt', whiteSpace: 'pre-wrap' }}>
                                    {summaryDescription(cargoSummary)}
                                </div>
                            </div>
                            <div className="bl-col bl-gross-content">{sums.gross}</div>
                            <div className="bl-col bl-meas-content">{sums.cbm}</div>
                        </div>

                        {/* Particulars disclaimer */}
                        <div className="bl-disclaimer">
                            <span className="bl-bold-u">Shipper’s load, stow, count, weight and seal</span> - The information appearing on the declaration relating to the quantity and description of the cargo is in each instance based on the shipper's load, count, weight and seal and count. we have no knowledge or information which would lead us to believe or to suspect that the information furnished by the shipper is incomplete, inaccurate, or false in any way.
                        </div>
                    </div>

                    {/* FOOTER TOTALS & CLAUSES */}
                    <div className="bl-footer-section">
                        <div className="bl-footer-row">
                            <div className="bl-footer-label">SHIPPERS DECLARED VALUE $</div>
                            <div className="bl-footer-right-label">{freight_payable || 'FREIGHT PAYABLE AT'}</div>
                        </div>
                        <div className="bl-footer-row border-top-blue">
                            <div className="bl-footer-label">IF NO VALUE, DECLARED LIABILITY LIMITED PER CLAUSE 6</div>
                            <div className="bl-footer-empty"></div>
                        </div>
                    </div>

                    <div className="bl-bottom-grid">
                        <div className="bl-charges-table">
                            <div className="bl-ch-header">FREIGHT & CHARGES</div>
                            <div className="bl-ch-header">PREPAID</div>
                            <div className="bl-ch-header">COLLECT</div>
                            {/* Empty rows for charges */}
                            <div className="bl-ch-row"></div><div className="bl-ch-row"></div><div className="bl-ch-row"></div>
                            <div className="bl-ch-row"></div><div className="bl-ch-row"></div><div className="bl-ch-row"></div>
                        </div>

                        <div className="bl-signatures-area">
                            <div className="bl-legal-text">
                                RECEIVED by Carrier the Goods as specified above in apparent good order and condition unless otherwise stated...
                                <br />(Terms and Conditions of Carriage Apply)
                            </div>
                            <div className="bl-sign-line">
                                <span className="bl-bold">By</span> ____________________________________
                            </div>
                        </div>
                    </div>

                    <div className="bl-date-place">
                        <strong>PLACE AND DATE OF ISSUE:</strong> {issue_date || '—'} <br />
                        <strong>SHIPPED ON BOARD:</strong> {shipped_on_board || '—'}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DocumentPreview;
