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
  tinyint,
} from "drizzle-orm/mysql-core";

// ─── Core User Table ──────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  initialBalance: decimal("initialBalance", { precision: 15, scale: 2 }).notNull().default("0"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Bank Accounts ─────────────────────────────────────────────────────────
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  bank: varchar("bank", { length: 100 }),
  type: mysqlEnum("type", ["corrente","poupanca","carteira","investimento","outro"]).notNull().default("corrente"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("building-2"),
  initialBalance: decimal("initialBalance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

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
  bankAccountId: int("bankAccountId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: mysqlEnum("category", [
    "salario", "renda_extra", "pensao", "aluguel", "investimento",
    "freelance", "bonus", "dividendos", "outros"
  ]).notNull().default("salario"),
  date: date("date").notNull(),
  isRecurring: boolean("isRecurring").default(false),
  recurringDay: int("recurringDay"),
  recurringRuleId: int("recurringRuleId"),
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
  bankAccountId: int("bankAccountId"),
  categoryId: int("categoryId"),
  subcategoryId: int("subcategoryId"),
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
  sourceType: mysqlEnum("sourceType", ["normal", "cartao_credito"]).notNull().default("normal"),
  creditCardItemId: int("creditCardItemId"),
  recurringRuleId: int("recurringRuleId"),
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
  bankAccountId: int("bankAccountId"),
  subcategoryId: int("subcategoryId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["pagar","receber"]).notNull().default("pagar"),
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

// ─── Fuel History (Histórico de Combustível) ──────────────────────────────────
export const fuelHistory = mysqlTable("fuel_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  gasStationName: varchar("gasStationName", { length: 150 }).notNull(),
  fuelType: mysqlEnum("fuelType", ["gasolina_comum", "gasolina_aditivada", "etanol", "diesel", "diesel_s10", "gnv"]).notNull().default("gasolina_comum"),
  pricePerLiter: decimal("pricePerLiter", { precision: 10, scale: 3 }).notNull(),
  liters: decimal("liters", { precision: 10, scale: 3 }),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }),
  mileage: int("mileage"),
  recordedAt: date("recordedAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuelHistory = typeof fuelHistory.$inferSelect;
export type InsertFuelHistory = typeof fuelHistory.$inferInsert;

// ─── Expense Groups (50/30/20 system) ────────────────────────────────────────
export const expenseGroups = mysqlTable("expense_groups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  groupType: mysqlEnum("groupType", ["necessario", "nao_necessario", "investimento"]).notNull(),
  targetPercent: decimal("targetPercent", { precision: 5, scale: 2 }).notNull().default("0"),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseGroup = typeof expenseGroups.$inferSelect;
export type InsertExpenseGroup = typeof expenseGroups.$inferInsert;

// ─── Expense Subcategories (custom 50/30/20 subcategories) ───────────────────
export const PARENT_CATEGORIES_ENUM = [
  'alimentacao', 'habitacao', 'saude', 'educacao', 'transporte',
  'vestuario', 'lazer', 'financeiro', 'utilidades', 'pessoal', 'outros'
] as const;

export const expenseSubcategories = mysqlTable("expense_subcategories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }).default("tag"),
  parentCategory: varchar("parentCategory", { length: 50 }).default("outros"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExpenseSubcategory = typeof expenseSubcategories.$inferSelect;
export type InsertExpenseSubcategory = typeof expenseSubcategories.$inferInsert;

// ─── Credit Card Invoices ─────────────────────────────────────────────────────
export const creditCardInvoices = mysqlTable("credit_card_invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  creditCardId: int("creditCardId").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  closingDate: date("closingDate"),
  dueDate: date("dueDate"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["aberta", "fechada", "paga"]).notNull().default("aberta"),
  billId: int("billId"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect;
export type InsertCreditCardInvoice = typeof creditCardInvoices.$inferInsert;

// ─── Credit Card Items ────────────────────────────────────────────────────────
export const creditCardItems = mysqlTable("credit_card_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  creditCardId: int("creditCardId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  parentCategory: mysqlEnum("parentCategory", [
    "habitacao", "alimentacao", "saude", "educacao",
    "transporte", "vestuario", "lazer", "financeiro",
    "utilidades", "pessoal", "outros"
  ]).notNull().default("outros"),
  subcategoryId: int("subcategoryId"),
  purchaseDate: date("purchaseDate").notNull(),
  installments: int("installments").notNull().default(1),
  currentInstallment: int("currentInstallment").notNull().default(1),
  totalInstallments: int("totalInstallments").notNull().default(1),
  notes: text("notes"),
  isRecurring: tinyint("isRecurring").notNull().default(0),
  expenseId: int("expenseId"),
  recurringRuleId: int("recurringRuleId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CreditCardItem = typeof creditCardItems.$inferSelect;
export type InsertCreditCardItem = typeof creditCardItems.$inferInsert;

// ─── Account Transfers ────────────────────────────────────────────────────────
export const accountTransfers = mysqlTable("account_transfers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromAccountId: int("fromAccountId").notNull(),
  toAccountId: int("toAccountId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: varchar("description", { length: 255 }),
  notes: text("notes"),
  fromExpenseId: int("fromExpenseId"), // despesa gerada na conta de origem
  toIncomeId: int("toIncomeId"),       // receita gerada na conta de destino
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AccountTransfer = typeof accountTransfers.$inferSelect;
export type InsertAccountTransfer = typeof accountTransfers.$inferInsert;

// ─── Recurring Rules ──────────────────────────────────────────────────────────
// Armazena regras de recorrência para despesas, receitas e itens de cartão
export const recurringRules = mysqlTable("recurring_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["expense", "income", "credit_card_item"]).notNull(),
  // Dados do lançamento recorrente
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  // Para expenses/income
  parentCategory: varchar("parentCategory", { length: 64 }),
  subcategoryId: int("subcategoryId"),
  bankAccountId: int("bankAccountId"),
  familyMemberId: int("familyMemberId"),
  paymentMethod: varchar("paymentMethod", { length: 32 }),
  category: varchar("category", { length: 64 }), // para incomes
  notes: text("notes"),
  // Para credit_card_item
  creditCardId: int("creditCardId"),
  // Configuração da recorrência
  frequency: mysqlEnum("frequency", ["monthly", "weekly", "yearly"]).notNull().default("monthly"),
  dayOfMonth: int("dayOfMonth"), // dia do mês para lançar (ex: 5 = todo dia 5)
  startDate: date("startDate").notNull(), // data do primeiro lançamento
  endDate: date("endDate"), // data de término (null = sem fim)
  isActive: tinyint("isActive").notNull().default(1),
  lastGeneratedDate: date("lastGeneratedDate"), // última data gerada
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecurringRule = typeof recurringRules.$inferSelect;
export type InsertRecurringRule = typeof recurringRules.$inferInsert;

// ─── Bill Notifications (controle de notificações de vencimento já enviadas) ──
export const billNotifications = mysqlTable("bill_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  billId: int("billId").notNull(),
  daysBeforeDue: int("daysBeforeDue").notNull(), // 0=hoje, 1=amanhã, 3=3 dias, 7=7 dias
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type BillNotification = typeof billNotifications.$inferSelect;
export type InsertBillNotification = typeof billNotifications.$inferInsert;

// ─── Import Sessions (sessões de importação de extrato/fatura) ────────────────
export const importSessions = mysqlTable("import_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["bank_statement", "credit_card"]).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  bankAccountId: int("bankAccountId"), // para extrato bancário
  creditCardId: int("creditCardId"),   // para fatura de cartão
  totalRows: int("totalRows").notNull().default(0),
  confirmedRows: int("confirmedRows").notNull().default(0),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull(),
});
export type ImportSession = typeof importSessions.$inferSelect;
export type InsertImportSession = typeof importSessions.$inferInsert;

// ─── Import Transactions (transações detectadas no extrato/fatura) ────────────
export const importTransactions = mysqlTable("import_transactions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  date: date("date").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["debit", "credit"]).notNull().default("debit"),
  subcategoryId: int("subcategoryId"),   // categorização manual pelo usuário
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "ignored"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull(),
});
export type ImportTransaction = typeof importTransactions.$inferSelect;
export type InsertImportTransaction = typeof importTransactions.$inferInsert;
