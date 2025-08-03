import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import SpotTrading from "@/pages/SpotTrading";
import ForwardTrading from "@/pages/ForwardTrading";
import SwapTrading from "@/pages/SwapTrading";
import MARTrading from "@/pages/MARTrading";
import ExchangeRates from "@/pages/ExchangeRates";
import TradeStatus from "@/pages/TradeStatus";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SpreadSettings from "@/pages/admin/SpreadSettings";
import QuoteApprovals from "@/pages/admin/QuoteApprovals";
import UserManagement from "@/pages/admin/UserManagement";
import TradeManagement from "@/pages/admin/TradeManagement";
import BloombergAPI from "@/pages/admin/BloombergAPI";

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
        <Layout>
          <Route path="/" component={SpotTrading} />
          <Route path="/spot" component={SpotTrading} />
          <Route path="/forward" component={ForwardTrading} />
          <Route path="/swap" component={SwapTrading} />
          <Route path="/mar" component={MARTrading} />
          <Route path="/rates" component={ExchangeRates} />
          <Route path="/trades" component={TradeStatus} />
          
          {user?.role === "admin" && (
            <>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/spreads" component={SpreadSettings} />
              <Route path="/admin/approvals" component={QuoteApprovals} />
              <Route path="/admin/users" component={UserManagement} />
              <Route path="/admin/trades" component={TradeManagement} />
              <Route path="/admin/bloomberg" component={BloombergAPI} />
            </>
          )}
        </Layout>
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
