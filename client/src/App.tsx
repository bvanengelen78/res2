import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MockAuthProvider } from "@/context/MockAuthContext";
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
// Login page removed - public access application
import NotFound from "@/pages/not-found";
import UserManagementPage from "@/pages/user-management";

function Router() {
  // Public access - no authentication required
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
          <Route path="/user-management" component={UserManagementPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </MockAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
