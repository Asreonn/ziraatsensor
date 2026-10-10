import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { DataProvider } from "@/lib/sensors/DataProvider";
import AuthPage from "./pages/Auth";
import Overview from "./pages/Overview";
import SystemStatus from "./pages/SystemStatus";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const Router = window.location.hostname.endsWith("github.io") ? HashRouter : BrowserRouter;

function AppContent() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 px-5 py-4 text-sm text-muted-foreground">
          AICO workspace hazirlaniyor...
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/system" element={<SystemStatus />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DataProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
