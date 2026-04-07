// Testar o comportamento do Drizzle com campos null vs undefined
// usando uma conexão mock que captura o SQL gerado

import mysql2 from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { int, mysqlTable, varchar, decimal, date, tinyint, text, timestamp } from 'drizzle-orm/mysql-core';

const creditCardItems = mysqlTable('credit_card_items', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  invoiceId: int('invoiceId').notNull(),
  creditCardId: int('creditCardId').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  subcategoryId: int('subcategoryId'),
  purchaseDate: date('purchaseDate').notNull(),
  notes: text('notes'),
  isRecurring: tinyint('isRecurring').notNull().default(0),
  expenseId: int('expenseId'),
  recurringRuleId: int('recurringRuleId'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

// Mock de conexão que captura queries
const capturedQueries = [];
const mockPool = {
  execute: async (sql, params) => {
    capturedQueries.push({ sql, params });
    console.log('SQL gerado:', sql);
    console.log('Params:', JSON.stringify(params));
    return [[], []];
  },
  query: async (sql, params) => {
    capturedQueries.push({ sql, params });
    return [[], []];
  },
};

const db = drizzle(mockPool);

// Testar com null explícito
const dataWithNull = {
  userId: 1,
  invoiceId: 12,
  creditCardId: 2,
  description: 'Test',
  amount: '7.95',
  subcategoryId: null,
  purchaseDate: '2026-03-28',
  notes: null,
  isRecurring: 0,
  expenseId: null,
  recurringRuleId: null,
  createdAt: new Date(),
};

// Testar com undefined
const dataWithUndefined = {
  userId: 1,
  invoiceId: 12,
  creditCardId: 2,
  description: 'Test',
  amount: '7.95',
  subcategoryId: undefined,
  purchaseDate: '2026-03-28',
  notes: undefined,
  isRecurring: 0,
  expenseId: undefined,
  recurringRuleId: undefined,
  createdAt: new Date(),
};

console.log('=== COM NULL ===');
await db.insert(creditCardItems).values(dataWithNull);

console.log('\n=== COM UNDEFINED ===');
await db.insert(creditCardItems).values(dataWithUndefined);

console.log('\n=== SEM OS CAMPOS (omitidos) ===');
const dataOmitted = {
  userId: 1,
  invoiceId: 12,
  creditCardId: 2,
  description: 'Test',
  amount: '7.95',
  purchaseDate: '2026-03-28',
  isRecurring: 0,
  createdAt: new Date(),
};
await db.insert(creditCardItems).values(dataOmitted);
