import React from 'react';

export default function PortDetails({ formData, onChange }) {
  return (
    <div className="row mt-4 mb-4">
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Vessel</label>
        <input
          type="text"
          className="form-control"
          name="vessel"
          placeholder="Enter vessel"
          value={formData.vessel}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Voy Nº</label>
        <input
          type="text"
          className="form-control"
          name="voy_number"
          placeholder="Enter voyage number"
          value={formData.voy_number}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Port of Loading</label>
        <input
          type="text"
          className="form-control"
          name="port_of_loading"
          placeholder="Enter port of loading"
          value={formData.port_of_loading}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Port of Discharge</label>
        <input
          type="text"
          className="form-control"
          name="port_of_discharge"
          placeholder="Enter port of discharge"
          value={formData.port_of_discharge}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Port of Delivery</label>
        <input
          type="text"
          className="form-control"
          name="place_of_delivery"
          placeholder="Si es el mismo, se usa el de descarga"
          value={formData.place_of_delivery}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Type of Move</label>
        <input
          type="text"
          className="form-control"
          name="type_of_move"
          placeholder="FCL / FCL"
          value={formData.type_of_move}
          onChange={onChange}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Freight</label>
        <input
          type="text"
          className="form-control"
          name="freight_payable"
          placeholder="FREIGHT COLLECT o FREIGHT PAYABLE AT DESTINATION"
          value={formData.freight_payable}
          onChange={onChange}
        />
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Place and date of issue</label>
        <input
          type="text"
          className="form-control"
          name="issue_date"
          placeholder="Opcional"
          value={formData.issue_date}
          onChange={onChange}
        />
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label fw-bold small text-uppercase text-secondary">Shipped on board</label>
        <input
          type="text"
          className="form-control"
          name="shipped_on_board"
          placeholder="Opcional"
          value={formData.shipped_on_board}
          onChange={onChange}
        />
      </div>
    </div>
  );
}