import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SpotTrading from "./SpotTrading";
import ForwardTrading from "./ForwardTrading";
import SwapTrading from "./SwapTrading";
import MARTrading from "./MARTrading";
import ExchangeRates from "./ExchangeRates";
import TradingStatus from "./TradingStatus";
import AdminDashboard from "./admin/AdminDashboard";
import SpreadSettings from "./admin/SpreadSettings";
import QuoteApprovals from "./admin/QuoteApprovals";
import UserManagement from "./admin/UserManagement";

export default function Dashboard() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const renderContent = () => {
    switch (location) {
      case "/spot":
        return <SpotTrading />;
      case "/forward":
        return <ForwardTrading />;
      case "/swap":
        return <SwapTrading />;
      case "/mar":
        return <MARTrading />;
      case "/rates":
        return <ExchangeRates />;
      case "/trades":
        return <TradingStatus />;
      case "/admin":
        return user.role === "admin" ? <AdminDashboard /> : <SpotTrading />;
      case "/admin/spreads":
        return user.role === "admin" ? <SpreadSettings /> : <SpotTrading />;
      case "/admin/approvals":
        return user.role === "admin" ? <QuoteApprovals /> : <SpotTrading />;
      case "/admin/users":
        return user.role === "admin" ? <UserManagement /> : <SpotTrading />;
      default:
        return user.role === "admin" ? <AdminDashboard /> : <SpotTrading />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-blue-800 font-['Nanum_Gothic']">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
