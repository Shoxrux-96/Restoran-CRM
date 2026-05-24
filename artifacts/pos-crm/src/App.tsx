import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import OwnerDashboard from "@/pages/owner/dashboard";
import OwnerVenues from "@/pages/owner/venues";
import OwnerVenueDetail from "@/pages/owner/venue-detail";
import OwnerUsers from "@/pages/owner/users";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminPos from "@/pages/admin/pos";
import AdminProducts from "@/pages/admin/products";
import AdminCustomers from "@/pages/admin/customers";
import AdminDebts from "@/pages/admin/debts";
import AdminRooms from "@/pages/admin/rooms";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ component: Component, role }: { component: React.ComponentType; role: "owner" | "admin" }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;

  if (role && user?.role !== role) {
    return <Redirect to={user?.role === "owner" ? "/owner/dashboard" : "/admin/dashboard"} />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Redirect to={user?.role === "owner" ? "/owner/dashboard" : "/admin/dashboard"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />

      <Route path="/owner/dashboard" component={() => <ProtectedRoute component={OwnerDashboard} role="owner" />} />
      <Route path="/owner/venues" component={() => <ProtectedRoute component={OwnerVenues} role="owner" />} />
      <Route path="/owner/venues/:id" component={() => <ProtectedRoute component={OwnerVenueDetail} role="owner" />} />
      <Route path="/owner/users" component={() => <ProtectedRoute component={OwnerUsers} role="owner" />} />

      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} role="admin" />} />
      <Route path="/admin/pos" component={() => <ProtectedRoute component={AdminPos} role="admin" />} />
      <Route path="/admin/products" component={() => <ProtectedRoute component={AdminProducts} role="admin" />} />
      <Route path="/admin/rooms" component={() => <ProtectedRoute component={AdminRooms} role="admin" />} />
      <Route path="/admin/customers" component={() => <ProtectedRoute component={AdminCustomers} role="admin" />} />
      <Route path="/admin/debts" component={() => <ProtectedRoute component={AdminDebts} role="admin" />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
