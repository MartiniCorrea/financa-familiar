import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// ─── Core User Table ──────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Family Members ───────────────────────────────────────────────────────────
export const familyMembers = mysqlTable("family_members", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  relationship: mysqlEnum("relationship", ["titular", "conjuge", "filho", "filha", "pai", "mae", "outro"]).notNull().default("titular"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;

// ─── Income (Receitas) ────────────────────────────────────────────────────────
export const incomes = mysqlTable("incomes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  familyMemberId: int("familyMemberId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: mysqlEnum("category", [
    "salario", "renda_extra", "pensao", "aluguel", "investimento",
    "freelance", "bonus", "dividendos", "outros"
  ]).notNull().default("salario"),
  date: date("date").notNull(),
  isRecurring: boolean("isRecurring").default(false),
  recurringDay: int("recurringDay"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Income = typeof incomes.$inferSelect;
export type InsertIncome = typeof incomes.$inferInsert;

// ─── Expense Categories ───────────────────────────────────────────────────────
export const expenseCategories = mysqlTable("expense_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  parentCategory: mysqlEnum("parentCategory", [
    "habitacao", "alimentacao", "saude", "educacao",
    "transporte", "vestuario", "lazer", "financeiro",
    "utilidades", "pessoal", "outros"
  ]).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("tag"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

// ─── Credit Cards ─────────────────────────────────────────────────────────────
export const creditCards = mysqlTable("credit_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  familyMemberId: int("familyMemberId"),
  name: varchar("name", { length: 100 }).notNull(),
  bank: varchar("bank", { length: 100 }),
  lastFourDigits: varchar("lastFourDigits", { length: 4 }),
  creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).notNull(),
  closingDay: int("closingDay").notNull(),
  dueDay: int("dueDay").notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = typeof creditCards.$inferInsert;

// ─── Expenses (Despesas) ──────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  familyMemberId: int("familyMemberId"),
  creditCardId: int("creditCardId"),
  categoryId: int("categoryId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  parentCategory: mysqlEnum("parentCategory", [
    "habitacao", "alimentacao", "saude", "educacao",
    "transporte", "vestuario", "lazer", "financeiro",
    "utilidades", "pessoal", "outros"
  ]).notNull().default("outros"),
  date: date("date").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["dinheiro", "debito", "credito", "pix", "transferencia", "boleto", "outros"]).default("outros"),
  isRecurring: boolean("isRecurring").default(false),
  recurringDay: int("recurringDay"),
  installments: int("installments").default(1),
  currentInstallment: int("currentInstallment").default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Bills (Contas a Pagar/Receber) ──────────────────────────────────────────
export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  familyMemberId: int("familyMemberId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["pagar", "receber"]).notNull().default("pagar"),
  category: mysqlEnum("category", [
    "habitacao", "alimentacao", "saude", "educacao",
    "transporte", "vestuario", "lazer", "financeiro",
    "utilidades", "pessoal", "outros", "salario", "renda_extra"
  ]).default("outros"),
  dueDate: date("dueDate").notNull(),
  paidAt: date("paidAt"),
  status: mysqlEnum("status", ["pendente", "pago", "vencido", "cancelado"]).default("pendente").notNull(),
  isRecurring: boolean("isRecurring").default(false),
  recurringDay: int("recurringDay"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;

// ─── Budget (Orçamento Mensal) ────────────────────────────────────────────────
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", [
    "habitacao", "alimentacao", "saude", "educacao",
    "transporte", "vestuario", "lazer", "financeiro",
    "utilidades", "pessoal", "outros"
  ]).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  plannedAmount: decimal("plannedAmount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── Financial Goals (Metas) ──────────────────────────────────────────────────
export const financialGoals = mysqlTable("financial_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  targetAmount: decimal("targetAmount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  deadline: date("deadline"),
  type: mysqlEnum("type", ["curto_prazo", "medio_prazo", "longo_prazo"]).notNull().default("medio_prazo"),
  category: mysqlEnum("category", ["emergencia", "viagem", "imovel", "veiculo", "educacao", "aposentadoria", "outros"]).default("outros"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("target"),
  isCompleted: boolean("isCompleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type InsertFinancialGoal = typeof financialGoals.$inferInsert;

// ─── Goal Contributions ───────────────────────────────────────────────────────
export const goalContributions = mysqlTable("goal_contributions", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId").notNull(),
  userId: int("userId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GoalContribution = typeof goalContributions.$inferSelect;
export type InsertGoalContribution = typeof goalContributions.$inferInsert;

// ─── Supermarkets ─────────────────────────────────────────────────────────────
export const supermarkets = mysqlTable("supermarkets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  address: varchar("address", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Supermarket = typeof supermarkets.$inferSelect;
export type InsertSupermarket = typeof supermarkets.$inferInsert;

// ─── Shopping Lists ───────────────────────────────────────────────────────────
export const shoppingLists = mysqlTable("shopping_lists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  supermarketId: int("supermarketId"),
  estimatedTotal: decimal("estimatedTotal", { precision: 15, scale: 2 }),
  actualTotal: decimal("actualTotal", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["ativa", "concluida", "cancelada"]).default("ativa").notNull(),
  shoppingDate: date("shoppingDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type InsertShoppingList = typeof shoppingLists.$inferInsert;

// ─── Shopping Items ───────────────────────────────────────────────────────────
export const shoppingItems = mysqlTable("shopping_items", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("listId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("1"),
  unit: varchar("unit", { length: 20 }).default("un"),
  estimatedPrice: decimal("estimatedPrice", { precision: 15, scale: 2 }),
  actualPrice: decimal("actualPrice", { precision: 15, scale: 2 }),
  category: varchar("category", { length: 50 }),
  isChecked: boolean("isChecked").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type InsertShoppingItem = typeof shoppingItems.$inferInsert;

// ─── Price History ────────────────────────────────────────────────────────────
export const priceHistory = mysqlTable("price_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 150 }).notNull(),
  supermarketId: int("supermarketId").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("un"),
  recordedAt: date("recordedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

// ─── Investments ──────────────────────────────────────────────────────────────
export const investments = mysqlTable("investments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  type: mysqlEnum("type", [
    "poupanca", "cdb", "lci", "lca", "tesouro_direto",
    "fundos", "acoes", "fii", "criptomoedas", "previdencia", "outros"
  ]).notNull().default("poupanca"),
  institution: varchar("institution", { length: 100 }),
  initialAmount: decimal("initialAmount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 15, scale: 2 }).notNull(),
  investedAt: date("investedAt").notNull(),
  maturityDate: date("maturityDate"),
  annualRate: decimal("annualRate", { precision: 8, scale: 4 }),
  isEmergencyFund: boolean("isEmergencyFund").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = typeof investments.$inferInsert;

// ─── Investment Transactions ──────────────────────────────────────────────────
export const investmentTransactions = mysqlTable("investment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  investmentId: int("investmentId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["aporte", "resgate", "rendimento"]).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvestmentTransaction = typeof investmentTransactions.$inferSelect;
export type InsertInvestmentTransaction = typeof investmentTransactions.$inferInsert;
