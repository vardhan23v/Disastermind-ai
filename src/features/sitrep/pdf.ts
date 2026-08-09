import type { SitrepData } from '@/types';
import { formatClock } from '@/utils/geo';
import { TICK_MINUTES } from '@/constants';

export async function downloadSitrepPdf(data: SitrepData): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  const tick = data.generatedAtTick;

  doc.setFillColor(9, 14, 26);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(230, 240, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DISASTERMIND AI — SITREP', 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 200, 220);
  doc.text(
    `${data.hazard.icon} ${data.hazard.name} — Generated ${formatClock(6 * 60 + tick * TICK_MINUTES)} (tick ${tick}) · Local simulation · Demo data`,
    14,
    27
  );

  doc.setTextColor(230, 240, 255);
  doc.setFontSize(12);
  doc.text('Summary', 14, 40);
  doc.setFontSize(10);
  const summary = [
    `People rescued: ${data.rescued}`,
    `SOS handled: ${data.sosHandled} · pending: ${data.pendingSos}`,
    `Estimated casualties prevented: ${data.casualtiesPrevented}`,
    `Peak alert level: ${data.alertPeak.toUpperCase()}`,
  ];
  let y = 46;
  for (const line of summary) {
    doc.text(line, 14, y);
    y += 7;
  }

  doc.setFontSize(12);
  doc.text('Timeline', 14, y + 4);
  doc.setFontSize(8);
  const rows = data.timeline.map((e) => [
    formatClock(e.tick * TICK_MINUTES),
    e.tag,
    e.text,
    e.severity.toUpperCase(),
  ]);
  autoTable(doc, {
    startY: y + 8,
    head: [['Time', 'Tag', 'Event', 'Severity']],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, textColor: [200, 220, 240], fillColor: [20, 28, 44] },
    headStyles: { fillColor: [8, 145, 178], textColor: [240, 255, 255] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Resources Deployed', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  data.resourcesDeployed.forEach((r, i) => {
    doc.text(`• ${r}`, 18, y + 6 + i * 5);
  });

  y += 6 + data.resourcesDeployed.length * 5 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Damage Assessment (final)', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const d = data.damage;
  const damageLines = [
    `Buildings damaged: ${d.buildingsDamaged}`,
    `Roads destroyed: ${d.roadsDestroyedKm} km`,
    `Power loss: ${d.powerLossPct}%`,
    `Affected population: ${d.affectedPopulation.toLocaleString('en-IN')}`,
    `Estimated economic loss: ₹${(d.economicLossInr / 1e7).toFixed(1)} Cr`,
  ];
  damageLines.forEach((line, i) => doc.text(line, 18, y + 6 + i * 5));

  doc.setFontSize(7);
  doc.setTextColor(120, 130, 150);
  doc.text('WATERMARK: SIMULATION / DEMO — Not operational guidance.', 14, 288);
  doc.save('DisasterMind-SITREP.pdf');
}