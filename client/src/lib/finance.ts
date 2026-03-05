// ─── Currency Formatting ──────────────────────────────────────────────────────
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// ─── Date Formatting ──────────────────────────────────────────────────────────
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
}

export function getDaysUntilDue(dueDate: string | Date): number {
  const due = typeof dueDate === 'string' ? new Date(dueDate + 'T00:00:00') : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Category Helpers ─────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: 'habitacao', label: 'Habitação', color: '#3b82f6', icon: '🏠' },
  { value: 'alimentacao', label: 'Alimentação', color: '#22c55e', icon: '🍽️' },
  { value: 'saude', label: 'Saúde', color: '#ef4444', icon: '❤️' },
  { value: 'educacao', label: 'Educação', color: '#8b5cf6', icon: '📚' },
  { value: 'transporte', label: 'Transporte', color: '#06b6d4', icon: '🚗' },
  { value: 'vestuario', label: 'Vestuário', color: '#ec4899', icon: '👕' },
  { value: 'lazer', label: 'Lazer', color: '#f59e0b', icon: '🎭' },
  { value: 'financeiro', label: 'Financeiro', color: '#d97706', icon: '💳' },
  { value: 'utilidades', label: 'Utilidades', color: '#14b8a6', icon: '💡' },
  { value: 'pessoal', label: 'Pessoal', color: '#f43f5e', icon: '👤' },
  { value: 'outros', label: 'Outros', color: '#6b7280', icon: '📦' },
] as const;

export const INCOME_CATEGORIES = [
  { value: 'salario', label: 'Salário', color: '#22c55e', icon: '💼' },
  { value: 'renda_extra', label: 'Renda Extra', color: '#3b82f6', icon: '💰' },
  { value: 'pensao', label: 'Pensão', color: '#8b5cf6', icon: '👴' },
  { value: 'aluguel', label: 'Aluguel', color: '#f59e0b', icon: '🏘️' },
  { value: 'investimento', label: 'Investimento', color: '#06b6d4', icon: '📈' },
  { value: 'freelance', label: 'Freelance', color: '#ec4899', icon: '💻' },
  { value: 'bonus', label: 'Bônus', color: '#f43f5e', icon: '🎁' },
  { value: 'dividendos', label: 'Dividendos', color: '#14b8a6', icon: '📊' },
  { value: 'outros', label: 'Outros', color: '#6b7280', icon: '📦' },
] as const;

export const INVESTMENT_TYPES = [
  { value: 'poupanca', label: 'Poupança' },
  { value: 'cdb', label: 'CDB' },
  { value: 'lci', label: 'LCI' },
  { value: 'lca', label: 'LCA' },
  { value: 'tesouro_direto', label: 'Tesouro Direto' },
  { value: 'fundos', label: 'Fundos' },
  { value: 'acoes', label: 'Ações' },
  { value: 'fii', label: 'FII' },
  { value: 'criptomoedas', label: 'Criptomoedas' },
  { value: 'previdencia', label: 'Previdência' },
  { value: 'outros', label: 'Outros' },
] as const;

export function getCategoryInfo(value: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === value) ?? { value, label: value, color: '#6b7280', icon: '📦' };
}

export function getIncomeCategoryInfo(value: string) {
  return INCOME_CATEGORIES.find(c => c.value === value) ?? { value, label: value, color: '#22c55e', icon: '💰' };
}

// ─── Number Helpers ───────────────────────────────────────────────────────────
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calcProgress(current: number | string, target: number | string): number {
  const c = typeof current === 'string' ? parseFloat(current) : current;
  const t = typeof target === 'string' ? parseFloat(target) : target;
  if (t <= 0) return 0;
  return Math.min(100, (c / t) * 100);
}

// ─── Chart Colors ─────────────────────────────────────────────────────────────
export const CHART_COLORS = [
  '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#3b82f6', '#d97706',
  '#14b8a6', '#f43f5e', '#6b7280',
];
