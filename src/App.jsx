import { useState, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './custom-toast.css';
import './App.css';

import Layout from './components/Layout';
import PartyDetails from './components/PartyDetails';
import PortDetails from './components/PortDetails';
import DynamicRows from './components/DynamicRows';
import FooterFields from './components/FooterFields';
import TotalsSection from './components/TotalsSection';
import { formatAmount, parseAmount } from './utils/amount';

function App() {
  // === STATE MANAGEMENT ===
  const [formData, setFormData] = useState({
    shipper: '',
    consignee: '',
    notify_party: '',
    second_notify: '',
    booking_number: '',
    bill_of_lading_number: '',
    vessel: '',
    voy_number: '',
    port_of_loading: '',
    port_of_discharge: '',
    place_of_delivery: '',
    type_of_move: '',
    freight_payable: '',
    issue_date: '',
    shipped_on_board: '',
  });

  const [globalMarks, setGlobalMarks] = useState('');
  const [observations, setObservations] = useState('');
  const [refs, setRefs] = useState({
    dae: '',
    hs_code: '',
    fda: '',
    contract: '',
    invoice: '',
    lote: '',
  });

  const [emailOption, setEmailOption] = useState('');
  const [emailValue, setEmailValue] = useState('');

  // Added state for button disabling
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rows, setRows] = useState([
    {
      container: '',
      seals: '',
      packages: '',
      description: '',
      grossWeight: '',
      netWeight: '',
      measurements: ''
    }
  ]);

  const sums = useMemo(() => {
    const add = (field) => rows.reduce((acc, row) => acc + (parseAmount(row[field]) || 0), 0);
    const any = (field) => rows.some((row) => parseAmount(row[field]) != null);
    return {
      packages: formatAmount(add('packages')),
      net: any('netWeight') ? formatAmount(add('netWeight')) : '',
      gross: any('grossWeight') ? formatAmount(add('grossWeight')) : '',
      cbm: any('measurements') ? formatAmount(add('measurements')) : '',
    };
  }, [rows]);


  // === HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        container: '',
        seals: '',
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

    // === VALIDATION ===
    if (!formData.shipper.trim()) return toast.error("Shipper/Export requerido");
    if (!formData.consignee.trim()) return toast.error("Consignee requerido");
    if (!formData.notify_party.trim()) return toast.error("Notify party requerido");
    if (!formData.booking_number.trim()) return toast.error("Booking requerido");
    if (!formData.vessel.trim()) return toast.error("Vessel requerido");
    if (!formData.port_of_loading.trim()) return toast.error("Puerto de carga requerido");
    if (!formData.port_of_discharge.trim()) return toast.error("Puerto de descarga requerido");

    if (emailOption === "") {
      return toast.error("Seleccione si desea recibir correo");
    }
    // === VALIDAR CORREO SI ELIGIÓ "SÍ" ===
    let email_to = [];
    if (emailOption === "yes") {
      if (!emailValue.trim()) {
        toast.error("Campo requerido: Correos electrónicos", { className: "error-toast" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      email_to = emailValue
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e !== "");

      for (let em of email_to) {
        if (!emailRegex.test(em)) {
          toast.error(`Correo inválido: ${em}`, { className: "error-toast" });
          return;
        }
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.container.trim()) return toast.error(`Fila ${i + 1}: Container No. requerido.`);
      if (!r.seals.trim()) return toast.error(`Fila ${i + 1}: Seals No. requerido.`);
      if (!String(r.packages).trim()) return toast.error(`Fila ${i + 1}: Packages requerido.`);
      if (!r.description.trim()) return toast.error(`Fila ${i + 1}: Description requerido.`);
      if (!String(r.grossWeight).trim()) return toast.error(`Fila ${i + 1}: Gross W. requerido.`);
    }

    // === PREPARE PAYLOAD ===
    const formattedRows = rows.map((r) => {
      let marksContent = "";
      if (r.container) marksContent += `CONTAINER:\n${r.container}`;
      if (r.seals) {
        if (marksContent) marksContent += "\n";
        marksContent += `SEALS:\n${r.seals}`;
      }

      const description = [r.description.trim()];
      if (String(r.netWeight).trim()) description.push(`NET: ${String(r.netWeight).trim()} KG`);

      return {
        marks_numbers: marksContent.trim(),
        description: description.filter(Boolean).join("\n"),
        packages: r.packages,
        gross_weight: r.grossWeight,
        net_weight: r.netWeight,
        measurements: r.measurements,
      };
    });

    const footerLines = [
      observations.trim(),
      formData.type_of_move.trim() ? `TYPE OF MOVE: ${formData.type_of_move.trim()}` : "",
      sums.packages ? `TOTAL BULTOS: ${sums.packages}` : "",
      sums.net ? `PESO NETO TOTAL: ${sums.net} KG` : "",
      sums.gross ? `PESO BRUTO TOTAL: ${sums.gross} KG` : "",
      sums.cbm ? `CBM TOTAL: ${sums.cbm}` : "",
      refs.contract.trim() ? `CONTRACT: ${refs.contract.trim()}` : "",
      refs.dae.trim() ? `DAE: ${refs.dae.trim()}` : "",
      refs.fda.trim() ? `FDA: ${refs.fda.trim()}` : "",
      refs.hs_code.trim() ? `HS CODE: ${refs.hs_code.trim()}` : "",
      refs.invoice.trim() ? `FACTURA: ${refs.invoice.trim()}` : "",
      refs.lote.trim() ? `LOTE: ${refs.lote.trim()}` : "",
    ].filter(Boolean);

    const totalsRow = {
      marks_numbers: globalMarks.trim() ? `MARCAS:\n${globalMarks.trim()}` : "",
      description: footerLines.join("\n"),
      packages: sums.packages,
      gross_weight: sums.gross,
      net_weight: sums.net,
      measurements: sums.cbm,
    };

    // Append totals row
    const finalRows = [...formattedRows, totalsRow];

    const jsonPayload = {
      template_name: "Template.docx",
      data: {
        ...formData,
        notify_party: [formData.notify_party.trim(), formData.second_notify.trim() ? `2ND NOTIFY:\n${formData.second_notify.trim()}` : ""]
          .filter(Boolean)
          .join("\n\n"),
        place_of_delivery: formData.place_of_delivery.trim() || formData.port_of_discharge.trim(),
        rows: finalRows,
        global_marks: globalMarks,
        observations,
        ...refs,
        total_packages: sums.packages,
        total_net: sums.net,
        total_gross: sums.gross,
        total_cbm: sums.cbm,
      },
      send_email: emailOption === "yes" ? "si" : "no",
      email_to,
      email_cc: [],
      email_cco: [],
    };

    // Disable button before starting process
    setIsSubmitting(true);

    toast.info("Generando Proforma...", { autoClose: 2000 });

    const fileName = `PROFORMA_${formData.booking_number.trim().replace(/[^\w.-]+/g, "_")}.docx`;
    const downloadWord = async () => {
      const res = await fetch("http://localhost:8100/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });
      if (!res.ok) throw new Error(await readError(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      if (emailOption === "yes") {
        const res = await fetch("http://localhost:8100/documents/generate_and_send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonPayload),
        });
        if (!res.ok) throw new Error(await readError(res));
        toast.success("Proforma enviada");
      } else {
        await downloadWord();
        toast.success("Proforma generada");
      }
      setTimeout(() => setIsSubmitting(false), 5000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "No se pudo generar la proforma");
      if (emailOption === "yes") {
        try {
          await downloadWord();
          toast.info("El correo falló. Se descargó el Word.");
        } catch (downloadErr) {
          console.error(downloadErr);
        }
      }
      setIsSubmitting(false);
    }
  };

  async function readError(res) {
    try {
      const data = await res.json();
      const detail = data?.detail;
      return typeof detail === "string" ? detail : "No se pudo generar la proforma";
    } catch {
      return "No se pudo generar la proforma";
    }
  }

  // Combine data for Preview
  const previewData = {
    ...formData,
    rows,
    globalMarks,
    observations,
    refs,
    sums,
  };

  return (
    <Layout formData={previewData}>
      {/* Container for the form content */}
      <div className="container-fluid p-0 compact-form">
        <div className="d-flex align-items-center mb-3 border-bottom pb-2">
          <img src="src/assets/logo.png" alt="Masterview" style={{ maxHeight: '40px', marginRight: '0.75rem' }} />
          <h5 className="mb-0 text-primary fw-bold" style={{ color: 'var(--color-primary)' }}>GENERADOR DE PROFORMA</h5>
        </div>

        <form onSubmit={handleSubmitJson} className="needs-validation" style={{ fontSize: '0.9rem' }}>
          <PartyDetails formData={formData} onChange={handleInputChange} />

          <hr className="my-3 text-secondary opacity-25" />

          <PortDetails formData={formData} onChange={handleInputChange} />

          <h6 className="mt-4 mb-2 text-secondary text-uppercase fw-bold" style={{ fontSize: '0.85rem' }}>Cargo Particulars</h6>
          <DynamicRows rows={rows} setRows={setRows} addRow={addRow} />

          <TotalsSection
            globalMarks={globalMarks} setGlobalMarks={setGlobalMarks}
            observations={observations} setObservations={setObservations}
            refs={refs} setRefs={setRefs}
            sumPackages={sums.packages}
            sumNet={sums.net}
            sumGross={sums.gross}
            sumCbm={sums.cbm}
          />

          <FooterFields
            emailOption={emailOption}
            setEmailOption={setEmailOption}
            emailValue={emailValue}
            setEmailValue={setEmailValue}
          />

          <div className="d-grid gap-2 d-md-flex justify-content-md-start mt-4 mb-4">
            <button
              type="submit"
              disabled={isSubmitting} // Disable when submitting or after success
              className="btn px-4 shadow-sm"
              style={{
                backgroundColor: isSubmitting ? '#6c757d' : '#0A2540',
                borderColor: isSubmitting ? '#6c757d' : '#0A2540',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <i className={`bi ${isSubmitting ? 'bi-check-circle' : 'bi-file-earmark-pdf'} me-2`}></i>
              {isSubmitting ? "Listo" : emailOption === "yes" ? "Generar y enviar" : "Generar Proforma"}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" />
    </Layout>
  );
}

export default App;