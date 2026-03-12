import { and, asc, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  BankAccount, Bill, Budget, CreditCard, CreditCardInvoice, CreditCardItem, Expense, ExpenseCategory, FamilyMember,
  FinancialGoal, GoalContribution, Income, InsertBankAccount, InsertBill, InsertBudget,
  InsertCreditCard, InsertCreditCardInvoice, InsertCreditCardItem, InsertExpense, InsertExpenseCategory, InsertFamilyMember,
  InsertFinancialGoal, InsertGoalContribution, InsertIncome, InsertInvestment,
  InsertInvestmentTransaction, InsertPriceHistory, InsertShoppingItem,
  InsertShoppingList, InsertSupermarket, InsertUser, Investment,
  InvestmentTransaction, PriceHistory, ShoppingItem, ShoppingList, Supermarket,
  AccountTransfer, InsertAccountTransfer,
  accountTransfers,
  bankAccounts, bills, budgets, creditCardInvoices, creditCardItems, creditCards, expenseCategories, expenses, familyMembers,
  financialGoals, goalContributions, incomes, investmentTransactions,
  investments, priceHistory, shoppingItems, shoppingLists, supermarkets, users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Family Members ───────────────────────────────────────────────────────────
export async function getFamilyMembers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(familyMembers).where(eq(familyMembers.userId, userId)).orderBy(asc(familyMembers.name));
}

export async function createFamilyMember(data: InsertFamilyMember) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(familyMembers).values(data);
  return result;
}

export async function updateFamilyMember(id: number, userId: number, data: Partial<InsertFamilyMember>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(familyMembers).set(data).where(and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)));
}

export async function deleteFamilyMember(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(familyMembers).where(and(eq(familyMembers.id, id), eq(familyMembers.userId, userId)));
}

// ─── Incomes ──────────────────────────────────────────────────────────────────
export async function getIncomes(userId: number, filters?: { month?: number; year?: number; memberId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(incomes.userId, userId)];
  if (filters?.month && filters?.year) {
    const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
    conditions.push(sql`${incomes.date} >= ${start}`, sql`${incomes.date} <= ${end}`);
  }
  if (filters?.memberId) conditions.push(eq(incomes.familyMemberId, filters.memberId));
  return db.select().from(incomes).where(and(...conditions)).orderBy(desc(incomes.date));
}

export async function createIncome(data: InsertIncome) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(incomes).values(data);
}

export async function updateIncome(id: number, userId: number, data: Partial<InsertIncome>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(incomes).set({ ...data, updatedAt: new Date() }).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
}

export async function deleteIncome(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpenses(userId: number, filters?: { month?: number; year?: number; memberId?: number; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(expenses.userId, userId)];
  if (filters?.month && filters?.year) {
    const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
    conditions.push(sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}`);
  }
  if (filters?.memberId) conditions.push(eq(expenses.familyMemberId, filters.memberId));
  if (filters?.category) conditions.push(eq(expenses.parentCategory, filters.category as any));
  return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(expenses).values(data);
}

export async function updateExpense(id: number, userId: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(expenses).set({ ...data, updatedAt: new Date() }).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// ─── Bills ────────────────────────────────────────────────────────────────────
export async function getBills(userId: number, filters?: { type?: 'pagar' | 'receber'; status?: string; month?: number; year?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bills.userId, userId)];
  if (filters?.type) conditions.push(eq(bills.type, filters.type));
  if (filters?.status) conditions.push(eq(bills.status, filters.status as any));
  if (filters?.month && filters?.year) {
    const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
    conditions.push(sql`${bills.dueDate} >= ${start}`, sql`${bills.dueDate} <= ${end}`);
  }
  return db.select().from(bills).where(and(...conditions)).orderBy(asc(bills.dueDate));
}

export async function createBill(data: InsertBill) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(bills).values(data);
}

export async function updateBill(id: number, userId: number, data: Partial<InsertBill>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(bills).set({ ...data, updatedAt: new Date() }).where(and(eq(bills.id, id), eq(bills.userId, userId)));
}

export async function deleteBill(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(bills).where(and(eq(bills.id, id), eq(bills.userId, userId)));
}

export async function markBillAsPaid(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const today = new Date();
  return db.update(bills).set({ status: 'pago', paidAt: today, updatedAt: new Date() })
    .where(and(eq(bills.id, id), eq(bills.userId, userId)));
}

// ─── Credit Cards ─────────────────────────────────────────────────────────────
export async function getCreditCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditCards).where(and(eq(creditCards.userId, userId), eq(creditCards.isActive, true))).orderBy(asc(creditCards.name));
}

export async function getCreditCardById(userId: number, cardId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(creditCards).where(and(eq(creditCards.id, cardId), eq(creditCards.userId, userId))).limit(1);
  return result[0] ?? null;
}

export async function createCreditCard(data: InsertCreditCard) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(creditCards).values(data);
}

export async function updateCreditCard(id: number, userId: number, data: Partial<InsertCreditCard>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(creditCards).set({ ...data, updatedAt: new Date() }).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
}

export async function deleteCreditCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(creditCards).set({ isActive: false, updatedAt: new Date() }).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
export async function getBudgets(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)));
}

export async function upsertBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(budgets).values(data).onDuplicateKeyUpdate({ set: { plannedAmount: data.plannedAmount, updatedAt: new Date() } });
}

// ─── Financial Goals ──────────────────────────────────────────────────────────
export async function getFinancialGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialGoals).where(eq(financialGoals.userId, userId)).orderBy(asc(financialGoals.isCompleted), asc(financialGoals.deadline));
}

export async function createFinancialGoal(data: InsertFinancialGoal) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(financialGoals).values(data);
}

export async function updateFinancialGoal(id: number, userId: number, data: Partial<InsertFinancialGoal>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(financialGoals).set({ ...data, updatedAt: new Date() }).where(and(eq(financialGoals.id, id), eq(financialGoals.userId, userId)));
}

export async function deleteFinancialGoal(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(financialGoals).where(and(eq(financialGoals.id, id), eq(financialGoals.userId, userId)));
}

export async function addGoalContribution(data: InsertGoalContribution) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(goalContributions).values(data);
  // Update goal current amount
  const goal = await db.select().from(financialGoals).where(eq(financialGoals.id, data.goalId)).limit(1);
  if (goal[0]) {
    const newAmount = parseFloat(goal[0].currentAmount) + parseFloat(data.amount as string);
    const isCompleted = newAmount >= parseFloat(goal[0].targetAmount);
    await db.update(financialGoals).set({ currentAmount: String(newAmount), isCompleted, updatedAt: new Date() }).where(eq(financialGoals.id, data.goalId));
  }
}

// ─── Supermarkets ─────────────────────────────────────────────────────────────
export async function getSupermarkets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supermarkets).where(eq(supermarkets.userId, userId)).orderBy(asc(supermarkets.name));
}

export async function createSupermarket(data: InsertSupermarket) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(supermarkets).values(data);
}

export async function deleteSupermarket(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(supermarkets).where(and(eq(supermarkets.id, id), eq(supermarkets.userId, userId)));
}

// ─── Shopping Lists ───────────────────────────────────────────────────────────
export async function getShoppingLists(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shoppingLists).where(eq(shoppingLists.userId, userId)).orderBy(desc(shoppingLists.createdAt));
}

export async function createShoppingList(data: InsertShoppingList) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(shoppingLists).values(data);
}

export async function updateShoppingList(id: number, userId: number, data: Partial<InsertShoppingList>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(shoppingLists).set({ ...data, updatedAt: new Date() }).where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));
}

export async function deleteShoppingList(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(shoppingItems).where(eq(shoppingItems.listId, id));
  return db.delete(shoppingLists).where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));
}

// ─── Shopping Items ───────────────────────────────────────────────────────────
export async function getShoppingItems(listId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shoppingItems).where(and(eq(shoppingItems.listId, listId), eq(shoppingItems.userId, userId))).orderBy(asc(shoppingItems.name));
}

export async function createShoppingItem(data: InsertShoppingItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(shoppingItems).values(data);
}

export async function updateShoppingItem(id: number, userId: number, data: Partial<InsertShoppingItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(shoppingItems).set(data).where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)));
}

export async function deleteShoppingItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(shoppingItems).where(and(eq(shoppingItems.id, id), eq(shoppingItems.userId, userId)));
}

// ─── Investmentsnts ──────────────────────────────────────────────────────────────
export async function getInvestments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(investments).where(eq(investments.userId, userId)).orderBy(desc(investments.currentAmount));
}

export async function createInvestment(data: InsertInvestment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(investments).values(data);
}

export async function updateInvestment(id: number, userId: number, data: Partial<InsertInvestment>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(investments).set({ ...data, updatedAt: new Date() }).where(and(eq(investments.id, id), eq(investments.userId, userId)));
}

export async function deleteInvestment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(investments).where(and(eq(investments.id, id), eq(investments.userId, userId)));
}

export async function addInvestmentTransaction(data: InsertInvestmentTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(investmentTransactions).values(data);
  const inv = await db.select().from(investments).where(eq(investments.id, data.investmentId)).limit(1);
  if (inv[0]) {
    let newAmount = parseFloat(inv[0].currentAmount);
    if (data.type === 'aporte' || data.type === 'rendimento') newAmount += parseFloat(data.amount as string);
    else if (data.type === 'resgate') newAmount -= parseFloat(data.amount as string);
    await db.update(investments).set({ currentAmount: String(newAmount), updatedAt: new Date() }).where(eq(investments.id, data.investmentId));
  }
}

export async function getInvestmentTransactions(investmentId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(investmentTransactions).where(and(eq(investmentTransactions.investmentId, investmentId), eq(investmentTransactions.userId, userId))).orderBy(desc(investmentTransactions.date));
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export async function getDashboardSummary(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [incomeResult] = await db.select({ total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)` })
    .from(incomes).where(and(eq(incomes.userId, userId), sql`${incomes.date} >= ${start}`, sql`${incomes.date} <= ${end}`));

  const [expenseResult] = await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses).where(and(eq(expenses.userId, userId), sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}`));

  const expenseByCategory = await db.select({
    category: expenses.parentCategory,
    total: sql<string>`SUM(${expenses.amount})`,
  }).from(expenses).where(and(eq(expenses.userId, userId), sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}`))
    .groupBy(expenses.parentCategory);

  const pendingBills = await db.select().from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.status, 'pendente')))
    .orderBy(asc(bills.dueDate)).limit(5);

  const totalIncome = parseFloat(incomeResult?.total || '0');
  const totalExpense = parseFloat(expenseResult?.total || '0');
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

  return { totalIncome, totalExpense, balance, savingsRate, expenseByCategory, pendingBills };
}

export async function getMonthlyEvolution(userId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return [];

  const results = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const [inc] = await db.select({ total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)` })
      .from(incomes).where(and(eq(incomes.userId, userId), sql`${incomes.date} >= ${start}`, sql`${incomes.date} <= ${end}`));
    const [exp] = await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses).where(and(eq(expenses.userId, userId), sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}`));

    results.push({
      month: `${String(month).padStart(2, '0')}/${year}`,
      monthLabel: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      income: parseFloat(inc?.total || '0'),
      expense: parseFloat(exp?.total || '0'),
    });
  }
  return results;
}

export async function getExpenseCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseCategories).where(eq(expenseCategories.userId, userId));
}

export async function createExpenseCategory(data: InsertExpenseCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(expenseCategories).values(data);
}

// ─── Price History ────────────────────────────────────────────────────────────
export async function getPriceHistory(userId: number, filters?: { productName?: string; supermarketId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(priceHistory.userId, userId)];
  if (filters?.productName) conditions.push(sql`LOWER(${priceHistory.productName}) LIKE LOWER(${`%${filters.productName}%`})`);
  if (filters?.supermarketId) conditions.push(eq(priceHistory.supermarketId, filters.supermarketId));
  const rows = await db.select({
    id: priceHistory.id,
    productName: priceHistory.productName,
    price: priceHistory.price,
    unit: priceHistory.unit,
    recordedAt: priceHistory.recordedAt,
    supermarketId: priceHistory.supermarketId,
    createdAt: priceHistory.createdAt,
    supermarketName: supermarkets.name,
  }).from(priceHistory)
    .leftJoin(supermarkets, eq(priceHistory.supermarketId, supermarkets.id))
    .where(and(...conditions))
    .orderBy(sql`${priceHistory.recordedAt} DESC`);
  return rows;
}

export async function createPriceHistory(data: InsertPriceHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(priceHistory).values(data);
}

export async function deletePriceHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(priceHistory).where(and(eq(priceHistory.id, id), eq(priceHistory.userId, userId)));
}

export async function getPriceComparison(userId: number, productName: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    supermarketId: priceHistory.supermarketId,
    supermarketName: supermarkets.name,
    minPrice: sql<string>`MIN(${priceHistory.price})`,
    maxPrice: sql<string>`MAX(${priceHistory.price})`,
    avgPrice: sql<string>`AVG(${priceHistory.price})`,
    lastPrice: sql<string>`(SELECT ph2.price FROM price_history ph2 WHERE ph2.userId = ${userId} AND LOWER(ph2.productName) = LOWER(${productName}) AND ph2.supermarketId = ${priceHistory.supermarketId} ORDER BY ph2.recordedAt DESC LIMIT 1)`,
    lastDate: sql<string>`(SELECT ph2.recordedAt FROM price_history ph2 WHERE ph2.userId = ${userId} AND LOWER(ph2.productName) = LOWER(${productName}) AND ph2.supermarketId = ${priceHistory.supermarketId} ORDER BY ph2.recordedAt DESC LIMIT 1)`,
    count: sql<number>`COUNT(*)`,
  }).from(priceHistory)
    .leftJoin(supermarkets, eq(priceHistory.supermarketId, supermarkets.id))
    .where(and(eq(priceHistory.userId, userId), sql`LOWER(${priceHistory.productName}) = LOWER(${productName})`))
    .groupBy(priceHistory.supermarketId, supermarkets.name);
  return rows.map(r => ({
    ...r,
    minPrice: parseFloat(r.minPrice || '0'),
    maxPrice: parseFloat(r.maxPrice || '0'),
    avgPrice: parseFloat(r.avgPrice || '0'),
    lastPrice: parseFloat(r.lastPrice || '0'),
    count: Number(r.count),
  }));
}

export async function getDistinctProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ productName: priceHistory.productName })
    .from(priceHistory).where(eq(priceHistory.userId, userId))
    .orderBy(priceHistory.productName);
  return rows.map(r => r.productName);
}

// ─── Fuel History ─────────────────────────────────────────────────────────────
import {
  fuelHistory, expenseGroups, expenseSubcategories,
  InsertFuelHistory, InsertExpenseGroup, InsertExpenseSubcategory,
  FuelHistory, ExpenseGroup, ExpenseSubcategory,
} from "../drizzle/schema";

export async function getFuelHistory(userId: number, filters?: { fuelType?: string; gasStationName?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(fuelHistory.userId, userId)];
  if (filters?.fuelType) conditions.push(eq(fuelHistory.fuelType, filters.fuelType as any));
  if (filters?.gasStationName) conditions.push(sql`LOWER(${fuelHistory.gasStationName}) LIKE LOWER(${`%${filters.gasStationName}%`})`);
  return db.select().from(fuelHistory).where(and(...conditions)).orderBy(sql`${fuelHistory.recordedAt} DESC`);
}

export async function createFuelHistory(data: InsertFuelHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(fuelHistory).values(data);
}

export async function deleteFuelHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(fuelHistory).where(and(eq(fuelHistory.id, id), eq(fuelHistory.userId, userId)));
}

export async function getFuelStats(userId: number, fuelType?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(fuelHistory.userId, userId)];
  if (fuelType) conditions.push(eq(fuelHistory.fuelType, fuelType as any));
  const rows = await db.select({
    gasStationName: fuelHistory.gasStationName,
    fuelType: fuelHistory.fuelType,
    minPrice: sql<string>`MIN(${fuelHistory.pricePerLiter})`,
    maxPrice: sql<string>`MAX(${fuelHistory.pricePerLiter})`,
    avgPrice: sql<string>`AVG(${fuelHistory.pricePerLiter})`,
    lastPrice: sql<string>`(SELECT fh2.pricePerLiter FROM fuel_history fh2 WHERE fh2.userId = ${userId} AND fh2.gasStationName = ${fuelHistory.gasStationName} ORDER BY fh2.recordedAt DESC LIMIT 1)`,
    lastDate: sql<string>`(SELECT fh2.recordedAt FROM fuel_history fh2 WHERE fh2.userId = ${userId} AND fh2.gasStationName = ${fuelHistory.gasStationName} ORDER BY fh2.recordedAt DESC LIMIT 1)`,
    count: sql<number>`COUNT(*)`,
  }).from(fuelHistory).where(and(...conditions))
    .groupBy(fuelHistory.gasStationName, fuelHistory.fuelType);
  return rows.map(r => ({
    ...r,
    minPrice: parseFloat(r.minPrice || '0'),
    maxPrice: parseFloat(r.maxPrice || '0'),
    avgPrice: parseFloat(r.avgPrice || '0'),
    lastPrice: parseFloat(r.lastPrice || '0'),
    count: Number(r.count),
  }));
}

export async function getDistinctStations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ name: fuelHistory.gasStationName })
    .from(fuelHistory).where(eq(fuelHistory.userId, userId))
    .orderBy(fuelHistory.gasStationName);
  return rows.map(r => r.name);
}

// ─── Expense Groups (50/30/20) ────────────────────────────────────────────────
export async function getExpenseGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseGroups).where(eq(expenseGroups.userId, userId)).orderBy(expenseGroups.groupType);
}

export async function createExpenseGroup(data: InsertExpenseGroup) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(expenseGroups).values(data);
}

export async function updateExpenseGroup(id: number, userId: number, data: Partial<InsertExpenseGroup>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(expenseGroups).set(data as any).where(and(eq(expenseGroups.id, id), eq(expenseGroups.userId, userId)));
}

export async function deleteExpenseGroup(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(expenseGroups).where(and(eq(expenseGroups.id, id), eq(expenseGroups.userId, userId)));
}

export async function getExpenseSubcategories(userId: number, groupId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(expenseSubcategories.userId, userId)];
  if (groupId) conditions.push(eq(expenseSubcategories.groupId, groupId));
  return db.select().from(expenseSubcategories).where(and(...conditions)).orderBy(expenseSubcategories.name);
}

export async function createExpenseSubcategory(data: InsertExpenseSubcategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(expenseSubcategories).values(data);
}

export async function deleteExpenseSubcategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(expenseSubcategories).where(and(eq(expenseSubcategories.id, id), eq(expenseSubcategories.userId, userId)));
}

export async function getExpenseGroupSummary(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [incomeRow] = await db.select({ total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)` })
    .from(incomes).where(and(eq(incomes.userId, userId), sql`${incomes.date} >= ${start}`, sql`${incomes.date} <= ${end}`));
  const totalIncome = parseFloat(incomeRow?.total || '0');

  const groups = await db.select().from(expenseGroups).where(eq(expenseGroups.userId, userId));
  const subcats = await db.select().from(expenseSubcategories).where(eq(expenseSubcategories.userId, userId));

  // Map expenses by subcategoryId to groups
  const expenseRows = await db.select({
    subcategoryId: expenses.subcategoryId,
    total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
  }).from(expenses)
    .where(and(eq(expenses.userId, userId), sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}`))
    .groupBy(expenses.subcategoryId);

  const expenseBySubcat: Record<number, number> = {};
  for (const row of expenseRows) {
    if (row.subcategoryId) expenseBySubcat[row.subcategoryId] = parseFloat(row.total || '0');
  }

  return groups.map(group => {
    const groupSubcats = subcats.filter(s => s.groupId === group.id);
    const spent = groupSubcats.reduce((sum, s) => sum + (expenseBySubcat[s.id] || 0), 0);
    const targetAmount = totalIncome * (parseFloat(group.targetPercent as string || '0') / 100);
    return {
      ...group,
      targetPercent: parseFloat(group.targetPercent as string || '0'),
      spent,
      targetAmount,
      percentUsed: targetAmount > 0 ? (spent / targetAmount) * 100 : 0,
      subcategories: groupSubcats.map(s => ({ ...s, spent: expenseBySubcat[s.id] || 0 })),
    };
  });
}

// ─── Initial Balance ──────────────────────────────────────────────────────────
export async function getInitialBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ initialBalance: users.initialBalance }).from(users).where(eq(users.id, userId));
  return parseFloat((row?.initialBalance as string) || '0');
}

export async function setInitialBalance(userId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ initialBalance: String(amount) } as any).where(eq(users.id, userId));
}

export async function getTotalBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [incomeResult] = await db.select({ total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)` })
    .from(incomes).where(eq(incomes.userId, userId));

  const [expenseResult] = await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses).where(eq(expenses.userId, userId));

  const initialBalance = await getInitialBalance(userId);
  const totalIncome = parseFloat(incomeResult?.total || '0');
  const totalExpense = parseFloat(expenseResult?.total || '0');

  return initialBalance + totalIncome - totalExpense;
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────
export async function getBankAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)))
    .orderBy(asc(bankAccounts.name));
}

export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(bankAccounts).values(data);
}

export async function updateBankAccount(id: number, userId: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(bankAccounts).set(data as any).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

export async function deleteBankAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Soft delete: apenas desativa a conta
  return db.update(bankAccounts).set({ isActive: false } as any).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

export async function getBankAccountBalance(accountId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [account] = await db.select({ initialBalance: bankAccounts.initialBalance })
    .from(bankAccounts).where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.userId, userId)));
  if (!account) return 0;

  const [incomeResult] = await db.select({ total: sql<string>`COALESCE(SUM(${incomes.amount}), 0)` })
    .from(incomes).where(and(eq(incomes.userId, userId), eq(incomes.bankAccountId, accountId)));

  const [expenseResult] = await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses).where(and(eq(expenses.userId, userId), eq(expenses.bankAccountId, accountId)));

  const initial = parseFloat((account.initialBalance as string) || '0');
  const totalIncome = parseFloat(incomeResult?.total || '0');
  const totalExpense = parseFloat(expenseResult?.total || '0');
  return initial + totalIncome - totalExpense;
}

export async function getBankAccountsWithBalance(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const accounts = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)))
    .orderBy(asc(bankAccounts.name));

  const results = await Promise.all(accounts.map(async (acc) => {
    const balance = await getBankAccountBalance(acc.id, userId);
    return { ...acc, balance, initialBalance: parseFloat((acc.initialBalance as string) || '0') };
  }));

  return results;
}

export async function getBankAccountTransactions(accountId: number, userId: number, filters?: { month?: number; year?: number }) {
  const db = await getDb();
  if (!db) return [];

  let incomeConditions = [eq(incomes.userId, userId), eq(incomes.bankAccountId, accountId)];
  let expenseConditions = [eq(expenses.userId, userId), eq(expenses.bankAccountId, accountId)];

  if (filters?.month && filters?.year) {
    const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
    incomeConditions.push(sql`${incomes.date} >= ${start}`, sql`${incomes.date} <= ${end}` as any);
    expenseConditions.push(sql`${expenses.date} >= ${start}`, sql`${expenses.date} <= ${end}` as any);
  }

  const incomeRows = await db.select({
    id: incomes.id, type: sql<string>`'receita'`, description: incomes.description,
    amount: incomes.amount, date: incomes.date, category: incomes.category,
  }).from(incomes).where(and(...incomeConditions)).orderBy(desc(incomes.date));

  const expenseRows = await db.select({
    id: expenses.id, type: sql<string>`'despesa'`, description: expenses.description,
    amount: expenses.amount, date: expenses.date, category: expenses.parentCategory,
  }).from(expenses).where(and(...expenseConditions)).orderBy(desc(expenses.date));

  const allTx = [
    ...incomeRows.map(r => ({ ...r, amount: parseFloat(r.amount as string), isIncome: true })),
    ...expenseRows.map(r => ({ ...r, amount: parseFloat(r.amount as string), isIncome: false })),
  ].sort((a, b) => new Date(b.date as unknown as string).getTime() - new Date(a.date as unknown as string).getTime());

  return allTx;
}

// ─── Credit Card Invoices ─────────────────────────────────────────────────────

export async function getCreditCardInvoices(userId: number, creditCardId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(creditCardInvoices.userId, userId)];
  if (creditCardId) conditions.push(eq(creditCardInvoices.creditCardId, creditCardId));
  return db.select().from(creditCardInvoices).where(and(...conditions)).orderBy(desc(creditCardInvoices.year), desc(creditCardInvoices.month));
}

export async function getOrCreateInvoice(userId: number, creditCardId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Try to find existing invoice
  const existing = await db.select().from(creditCardInvoices)
    .where(and(
      eq(creditCardInvoices.userId, userId),
      eq(creditCardInvoices.creditCardId, creditCardId),
      eq(creditCardInvoices.month, month),
      eq(creditCardInvoices.year, year)
    )).limit(1);
  if (existing.length > 0) return existing[0];
  // Get card info for closing/due dates
  const card = await db.select().from(creditCards).where(and(eq(creditCards.id, creditCardId), eq(creditCards.userId, userId))).limit(1);
  let closingDate: string | null = null;
  let dueDate: string | null = null;
  // Helper: retorna o último dia válido do mês (ex: dia 30 em fevereiro vira 28 ou 29)
  function clampDay(d: number, m: number, y: number): number {
    const lastDay = new Date(y, m, 0).getDate(); // dia 0 do próximo mês = último dia do mês atual
    return Math.min(d, lastDay);
  }
  if (card.length > 0) {
    const c = card[0];
    // O mês da fatura é o mês do PAGAMENTO.
    // closingDate (fechamento) é no mês ANTERIOR à fatura.
    // dueDate (vencimento) é no próprio mês da fatura.
    if (c.closingDay) {
      const closingMonth = month === 1 ? 12 : month - 1;
      const closingYear = month === 1 ? year - 1 : year;
      const day = clampDay(c.closingDay, closingMonth, closingYear);
      closingDate = `${closingYear}-${String(closingMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
    if (c.dueDay) {
      // Vencimento no próprio mês da fatura
      const day = clampDay(c.dueDay, month, year);
      dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  await db.insert(creditCardInvoices).values({
    userId, creditCardId, month, year,
    closingDate: closingDate as any,
    dueDate: dueDate as any,
    totalAmount: "0",
    status: "aberta",
  });
  const created = await db.select().from(creditCardInvoices)
    .where(and(
      eq(creditCardInvoices.userId, userId),
      eq(creditCardInvoices.creditCardId, creditCardId),
      eq(creditCardInvoices.month, month),
      eq(creditCardInvoices.year, year)
    )).limit(1);
  return created[0];
}

export async function updateInvoiceTotal(invoiceId: number) {
  const db = await getDb();
  if (!db) return;
  const result = await db.select({ total: sql<string>`SUM(${creditCardItems.amount})` })
    .from(creditCardItems)
    .where(eq(creditCardItems.invoiceId, invoiceId));
  const total = result[0]?.total || "0";
  await db.update(creditCardInvoices).set({ totalAmount: total }).where(eq(creditCardInvoices.id, invoiceId));
}

export async function addItemToInvoice(data: InsertCreditCardItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(creditCardItems).values(data);
  await updateInvoiceTotal(data.invoiceId);
  // Ensure bill exists for this invoice
  await syncInvoiceBill(data.userId, data.invoiceId);
}

export async function removeItemFromInvoice(itemId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const item = await db.select().from(creditCardItems).where(and(eq(creditCardItems.id, itemId), eq(creditCardItems.userId, userId))).limit(1);
  if (item.length === 0) return;
  await db.delete(creditCardItems).where(eq(creditCardItems.id, itemId));
  await updateInvoiceTotal(item[0].invoiceId);
  await syncInvoiceBill(userId, item[0].invoiceId);
}

export async function updateItemInInvoice(
  itemId: number,
  userId: number,
  data: {
    description: string;
    amount: string;
    parentCategory: string;
    subcategoryId?: number | null;
    purchaseDate: string;
    notes?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const item = await db.select().from(creditCardItems)
    .where(and(eq(creditCardItems.id, itemId), eq(creditCardItems.userId, userId))).limit(1);
  if (item.length === 0) throw new Error("Item não encontrado");
  await db.update(creditCardItems).set({
    description: data.description,
    amount: data.amount,
    parentCategory: data.parentCategory as any,
    subcategoryId: data.subcategoryId !== undefined ? data.subcategoryId : null,
    purchaseDate: data.purchaseDate as any,
    notes: (data.notes && String(data.notes).trim() !== '') ? String(data.notes).trim() : null,
  }).where(eq(creditCardItems.id, itemId));
  await updateInvoiceTotal(item[0].invoiceId);
  await syncInvoiceBill(userId, item[0].invoiceId);
}

export async function getCreditCardItems(invoiceId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditCardItems)
    .where(and(eq(creditCardItems.invoiceId, invoiceId), eq(creditCardItems.userId, userId)))
    .orderBy(desc(creditCardItems.purchaseDate));
}

export async function syncInvoiceBill(userId: number, invoiceId: number) {
  const db = await getDb();
  if (!db) return;
  const invoice = await db.select().from(creditCardInvoices).where(and(eq(creditCardInvoices.id, invoiceId), eq(creditCardInvoices.userId, userId))).limit(1);
  if (invoice.length === 0) return;
  const inv = invoice[0];
  if (inv.status === 'paga') return;
  const card = await db.select().from(creditCards).where(eq(creditCards.id, inv.creditCardId)).limit(1);
  const cardName = card[0]?.name || 'Cartão de Crédito';
  const total = parseFloat(inv.totalAmount as string);
  if (total <= 0) return;
  const description = `Fatura ${cardName} ${String(inv.month).padStart(2,'0')}/${inv.year}`;
  if (inv.billId) {
    // Update existing bill
    await db.update(bills).set({ amount: inv.totalAmount as string, dueDate: inv.dueDate as any }).where(eq(bills.id, inv.billId));
  } else {
    // Create new bill
    await db.insert(bills).values({
      userId,
      description,
      amount: inv.totalAmount as string,
      type: 'pagar',
      category: 'financeiro' as any,
      dueDate: (inv.dueDate || `${inv.year}-${String(inv.month).padStart(2,'0')}-10`) as any,
      status: 'pendente',
    });
    const newBill = await db.select().from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.description, description)))
      .orderBy(desc(bills.id)).limit(1);
    if (newBill.length > 0) {
      await db.update(creditCardInvoices).set({ billId: newBill[0].id }).where(eq(creditCardInvoices.id, invoiceId));
    }
  }
}

export async function payInvoice(invoiceId: number, userId: number, bankAccountId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const invoice = await db.select().from(creditCardInvoices).where(and(eq(creditCardInvoices.id, invoiceId), eq(creditCardInvoices.userId, userId))).limit(1);
  if (invoice.length === 0) throw new Error("Fatura não encontrada");
  const inv = invoice[0];
  if (inv.status === 'paga') throw new Error("Fatura já foi paga");
  // Get all items
  const items = await db.select().from(creditCardItems).where(eq(creditCardItems.invoiceId, invoiceId));
  const card = await db.select().from(creditCards).where(eq(creditCards.id, inv.creditCardId)).limit(1);
  const cardName = card[0]?.name || 'Cartão';
  const today = new Date().toISOString().split('T')[0];
  // Create individual expenses for each item
  for (const item of items) {
    await db.insert(expenses).values({
      userId,
      description: item.description,
      amount: item.amount as string,
      parentCategory: item.parentCategory as any,
      subcategoryId: item.subcategoryId,
      date: today as any, // data de pagamento da fatura, não da compra
      notes: item.notes ? `[Cartão ${cardName}] ${item.notes}` : `[Cartão ${cardName}]`,
      sourceType: 'cartao_credito' as any,
      creditCardItemId: item.id,
      installments: item.totalInstallments,
      currentInstallment: item.currentInstallment,
      bankAccountId: bankAccountId || null,
    });
  }
  // Mark invoice as paid
  await db.update(creditCardInvoices).set({ status: 'paga', paidAt: new Date() }).where(eq(creditCardInvoices.id, invoiceId));
  // Mark bill as paid and link bank account
  if (inv.billId) {
    await db.update(bills).set({
      status: 'pago',
      paidAt: today as any,
      ...(bankAccountId ? { bankAccountId } : {}),
    }).where(eq(bills.id, inv.billId));
  }
  return { itemsLaunched: items.length };
}

export async function reverseInvoicePayment(invoiceId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const invoice = await db.select().from(creditCardInvoices)
    .where(and(eq(creditCardInvoices.id, invoiceId), eq(creditCardInvoices.userId, userId))).limit(1);
  if (invoice.length === 0) throw new Error("Fatura não encontrada");
  const inv = invoice[0];
  if (inv.status !== 'paga') throw new Error("Fatura não está paga");

  // 1. Buscar as despesas lançadas automaticamente para esta fatura
  const items = await db.select().from(creditCardItems).where(eq(creditCardItems.invoiceId, invoiceId));
  const itemIds = items.map(i => i.id);

  // 2. Remover as despesas de cartão vinculadas a esses itens
  if (itemIds.length > 0) {
    for (const itemId of itemIds) {
      // Buscar a despesa vinculada a este item
      const linkedExpenses = await db.select().from(expenses)
        .where(and(
          eq(expenses.userId, userId),
          eq(expenses.creditCardItemId, itemId),
          eq(expenses.sourceType, 'cartao_credito' as any)
        ));
      for (const exp of linkedExpenses) {
        // O saldo da conta é calculado dinamicamente (receitas - despesas + initialBalance),
        // então basta remover a despesa para o saldo ser restituído automaticamente.
        await db.delete(expenses).where(eq(expenses.id, exp.id));
      }
    }
  }

  // 3. Reabrir a fatura
  await db.update(creditCardInvoices).set({ status: 'aberta', paidAt: null }).where(eq(creditCardInvoices.id, invoiceId));

  // 4. Reabrir a conta a pagar vinculada
  if (inv.billId) {
    await db.update(bills).set({ status: 'pendente', paidAt: null }).where(eq(bills.id, inv.billId));
  }

  return { reversed: true };
}

export async function generateNextInstallments(
  userId: number,
  creditCardId: number,
  baseItem: InsertCreditCardItem,
  totalInstallments: number,
  firstInvoiceMonth: number,
  firstInvoiceYear: number
) {
  // Gera as parcelas 2..N a partir do mês/ano da primeira fatura (já calculado pelo router)
  const db = await getDb();
  if (!db) return;
  for (let i = 2; i <= totalInstallments; i++) {
    // Cada parcela avança 1 mês a partir da primeira fatura
    let futureMonth = firstInvoiceMonth + (i - 1);
    let futureYear = firstInvoiceYear;
    while (futureMonth > 12) { futureMonth -= 12; futureYear++; }
    const futureInvoice = await getOrCreateInvoice(userId, creditCardId, futureMonth, futureYear);
    const futureItem = {
      userId: baseItem.userId,
      invoiceId: futureInvoice.id,
      creditCardId: baseItem.creditCardId,
      description: baseItem.description,
      amount: baseItem.amount,
      parentCategory: baseItem.parentCategory,
      subcategoryId: baseItem.subcategoryId !== undefined ? baseItem.subcategoryId : null,
      purchaseDate: baseItem.purchaseDate, // mantém a data original da compra
      installments: baseItem.installments,
      currentInstallment: i,
      totalInstallments: baseItem.totalInstallments,
      notes: (baseItem.notes && String(baseItem.notes).trim() !== '') ? String(baseItem.notes).trim() : null,
      isRecurring: baseItem.isRecurring ? 1 : 0,
    };
    await db.insert(creditCardItems).values(futureItem as any);
    await updateInvoiceTotal(futureInvoice.id);
    await syncInvoiceBill(userId, futureInvoice.id);
  }
}

// ─── Account Transfers ────────────────────────────────────────────────────────
export async function listAccountTransfers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountTransfers)
    .where(eq(accountTransfers.userId, userId))
    .orderBy(desc(accountTransfers.date));
}

export async function createAccountTransfer(userId: number, data: Omit<InsertAccountTransfer, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Validate accounts belong to user
  const from = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, data.fromAccountId), eq(bankAccounts.userId, userId))).limit(1);
  const to = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, data.toAccountId), eq(bankAccounts.userId, userId))).limit(1);
  if (from.length === 0 || to.length === 0) throw new Error("Conta não encontrada");
  if (data.fromAccountId === data.toAccountId) throw new Error("Contas de origem e destino devem ser diferentes");
  const result = await db.insert(accountTransfers).values({ ...data, userId });
  return { id: (result as any).insertId };
}

export async function deleteAccountTransfer(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(accountTransfers).where(and(eq(accountTransfers.id, id), eq(accountTransfers.userId, userId)));
}
