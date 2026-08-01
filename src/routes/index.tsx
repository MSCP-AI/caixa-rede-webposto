import { createFileRoute } from "@tanstack/react-router";
import { HomeAlerts } from "@/components/caixa/home-alerts";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <HomeAlerts />;
}
