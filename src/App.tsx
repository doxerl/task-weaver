import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { YearProvider } from "@/contexts/YearContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Initialize i18n
import "@/i18n";
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
import VatReport from "./pages/finance/VatReport";
import ReceiptDetail from "./pages/finance/ReceiptDetail";
import BalanceSheet from "./pages/finance/BalanceSheet";
import CostCenterAnalysis from "./pages/finance/CostCenterAnalysis";
import GrowthSimulation from "./pages/finance/GrowthSimulation";
import ScenarioComparisonPage from "./pages/finance/ScenarioComparisonPage";
import GrowthComparisonPage from "./pages/finance/GrowthComparisonPage";
import OfficialData from "./pages/finance/OfficialData";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LanguageProvider>
            <YearProvider>
              <CurrencyProvider>
                <Toaster />
                <Sonner position="top-center" />
                <BrowserRouter basename="/finance">
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/week" element={<ProtectedRoute><Week /></ProtectedRoute>} />
                    <Route path="/bank-import" element={<ProtectedRoute><BankImport /></ProtectedRoute>} />
                    <Route path="/bank-transactions" element={<ProtectedRoute><BankTransactions /></ProtectedRoute>} />
                    <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
                    <Route path="/receipts/upload" element={<ProtectedRoute><ReceiptUpload /></ProtectedRoute>} />
                    <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/vat-report" element={<ProtectedRoute><VatReport /></ProtectedRoute>} />
                    <Route path="/manual-entry" element={<ProtectedRoute><ManualEntry /></ProtectedRoute>} />
                    <Route path="/receipts/:id" element={<ProtectedRoute><ReceiptDetail /></ProtectedRoute>} />
                    <Route path="/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
                    <Route path="/cost-center" element={<ProtectedRoute><CostCenterAnalysis /></ProtectedRoute>} />
                    <Route path="/simulation" element={<ProtectedRoute><GrowthSimulation /></ProtectedRoute>} />
                    <Route path="/simulation/compare" element={<ProtectedRoute><ScenarioComparisonPage /></ProtectedRoute>} />
                    <Route path="/simulation/growth" element={<ProtectedRoute><GrowthComparisonPage /></ProtectedRoute>} />
                    <Route path="/official-data" element={<ProtectedRoute><OfficialData /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </CurrencyProvider>
            </YearProvider>
          </LanguageProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
