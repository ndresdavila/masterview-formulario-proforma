import { Document, Packer, Paragraph } from 'docx';
import { containerDescription, containerMarks, notifyText, summaryDescription, vesselLine } from './proformaText.js';

function paragraphs(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => new Paragraph({ text: line }));
}

function section(title, body) {
  return [...paragraphs(title), ...paragraphs(body), new Paragraph({ text: '' })];
}

export function buildLocalProforma({ formData, rows, globalMarks, cargoSummary, sums }) {
  const children = [
    ...section('SHIPPER', formData.shipper),
    ...section('CONSIGNEE', formData.consignee),
    ...section('NOTIFY', notifyText(formData.notify_party, formData.second_notify)),
    ...section('BOOKING NUMBER', formData.booking_number),
    ...section('VESSEL', vesselLine(formData.vessel, formData.voy_number)),
    ...section('PORT OF LOADING', formData.port_of_loading),
    ...section('PORT OF DISCHARGE', formData.port_of_discharge),
  ];

  rows.forEach((row) => {
    children.push(...paragraphs(containerMarks(row)));
    children.push(...paragraphs(containerDescription(row)));
    const measurement = String(row.measurements || '').trim();
    if (measurement) children.push(new Paragraph({ text: `MEASUREMENT: ${measurement}` }));
    children.push(new Paragraph({ text: '' }));
  });

  if (String(globalMarks || '').trim()) {
    children.push(...section('MARCAS:', globalMarks.trim()));
  }
  children.push(...paragraphs(summaryDescription(cargoSummary, sums)));

  return new Document({ sections: [{ children }] });
}

export async function downloadLocalProforma({ formData, rows, globalMarks, cargoSummary, sums, fileName }) {
  const blob = await Packer.toBlob(buildLocalProforma({ formData, rows, globalMarks, cargoSummary, sums }));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
