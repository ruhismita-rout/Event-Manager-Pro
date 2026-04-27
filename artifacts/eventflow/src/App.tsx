import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, RequireOrganizer } from "@/lib/auth";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import EventList from "@/pages/events/index";
import EventNew from "@/pages/events/new";
import EventDetail from "@/pages/events/[id]/index";
import EventEdit from "@/pages/events/[id]/edit";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={() => <RequireOrganizer><Dashboard /></RequireOrganizer>} />
      <Route path="/events" component={EventList} />
      <Route path="/events/new" component={() => <RequireOrganizer><EventNew /></RequireOrganizer>} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/events/:id/edit" component={() => <RequireOrganizer><EventEdit /></RequireOrganizer>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
