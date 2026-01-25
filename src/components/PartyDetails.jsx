export default function PartyDetails() {
  return (
    <>
      {/* === SHIPPER + BOOKING === */}
      <div className="row">
        <div className="col-6">
          <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">
            SHIPPER/EXPORT
          </label>
          <textarea
            id="shipper"
            className="form-control mt-0"
            name="shipper"
            rows="6"
            placeholder="SHIPPER/EXPORT: Principal or Seller licensee and full address"
            style={{ resize: "none" }}
          />
        </div>

        <div className="col-3">
          <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">
            Booking Number
          </label>
          <input
            id="bookingNumber"
            type="text"
            className="form-control mt-0"
            name="bookingNumber"
            placeholder="Enter booking number"
          />
        </div>
      </div>

      {/* === CONSIGNEE === */}
      <div className="row mt-4">
        <div className="col-6">
          <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">
            CONSIGNEE
          </label>
          <textarea
            id="consignee"
            className="form-control mt-0"
            name="consignee"
            rows="6"
            placeholder="CONSIGNEE: Name and Full Address / Non-Negotiable Unless Consigned to Order"
            style={{ resize: "none" }}
          />
        </div>
      </div>

      {/* === NOTIFY PARTY === */}
      <div className="row g-0 mt-4">
        <div className="col-6 pe-1">
          <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">
            NOTIFY PARTY
          </label>
          <textarea
            id="notify"
            className="form-control mt-0"
            name="notifyParty"
            rows="6"
            placeholder="NOTIFY PARTY: Name and full address"
            style={{ resize: "none" }}
          />
        </div>
      </div>
    </>
  );
}
