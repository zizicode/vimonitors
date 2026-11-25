// apps/dashboard/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function DashboardApp() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>VIMONITORS — Dashboard Administrativo</h1>
      <p>Consola privada inicializada.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>
);