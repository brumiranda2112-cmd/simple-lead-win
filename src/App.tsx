import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AppLayout } from "@/components/AppLayout";
import { TaskAlertModal } from "@/components/TaskAlertModal";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Leads from "./pages/Leads";
import Tasks from "./pages/Tasks";
import Financeiro from "./pages/Financeiro";
import Agendamentos from "./pages/Agendamentos";
import Agendar from "./pages/Agendar";
import WhatsAppInbox from "./pages/WhatsAppInbox";
import Admin from "./pages/Admin";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const MASTER_EMAIL = 'khronos@crm.ia';

function ProtectedRoutes() {
  const { user, isLoggedIn, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  
  // Master account always goes to setup page
  if (user?.email?.toLowerCase() === MASTER_EMAIL) {
    return <Navigate to="/setup" replace />;
  }
  
  return (
    <AppLayout>
      <TaskAlertModal />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/whatsapp" element={<WhatsAppInbox />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AppRoutes() {
  const { user, isLoggedIn, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  
  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;
  
  return (
    <Routes>
      <Route path="/agendar" element={<Agendar />} />
      <Route path="/setup" element={isLoggedIn && isMaster ? <Setup /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={isLoggedIn ? (isMaster ? <Navigate to="/setup" replace /> : <Navigate to="/" replace />) : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrandingProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </BrandingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
