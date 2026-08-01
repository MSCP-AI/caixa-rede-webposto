import { createFileRoute } from "@tanstack/react-router";
import { RedeDashboard } from "@/components/caixa/rede-dashboard";

export const Route = createFileRoute("/rede")({
  component: RedePage,
});

function RedePage() {
  return <RedeDashboard />;
}
