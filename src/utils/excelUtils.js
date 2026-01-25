import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const fillExcelTemplate = async (formRef, rows) => {
  const response = await fetch('/Masterview-FORMATO_PROFORMA.xlsx');
  const arrayBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.getWorksheet("BILL OF LADING ");

  const fieldMappings = [
    { id: 'shipper', cell: 'A12' },
    { id: 'bookingNumber', cell: 'G12' },
    { id: 'consignee', cell: 'A20' },
    { id: 'consigneeContact', cell: 'B26' },
    { id: 'notify', cell: 'A28' },
    { id: 'notifyContact', cell: 'B33' },
    { id: 'secondNotify', cell: 'G28' },
    { id: 'secondNotifyContact', cell: 'H33' },
    { id: 'vessel', cell: 'A37' },
    { id: 'portOfLoading', cell: 'D37' },
    { id: 'portOfDischarge', cell: 'A39' },
  ];

  fieldMappings.forEach(({ id, cell }) => {
  const value = formRef.current.querySelector(`#${id}`)?.value || '';
  const cellRef = sheet.getCell(cell);

  cellRef.value = value;

  if (value.includes('\n')) {
    const prevAlignment = cellRef.alignment || {};
    cellRef.alignment = { ...prevAlignment, wrapText: true };
  }
});

  let startRow = 46;
  rows.forEach((row, index) => {
    const baseRow = startRow + (index * 5);
    const containerRow = sheet.getRow(baseRow);
    containerRow.getCell(1).value = row.container;
    containerRow.getCell(4).value = row.packages;

    const descriptionLines = row.description.split('\n').filter(line => line.trim() !== '');
    descriptionLines.forEach((line, lineIndex) => {
      const targetRow = sheet.getRow(baseRow + lineIndex);
      targetRow.getCell(6).value = line;
      targetRow.getCell(6).alignment = { wrapText: true };
      targetRow.commit();
    });

    containerRow.getCell(9).value = row.grossWeight;
    containerRow.getCell(10).value = row.measurements;
    containerRow.commit();

    const sealsRow = sheet.getRow(baseRow + 1);
    sealsRow.getCell(1).value = row.seals;
    sealsRow.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Masterview-FORMATO_PROFORMA.xlsx');
};
