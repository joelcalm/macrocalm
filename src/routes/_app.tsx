import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) {
    // client-side redirect via throw
    throw redirect({ to: "/login" });
  }
  return <Outlet />;
}
