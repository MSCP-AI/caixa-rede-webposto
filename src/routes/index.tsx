import { createFileRoute } from "@tanstack/react-router";
import { RedeDashboard } from "@/components/caixa/rede-dashboard";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <RedeDashboard />;
}
