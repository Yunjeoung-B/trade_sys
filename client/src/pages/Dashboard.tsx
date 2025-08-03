// This component is now replaced by Layout.tsx and individual page routing
// Keeping as a simple redirect to SpotTrading for backwards compatibility
import SpotTrading from "./SpotTrading";

export default function Dashboard() {
  return <SpotTrading />;
}
