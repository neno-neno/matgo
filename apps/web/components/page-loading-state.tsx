"use client";

type PageLoadingStateProps = {
  title?: string;
  subtitle?: string;
};

export function PageLoadingState({
  title = "Carregando",
  subtitle = "Preparando os dados.",
}: PageLoadingStateProps) {
  return (
    <section className="section-stack">
      <article className="glass panel">
        <div className="page-loading-state">
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
        </div>
      </article>
    </section>
  );
}
