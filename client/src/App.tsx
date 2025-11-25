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
import TradeStatus from "@/pages/TradeStatus";
import SpotTradingCustomer from "@/pages/customer/SpotTradingCustomer";
import ForwardTradingCustomer from "@/pages/customer/ForwardTradingCustomer";
import SwapTradingCustomer from "@/pages/customer/SwapTradingCustomer";
import MARTradingCustomer from "@/pages/customer/MARTradingCustomer";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SpreadSettings from "@/pages/admin/SpreadSettings";
import QuoteApprovals from "@/pages/admin/QuoteApprovals";
import UserManagement from "@/pages/admin/UserManagement";
import TradeManagement from "@/pages/admin/TradeManagement";
import InfomaxAPI from "@/pages/admin/InfomaxAPI";
import FXSpotMonitoring from "@/pages/admin/FXSpotMonitoring";
import FXSwapMonitoring from "@/pages/admin/FXSwapMonitoring";
import ForwardRateCalculator from "@/pages/admin/ForwardRateCalculator";
import SwapPointsHistoryPage from "@/pages/admin/SwapPointsHistoryPage";

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
          <Route path="/" component={SpotTradingCustomer} />
          
          {/* 고객용 거래 화면 */}
          <Route path="/customer/spot" component={SpotTradingCustomer} />
          <Route path="/customer/forward" component={ForwardTradingCustomer} />
          <Route path="/customer/swap" component={SwapTradingCustomer} />
          <Route path="/customer/mar" component={MARTradingCustomer} />
          <Route path="/trades" component={TradeStatus} />
          
          {/* Admin routes - 관리자 권한 확인 */}
          <Route path="/admin">
            {user?.role === "admin" ? <AdminDashboard /> : <NotFound />}
          </Route>
          <Route path="/admin/forward-calculator">
            {user?.role === "admin" ? <ForwardRateCalculator /> : <NotFound />}
          </Route>
          <Route path="/admin/fx-spot">
            {user?.role === "admin" ? <FXSpotMonitoring /> : <NotFound />}
          </Route>
          <Route path="/admin/fx-swap">
            {user?.role === "admin" ? <FXSwapMonitoring /> : <NotFound />}
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
          <Route path="/admin/infomax">
            {user?.role === "admin" ? <InfomaxAPI /> : <NotFound />}
          </Route>
          <Route path="/admin/swap-points-history">
            {user?.role === "admin" ? <SwapPointsHistoryPage /> : <NotFound />}
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
