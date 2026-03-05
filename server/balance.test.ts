import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof db>();
  return {
    ...original,
    getInitialBalance: vi.fn(),
    setInitialBalance: vi.fn(),
    getTotalBalance: vi.fn(),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-42",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("balance router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("balance.get returns the initial balance for the user", async () => {
    vi.mocked(db.getInitialBalance).mockResolvedValue(1500);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.balance.get();

    expect(result).toBe(1500);
    expect(db.getInitialBalance).toHaveBeenCalledWith(42);
  });

  it("balance.getTotal returns the total accumulated balance", async () => {
    vi.mocked(db.getTotalBalance).mockResolvedValue(3200.50);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.balance.getTotal();

    expect(result).toBe(3200.50);
    expect(db.getTotalBalance).toHaveBeenCalledWith(42);
  });

  it("balance.set updates the initial balance", async () => {
    vi.mocked(db.setInitialBalance).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.balance.set({ amount: 5000 });

    expect(db.setInitialBalance).toHaveBeenCalledWith(42, 5000);
  });

  it("balance.set rejects negative amounts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.balance.set({ amount: -100 })).rejects.toThrow();
    expect(db.setInitialBalance).not.toHaveBeenCalled();
  });

  it("balance.set accepts zero as initial balance", async () => {
    vi.mocked(db.setInitialBalance).mockResolvedValue(undefined);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.balance.set({ amount: 0 });

    expect(db.setInitialBalance).toHaveBeenCalledWith(42, 0);
  });
});
