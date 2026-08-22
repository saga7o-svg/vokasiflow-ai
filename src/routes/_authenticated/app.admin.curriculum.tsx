import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/curriculum")({
  beforeLoad: () => {
    throw redirect({
      to: "/app/admin/dashboard",
    });
  },
  component: () => null,
});
