import PartyDetails from './components/PartyDetails';
import PortDetails from './components/PortDetails';
import DynamicRows from './components/DynamicRows';
import FooterFields from './components/FooterFields';
import { useState, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './custom-toast.css';
import './App.css';

function App() {

  const [emailOption, setEmailOption] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const formRef = useRef(null);

  const [rows, setRows] = useState([
    {
      marks: '',
      container: '',
      packages: '',
      description: '',
      grossWeight: '',
      netWeight: '',
      measurements: ''
    }
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        marks: '',
        container: '',
        packages: '',
        description: '',
        grossWeight: '',
        netWeight: '',
        measurements: ''
      }
    ]);
  };

  const handleSubmitJson = async (e) => {
    e.preventDefault();

    const form = formRef.current;
    const elements = form.querySelectorAll("input, textarea");

    // IDs opcionales
    const optionalIds = ["secondNotify", "secondNotifyContact", "emailList"];

    // === VALIDACIÓN GENERAL DE CAMPOS VACÍOS ===
    for (let el of elements) {
      if (optionalIds.includes(el.id)) continue;

      if (!el.value.trim()) {
        toast.error(
          <div className="toast-content">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <b>Campo requerido:</b> <br /> {el.placeholder || el.name}
          </div>,
          {
            position: "bottom-right",
            className: "error-toast",
            autoClose: 5000,
          }
        );
        return;
      }
    }

    // === VALIDAR RADIO DE EMAIL ===
    if (emailOption === "") {
      toast.error(
        <div className="toast-content">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <b>Campo requerido:</b> <br /> ¿Desea recibir correo?
        </div>,
        {
          position: "bottom-right",
          className: "error-toast",
          autoClose: 5000,
        }
      );
      return;
    }

    // === VALIDAR CORREO SI ELIGIÓ "SÍ" ===
    let email_to = [];

    if (emailOption === "yes") {
      if (!emailValue.trim()) {
        toast.error(
          <div className="toast-content">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <b>Campo requerido:</b> <br /> Correos electrónicos
          </div>,
          {
            position: "bottom-right",
            className: "error-toast",
            autoClose: 5000,
          }
        );
        return;
      }

      // validar emails separados por coma
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      email_to = emailValue
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e !== "");

      for (let em of email_to) {
        if (!emailRegex.test(em)) {
          toast.error(
            <div className="toast-content">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <b>Correo inválido:</b> <br /> {em}
            </div>,
            {
              position: "bottom-right",
              className: "error-toast",
              autoClose: 5000,
            }
          );
          return;
        }
      }
    }

    // === VALIDACIÓN FILAS DINÁMICAS ===
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      if (!r.marks.trim()) return toast.error(`Fila ${i + 1}: Marks & Numbers es requerido.`);
      if (!r.container.trim()) return toast.error(`Fila ${i + 1}: Container Numbers es requerido.`);
      if (!r.description.trim()) return toast.error(`Fila ${i + 1}: Description es requerido.`);
      if (!r.packages.trim()) return toast.error(`Fila ${i + 1}: Packages es requerido.`);
      if (!r.grossWeight.trim()) return toast.error(`Fila ${i + 1}: Gross Weight es requerido.`);
      if (!r.netWeight.trim()) return toast.error(`Fila ${i + 1}: Net Weight es requerido.`);
      if (!r.measurements.trim()) return toast.error(`Fila ${i + 1}: Measurements es requerido.`);
    }

    // === CAPTURAR CAMPOS NORMALES ===
    const shipper = form.shipper.value.trim();
    const consignee = form.consignee.value.trim();
    const notify_party = form.notify.value.trim();
    const booking_number = form.bookingNumber.value.trim();
    const bill_of_lading_number = "";
    const vessel = form.vessel.value.trim();
    const voy_number = form.voy_number?.value?.trim() || "";
    const port_of_loading = form.portOfLoading.value.trim();
    const port_of_discharge = form.portOfDischarge.value.trim();

    // === FILAS ===
    const formattedRows = rows.map((r) => ({
      marks_numbers: r.marks,
      container_numbers: r.container,
      description: r.description,
      packages: Number(r.packages),
      gross_weight: Number(r.grossWeight),
      net_weight: Number(r.netWeight),
      measurements: Number(r.measurements),
    }));

    // === TOTALES ===
    const total_packages = rows.reduce((a, r) => a + Number(r.packages), 0);
    const total_gross_weight = rows.reduce((a, r) => a + Number(r.grossWeight), 0);
    const total_measurements = rows.reduce((a, r) => a + Number(r.measurements), 0);

    const send_email = emailOption === "yes" ? "si" : "no";

    const jsonPayload = {
      template_name: "Template.docx",
      data: {
        shipper,
        consignee,
        notify_party,
        booking_number,
        bill_of_lading_number,
        vessel,
        voy_number,
        port_of_loading,
        port_of_discharge,
        port_of_discharge,
        rows: formattedRows,
        // Totals removed as requested by user
        // total_packages,
        // total_gross_weight,
        // total_measurements,
      },
      send_email,
      email_to,
      email_cc: [],
      email_cco: [],
    };

    // SI TODO OK
    toast.success("Todos los campos están completos. Enviando JSON...");

    descargarJson(jsonPayload);
    // === ENVÍO AL MICROSERVICIO ===
    try {
      const res = await fetch("http://localhost:8100/documents/generate_and_send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });

      const result = await res.json();
      console.log(result);

      toast.success("JSON enviado correctamente.");
    } catch (err) {
      console.error(err);
      toast.error("Error enviando JSON al microservicio.");
    }
  };

  function descargarJson(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "proforma.json";   // Nombre del archivo descargado
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className='border h[90%]'>
      <div className="scale-container">
        <div className="container mt-5">
          <img src="src/assets/logo.png" alt="Logo" className="logo-top mb-4" />
          <h2 className="mb-4">PROFORMA</h2>

          <form ref={formRef}>
            {/* <FormHeader /> */}
            <PartyDetails />
            <PortDetails />
            <DynamicRows rows={rows} setRows={setRows} addRow={addRow} />
            <FooterFields
              emailOption={emailOption}
              setEmailOption={setEmailOption}
              emailValue={emailValue}
              setEmailValue={setEmailValue}
            />

            <div className="mb-3 mt-4">
              <button type="button" className="btn btn-primary" onClick={handleSubmitJson}>
                Generar
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;