import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
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
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
