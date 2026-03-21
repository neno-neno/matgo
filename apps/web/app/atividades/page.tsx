import { Clock3, Swords, Target } from "@/lib/icons";

import { DailyMissionBoard } from "@/components/daily-mission-board";
import { PlatformShell } from "@/components/platform-shell";
import { StudentActivityFocus } from "@/components/student-activity-focus";
import { fetchBootstrapData } from "@/lib/api";

export default async function AtividadesPage() {
  const data = await fetchBootstrapData();

  return (
    <PlatformShell
      heading="Atividades e pratica"
      description="Rotina diaria de pratica objetiva para manter consistencia, foco e variacao de temas."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Missao</span>
            <h2>Ritmo diario do aluno</h2>
            <p>A plataforma agora organiza a pratica diaria em blocos objetivos, curtos e com tema do dia.</p>
          </div>
          <div className="mission-list">
            {data.dashboard.missions.map((mission) => (
              <div key={mission.id} className="mission-card">
                <div>
                  <strong>{mission.title}</strong>
                  <span>{mission.description}</span>
                </div>
                <p>{mission.progress}/{mission.goal}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Extra</span>
            <h2>Batalhas e intensidade</h2>
            <p>As batalhas continuam como camada complementar para variar o ritmo depois da missao diaria.</p>
          </div>
          <div className="battle-list">
            {data.battles.map((battle) => (
              <div key={battle.id} className="battle-card">
                <div>
                  <strong>{battle.title}</strong>
                  <small>vs {battle.opponent_name}</small>
                </div>
                <p>{battle.reward_xp} XP | {battle.topic}</p>
                <div className="battle-tags">
                  <span className="tag"><Swords size={14} /> PVP</span>
                  <span className="tag"><Clock3 size={14} /> {battle.duration_seconds}s</span>
                  <span className="tag"><Target size={14} /> dificuldade {battle.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <StudentActivityFocus />
      <DailyMissionBoard />
    </PlatformShell>
  );
}
