import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
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
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
