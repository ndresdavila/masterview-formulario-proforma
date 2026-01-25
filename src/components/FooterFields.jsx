import React from 'react';

export default function FooterFields({ emailOption, setEmailOption, emailValue, setEmailValue }) {
  return (
    <>
      {/* === CAMPOS EXISTENTES === */}
      <div className="row">
        <div className="col-3"><label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Marcas</label></div>
        <div className="col-2"><label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Total Pkgs</label></div>
        <div className="col-5"><label className="form-label fw-bold border p-2 d-block bg-primary-subtle text-start mb-0">Description of Packages and Goods</label></div>
      </div>

      <div className="row">
        <div className="col-3"><textarea className="form-control mt-0" rows="6" placeholder="Enter marks information" style={{ resize: 'none' }} /></div>
        <div className="col-2"><textarea className="form-control mt-0" rows="1" placeholder="Enter total packages" style={{ resize: 'none' }} /></div>
        <div className="col-5"><textarea className="form-control mt-0" rows="6" placeholder="Enter description of packages and goods" style={{ resize: 'none' }} /></div>
      </div>

      {/* === NUEVA SECCIÓN === */}
      <div className="row mt-4">
        <div className="col-4">
          <label className="form-label fw-bold">¿Desea recibir correo?</label>

          <div className="form-check">
            <input
              type="radio"
              id="emailYes"
              name="emailOption"
              className="form-check-input"
              checked={emailOption === 'yes'}
              onChange={() => setEmailOption('yes')}
            />
            <label className="form-check-label" htmlFor="emailYes">Sí</label>
          </div>

          <div className="form-check">
            <input
              type="radio"
              id="emailNo"
              name="emailOption"
              className="form-check-input"
              checked={emailOption === 'no'}
              onChange={() => setEmailOption('no')}
            />
            <label className="form-check-label" htmlFor="emailNo">No</label>
          </div>
        </div>
      </div>

      {emailOption === 'yes' && (
        <div className="row mt-3">
          <div className="col-6">
            <label className="form-label fw-bold">
              Correos electrónicos que recibirán el documento:
            </label>
            <textarea
              id="emailList"
              className="form-control"
              rows="2"
              placeholder="Ingrese correo(s) electrónico(s)"
              value={emailValue}
              onChange={e => setEmailValue(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
