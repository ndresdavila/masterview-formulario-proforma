import { useState, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './custom-toast.css';
import './App.css';
import logoImg from './assets/logo.png';

import Layout from './components/Layout';
import PartyDetails from './components/PartyDetails';
import PortDetails from './components/PortDetails';
import DynamicRows from './components/DynamicRows';
import TotalsSection from './components/TotalsSection';
import { formatAmount, parseAmount } from './utils/amount';
import { readSummaryFigures, sameAmount } from './utils/summaryCheck';
import {
  containerMarks,
  containerDescription,
  notifyText,
  vesselLine,
  summaryDescription,
} from './utils/proformaText';

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8100").replace(/\/$/, "");
const MAILBOX = "log@masterview.me";

function emptyCargoItem() {
  return {
    id: crypto.randomUUID(),
    container: '',
    seals: '',
    packages: '',
    description: '',
    grossWeight: '',
    netWeight: '',
    measurements: '',
  };
}

function App() {
  // === STATE MANAGEMENT ===
  const [formData, setFormData] = useState({
    shipper: '',
    consignee: '',
    notify_party: '',
    second_notify: '',
    booking_number: '',
    vessel: '',
    voy_number: '',
    port_of_loading: '',
    port_of_discharge: '',
  });

  const [globalMarks, setGlobalMarks] = useState('');
  const [cargoSummary, setCargoSummary] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rows, setRows] = useState([emptyCargoItem()]);

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
    setRows([...rows, emptyCargoItem()]);
  };

  const handleSubmitJson = async (e) => {
    e.preventDefault();

    // === VALIDATION ===
    if (!formData.shipper.trim()) return toast.error("Shipper/Export requerido");
    if (!formData.consignee.trim()) return toast.error("Consignee requerido");
    if (!formData.notify_party.trim()) return toast.error("Notify party requerido");
    if (!formData.booking_number.trim()) return toast.error("Booking requerido");
    if (!formData.vessel.trim()) return toast.error("Vessel requerido");
    if (!formData.voy_number.trim()) return toast.error("Voy Nº requerido");
    if (!formData.port_of_loading.trim()) return toast.error("Puerto de carga requerido");
    if (!formData.port_of_discharge.trim()) return toast.error("Puerto de descarga requerido");

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.container.trim()) return toast.error(`Contenedor ${i + 1}: número de contenedor requerido.`);
      if (!r.seals.trim()) return toast.error(`Contenedor ${i + 1}: número de sello requerido.`);
      if (!String(r.packages).trim()) return toast.error(`Contenedor ${i + 1}: número de bultos requerido.`);
      if (parseAmount(r.packages) == null) return toast.error(`Contenedor ${i + 1}: número de bultos no es válido.`);
      if (!r.description.trim()) return toast.error(`Contenedor ${i + 1}: descripción requerida.`);
      if (!String(r.netWeight).trim()) return toast.error(`Contenedor ${i + 1}: peso neto requerido.`);
      if (parseAmount(r.netWeight) == null) return toast.error(`Contenedor ${i + 1}: peso neto no es válido.`);
      if (!String(r.grossWeight).trim()) return toast.error(`Contenedor ${i + 1}: peso bruto requerido.`);
      if (parseAmount(r.grossWeight) == null) return toast.error(`Contenedor ${i + 1}: peso bruto no es válido.`);
      if (!String(r.measurements).trim()) return toast.error(`Contenedor ${i + 1}: measurement requerido.`);
      if (parseAmount(r.measurements) == null) return toast.error(`Contenedor ${i + 1}: measurement no es válido.`);
    }

    if (!globalMarks.trim()) return toast.error('Marks and Numbers es requerido.');
    if (!cargoSummary.trim()) return toast.error('La descripción del resumen es requerida.');

    const found = readSummaryFigures(cargoSummary);
    const expectedNet = sums.net ? parseAmount(sums.net) : null;
    const expectedGross = sums.gross ? parseAmount(sums.gross) : null;
    const checks = [
      ['packages', found.packages, parseAmount(sums.packages), sums.packages],
      ['peso neto (KN)', found.net, expectedNet, sums.net],
      ['peso bruto (KB)', found.gross, expectedGross, sums.gross],
    ];
    for (const [label, written, expected, shown] of checks) {
      if (written == null) return toast.error(`No se encontró el total de ${label} en el resumen.`);
      if (!sameAmount(written, expected)) {
        return toast.error(`El total de ${label} del resumen (${formatAmount(written)}) no coincide con los contenedores (${shown || '—'}).`);
      }
    }

    // === PREPARE PAYLOAD ===
    const formattedRows = rows.map((r) => ({
      marks_numbers: containerMarks(r),
      description: containerDescription(r),
      packages: r.packages,
      gross_weight: r.grossWeight,
      net_weight: r.netWeight,
      measurements: r.measurements,
    }));

    const marksBody = globalMarks.trim();

    const totalsRow = {
      marks_numbers: marksBody ? `MARCAS:\n${marksBody}` : "",
      description: summaryDescription(cargoSummary, sums),
      packages: "",
      gross_weight: "",
      net_weight: "",
      measurements: "",
    };

    // Append totals row
    const finalRows = [...formattedRows, totalsRow];

    const jsonPayload = {
      template_name: "Template.docx",
      data: {
        ...formData,
        vessel: vesselLine(formData.vessel, formData.voy_number),
        notify_party: notifyText(formData.notify_party, formData.second_notify),
        bill_of_lading_number: '',
        place_of_delivery: '',
        freight_payable: '',
        issue_date: '',
        shipped_on_board: '',
        rows: finalRows,
        global_marks: globalMarks,
        cargo_summary: cargoSummary,
        total_packages: sums.packages,
        total_net: sums.net,
        total_gross: sums.gross,
        total_cbm: sums.cbm,
      },
      email_to: [MAILBOX],
      email_cc: [],
      email_cco: [],
    };

    // Disable button before starting process
    setIsSubmitting(true);

    toast.info("Enviando Proforma...", { autoClose: 2000 });

    const fileName = `PROFORMA_${formData.booking_number.trim().replace(/[^\w.-]+/g, "_")}.docx`;
    const downloadWord = async () => {
      const res = await fetch(`${API_BASE}/documents/generate`, {
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
      const res = await fetch(`${API_BASE}/documents/generate_and_send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success("Proforma enviada");
      setTimeout(() => setIsSubmitting(false), 5000);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "No se pudo generar la proforma");
      try {
        await downloadWord();
        toast.info("El correo falló. Se descargó el Word.");
      } catch (downloadErr) {
        console.error(downloadErr);
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
    cargoSummary,
    sums,
  };

  return (
    <Layout formData={previewData}>
      {/* Container for the form content */}
      <div className="container-fluid p-0 compact-form">
        <div className="d-flex align-items-center mb-3 border-bottom pb-2">
          <img src={logoImg} alt="Masterview" style={{ maxHeight: '40px', marginRight: '0.75rem' }} />
          <h5 className="mb-0 text-primary fw-bold" style={{ color: 'var(--color-primary)' }}>FORMULARIO DE PROFORMA</h5>
        </div>

        <form onSubmit={handleSubmitJson} className="needs-validation" style={{ fontSize: '0.9rem' }}>
          <PartyDetails formData={formData} onChange={handleInputChange} />

          <hr className="my-3 text-secondary opacity-25" />

          <PortDetails formData={formData} onChange={handleInputChange} />

          <h6 className="mt-4 mb-2 text-secondary text-uppercase fw-bold" style={{ fontSize: '0.85rem' }}>Cargo Particulars</h6>
          <DynamicRows rows={rows} setRows={setRows} addRow={addRow} />

          <hr className="my-3 text-secondary opacity-25" />

          <TotalsSection
            globalMarks={globalMarks} setGlobalMarks={setGlobalMarks}
            cargoSummary={cargoSummary} setCargoSummary={setCargoSummary}
            sumPackages={sums.packages}
            sumNet={sums.net}
            sumGross={sums.gross}
            sumCbm={sums.cbm}
          />

          <div className="d-grid gap-2 d-md-flex justify-content-md-start mt-4 mb-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn px-4 generate-btn"
            >
              <i className={`bi ${isSubmitting ? 'bi-check-circle' : 'bi-envelope'} me-2`}></i>
              Enviar Proforma
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" />
    </Layout>
  );
}

export default App;