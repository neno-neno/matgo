"use client";

import { Flame, Gem, Heart, Sparkles, Trophy } from "@/lib/icons";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { StudentActivityFocus } from "@/components/student-activity-focus";
import { fetchBootstrapData, fetchRewardsOverviewAuthed } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData, fallbackRewardsOverview, RewardsOverview } from "@/lib/data";

export default function HomePage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<BootstrapData>(fallbackBootstrapData);
  const [rewards, setRewards] = useState<RewardsOverview>(fallbackRewardsOverview);

  useEffect(() => {
    fetchBootstrapData().then(setData).catch(() => setData(fallbackBootstrapData));
  }, []);

  useEffect(() => {
    if (!token || !user?.id) {
      setRewards(fallbackRewardsOverview);
      return;
    }
    fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));
  }, [token, user?.id]);

  const profile = user ?? data.dashboard.profile;

  return (
    <PlatformShell
      heading="Painel principal"
      description="Missao diaria, progresso e acessos rapidos dentro da nova identidade da MatGo."
    >
      <section className="hero compact-hero">
        <div className="hero-copy">
          <div className="pill-row single">
            <span className="pill pill-hot"><Sparkles size={16} /> Missao diaria em destaque</span>
          </div>
          <h1>MatGo: treinar matematica todos os dias sem complicacao.</h1>
          <p>
            A home agora funciona como ponto de partida da rotina do aluno: entender a meta do dia, praticar operacoes e seguir evoluindo por tema.
          </p>
          <div className="hero-stats">
            <div className="stat-card">
              <Flame size={18} />
              <strong>{profile.streak} dias</strong>
              <span>streak ativo</span>
            </div>
            <div className="stat-card">
              <Gem size={18} />
              <strong>{profile.coins}</strong>
              <span>moedas</span>
            </div>
            <div className="stat-card">
              <Heart size={18} />
              <strong>{profile.lives}/5</strong>
              <span>vidas</span>
            </div>
          </div>
        </div>

        <div className="hero-panel glass">
          <div className="student-header">
            <img alt="Avatar do usuario" className="avatar" src={profile.avatar_url ?? "https://api.dicebear.com/8.x/adventurer/svg?seed=Usuario"} />
            <div>
              <h3>{profile.full_name}</h3>
              <p>Nivel {profile.level} | papel {profile.role}</p>
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>XP acumulado</span>
              <strong>{profile.xp}</strong>
            </div>
            <div className="progress-bar">
              <div style={{ width: `${data.dashboard.profile.progress_percent}%` }} />
            </div>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{data.dashboard.profile.stats.accuracy}%</strong>
              <span>acertos</span>
            </div>
            <div>
              <strong>{data.dashboard.profile.stats.study_minutes} min</strong>
              <span>tempo estudado</span>
            </div>
            <div>
              <strong>{data.dashboard.adaptive_plan.next_focus}</strong>
              <span>foco sugerido</span>
            </div>
            <div>
              <strong>{data.dashboard.missions.length}</strong>
              <span>missoes ativas</span>
            </div>
          </div>
        </div>
      </section>

      <StudentActivityFocus />

      <section className="content-grid three-up">
        <article className="glass panel">
          <div className="section-title">
            <span>Hoje</span>
            <h2>Missoes do dia</h2>
            <p>{data.dashboard.adaptive_plan.daily_goal}</p>
          </div>
          <div className="mission-list">
            {data.dashboard.missions.map((mission) => (
              <div key={mission.id} className="mission-card">
                <div>
                  <strong>{mission.title}</strong>
                  <span>+{mission.xp_reward} XP</span>
                </div>
                <p>{mission.progress}/{mission.goal}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Desbloqueios</span>
            <h2>Seu progresso aparece aqui</h2>
            <p>Itens raros e badges ganhas automaticamente pela sua rotina na MatGo.</p>
          </div>
          <div className="rank-list">
            {rewards.recent_unlocks.slice(0, 3).map((unlock) => (
              <div key={unlock.id} className="rank-item">
                <strong>{unlock.kind === "cosmetic" ? "I" : "B"}</strong>
                <div>
                  <span>{unlock.title}</span>
                  <small>{unlock.rarity}</small>
                </div>
                <Sparkles size={18} />
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Mundo atual</span>
            <h2>{data.world_map.world_name}</h2>
            <p>{data.world_map.theme}</p>
          </div>
          <div className="world-map single-column">
            {data.world_map.nodes.slice(0, 3).map((node) => (
              <div key={node.id} className={`world-node ${node.status}`}>
                <span>{node.category}</span>
                <strong>{node.title}</strong>
                <small>{"*".repeat(node.stars || 1)}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Ranking</span>
            <h2>Liga semanal</h2>
            <p>Veja o quadro completo na area de relatorios.</p>
          </div>
          <div className="rank-list">
            {data.dashboard.leaderboard.map((entry) => (
              <div key={entry.user_name} className="rank-item">
                <strong>#{entry.position}</strong>
                <div>
                  <span>{entry.user_name}</span>
                  <small>{entry.xp} XP</small>
                </div>
                <Trophy size={18} />
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
