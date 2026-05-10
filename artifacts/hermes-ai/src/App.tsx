import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { storage } from "@/lib/storage";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import CreateProfile from "@/pages/create-profile";
import CatProfile from "@/pages/cat-profile";
import Record from "@/pages/record";

function RootRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!storage.isOnboardingComplete()) {
      navigate("/onboarding");
    } else {
      navigate("/dashboard");
    }
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile/new" component={CreateProfile} />
      <Route path="/profile/:id" component={CatProfile} />
      <Route path="/record/:catId" component={Record} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
