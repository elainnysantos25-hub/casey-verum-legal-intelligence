import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/casey/AppShell";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: AppShell,
});
