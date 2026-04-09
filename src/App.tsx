import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Partners from "@/pages/Partners";
import PartnerDetail from "@/pages/PartnerDetail";
import PartnerContactDetail from "@/pages/PartnerContactDetail";
import UnitContactDetail from "@/pages/UnitContactDetail";
import Needs from "@/pages/Needs";
import NeedDetail from "@/pages/NeedDetail";
import Hypotheses from "@/pages/Hypotheses";
import HypothesisDetail from "@/pages/HypothesisDetail";
import NextSteps from "@/pages/NextSteps";
import NextStepDetail from "@/pages/NextStepDetail";
import Units from "@/pages/Units";
import UnitDetail from "@/pages/UnitDetail";
import Competencies from "@/pages/Competencies";
import CompetencyDetail from "@/pages/CompetencyDetail";
import Sources from "@/pages/Sources";
import SourceDetail from "@/pages/SourceDetail";
import EvidencePage from "@/pages/Evidence";
import EvidenceDetail from "@/pages/EvidenceDetail";
import ExternalContacts from "@/pages/ExternalContacts";
import InternalContacts from "@/pages/InternalContacts";
import Admin from "@/pages/Admin";
import ResetPassword from "@/pages/ResetPassword";
import Bootstrap from "@/pages/Bootstrap";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/bootstrap" element={<Bootstrap />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
              <Route path="/partners/:partnerId/contacts/new" element={<PartnerContactDetail />} />
              <Route path="/partners/:partnerId/contacts/:contactId" element={<PartnerContactDetail />} />
              <Route path="/needs" element={<Needs />} />
              <Route path="/needs/:id" element={<NeedDetail />} />
              <Route path="/hypotheses" element={<Hypotheses />} />
              <Route path="/hypotheses/:id" element={<HypothesisDetail />} />
              <Route path="/next-steps" element={<NextSteps />} />
              <Route path="/next-steps/:id" element={<NextStepDetail />} />
              <Route path="/units" element={<Units />} />
              <Route path="/units/:id" element={<UnitDetail />} />
              <Route path="/units/:unitId/contacts/new" element={<UnitContactDetail />} />
              <Route path="/units/:unitId/contacts/:contactId" element={<UnitContactDetail />} />
              <Route path="/competencies" element={<Competencies />} />
              <Route path="/competencies/:id" element={<CompetencyDetail />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/sources/:id" element={<SourceDetail />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/evidence/:id" element={<EvidenceDetail />} />
              <Route path="/contacts/external" element={<ExternalContacts />} />
              <Route path="/contacts/external/new" element={<PartnerContactDetail />} />
              <Route path="/contacts/external/:contactId" element={<PartnerContactDetail />} />
              <Route path="/contacts/internal" element={<InternalContacts />} />
              <Route path="/contacts/internal/new" element={<UnitContactDetail />} />
              <Route path="/contacts/internal/:contactId" element={<UnitContactDetail />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
