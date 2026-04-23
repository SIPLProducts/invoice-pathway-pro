import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { useSapAutoLogin } from "@/hooks/useSapAutoLogin";
import Dashboard from "./pages/Dashboard";
import DMRList from "./pages/DMRList";
import DMRDetail from "./pages/DMRDetail";
import DMRNew from "./pages/DMRNew";
import OCRCapture from "./pages/OCRCapture";
import GRN from "./pages/GRN";
import Tracker from "./pages/Tracker";
import Approvals from "./pages/Approvals";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import SAPSettings from "./pages/SAPSettings";
import SAPSyncMonitor from "./pages/SAPSyncMonitor";
import SAPApiEdit from "./pages/SAPApiEdit";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  useSapAutoLogin();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dmr" element={<DMRList />} />
        <Route path="/dmr/new" element={<DMRNew />} />
        <Route path="/dmr/:id" element={<DMRDetail />} />
        <Route path="/ocr" element={<OCRCapture />} />
        <Route path="/grn" element={<GRN />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/sap/settings" element={<SAPSettings />} />
        <Route path="/sap/settings/edit/:id" element={<SAPApiEdit />} />
        <Route path="/sap/monitor" element={<SAPSyncMonitor />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);


export default App;

