import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Dashboard from "@/pages/dashboard";
import ManagementDashboard from "@/pages/management-dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "./pages/project-detail.tsx";
import Resources from "@/pages/resources";
import ResourceDetail from "@/pages/resource-detail";
import Calendar from "@/pages/calendar";
import TimeLogging from "@/pages/time-logging";
import MobileTimeLogging from "@/pages/mobile-time-logging";
import Reports from "@/pages/reports";
import ChangeLeadReports from "@/pages/change-lead-reports";
import ChangeEffortReport from "@/pages/change-effort-report";
import BusinessControllerReport from "@/pages/business-controller-report";
import SubmissionOverview from "@/pages/submission-overview";
import Settings from "@/pages/settings";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { EnhancedUIDemo } from "@/components/enhanced-ui-demo";
import { TooltipDemo } from "@/components/tooltip-demo";
import { ResourceTooltipTest } from "@/components/resource-tooltip-test";
import { TooltipImprovementsTest } from "@/components/tooltip-improvements-test";
import { UtilizationBarTest } from "@/components/utilization-bar-test";
import { KpiCardDemo } from "@/components/ui/kpi-card-demo";
import { AllocationInputTest } from "@/components/allocation-input-test";
import { CelebrationTest } from "@/components/celebration-test";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  // Show main application if authenticated
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto main-content-bg">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/management-dashboard" component={ManagementDashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/resources" component={Resources} />
          <Route path="/resources/:id" component={ResourceDetail} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/time-logging" component={TimeLogging} />
          <Route path="/mobile-time-logging" component={MobileTimeLogging} />
          <Route path="/reports" component={Reports} />
          <Route path="/change-lead-reports" component={ChangeLeadReports} />
          <Route path="/change-effort-report" component={ChangeEffortReport} />
          <Route path="/business-controller-report" component={BusinessControllerReport} />
          <Route path="/submission-overview" component={SubmissionOverview} />
          <Route path="/settings" component={Settings} />
          <Route path="/demo" component={EnhancedUIDemo} />
          <Route path="/tooltip-demo" component={TooltipDemo} />
          <Route path="/resource-tooltip-test" component={ResourceTooltipTest} />
          <Route path="/tooltip-improvements-test" component={TooltipImprovementsTest} />
          <Route path="/utilization-bar-test" component={UtilizationBarTest} />
          <Route path="/allocation-input-test" component={AllocationInputTest} />
          <Route path="/celebration-test" component={CelebrationTest} />
          <Route path="/kpi-card-demo" component={KpiCardDemo} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
