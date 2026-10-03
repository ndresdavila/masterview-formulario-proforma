import React from 'react';
import AutoTextarea from './AutoTextarea';

export default function PartyDetails({ formData, onChange }) {
  return (
    <>
      <div className="party-block mb-3">
        <div className="field-booking">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Booking Number<span className="req-star">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            name="booking_number"
            placeholder="Ingrese el número de booking"
            value={formData.booking_number}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="party-block mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">
          Shipper / Export<span className="req-star">*</span>
        </label>
        <AutoTextarea
          className="form-control"
          name="shipper"
          rows="5"
          placeholder="Nombre y dirección completa"
          style={{ resize: "none" }}
          value={formData.shipper}
          onChange={onChange}
        />
      </div>

      {/* === CONSIGNEE === */}
      <div className="party-block mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">
          Consignee<span className="req-star">*</span>
        </label>
        <AutoTextarea
          className="form-control"
          name="consignee"
          rows="5"
          placeholder="Nombre y dirección completa"
          style={{ resize: "none" }}
          value={formData.consignee}
          onChange={onChange}
        />
      </div>

      <div className="party-block mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">
          Notify Party<span className="req-star">*</span>
        </label>
        <AutoTextarea
          className="form-control"
          name="notify_party"
          rows="5"
          placeholder="Nombre y dirección completa"
          style={{ resize: "none" }}
          value={formData.notify_party}
          onChange={onChange}
        />
      </div>

      <div className="party-block mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">
          Second Notify <span className="opt-tag">(Opcional)</span>
        </label>
        <AutoTextarea
          className="form-control"
          name="second_notify"
          rows="3"
          placeholder="Nombre y dirección completa"
          style={{ resize: "none" }}
          value={formData.second_notify}
          onChange={onChange}
        />
      </div>
    </>
  );
}

