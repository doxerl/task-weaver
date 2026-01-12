import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Today from "./pages/Today";
import Settings from "./pages/Settings";
import Week from "./pages/Week";
import NotFound from "./pages/NotFound";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import BankImport from "./pages/finance/BankImport";
import BankTransactions from "./pages/finance/BankTransactions";
import Receipts from "./pages/finance/Receipts";
import ReceiptUpload from "./pages/finance/ReceiptUpload";
import Categories from "./pages/finance/Categories";
import Reports from "./pages/finance/Reports";
import ManualEntry from "./pages/finance/ManualEntry";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/week" element={<ProtectedRoute><Week /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
            <Route path="/finance/bank-import" element={<ProtectedRoute><BankImport /></ProtectedRoute>} />
            <Route path="/finance/bank-transactions" element={<ProtectedRoute><BankTransactions /></ProtectedRoute>} />
            <Route path="/finance/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
            <Route path="/finance/receipts/upload" element={<ProtectedRoute><ReceiptUpload /></ProtectedRoute>} />
            <Route path="/finance/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/finance/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/finance/manual-entry" element={<ProtectedRoute><ManualEntry /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
