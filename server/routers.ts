import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import * as db from "./db";

// ─── Shared Schemas ───────────────────────────────────────────────────────────
const monthYearSchema = z.object({ month: z.number().min(1).max(12), year: z.number().min(2000).max(2100) });

// ─── Bank Accounts Router ─────────────────────────────────────────────────────────
const bankAccountsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getBankAccounts(ctx.user.id)),
  listWithBalance: protectedProcedure.query(({ ctx }) => db.getBankAccountsWithBalance(ctx.user.id)),
  getBalance: protectedProcedure.input(z.object({ accountId: z.number() }))
    .query(({ ctx, input }) => db.getBankAccountBalance(input.accountId, ctx.user.id)),
  getTransactions: protectedProcedure.input(z.object({
    accountId: z.number(),
    month: z.number().optional(),
    year: z.number().optional(),
  })).query(({ ctx, input }) => db.getBankAccountTransactions(input.accountId, ctx.user.id, { month: input.month, year: input.year })),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(100),
    bank: z.string().optional(),
    type: z.enum(["corrente","poupanca","carteira","investimento","outro"]).default("corrente"),
    color: z.string().optional(),
    icon: z.string().optional(),
    initialBalance: z.string().default("0"),
  })).mutation(({ ctx, input }) => db.createBankAccount({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    bank: z.string().optional(),
    type: z.enum(["corrente","poupanca","carteira","investimento","outro"]).optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    initialBalance: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateBankAccount(id, ctx.user.id, data as any); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteBankAccount(input.id, ctx.user.id)),
});

// ─── Account Transfers Router ───────────────────────────────────────────────────────
const accountTransfersRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listAccountTransfers(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    fromAccountId: z.number(),
    toAccountId: z.number(),
    amount: z.string(),
    date: z.string(),
    description: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createAccountTransfer(ctx.user.id, input as any)),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteAccountTransfer(input.id, ctx.user.id)),
});

// ─── Family Members Router ─────────────────────────────────────────────────────────
const familyMembersRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getFamilyMembers(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(100),
    relationship: z.enum(["titular","conjuge","filho","filha","pai","mae","outro"]).default("titular"),
    color: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createFamilyMember({ ...input, userId: ctx.user.id })),
  update: protectedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), relationship: z.enum(["titular","conjuge","filho","filha","pai","mae","outro"]).optional(), color: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateFamilyMember(id, ctx.user.id, data); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteFamilyMember(input.id, ctx.user.id)),
});

// ─── Incomes Router ───────────────────────────────────────────────────────────
const incomesRouter = router({
  list: protectedProcedure.input(z.object({ month: z.number().optional(), year: z.number().optional(), memberId: z.number().optional(), bankAccountId: z.number().optional(), dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
    .query(({ ctx, input }) => db.getIncomes(ctx.user.id, input)),
  create: protectedProcedure.input(z.object({
    description: z.string().min(1).max(255),
    amount: z.string(),
    category: z.enum(["salario","renda_extra","pensao","aluguel","investimento","freelance","bonus","dividendos","outros"]),
    date: z.string(),
    familyMemberId: z.number().optional(),
    bankAccountId: z.number().optional(),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createIncome({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), description: z.string().optional(), amount: z.string().optional(),
    category: z.enum(["salario","renda_extra","pensao","aluguel","investimento","freelance","bonus","dividendos","outros"]).optional(),
    date: z.string().optional(), familyMemberId: z.number().nullable().optional(),
    bankAccountId: z.number().nullable().optional(),
    isRecurring: z.boolean().optional(), notes: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateIncome(id, ctx.user.id, data as any); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteIncome(input.id, ctx.user.id)),
});

// ─── Expenses Router ──────────────────────────────────────────────────────────
const expensesRouter = router({
  list: protectedProcedure.input(z.object({ month: z.number().optional(), year: z.number().optional(), memberId: z.number().optional(), category: z.string().optional(), bankAccountId: z.number().optional(), dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
    .query(({ ctx, input }) => db.getExpenses(ctx.user.id, input)),
  create: protectedProcedure.input(z.object({
    description: z.string().min(1).max(255),
    amount: z.string(),
    parentCategory: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"]),
    date: z.string(),
    familyMemberId: z.number().optional(),
    bankAccountId: z.number().optional(),
    creditCardId: z.number().optional(),
    categoryId: z.number().optional(),
    subcategoryId: z.number().optional(),
    paymentMethod: z.enum(["dinheiro","debito","credito","pix","transferencia","boleto","outros"]).optional(),
    isRecurring: z.boolean().optional(),
    installments: z.number().optional(),
    currentInstallment: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createExpense({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), description: z.string().optional(), amount: z.string().optional(),
    parentCategory: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"]).optional(),
    date: z.string().optional(), familyMemberId: z.number().nullable().optional(),
    bankAccountId: z.number().nullable().optional(),
    creditCardId: z.number().nullable().optional(), subcategoryId: z.number().nullable().optional(),
    paymentMethod: z.enum(["dinheiro","debito","credito","pix","transferencia","boleto","outros"]).optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateExpense(id, ctx.user.id, data as any); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteExpense(input.id, ctx.user.id)),
  categories: protectedProcedure.query(({ ctx }) => db.getExpenseCategories(ctx.user.id)),
});

// ─── Bills Router ─────────────────────────────────────────────────────────────
const billsRouter = router({
  list: protectedProcedure.input(z.object({ type: z.enum(["pagar","receber"]).optional(), status: z.string().optional(), month: z.number().optional(), year: z.number().optional() }).optional())
    .query(({ ctx, input }) => db.getBills(ctx.user.id, input)),
  create: protectedProcedure.input(z.object({
    description: z.string().min(1).max(255),
    amount: z.string(),
    type: z.enum(["pagar","receber"]),
    dueDate: z.string(),
    category: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros","salario","renda_extra"]).optional(),
    familyMemberId: z.number().optional(),
    bankAccountId: z.number().optional(),
    subcategoryId: z.number().optional(),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createBill({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), description: z.string().optional(), amount: z.string().optional(),
    dueDate: z.string().optional(), status: z.enum(["pendente","pago","vencido","cancelado"]).optional(),
    subcategoryId: z.number().nullable().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateBill(id, ctx.user.id, data as any); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteBill(input.id, ctx.user.id)),
  markAsPaid: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.markBillAsPaid(input.id, ctx.user.id)),
});

// ─── Credit Cards Router ──────────────────────────────────────────────────────
const creditCardsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getCreditCards(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(100),
    bank: z.string().optional(),
    lastFourDigits: z.string().max(4).optional(),
    creditLimit: z.string(),
    closingDay: z.number().min(1).max(31),
    dueDay: z.number().min(1).max(31),
    color: z.string().optional(),
    familyMemberId: z.number().optional(),
  })).mutation(({ ctx, input }) => db.createCreditCard({ ...input, userId: ctx.user.id })),
  update: protectedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), bank: z.string().optional(),
    creditLimit: z.string().optional(), closingDay: z.number().optional(), dueDay: z.number().optional(), color: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateCreditCard(id, ctx.user.id, data); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteCreditCard(input.id, ctx.user.id)),
});

// ─── Budgets Router ───────────────────────────────────────────────────────────
const budgetsRouter = router({
  list: protectedProcedure.input(monthYearSchema).query(({ ctx, input }) => db.getBudgets(ctx.user.id, input.month, input.year)),
  upsert: protectedProcedure.input(z.object({
    category: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"]),
    month: z.number().min(1).max(12),
    year: z.number().min(2000).max(2100),
    plannedAmount: z.string(),
  })).mutation(({ ctx, input }) => db.upsertBudget({ ...input, userId: ctx.user.id })),
});

// ─── Financial Goals Router ───────────────────────────────────────────────────
const goalsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getFinancialGoals(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(150),
    description: z.string().optional(),
    targetAmount: z.string(),
    deadline: z.string().optional(),
    type: z.enum(["curto_prazo","medio_prazo","longo_prazo"]),
    category: z.enum(["emergencia","viagem","imovel","veiculo","educacao","aposentadoria","outros"]).optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createFinancialGoal({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), description: z.string().optional(),
    targetAmount: z.string().optional(), deadline: z.string().nullable().optional(),
    type: z.enum(["curto_prazo","medio_prazo","longo_prazo"]).optional(),
    isCompleted: z.boolean().optional(), color: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateFinancialGoal(id, ctx.user.id, data as any); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteFinancialGoal(input.id, ctx.user.id)),
  addContribution: protectedProcedure.input(z.object({
    goalId: z.number(), amount: z.string(), date: z.string(), notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.addGoalContribution({ ...input, userId: ctx.user.id } as any)),
});

// ─── Shopping Router ──────────────────────────────────────────────────────────
const shoppingRouter = router({
  supermarkets: router({
    list: protectedProcedure.query(({ ctx }) => db.getSupermarkets(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(100), address: z.string().optional() }))
      .mutation(({ ctx, input }) => db.createSupermarket({ ...input, userId: ctx.user.id })),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteSupermarket(input.id, ctx.user.id)),
  }),
  lists: router({
    list: protectedProcedure.query(({ ctx }) => db.getShoppingLists(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1).max(150), supermarketId: z.number().optional(), shoppingDate: z.string().optional(), notes: z.string().optional(),
    })).mutation(({ ctx, input }) => db.createShoppingList({ ...input, userId: ctx.user.id } as any)),
    update: protectedProcedure.input(z.object({
      id: z.number(), name: z.string().optional(), status: z.enum(["ativa","concluida","cancelada"]).optional(),
      actualTotal: z.string().optional(), supermarketId: z.number().optional(), shoppingDate: z.string().optional(),
      autoExpenseSubcategoryId: z.number().optional(), // subcategoria para despesa automática
    })).mutation(async ({ ctx, input }) => {
      const { id, autoExpenseSubcategoryId, ...data } = input;
      const result = await db.updateShoppingList(id, ctx.user.id, data as any);
      // Criar despesa automática ao concluir a compra
      if (data.status === 'concluida' && data.actualTotal && parseFloat(data.actualTotal) > 0) {
        const list = await db.getShoppingLists(ctx.user.id).then(lists => lists.find(l => l.id === id));
        const supermarketName = list ? (list as any).supermarketName ?? 'Mercado' : 'Mercado';
        const dateStr = data.shoppingDate ?? new Date().toISOString().split('T')[0];
        await db.createExpense({
          userId: ctx.user.id,
          description: `Compra - ${supermarketName}`,
          amount: data.actualTotal,
          category: 'alimentacao' as any,
          subcategoryId: autoExpenseSubcategoryId ?? null,
          date: dateStr,
          notes: `Gerado automaticamente ao concluir lista de compras`,
          isRecurring: false,
        } as any);
      }
      return result;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteShoppingList(input.id, ctx.user.id)),
  }),
  items: router({
    list: protectedProcedure.input(z.object({ listId: z.number() })).query(({ ctx, input }) => db.getShoppingItems(input.listId, ctx.user.id)),
    create: protectedProcedure.input(z.object({
      listId: z.number(), name: z.string().min(1).max(150), quantity: z.string().optional(),
      unit: z.string().optional(), estimatedPrice: z.string().optional(), category: z.string().optional(),
    })).mutation(({ ctx, input }) => db.createShoppingItem({ ...input, userId: ctx.user.id })),
    update: protectedProcedure.input(z.object({
      id: z.number(), name: z.string().optional(), quantity: z.string().optional(),
      actualPrice: z.string().optional(), isChecked: z.boolean().optional(),
    })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateShoppingItem(id, ctx.user.id, data); }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteShoppingItem(input.id, ctx.user.id)),
  }),
});
// (shopping.prices removed - use priceHistory router instead)

// ─── Investments Router ───────────────────────────────────────────────────────
const investmentsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getInvestments(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(150),
    type: z.enum(["poupanca","cdb","lci","lca","tesouro_direto","fundos","acoes","fii","criptomoedas","previdencia","outros"]),
    institution: z.string().optional(),
    initialAmount: z.string(),
    currentAmount: z.string(),
    investedAt: z.string(),
    maturityDate: z.string().optional(),
    annualRate: z.string().optional(),
    isEmergencyFund: z.boolean().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createInvestment({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), currentAmount: z.string().optional(),
    annualRate: z.string().optional(), notes: z.string().optional(), isEmergencyFund: z.boolean().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateInvestment(id, ctx.user.id, data); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteInvestment(input.id, ctx.user.id)),
  addTransaction: protectedProcedure.input(z.object({
    investmentId: z.number(), type: z.enum(["aporte","resgate","rendimento"]), amount: z.string(), date: z.string(), notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.addInvestmentTransaction({ ...input, userId: ctx.user.id } as any)),
  transactions: protectedProcedure.input(z.object({ investmentId: z.number() }))
    .query(({ ctx, input }) => db.getInvestmentTransactions(input.investmentId, ctx.user.id)),
});

// ─── Price History Router ───────────────────────────────────────────────────────
const priceHistoryRouter = router({
  list: protectedProcedure.input(z.object({
    productName: z.string().optional(),
    supermarketId: z.number().optional(),
  }).optional()).query(({ ctx, input }) => db.getPriceHistory(ctx.user.id, input)),
  create: protectedProcedure.input(z.object({
    productName: z.string().min(1).max(150),
    supermarketId: z.number(),
    price: z.string(),
    unit: z.string().optional(),
    recordedAt: z.string(),
  })).mutation(({ ctx, input }) => db.createPriceHistory({ ...input, userId: ctx.user.id } as any)),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deletePriceHistory(input.id, ctx.user.id)),
  comparison: protectedProcedure.input(z.object({ productName: z.string() }))
    .query(({ ctx, input }) => db.getPriceComparison(ctx.user.id, input.productName)),
  products: protectedProcedure.query(({ ctx }) => db.getDistinctProducts(ctx.user.id)),
});

// ─── Fuel History Router ─────────────────────────────────────────────────────
const fuelHistoryRouter = router({
  list: protectedProcedure.input(z.object({
    fuelType: z.string().optional(),
    gasStationName: z.string().optional(),
  }).optional()).query(({ ctx, input }) => db.getFuelHistory(ctx.user.id, input)),
  create: protectedProcedure.input(z.object({
    gasStationName: z.string().min(1).max(150),
    fuelType: z.enum(["gasolina_comum","gasolina_aditivada","etanol","diesel","diesel_s10","gnv"]),
    pricePerLiter: z.string(),
    liters: z.string().optional(),
    totalAmount: z.string().optional(),
    mileage: z.number().optional(),
    recordedAt: z.string(),
    notes: z.string().optional(),
    autoExpenseSubcategoryId: z.number().optional(), // subcategoria para despesa automática
  })).mutation(async ({ ctx, input }) => {
    const { autoExpenseSubcategoryId, ...fuelData } = input;
    const result = await db.createFuelHistory({ ...fuelData, userId: ctx.user.id } as any);
    // Criar despesa automática ao registrar abastecimento
    const total = fuelData.totalAmount
      ? parseFloat(fuelData.totalAmount)
      : fuelData.liters ? parseFloat(fuelData.liters) * parseFloat(fuelData.pricePerLiter) : 0;
    if (total > 0) {
      const fuelLabel: Record<string, string> = {
        gasolina_comum: 'Gasolina Comum', gasolina_aditivada: 'Gasolina Aditivada',
        etanol: 'Etanol', diesel: 'Diesel', diesel_s10: 'Diesel S10', gnv: 'GNV',
      };
      await db.createExpense({
        userId: ctx.user.id,
        description: `Abastecimento - ${fuelLabel[fuelData.fuelType] ?? fuelData.fuelType} (${fuelData.gasStationName})`,
        amount: total.toFixed(2),
        category: 'transporte' as any,
        subcategoryId: autoExpenseSubcategoryId ?? null,
        date: fuelData.recordedAt,
        notes: `Gerado automaticamente ao registrar abastecimento`,
        isRecurring: false,
      } as any);
    }
    return result;
  }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteFuelHistory(input.id, ctx.user.id)),
  stats: protectedProcedure.input(z.object({ fuelType: z.string().optional() }).optional())
    .query(({ ctx, input }) => db.getFuelStats(ctx.user.id, input?.fuelType)),
  stations: protectedProcedure.query(({ ctx }) => db.getDistinctStations(ctx.user.id)),
});

// ─── Expense Groups Router (50/30/20) ─────────────────────────────────────────
const expenseGroupsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getExpenseGroups(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    name: z.string().min(1).max(100),
    groupType: z.enum(["necessario","nao_necessario","investimento"]),
    targetPercent: z.string(),
    color: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createExpenseGroup({ ...input, userId: ctx.user.id } as any)),
  update: protectedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), targetPercent: z.string().optional(), color: z.string().optional(),
  })).mutation(({ ctx, input }) => { const { id, ...data } = input; return db.updateExpenseGroup(id, ctx.user.id, data); }),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteExpenseGroup(input.id, ctx.user.id)),
  subcategories: router({
    list: protectedProcedure.input(z.object({ groupId: z.number().optional() }).optional())
      .query(({ ctx, input }) => db.getExpenseSubcategories(ctx.user.id, input?.groupId)),
    create: protectedProcedure.input(z.object({
      groupId: z.number(),
      name: z.string().min(1).max(100),
      color: z.string().optional(),
      icon: z.string().optional(),
      parentCategory: z.string().optional().default('outros'),
    })).mutation(({ ctx, input }) => db.createExpenseSubcategory({ ...input, userId: ctx.user.id } as any)),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteExpenseSubcategory(input.id, ctx.user.id)),
  }),
  summary: protectedProcedure.input(monthYearSchema)
    .query(({ ctx, input }) => db.getExpenseGroupSummary(ctx.user.id, input.month, input.year)),
});

// ─── Balance Router ─────────────────────────────────────────────────────────
const balanceRouter = router({
  get: protectedProcedure.query(({ ctx }) => db.getInitialBalance(ctx.user.id)),
  getTotal: protectedProcedure.query(({ ctx }) => db.getTotalBalance(ctx.user.id)),
  set: protectedProcedure.input(z.object({ amount: z.number().min(0) })).mutation(({ ctx, input }) => db.setInitialBalance(ctx.user.id, input.amount)),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  summary: protectedProcedure.input(monthYearSchema).query(({ ctx, input }) => db.getDashboardSummary(ctx.user.id, input.month, input.year)),
  evolution: protectedProcedure.input(z.object({ months: z.number().min(3).max(24).optional() }).optional())
    .query(({ ctx, input }) => db.getMonthlyEvolution(ctx.user.id, input?.months ?? 6)),
});

// ─── Credit Card Invoices Router ───────────────────────────────────────────────
const creditCardInvoicesRouter = router({
  list: protectedProcedure.input(z.object({ creditCardId: z.number().optional() }))
    .query(({ ctx, input }) => db.getCreditCardInvoices(ctx.user.id, input.creditCardId)),
  getOrCreate: protectedProcedure.input(z.object({
    creditCardId: z.number(),
    month: z.number().min(1).max(12),
    year: z.number().min(2000).max(2100),
  })).mutation(({ ctx, input }) => db.getOrCreateInvoice(ctx.user.id, input.creditCardId, input.month, input.year)),
  getItems: protectedProcedure.input(z.object({ invoiceId: z.number() }))
    .query(({ ctx, input }) => db.getCreditCardItems(input.invoiceId, ctx.user.id)),
  addItem: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    creditCardId: z.number(),
    description: z.string().min(1).max(255),
    amount: z.string(),
    parentCategory: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"]).default("outros"),
    subcategoryId: z.number().optional(),
    purchaseDate: z.string(),
    installments: z.number().min(1).max(72).default(1),
    notes: z.string().optional(),
    isRecurring: z.boolean().default(false),
  })).mutation(async ({ ctx, input }) => {
    const installments = input.installments ?? 1;

    // Calcular o mês/ano correto da fatura com base na data de compra e no dia de fechamento do cartão
    // Regra (padrão Nubank/mercado): a fatura tem o nome do mês de PAGAMENTO (vencimento), não do mês da compra.
    // - Compra em fevereiro (antes ou no fechamento) → fatura de MARÇO (paga em março)
    // - Compra em fevereiro (após o fechamento) → fatura de ABRIL (paga em abril)
    const purchaseDateObj = new Date(input.purchaseDate + 'T12:00:00');
    const purchaseDay = purchaseDateObj.getDate();
    const purchaseMonth = purchaseDateObj.getMonth() + 1; // 1-12
    const purchaseYear = purchaseDateObj.getFullYear();

    // Buscar o cartão para obter o closingDay
    const card = await db.getCreditCardById(ctx.user.id, input.creditCardId);
    const closingDay = card?.closingDay ?? 1;

    // Função auxiliar para avançar N meses
    function addMonths(month: number, year: number, n: number): { month: number; year: number } {
      let m = month + n;
      let y = year;
      while (m > 12) { m -= 12; y++; }
      return { month: m, year: y };
    }

    // Determinar mês/ano da fatura (mês de pagamento = mês da compra + 1 ou + 2)
    let invoiceMonth: number;
    let invoiceYear: number;
    if (purchaseDay <= closingDay) {
      // Compra antes ou no dia do fechamento → fatura do próximo mês (paga no mês seguinte)
      const next = addMonths(purchaseMonth, purchaseYear, 1);
      invoiceMonth = next.month;
      invoiceYear = next.year;
    } else {
      // Compra após o fechamento → fatura de dois meses à frente
      const next = addMonths(purchaseMonth, purchaseYear, 2);
      invoiceMonth = next.month;
      invoiceYear = next.year;
    }

    // Buscar ou criar a fatura correta
    const correctInvoice = await db.getOrCreateInvoice(ctx.user.id, input.creditCardId, invoiceMonth, invoiceYear);

    const itemData = {
      userId: ctx.user.id,
      invoiceId: correctInvoice.id,
      creditCardId: input.creditCardId,
      description: input.description,
      amount: input.amount,
      parentCategory: input.parentCategory,
      subcategoryId: input.subcategoryId !== undefined ? input.subcategoryId : null,
      purchaseDate: input.purchaseDate,
      installments: installments,
      currentInstallment: 1,
      totalInstallments: installments,
      notes: (input.notes && input.notes.trim() !== '') ? input.notes.trim() : null,
      isRecurring: input.isRecurring ? 1 : 0,
    };
    try {
      await db.addItemToInvoice(itemData as any);
      if (installments > 1) {
        await db.generateNextInstallments(ctx.user.id, input.creditCardId, itemData as any, installments, invoiceMonth, invoiceYear);
      }
    } catch (err: any) {
      console.error('[addItemToInvoice] Error:', err?.message || err);
      throw new Error(err?.message || 'Erro interno ao adicionar gasto');
    }
    return { success: true, invoiceMonth, invoiceYear };
  }),
  removeItem: protectedProcedure.input(z.object({ itemId: z.number() }))
    .mutation(({ ctx, input }) => db.removeItemFromInvoice(input.itemId, ctx.user.id)),
  updateItem: protectedProcedure.input(z.object({
    itemId: z.number(),
    description: z.string().min(1).max(255),
    amount: z.string(),
    parentCategory: z.enum(["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"]).default("outros"),
    subcategoryId: z.number().optional().nullable(),
    purchaseDate: z.string(),
    notes: z.string().optional().nullable(),
  })).mutation(({ ctx, input }) => db.updateItemInInvoice(input.itemId, ctx.user.id, input)),
  payInvoice: protectedProcedure.input(z.object({
    invoiceId: z.number(),
    bankAccountId: z.number().optional().nullable(),
  })).mutation(({ ctx, input }) => db.payInvoice(input.invoiceId, ctx.user.id, input.bankAccountId)),
   reversePayment: protectedProcedure.input(z.object({
    invoiceId: z.number(),
  })).mutation(({ ctx, input }) => db.reverseInvoicePayment(input.invoiceId, ctx.user.id)),
});
// ─── Recurring Router ───────────────────────────────────────────────────────────────────────────────────────────
const recurringRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.getRecurringRules(ctx.user.id)),
  create: protectedProcedure.input(z.object({
    type: z.enum(['expense', 'income', 'credit_card_item']),
    description: z.string().min(1).max(255),
    amount: z.string(),
    category: z.string().optional(),
    paymentMethod: z.enum(['dinheiro','debito','credito','pix','transferencia','boleto','outros']).optional(),
    bankAccountId: z.number().optional(),
    creditCardId: z.number().optional(),
    subcategoryId: z.number().optional(),
    familyMemberId: z.number().optional(),
    frequency: z.enum(['monthly', 'weekly', 'yearly']),
    startDate: z.string(),
    endDate: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(({ ctx, input }) => db.createRecurringRule(ctx.user.id, input as any)),
  cancel: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.cancelRecurringRule(input.id, ctx.user.id)),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteRecurringRule(input.id, ctx.user.id)),
  generatePending: protectedProcedure.mutation(({ ctx }) => db.generatePendingRecurringEntries(ctx.user.id)),
});
// ─── Bill Alerts Router ─────────────────────────────────────────────────────
const billAlertsRouter = router({
  /**
   * Verifica contas pendentes que vencem em até 7 dias e envia notificação
   * ao dono do projeto. Retorna a lista de contas alertadas.
   * Deve ser chamado uma vez por dia (ex: ao abrir o app).
   */
  checkAndNotify: protectedProcedure.mutation(async ({ ctx }) => {
    const dueBills = await db.getBillsDueForNotification(ctx.user.id, 7);
    if (dueBills.length === 0) return { notified: 0, bills: [] };

    const lines = dueBills.map(({ bill, daysBeforeDue }) => {
      const label = daysBeforeDue === 0 ? 'vence HOJE' :
        daysBeforeDue === 1 ? 'vence amanhã' :
        `vence em ${daysBeforeDue} dias`;
      const amount = parseFloat(String(bill.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return `• ${bill.description} — ${amount} (${label})`;
    });

    await notifyOwner({
      title: `⚠️ ${dueBills.length} conta(s) a pagar próxima(s) do vencimento`,
      content: `As seguintes contas estão próximas do vencimento:\n\n${lines.join('\n')}\n\nAcesse o FinançaFamiliar para mais detalhes.`,
    });

    // Registra as notificações enviadas para evitar duplicatas
    for (const { bill, daysBeforeDue } of dueBills) {
      await db.markBillNotificationSent(ctx.user.id, bill.id, daysBeforeDue);
    }

    return { notified: dueBills.length, bills: dueBills.map(({ bill, daysBeforeDue }) => ({ id: bill.id, description: bill.description, dueDate: bill.dueDate, amount: bill.amount, daysBeforeDue })) };
  }),

  /**
   * Retorna contas pendentes que vencem em até 7 dias (para exibir no dashboard).
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    return db.getBillsDueForNotification(ctx.user.id, 7);
  }),
});

// ─── Import CSV Router ─────────────────────────────────────────────────────────
const PARENT_CATEGORIES = ["habitacao","alimentacao","saude","educacao","transporte","vestuario","lazer","financeiro","utilidades","pessoal","outros"] as const;

const importCsvRouter = router({
  // Categoriza automaticamente uma lista de descrições de transações via LLM
  categorize: protectedProcedure.input(z.object({
    transactions: z.array(z.object({
      id: z.string(),
      description: z.string(),
      amount: z.number(),
    })),
  })).mutation(async ({ input }) => {
    const list = input.transactions.map(t => `${t.id}|${t.description}|${t.amount}`).join('\n');
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: `Você é um assistente de finanças pessoais. Categorize cada transação financeira em uma das seguintes categorias: habitacao, alimentacao, saude, educacao, transporte, vestuario, lazer, financeiro, utilidades, pessoal, outros. Responda APENAS com JSON no formato {"results":[{"id":"...","category":"...","reason":"..."}]}. Sem texto adicional.` },
        { role: 'user', content: `Categorize estas transações (formato: id|descrição|valor):\n${list}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'categorization',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    category: { type: 'string', enum: PARENT_CATEGORIES as unknown as string[] },
                    reason: { type: 'string' },
                  },
                  required: ['id', 'category', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['results'],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0].message.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return parsed as { results: Array<{ id: string; category: string; reason: string }> };
  }),

  // Importa em lote despesas a partir do CSV já parseado no frontend
  importExpenses: protectedProcedure.input(z.object({
    expenses: z.array(z.object({
      description: z.string(),
      amount: z.string(),
      date: z.string(),
      parentCategory: z.enum(PARENT_CATEGORIES),
      subcategoryId: z.number().optional(),
      bankAccountId: z.number().optional(),
      paymentMethod: z.enum(["dinheiro","debito","credito","pix","transferencia","boleto","outros"]).optional(),
      notes: z.string().optional(),
    })),
  })).mutation(async ({ ctx, input }) => {
    const results = [];
    for (const expense of input.expenses) {
      const created = await db.createExpense({ ...expense, userId: ctx.user.id } as any);
      results.push(created);
    }
    return { imported: results.length };
  }),

  // Importa em lote lançamentos de cartão de crédito
  importCreditCardItems: protectedProcedure.input(z.object({
    creditCardId: z.number(),
    items: z.array(z.object({
      description: z.string(),
      amount: z.string(),
      date: z.string(),
      category: z.enum(PARENT_CATEGORIES),
      subcategoryId: z.number().nullish(),
      notes: z.string().nullish(),
    })),
  })).mutation(async ({ ctx, input }) => {
    let imported = 0;
    // Buscar o cartão uma vez para obter o closingDay
    const card = await db.getCreditCardById(ctx.user.id, input.creditCardId);
    const closingDay = card?.closingDay ?? 1;

    // Função auxiliar para avançar N meses
    function addMonths(month: number, year: number, n: number): { month: number; year: number } {
      let m = month + n;
      let y = year;
      while (m > 12) { m -= 12; y++; }
      return { month: m, year: y };
    }

    for (const item of input.items) {
      // Garantir formato YYYY-MM-DD para o MySQL (campo date no schema)
      const rawDate = item.date;
      let isoDate: string;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        isoDate = rawDate; // já está no formato correto
      } else {
        // Converter qualquer outro formato para YYYY-MM-DD
        const d = new Date(rawDate);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        isoDate = `${y}-${m}-${day}`;
      }
      const [yearStr, monthStr, dayStr] = isoDate.split('-');
      const purchaseMonth = parseInt(monthStr, 10);
      const purchaseYear = parseInt(yearStr, 10);
      const purchaseDay = parseInt(dayStr, 10);

      // Determinar mês/ano da fatura usando a mesma lógica do addItem:
      // Compra antes ou no fechamento → fatura do próximo mês
      // Compra após o fechamento → fatura de dois meses à frente
      let invoiceMonth: number;
      let invoiceYear: number;
      if (purchaseDay <= closingDay) {
        const next = addMonths(purchaseMonth, purchaseYear, 1);
        invoiceMonth = next.month;
        invoiceYear = next.year;
      } else {
        const next = addMonths(purchaseMonth, purchaseYear, 2);
        invoiceMonth = next.month;
        invoiceYear = next.year;
      }

      const invoice = await db.getOrCreateInvoice(ctx.user.id, input.creditCardId, invoiceMonth, invoiceYear);
      // Garantir que subcategoryId e notes sejam null (não undefined nem string vazia)
      const subcategoryId = (item.subcategoryId != null && item.subcategoryId !== undefined) ? item.subcategoryId : null;
      const notes = (item.notes && String(item.notes).trim() !== '') ? String(item.notes).trim() : null;
      await db.addItemToInvoice({
        userId: ctx.user.id,
        invoiceId: invoice.id,
        creditCardId: input.creditCardId,
        description: item.description,
        amount: item.amount,
        parentCategory: item.category,
        subcategoryId,
        purchaseDate: isoDate as unknown as Date,
        notes,
        installments: 1,
        currentInstallment: 1,
        totalInstallments: 1,
        isRecurring: 0,
        createdAt: new Date(),
      });
      imported++;
    }
    return { imported };
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  familyMembers: familyMembersRouter,
  incomes: incomesRouter,
  expenses: expensesRouter,
  bills: billsRouter,
  creditCards: creditCardsRouter,
  budgets: budgetsRouter,
  goals: goalsRouter,
  shopping: shoppingRouter,
  investments: investmentsRouter,
  dashboard: dashboardRouter,
  priceHistory: priceHistoryRouter,
  fuelHistory: fuelHistoryRouter,
  expenseGroups: expenseGroupsRouter,
  balance: balanceRouter,
  bankAccounts: bankAccountsRouter,
  accountTransfers: accountTransfersRouter,
  creditCardInvoices: creditCardInvoicesRouter,
   recurring: recurringRouter,
  billAlerts: billAlertsRouter,
  importCsv: importCsvRouter,
});
export type AppRouter = typeof appRouter;

