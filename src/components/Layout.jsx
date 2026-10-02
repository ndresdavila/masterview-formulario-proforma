import React, { useState, useRef, useEffect } from 'react';
import DocumentPreview from './DocumentPreview';
import './Layout.css';

const Layout = ({ children, formData }) => {
    const [showModal, setShowModal] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50); // Percentage
    const [isResizing, setIsResizing] = useState(false);
    const layoutRef = useRef(null);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback((mouseMoveEvent) => {
        if (isResizing && layoutRef.current) {
            const layoutRect = layoutRef.current.getBoundingClientRect();
            const newLeftWidth = ((mouseMoveEvent.clientX - layoutRect.left) / layoutRect.width) * 100;

            // Limit constraints (min 20%, max 80%)
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                setLeftWidth(newLeftWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <div className={`app-layout ${isResizing ? 'disable-selection' : ''}`} ref={layoutRef}>
            {/* Left Column: Form */}
            <div
                className="layout-form-section"
                style={{ width: `${leftWidth}%`, flex: 'none' }}
            >
                <div className="form-page-container">
                    {children}
                </div>
            </div>

            {/* Resizer Handle */}
            <div
                className={`resizer ${isResizing ? 'resizing' : ''}`}
                onMouseDown={startResizing}
            >
                <div className="resizer-handle-icon">
                    <i className="bi bi-chevron-left"></i>
                    <i className="bi bi-chevron-right"></i>
                </div>
            </div>

            {/* Right Column: Preview (Desktop) */}
            <div
                className="layout-preview-section"
                style={{ width: `${100 - leftWidth}%`, flex: 'none' }}
            >
                <div className="preview-sticky-wrapper">
                    <DocumentPreview data={formData} />
                </div>
            </div>

            {/* Mobile Floating Button */}
            <button
                className="fab-preview"
                onClick={() => setShowModal(true)}
                title="Ver Vista Previa"
            >
                <i className="bi bi-search"></i>
            </button>

            {/* Mobile Modal */}
            {showModal && (
                <div className="preview-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setShowModal(false)}>&times;</button>
                        <DocumentPreview data={formData} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
