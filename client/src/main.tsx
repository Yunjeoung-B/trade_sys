import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

// Enable dark mode by default
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>
);
