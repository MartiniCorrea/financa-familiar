import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...createTestContext(),
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBe(1);
  });
});

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      ...createTestContext(),
      user: null,
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("dashboard.summary", () => {
  it("returns a valid summary structure", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.dashboard.summary({ month: 3, year: 2026 });
    expect(summary).toBeDefined();
    expect(typeof summary.totalIncome).toBe("number");
    expect(typeof summary.totalExpense).toBe("number");
    expect(typeof summary.balance).toBe("number");
    expect(typeof summary.savingsRate).toBe("number");
    expect(Array.isArray(summary.expenseByCategory)).toBe(true);
    expect(Array.isArray(summary.pendingBills)).toBe(true);
  });
});

describe("dashboard.evolution", () => {
  it("returns evolution data for specified months", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const evolution = await caller.dashboard.evolution({ months: 6 });
    expect(Array.isArray(evolution)).toBe(true);
    expect(evolution.length).toBeLessThanOrEqual(6);
    if (evolution.length > 0) {
      const first = evolution[0];
      expect(first).toHaveProperty("month");
      expect(first).toHaveProperty("income");
      expect(first).toHaveProperty("expense");
    }
  });
});

describe("incomes", () => {
  it("returns list of incomes", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const incomes = await caller.incomes.list({ month: 3, year: 2026 });
    expect(Array.isArray(incomes)).toBe(true);
  });
});

describe("expenses", () => {
  it("returns list of expenses", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const expenses = await caller.expenses.list({ month: 3, year: 2026 });
    expect(Array.isArray(expenses)).toBe(true);
  });
});

describe("bills", () => {
  it("returns list of bills", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const bills = await caller.bills.list({ status: "pendente" });
    expect(Array.isArray(bills)).toBe(true);
  });
});

describe("goals", () => {
  it("returns list of goals", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const goals = await caller.goals.list();
    expect(Array.isArray(goals)).toBe(true);
  });
});

describe("budgets", () => {
  it("returns list of budgets for a given month/year", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const budgets = await caller.budgets.list({ month: 3, year: 2026 });
    expect(Array.isArray(budgets)).toBe(true);
  });
});

describe("investments", () => {
  it("returns list of investments", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const investments = await caller.investments.list();
    expect(Array.isArray(investments)).toBe(true);
  });
});

describe("familyMembers", () => {
  it("returns list of family members", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const members = await caller.familyMembers.list();
    expect(Array.isArray(members)).toBe(true);
  });
});

describe("shopping.lists", () => {
  it("returns list of shopping lists", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const lists = await caller.shopping.lists.list();
    expect(Array.isArray(lists)).toBe(true);
  });
});
