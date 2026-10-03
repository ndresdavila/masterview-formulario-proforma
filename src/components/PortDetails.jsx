import React from 'react';

export default function PortDetails({ formData, onChange }) {
  return (
    <div className="party-block mb-3">
      <div className="d-flex flex-wrap align-items-end gap-3">
        <div className="field-vessel">
          <label className="form-label fw-bold small text-uppercase text-secondary">Vessel<span className="req-star">*</span></label>
          <input
            type="text"
            className="form-control"
            name="vessel"
            placeholder="Ingrese el buque"
            value={formData.vessel}
            onChange={onChange}
          />
        </div>
        <div className="field-voy">
          <label className="form-label fw-bold small text-uppercase text-secondary">Voy Nº<span className="req-star">*</span></label>
          <input
            type="text"
            className="form-control"
            name="voy_number"
            placeholder="70N"
            value={formData.voy_number}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="row mt-3">
        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold small text-uppercase text-secondary">Port of Loading<span className="req-star">*</span></label>
          <input
            type="text"
            className="form-control"
            name="port_of_loading"
            placeholder="Ingrese el puerto de carga"
            value={formData.port_of_loading}
            onChange={onChange}
          />
        </div>
        <div className="col-md-6 mb-0">
          <label className="form-label fw-bold small text-uppercase text-secondary">Port of Discharge<span className="req-star">*</span></label>
          <input
            type="text"
            className="form-control"
            name="port_of_discharge"
            placeholder="Ingrese el puerto de descarga"
            value={formData.port_of_discharge}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
}
