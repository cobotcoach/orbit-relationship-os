import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "ORBIT — Mission Control" }] }),
  component: HomeRedirect,
});

function HomeRedirect() {
  return <Navigate to="/mission" replace />;
}
