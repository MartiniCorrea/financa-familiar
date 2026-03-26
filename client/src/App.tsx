import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { trpc } from "./lib/trpc";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Incomes from "./pages/Incomes";
import Expenses from "./pages/Expenses";
import Bills from "./pages/Bills";
import CreditCards from "./pages/CreditCards";
import Budget from "./pages/Budget";
import Goals from "./pages/Goals";
import Market from "./pages/Market";
import Investments from "./pages/Investments";
import Reports from "./pages/Reports";
import FamilyMembers from "./pages/FamilyMembers";
import FuelHistory from "./pages/FuelHistory";
import ExpenseGroups from "./pages/ExpenseGroups";
import BankAccounts from "./pages/BankAccounts";
import Recurring from "./pages/Recurring";

/** Verifica vencimentos uma vez por sessão (quando o usuário está logado) */
function BillDueChecker() {
  const { user } = useAuth();
  const checkAndNotify = trpc.billAlerts.checkAndNotify.useMutation();
  const checked = useRef(false);

  useEffect(() => {
    if (!user || checked.current) return;
    // Verifica apenas uma vez por sessão de navegação
    const lastCheck = sessionStorage.getItem('billAlertChecked');
    if (lastCheck) return;
    checked.current = true;
    sessionStorage.setItem('billAlertChecked', '1');
    checkAndNotify.mutate();
  }, [user]);

  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <DashboardLayout>
          <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/receitas" component={Incomes} />
        <Route path="/despesas" component={Expenses} />
        <Route path="/contas" component={Bills} />
        <Route path="/cartoes" component={CreditCards} />
        <Route path="/orcamento" component={Budget} />
        <Route path="/metas" component={Goals} />
        <Route path="/mercado" component={Market} />
        <Route path="/combustivel" component={FuelHistory} />
        <Route path="/categorias" component={ExpenseGroups} />
        <Route path="/investimentos" component={Investments} />
        <Route path="/relatorios" component={Reports} />
        <Route path="/familia" component={FamilyMembers} />
        <Route path="/contas-bancarias" component={BankAccounts} />
        <Route path="/recorrencias" component={Recurring} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </Route>
  </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <BillDueChecker />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
