import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pesquisa from "./pages/Pesquisa";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminRoomForm from "./pages/AdminRoomForm";
import AdminReservationNew from "./pages/AdminReservationNew";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registo" element={<Register />} />
            <Route path="/pesquisa" element={<Pesquisa />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/quartos/novo" element={<AdminRoute><AdminRoomForm /></AdminRoute>} />
            <Route path="/admin/quartos/:id" element={<AdminRoute><AdminRoomForm /></AdminRoute>} />
            <Route path="/admin/reservas/novo" element={<AdminRoute><AdminReservationNew /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
