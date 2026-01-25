import React from 'react';

export default function PortDetails() {
  return (
    <div className="row mt-4">
      <div className="col-3">
        <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Vessel</label>
        <input id="vessel" type="text" className="form-control mt-0" name="vesselVoy" placeholder="Enter vessel" />
      </div>
      <div className="col-3">
        <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Voy Nº</label>
        <input id="voy_number" type="text" className="form-control mt-0" name="vesselVoy" placeholder="Enter voyage number" />
      </div>
      <div className="col-3">
        <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Port of Loading</label>
        <input id="portOfLoading" type="text" className="form-control mt-0" name="portOfLoading" placeholder="Enter port of loading" />
      </div>
      <div className="col-3">
        <label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0 rounded-top">Port of Discharge</label>
        <input id="portOfDischarge" type="text" className="form-control rounded-bottom" name="portOfDischarge" placeholder="Enter port of discharge" />
      </div>
    </div>
  );
}