import { Compass, Lock, Sparkles } from "@/lib/icons";

import { PlatformShell } from "@/components/platform-shell";
import { fetchBootstrapData } from "@/lib/api";

export default async function AprendizadoPage() {
  const data = await fetchBootstrapData();

  return (
    <PlatformShell
      heading="Aprendizado e trilhas"
      description="Trilhas por serie, mundos e aulas curtas organizadas para estudo progressivo."
    >
      <section className="section-stack">
        {data.learning_paths.map((path) => (
          <article key={path.id} className="glass panel">
            <div className="section-title">
              <span>{path.grade_band}</span>
              <h2>{path.title}</h2>
              <p>{path.world_name} | dificuldade {path.difficulty}</p>
            </div>
            <div className="path-grid">
              <div className="path-card feature">
                <div className="path-meta">
                  <span>{path.category}</span>
                  <span>{path.completion_rate}% concluido</span>
                </div>
                <strong>Mapa da trilha</strong>
                <p>Acompanhe a progressao do mundo, desbloqueios e proximas etapas.</p>
                <div className="progress-bar compact">
                  <div style={{ width: `${path.completion_rate}%` }} />
                </div>
              </div>
              {path.lessons.map((lesson) => (
                <div key={lesson.id} className={lesson.locked ? "path-card locked-card" : "path-card"}>
                  <div className="path-meta">
                    <span>{lesson.estimated_minutes} min</span>
                    <span>+{lesson.xp_reward} XP</span>
                  </div>
                  <strong>{lesson.title}</strong>
                  <p>{lesson.summary}</p>
                  <div className="lesson-status">
                    {lesson.locked ? <Lock size={16} /> : <Compass size={16} />}
                    {lesson.locked ? "Bloqueada" : lesson.completed ? "Concluida" : "Disponivel"}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}

        <article className="glass panel">
          <div className="section-title">
            <span>Adaptacao</span>
            <h2>Sugestoes inteligentes</h2>
            <p>A plataforma pode virar subdominios como `aprender.localhost` no futuro, mas por enquanto a navegacao ja esta segmentada por rotas.</p>
          </div>
          <div className="insights-grid">
            {data.dashboard.adaptive_plan.weak_points.map((point) => (
              <div key={point.topic} className="insight-card">
                <Sparkles size={18} />
                <div>
                  <strong>{point.topic}</strong>
                  <p>{point.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
