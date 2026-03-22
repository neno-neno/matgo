"use client";

export function PlatformFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="platform-footer">
      <p>&copy; {year} MatGo. Desenvolvido por Neto Damasceno. Todos os direitos reservados.</p>
    </footer>
  );
}
