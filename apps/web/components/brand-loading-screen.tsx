"use client";

import Image from "next/image";

type BrandLoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

export function BrandLoadingScreen({
  title = "MatGo",
  subtitle = "Preparando sua trilha personalizada, seu painel e o proximo passo da jornada.",
}: BrandLoadingScreenProps) {
  return (
    <div className="brand-loading-screen">
      <div className="brand-loading-card">
        <div className="brand-loading-mark">
          <Image alt="Mascote oficial da MatGo" className="brand-image" height={86} src="/oficial.png" width={86} />
        </div>
        <div className="brand-loading-copy">
          <span className="brand-loading-kicker">Universo MatGo</span>
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
        <div aria-hidden="true" className="brand-loading-dots">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <small>Developed by Neto Damasceno</small>
      </div>
    </div>
  );
}
