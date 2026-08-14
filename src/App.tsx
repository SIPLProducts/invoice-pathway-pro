import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { RequirePermission } from "@/components/RequirePermission";
import { AuthProvider } from "@/lib/auth";
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
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route path="/" element={<RequirePermission screen="dashboard" label="Dashboard"><Dashboard /></RequirePermission>} />
              <Route path="/dmr" element={<RequirePermission screen="dmr" label="DMR"><DMRList /></RequirePermission>} />
              <Route path="/dmr/new" element={<RequirePermission screen="dmr" action="create" label="DMR"><DMRNew /></RequirePermission>} />
              <Route path="/dmr/:id" element={<RequirePermission screen="dmr" label="DMR"><DMRDetail /></RequirePermission>} />
              <Route path="/ocr" element={<RequirePermission screen="gate_entries" label="Gate Entries"><OCRCapture /></RequirePermission>} />
              <Route path="/grn" element={<RequirePermission screen="grn" label="GRN"><GRN /></RequirePermission>} />
              <Route path="/tracker" element={<RequirePermission screen="sap_tracker" label="SAP Tracker"><Tracker /></RequirePermission>} />
              <Route path="/approvals" element={<RequirePermission screen="approvals" label="Approvals"><Approvals /></RequirePermission>} />
              <Route path="/documents" element={<RequirePermission screen="documents" label="Documents"><Documents /></RequirePermission>} />
              <Route path="/reports" element={<RequirePermission screen="reports" label="Reports"><Reports /></RequirePermission>} />
              <Route path="/sap/settings" element={<RequirePermission screen="sap_module" label="SAP Module"><SAPSettings /></RequirePermission>} />
              <Route path="/sap/settings/edit/:id" element={<RequirePermission screen="sap_module" action="edit" label="SAP Module"><SAPApiEdit /></RequirePermission>} />
              <Route path="/sap/monitor" element={<RequirePermission screen="sap_module" label="SAP Module"><SAPSyncMonitor /></RequirePermission>} />
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
