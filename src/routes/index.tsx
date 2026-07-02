import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Mawson — Mission Control" }] }),
  component: HomeRedirect,
});

function HomeRedirect() {
  return <Navigate to="/mission" replace />;
}
