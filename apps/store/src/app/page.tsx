// apps/store/src/app/page.tsx
import { centsToDisplay } from "@vimonitors/shared";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>VIMONITORS — Tienda</h1>
      <p>Base inicial lista. Ejemplo formato monetario: {centsToDisplay(19900)}</p>
    </main>
  );
}