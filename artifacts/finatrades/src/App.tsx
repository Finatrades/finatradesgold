import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';
import EcosystemLanding from "@/pages/ecosystem/EcosystemLanding";

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={EcosystemLanding} />
          <Route path="/ecosystem" component={EcosystemLanding} />
          <Route component={EcosystemLanding} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
