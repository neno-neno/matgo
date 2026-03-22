"use client";

export function PlatformFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="platform-footer">
      <p>&copy; {year} MatGo. Desenvolvida por Neto Damasceno, Professor de matematica. Todos os direitos reservados.</p>
    </footer>
  );
}
