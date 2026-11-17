import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/casey/AppShell";
import { overviewQuery } from "@/lib/casey/queries";

export const Route = createFileRoute("/_shell")({
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery()).catch(() => undefined),
  component: AppShell,
});
