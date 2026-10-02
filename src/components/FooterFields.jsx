import React from 'react';

export default function FooterFields({ emailOption, setEmailOption, emailValue, setEmailValue }) {
  return (
    <div className="row mt-4 pt-3 border-top">
      <div className="col-12">
        <label className="form-label fw-bold mb-2">¿Desea recibir correo?</label>

        <div className="d-flex gap-4">
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
        <div className="col-md-8 mt-3">
          <label className="form-label fw-bold small text-uppercase text-secondary">
            Correos destinatarios (separados por coma)
          </label>
          <textarea
            id="emailList"
            className="form-control"
            rows="2"
            placeholder="ejemplo@masterview.com, logistica@empresa.com"
            value={emailValue}
            onChange={e => setEmailValue(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
