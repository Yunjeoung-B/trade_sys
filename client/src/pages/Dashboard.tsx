import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SpotTrading from "./SpotTrading";
import AdminDashboard from "./admin/AdminDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  // Default to appropriate page based on role
  const shouldShowDefaultContent = location === "/";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6">
          {shouldShowDefaultContent && (
            <>
              {user.role === "admin" ? (
                <AdminDashboard />
              ) : (
                <SpotTrading />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
