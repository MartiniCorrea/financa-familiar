/**
 * PDF Report Generator
 * Generates a monthly financial summary PDF using PDFKit.
 */
import PDFDocument from "pdfkit";
import { Response } from "express";
import * as db from "./db";

const BLUE = "#1e40af";
const DARK = "#1e293b";
const GRAY = "#64748b";
const LIGHT_GRAY = "#f1f5f9";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const WHITE = "#ffffff";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(typeof dateStr === "string" ? dateStr + "T12:00:00" : dateStr);
  return d.toLocaleDateString("pt-BR");
}

function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
}

export async function generateMonthlyReport(
  res: Response,
  userId: number,
  month: number,
  year: number,
  sections: { summary: boolean; expenses: boolean; incomes: boolean; bills: boolean }
) {
  // Fetch all data in parallel
  const [summary, expenseList, incomeList, billList, groupSummary] = await Promise.all([
    db.getDashboardSummary(userId, month, year),
    sections.expenses ? db.getExpenses(userId, { month, year }) : Promise.resolve([]),
    sections.incomes ? db.getIncomes(userId, { month, year }) : Promise.resolve([]),
    sections.bills ? db.getBills(userId, { month, year }) : Promise.resolve([]),
    sections.summary ? db.getExpenseGroupSummary(userId, month, year) : Promise.resolve([]),
  ]);

  const monthName = getMonthName(month);
  const title = `Relatório Financeiro — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });

  // Stream to response
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio-${year}-${String(month).padStart(2, "0")}.pdf"`);
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 80).fill(BLUE);
  doc.fillColor(WHITE).fontSize(20).font("Helvetica-Bold").text("FinançaFamiliar", 50, 22);
  doc.fillColor(WHITE).fontSize(11).font("Helvetica").text(title, 50, 48);
  doc.fillColor(WHITE).fontSize(9).text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, doc.page.width - 180, 56);

  let y = 100;

  // ── Resumo Mensal ────────────────────────────────────────────────────────────
  if (sections.summary && summary) {
    doc.fillColor(DARK).fontSize(14).font("Helvetica-Bold").text("Resumo do Mês", 50, y);
    y += 24;

    const kpis = [
      { label: "Receitas", value: summary.totalIncome, color: GREEN },
      { label: "Despesas", value: summary.totalExpense, color: RED },
      { label: "Saldo", value: summary.balance, color: summary.balance >= 0 ? GREEN : RED },
      { label: "Taxa de Poupança", value: null, pct: summary.savingsRate, color: BLUE },
    ];

    const boxW = (doc.page.width - 100 - 30) / 4;
    kpis.forEach((kpi, i) => {
      const x = 50 + i * (boxW + 10);
      doc.rect(x, y, boxW, 60).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(kpi.label.toUpperCase(), x + 10, y + 10, { width: boxW - 20 });
      const val = kpi.value !== null ? formatCurrency(kpi.value) : `${kpi.pct?.toFixed(1)}%`;
      doc.fillColor(kpi.color).fontSize(14).font("Helvetica-Bold").text(val, x + 10, y + 26, { width: boxW - 20 });
    });
    y += 80;

    // Despesas por categoria
    if (groupSummary && groupSummary.length > 0) {
      doc.fillColor(DARK).fontSize(12).font("Helvetica-Bold").text("Despesas por Grupo (50/30/20)", 50, y);
      y += 18;
      for (const group of groupSummary) {
        if ((group as any).spent <= 0) continue;
        doc.fillColor(DARK).fontSize(10).font("Helvetica-Bold").text(group.name, 50, y);
        doc.fillColor(GRAY).fontSize(10).font("Helvetica").text(formatCurrency((group as any).spent), 0, y, { align: "right", width: doc.page.width - 100 });
        y += 16;
        if ((group as any).subcategories?.length) {
          for (const sub of (group as any).subcategories) {
            if ((sub as any).spent <= 0) continue;
            doc.fillColor(GRAY).fontSize(9).font("Helvetica").text(`  • ${sub.name}`, 60, y);
            doc.fillColor(GRAY).fontSize(9).text(formatCurrency((sub as any).spent), 0, y, { align: "right", width: doc.page.width - 100 });
            y += 14;
          }
        }
        if (y > doc.page.height - 100) { doc.addPage(); y = 50; }
      }
      y += 10;
    }
  }

  // ── Receitas ─────────────────────────────────────────────────────────────────
  if (sections.incomes && incomeList.length > 0) {
    if (y > doc.page.height - 150) { doc.addPage(); y = 50; }
    doc.fillColor(DARK).fontSize(14).font("Helvetica-Bold").text("Receitas do Mês", 50, y);
    y += 24;
    // Table header
    doc.rect(50, y, doc.page.width - 100, 20).fill(BLUE);
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold");
    doc.text("Data", 55, y + 5, { width: 70 });
    doc.text("Descrição", 130, y + 5, { width: 200 });
    doc.text("Categoria", 335, y + 5, { width: 100 });
    doc.text("Valor", doc.page.width - 145, y + 5, { width: 90, align: "right" });
    y += 20;

    let rowBg = false;
    for (const inc of incomeList as any[]) {
      if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
      if (rowBg) doc.rect(50, y, doc.page.width - 100, 18).fill("#f8fafc");
      doc.fillColor(DARK).fontSize(9).font("Helvetica");
      doc.text(formatDate(inc.date), 55, y + 4, { width: 70 });
      doc.text(inc.description || "—", 130, y + 4, { width: 200 });
      doc.text(inc.category || "—", 335, y + 4, { width: 100 });
      doc.fillColor(GREEN).text(formatCurrency(parseFloat(inc.amount)), doc.page.width - 145, y + 4, { width: 90, align: "right" });
      y += 18;
      rowBg = !rowBg;
    }
    // Total
    doc.rect(50, y, doc.page.width - 100, 22).fill(LIGHT_GRAY);
    doc.fillColor(DARK).fontSize(10).font("Helvetica-Bold").text("Total de Receitas", 55, y + 5);
    const totalInc = incomeList.reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
    doc.fillColor(GREEN).text(formatCurrency(totalInc), doc.page.width - 145, y + 5, { width: 90, align: "right" });
    y += 32;
  }

  // ── Despesas ─────────────────────────────────────────────────────────────────
  if (sections.expenses && expenseList.length > 0) {
    if (y > doc.page.height - 150) { doc.addPage(); y = 50; }
    doc.fillColor(DARK).fontSize(14).font("Helvetica-Bold").text("Despesas do Mês", 50, y);
    y += 24;
    // Table header
    doc.rect(50, y, doc.page.width - 100, 20).fill(RED);
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold");
    doc.text("Data", 55, y + 5, { width: 70 });
    doc.text("Descrição", 130, y + 5, { width: 200 });
    doc.text("Categoria", 335, y + 5, { width: 100 });
    doc.text("Valor", doc.page.width - 145, y + 5, { width: 90, align: "right" });
    y += 20;

    let rowBg = false;
    for (const exp of expenseList as any[]) {
      if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
      if (rowBg) doc.rect(50, y, doc.page.width - 100, 18).fill("#f8fafc");
      doc.fillColor(DARK).fontSize(9).font("Helvetica");
      doc.text(formatDate(exp.date), 55, y + 4, { width: 70 });
      doc.text(exp.description || "—", 130, y + 4, { width: 200 });
      doc.text(exp.parentCategory || exp.category || "—", 335, y + 4, { width: 100 });
      doc.fillColor(RED).text(formatCurrency(parseFloat(exp.amount)), doc.page.width - 145, y + 4, { width: 90, align: "right" });
      y += 18;
      rowBg = !rowBg;
    }
    // Total
    doc.rect(50, y, doc.page.width - 100, 22).fill(LIGHT_GRAY);
    doc.fillColor(DARK).fontSize(10).font("Helvetica-Bold").text("Total de Despesas", 55, y + 5);
    const totalExp = expenseList.reduce((s: number, e: any) => s + parseFloat(e.amount), 0);
    doc.fillColor(RED).text(formatCurrency(totalExp), doc.page.width - 145, y + 5, { width: 90, align: "right" });
    y += 32;
  }

  // ── Contas a Pagar/Receber ────────────────────────────────────────────────────
  if (sections.bills && billList.length > 0) {
    if (y > doc.page.height - 150) { doc.addPage(); y = 50; }
    doc.fillColor(DARK).fontSize(14).font("Helvetica-Bold").text("Contas a Pagar / Receber", 50, y);
    y += 24;
    // Table header
    doc.rect(50, y, doc.page.width - 100, 20).fill(AMBER);
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold");
    doc.text("Vencimento", 55, y + 5, { width: 80 });
    doc.text("Descrição", 140, y + 5, { width: 180 });
    doc.text("Tipo", 325, y + 5, { width: 60 });
    doc.text("Status", 390, y + 5, { width: 70 });
    doc.text("Valor", doc.page.width - 145, y + 5, { width: 90, align: "right" });
    y += 20;

    let rowBg = false;
    for (const bill of billList as any[]) {
      if (y > doc.page.height - 80) { doc.addPage(); y = 50; }
      if (rowBg) doc.rect(50, y, doc.page.width - 100, 18).fill("#f8fafc");
      doc.fillColor(DARK).fontSize(9).font("Helvetica");
      doc.text(formatDate(bill.dueDate), 55, y + 4, { width: 80 });
      doc.text(bill.description || "—", 140, y + 4, { width: 180 });
      doc.text(bill.type === "pagar" ? "Pagar" : "Receber", 325, y + 4, { width: 60 });
      const statusColor = bill.status === "pago" ? GREEN : bill.status === "vencido" ? RED : AMBER;
      doc.fillColor(statusColor).text(bill.status || "—", 390, y + 4, { width: 70 });
      const billColor = bill.type === "pagar" ? RED : GREEN;
      doc.fillColor(billColor).text(formatCurrency(parseFloat(bill.amount)), doc.page.width - 145, y + 4, { width: 90, align: "right" });
      y += 18;
      rowBg = !rowBg;
    }
    y += 10;
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fillColor(GRAY).fontSize(8).font("Helvetica")
      .text(`Página ${i + 1} de ${pageCount}  •  FinançaFamiliar`, 50, doc.page.height - 30, { align: "center", width: doc.page.width - 100 });
  }

  doc.end();
}
