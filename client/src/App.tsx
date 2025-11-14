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
import SpotTradingCustomer from "@/pages/customer/SpotTradingCustomer";
import MARTradingCustomer from "@/pages/customer/MARTradingCustomer";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SpreadSettings from "@/pages/admin/SpreadSettings";
import QuoteApprovals from "@/pages/admin/QuoteApprovals";
import UserManagement from "@/pages/admin/UserManagement";
import TradeManagement from "@/pages/admin/TradeManagement";
import BloombergAPI from "@/pages/admin/BloombergAPINew";
import InfomaxAPI from "@/pages/admin/InfomaxAPI";
import ExcelMonitoring from "@/pages/admin/ExcelMonitoring";
import FXSpotMonitoring from "@/pages/admin/FXSpotMonitoring";

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
          
          {/* 고객용 거래 화면 */}
          <Route path="/customer/spot" component={SpotTradingCustomer} />
          <Route path="/customer/mar" component={MARTradingCustomer} />
          
          {/* 트레이더용 거래 화면 */}
          <Route path="/spot" component={SpotTrading} />
          <Route path="/forward" component={ForwardTrading} />
          <Route path="/swap" component={SwapTrading} />
          <Route path="/mar" component={MARTrading} />
          <Route path="/rates" component={ExchangeRates} />
          <Route path="/trades" component={TradeStatus} />
          
          {/* Admin routes - 관리자 권한 확인 */}
          <Route path="/admin">
            {user?.role === "admin" ? <AdminDashboard /> : <NotFound />}
          </Route>
          <Route path="/admin/fx-spot">
            {user?.role === "admin" ? <FXSpotMonitoring /> : <NotFound />}
          </Route>
          <Route path="/admin/spreads">
            {user?.role === "admin" ? <SpreadSettings /> : <NotFound />}
          </Route>
          <Route path="/admin/approvals">
            {user?.role === "admin" ? <QuoteApprovals /> : <NotFound />}
          </Route>
          <Route path="/admin/users">
            {user?.role === "admin" ? <UserManagement /> : <NotFound />}
          </Route>
          <Route path="/admin/trades">
            {user?.role === "admin" ? <TradeManagement /> : <NotFound />}
          </Route>
          <Route path="/admin/bloomberg">
            {user?.role === "admin" ? <BloombergAPI /> : <NotFound />}
          </Route>
          <Route path="/admin/infomax">
            {user?.role === "admin" ? <InfomaxAPI /> : <NotFound />}
          </Route>
          <Route path="/admin/excel">
            {user?.role === "admin" ? <ExcelMonitoring /> : <NotFound />}
          </Route>
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
