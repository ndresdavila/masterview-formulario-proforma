import React from 'react';

export default function PartyDetails({ formData, onChange }) {
  return (
    <>
      {/* === SHIPPER + BOOKING === */}
      <div className="row mb-4">
        <div className="col-md-8">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Shipper / Export
          </label>
          <textarea
            className="form-control"
            name="shipper"
            rows="5"
            placeholder="Principal or Seller licensee and full address"
            style={{ resize: "none" }}
            value={formData.shipper}
            onChange={onChange}
          />
        </div>

        <div className="col-md-4">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Booking Number
          </label>
          <input
            type="text"
            className="form-control mb-3"
            name="booking_number"
            placeholder="ZIMUGYL… / GYEG… / 6464…"
            value={formData.booking_number}
            onChange={onChange}
          />
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Bill of Lading No.
          </label>
          <input
            type="text"
            className="form-control"
            name="bill_of_lading_number"
            placeholder="Opcional. Vacío si aún no hay BL"
            value={formData.bill_of_lading_number}
            onChange={onChange}
          />
        </div>
      </div>

      {/* === CONSIGNEE === */}
      <div className="row mb-4">
        <div className="col-md-8">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Consignee
          </label>
          <textarea
            className="form-control"
            name="consignee"
            rows="5"
            placeholder="Name and Full Address"
            style={{ resize: "none" }}
            value={formData.consignee}
            onChange={onChange}
          />
        </div>
      </div>

      {/* === NOTIFY PARTY === */}
      <div className="row mb-4">
        <div className="col-md-8">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Notify Party
          </label>
          <textarea
            className="form-control"
            name="notify_party"
            rows="5"
            placeholder="Name and Full Address"
            style={{ resize: "none" }}
            value={formData.notify_party}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-8">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            2nd Notify
          </label>
          <textarea
            className="form-control"
            name="second_notify"
            rows="3"
            placeholder="Opcional. Vacío si no hay segundo notify"
            style={{ resize: "none" }}
            value={formData.second_notify}
            onChange={onChange}
          />
        </div>
      </div>
    </>
  );
}

