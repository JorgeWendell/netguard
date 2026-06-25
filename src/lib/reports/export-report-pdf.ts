import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { AvailabilityEventRow } from "@/lib/events/get-availability-events";
import { formatDateTime } from "@/lib/monitoring/format";
import type { ReportData } from "@/lib/reports/get-report-data";
import { formatServiceLabel } from "@/lib/services/format-service-label";
import type { DeviceServiceRow } from "@/lib/services/get-device-services";

export type ReportPdfMeta = {
  companyLabel: string;
  locationLabel: string;
  deviceLabel: string;
  dateFrom: string;
  dateTo: string;
};

function formatDateBr(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function serviceStatusLabel(row: DeviceServiceRow) {
  if (!row.enabled) return "Desabilitado";
  return row.running ? "Em execução" : "Parado";
}

export function exportReportPdf(data: ReportData, meta: ReportPdfMeta) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text("NetGuard — Relatório", 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Gerado em: ${formatDateTime(data.generatedAt)}`, 14, 24);
  doc.text(
    `Período: ${formatDateBr(meta.dateFrom)} a ${formatDateBr(meta.dateTo)}`,
    14,
    30,
  );
  doc.text(`Empresa: ${meta.companyLabel}`, 14, 36);
  doc.text(`Local: ${meta.locationLabel}`, 14, 42);
  doc.text(`Equipamento: ${meta.deviceLabel}`, 14, 48);

  doc.setTextColor(30);
  doc.setFontSize(13);
  doc.text("Log de disponibilidade", 14, 58);

  autoTable(doc, {
    startY: 62,
    head: [
      ["Data / Hora", "Evento", "Equipamento", "Empresa", "Local", "Host", "Descrição"],
    ],
    body: data.availability.map((row: AvailabilityEventRow) => [
      formatDateTime(row.createdAt),
      row.eventType === "online" ? "Online" : "Offline",
      row.deviceName,
      row.companyName,
      row.locationName,
      row.host,
      row.message ?? "—",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14, right: 14 },
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    },
  });

  const servicesStartY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 62;

  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("Status dos serviços (última verificação no período)", 14, servicesStartY + 12);

  autoTable(doc, {
    startY: servicesStartY + 16,
    head: [
      [
        "Última verificação",
        "Serviço",
        "Equipamento",
        "Empresa",
        "Local",
        "Status",
        "Execução",
      ],
    ],
    body: data.services.map((row: DeviceServiceRow) => [
      row.lastCheck ? formatDateTime(row.lastCheck) : "—",
      formatServiceLabel(row.service),
      row.deviceName,
      row.companyName,
      row.locationName,
      row.status ?? "—",
      serviceStatusLabel(row),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 58, 237] },
    margin: { left: 14, right: 14 },
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    },
  });

  if (data.availabilityTruncated || data.servicesTruncated) {
    const finalY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? servicesStartY + 20;
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    const notes: string[] = [];
    if (data.availabilityTruncated) {
      notes.push("Disponibilidade limitada ao máximo de registros do relatório.");
    }
    if (data.servicesTruncated) {
      notes.push("Serviços limitados ao máximo de registros do relatório.");
    }
    doc.text(notes.join(" "), 14, finalY + 8);
  }

  const fileDate = meta.dateFrom.replace(/-/g, "");
  doc.save(`relatorio-netguard-${fileDate}.pdf`);
}
