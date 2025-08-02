import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SpotTrading from "@/pages/SpotTrading";
import ForwardTrading from "@/pages/ForwardTrading";
import SwapTrading from "@/pages/SwapTrading";
import MARTrading from "@/pages/MARTrading";
import ExchangeRates from "@/pages/ExchangeRates";
import TradingStatus from "@/pages/TradingStatus";
import TradeStatus from "@/pages/TradeStatus";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SpreadSettings from "@/pages/admin/SpreadSettings";
import QuoteApprovals from "@/pages/admin/QuoteApprovals";
import UserManagement from "@/pages/admin/UserManagement";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/spot" component={Dashboard} />
          <Route path="/forward" component={Dashboard} />
          <Route path="/swap" component={Dashboard} />
          <Route path="/mar" component={Dashboard} />
          <Route path="/rates" component={Dashboard} />
          <Route path="/trades" component={TradeStatus} />
          
          {user?.role === "admin" && (
            <>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/spreads" component={SpreadSettings} />
              <Route path="/admin/approvals" component={QuoteApprovals} />
              <Route path="/admin/users" component={UserManagement} />
            </>
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
