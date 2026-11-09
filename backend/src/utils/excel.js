import ExcelJS from 'exceljs';
import { brandInfo } from '../services/brand.js';

const NAVY = 'FF0B1B3F';
const ORANGE = 'FFF97316';
const FORMATS = { currency: '"₹"#,##0.00', number: '#,##0', percent: '0.0"%"' };

const sheetName = (value) => String(value || 'Report').replace(/[\\/?*[\]:]/g, ' ').slice(0, 30);

// Builds a branded workbook (logo, business name, report title, date, styled table) and streams it.
export async function sendExcel(res, { filename, title, subtitle, columns, rows }) {
  const brand = await brandInfo();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = brand.name;
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName(title), { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }] });
  const last = Math.max(columns.length, 4);

  sheet.columns = columns.map((c) => ({ key: c.label, width: c.width || Math.min(40, Math.max(12, c.label.length + 4)) }));

  if (brand.logoSmall) {
    const logoId = workbook.addImage({ buffer: brand.logoSmall, extension: 'png' });
    sheet.addImage(logoId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 66, height: 66 } });
  }
  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 20;

  sheet.mergeCells(1, 2, 1, last + 1);
  sheet.getCell(1, 2).value = brand.name;
  sheet.getCell(1, 2).font = { name: 'Calibri', size: 18, bold: true, color: { argb: NAVY } };
  sheet.mergeCells(2, 2, 2, last + 1);
  sheet.getCell(2, 2).value = title;
  sheet.getCell(2, 2).font = { name: 'Calibri', size: 13, bold: true, color: { argb: ORANGE } };
  sheet.mergeCells(3, 2, 3, last + 1);
  sheet.getCell(3, 2).value = [subtitle, `Generated on ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, `${rows.length} record${rows.length === 1 ? '' : 's'}`].filter(Boolean).join('  |  ');
  sheet.getCell(3, 2).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  [1, 2, 3].forEach((r) => { sheet.getCell(r, 2).alignment = { vertical: 'middle' }; });

  // The first column of data starts under the logo column, so the table begins at column A.
  const header = sheet.getRow(5);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.label;
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: c.format ? 'right' : 'left' };
  });
  header.height = 24;

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(6 + index);
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1);
      const value = c.value(row);
      cell.value = value === undefined || value === null ? '' : value;
      if (c.format && typeof value === 'number') cell.numFmt = FORMATS[c.format];
      cell.alignment = { vertical: 'middle', horizontal: c.format ? 'right' : 'left', wrapText: false };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
    excelRow.height = 20;
  });

  // Column totals for the money columns.
  if (rows.length && columns.some((c) => c.total)) {
    const totalRow = sheet.getRow(6 + rows.length);
    totalRow.getCell(1).value = 'Total';
    columns.forEach((c, i) => {
      if (!c.total) return;
      const cell = totalRow.getCell(i + 1);
      cell.value = rows.reduce((sum, r) => sum + (Number(c.value(r)) || 0), 0);
      cell.numFmt = FORMATS[c.format || 'number'];
      cell.alignment = { horizontal: 'right' };
    });
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', bold: true, color: { argb: NAVY } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1E6' } };
      cell.border = { top: { style: 'thin', color: { argb: ORANGE } } };
    });
    totalRow.height = 22;
  }

  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: columns.length } };
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = `&L${brand.name}&RPage &P of &N`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}
