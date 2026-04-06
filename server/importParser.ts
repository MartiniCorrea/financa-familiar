/**
 * Import Parser — CSV e OFX para extratos bancários e faturas de cartão
 *
 * Formatos suportados:
 *  - CSV genérico (colunas: data, descrição, valor)
 *  - OFX (Open Financial Exchange — padrão bancário brasileiro)
 *  - CSV Nubank (Data,Categoria,Título,Valor)
 *  - CSV Inter (Data Lançamento;Histórico;Descrição;Valor)
 *  - CSV C6 Bank (Data;Descrição;Valor)
 *  - CSV Itaú/Bradesco/BB (Data;Histórico;Valor)
 */

export interface ParsedTransaction {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // positivo = crédito, negativo = débito
  type: "debit" | "credit";
  rawLine?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  format: string;
  errors: string[];
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim().replace(/['"]/g, "");

  // YYYYMMDD (OFX)
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m}-${d}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return `${y}-${m}-${d}`;
  }
  // DD/MM/YY
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `20${y}-${m}-${d}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  raw = raw.trim().replace(/['"R$\s]/g, "");
  // Remove pontos de milhar e troca vírgula por ponto
  raw = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function detectSeparator(line: string): string {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitLine(line: string, sep: string): string[] {
  // Suporta campos entre aspas
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

// ─── Parser OFX ───────────────────────────────────────────────────────────────

function parseOFX(content: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  // Extrair blocos <STMTTRN>
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  for (const block of blocks) {
    const getTag = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\n\r]+)`, "i"));
      return m ? m[1].trim() : null;
    };

    const trntype = getTag("TRNTYPE") || "DEBIT";
    const dtposted = getTag("DTPOSTED");
    const trnamt = getTag("TRNAMT");
    const memo = getTag("MEMO") || getTag("NAME") || "Transação";

    const date = dtposted ? parseDate(dtposted.slice(0, 8)) : null;
    const amount = trnamt ? parseAmount(trnamt) : null;

    if (!date || amount === null) {
      errors.push(`Linha inválida no OFX: ${block.slice(0, 80)}`);
      continue;
    }

    transactions.push({
      date,
      description: memo,
      amount: Math.abs(amount),
      type: trntype.toUpperCase() === "CREDIT" || amount > 0 ? "credit" : "debit",
    });
  }

  return { transactions, format: "OFX", errors };
}

// ─── Parser CSV Nubank ────────────────────────────────────────────────────────
// Formato: Data,Categoria,Título,Valor

function parseNubankCSV(lines: string[], sep: string): ParseResult | null {
  const header = splitLine(lines[0], sep).map(h => h.toLowerCase().trim());
  const hasNubankCols =
    header.includes("data") &&
    (header.includes("título") || header.includes("titulo")) &&
    header.includes("valor");

  if (!hasNubankCols) return null;

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  const iDate = header.indexOf("data");
  const iDesc = header.includes("título") ? header.indexOf("título") : header.indexOf("titulo");
  const iVal = header.indexOf("valor");

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitLine(line, sep);
    const date = parseDate(cols[iDate]);
    const amount = parseAmount(cols[iVal]);
    if (!date || amount === null) { errors.push(`Linha ${i + 1}: inválida`); continue; }
    transactions.push({
      date,
      description: cols[iDesc] || "Sem descrição",
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      rawLine: line,
    });
  }
  return { transactions, format: "CSV Nubank", errors };
}

// ─── Parser CSV Inter ─────────────────────────────────────────────────────────
// Formato: Data Lançamento;Histórico;Descrição;Valor

function parseInterCSV(lines: string[], sep: string): ParseResult | null {
  const header = splitLine(lines[0], sep).map(h => h.toLowerCase().trim());
  const hasInterCols =
    (header.some(h => h.includes("lançamento") || h.includes("lancamento"))) &&
    header.some(h => h.includes("histórico") || h.includes("historico"));

  if (!hasInterCols) return null;

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  const iDate = header.findIndex(h => h.includes("data"));
  const iDesc = header.findIndex(h => h.includes("descrição") || h.includes("descricao") || h.includes("histórico") || h.includes("historico"));
  const iVal = header.findIndex(h => h.includes("valor"));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitLine(line, sep);
    const date = parseDate(cols[iDate]);
    const amount = parseAmount(cols[iVal]);
    if (!date || amount === null) { errors.push(`Linha ${i + 1}: inválida`); continue; }
    transactions.push({
      date,
      description: cols[iDesc] || "Sem descrição",
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      rawLine: line,
    });
  }
  return { transactions, format: "CSV Inter", errors };
}

// ─── Parser CSV Genérico ──────────────────────────────────────────────────────
// Tenta detectar colunas de data, descrição e valor automaticamente

function parseGenericCSV(lines: string[], sep: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const header = splitLine(lines[0], sep).map(h => h.toLowerCase().trim());

  // Detectar índices de colunas
  const iDate = header.findIndex(h =>
    h.includes("data") || h.includes("date") || h.includes("dt") || h.includes("vencimento")
  );
  const iDesc = header.findIndex(h =>
    h.includes("descriç") || h.includes("descric") || h.includes("histór") || h.includes("histor") ||
    h.includes("memo") || h.includes("título") || h.includes("titulo") || h.includes("lançamento") ||
    h.includes("lancamento") || h.includes("estabelecimento") || h.includes("nome") || h.includes("name")
  );
  const iVal = header.findIndex(h =>
    h.includes("valor") || h.includes("value") || h.includes("amount") || h.includes("débito") ||
    h.includes("debito") || h.includes("crédito") || h.includes("credito") || h.includes("montante")
  );

  if (iDate === -1 || iDesc === -1 || iVal === -1) {
    // Tentar heurística posicional: primeira coluna = data, última = valor, meio = descrição
    const startLine = lines.findIndex((l, i) => i > 0 && parseDate(splitLine(l, sep)[0]) !== null);
    if (startLine === -1) {
      return { transactions: [], format: "CSV Genérico", errors: ["Não foi possível detectar as colunas. Verifique se o arquivo tem cabeçalho com: data, descrição, valor."] };
    }
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = splitLine(line, sep);
      if (cols.length < 3) continue;
      const date = parseDate(cols[0]);
      const amount = parseAmount(cols[cols.length - 1]);
      if (!date || amount === null) continue;
      const desc = cols.slice(1, cols.length - 1).join(" ").trim() || "Sem descrição";
      transactions.push({ date, description: desc, amount: Math.abs(amount), type: amount < 0 ? "debit" : "credit", rawLine: line });
    }
    return { transactions, format: "CSV Genérico (posicional)", errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitLine(line, sep);
    const date = parseDate(cols[iDate]);
    const amount = parseAmount(cols[iVal]);
    if (!date || amount === null) { errors.push(`Linha ${i + 1}: inválida`); continue; }
    transactions.push({
      date,
      description: cols[iDesc] || "Sem descrição",
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      rawLine: line,
    });
  }
  return { transactions, format: "CSV Genérico", errors };
}

// ─── Entrada principal ────────────────────────────────────────────────────────

export function parseStatement(content: string, filename: string): ParseResult {
  const lower = filename.toLowerCase();

  // OFX
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx") || content.includes("<OFX>") || content.includes("<STMTTRN>")) {
    return parseOFX(content);
  }

  // CSV
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { transactions: [], format: "Desconhecido", errors: ["Arquivo muito curto ou vazio."] };
  }

  const sep = detectSeparator(lines[0]);

  // Tentar parsers específicos primeiro
  const nubank = parseNubankCSV(lines, sep);
  if (nubank) return nubank;

  const inter = parseInterCSV(lines, sep);
  if (inter) return inter;

  // Fallback genérico
  return parseGenericCSV(lines, sep);
}
