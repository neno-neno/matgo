"use client";

import Link from "next/link";
import { Flame, Gem, Heart, Sparkles, Trophy } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

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
  const dailyMissionSummary = useMemo(() => {
    return data.dashboard.missions.slice(0, 3);
  }, [data.dashboard.missions]);

  if (user?.role === "teacher" || user?.role === "master") {
    return (
      <PlatformShell
        heading="Painel principal"
        description="Visao mais objetiva para acompanhar turma, alunos e proximos pontos de acao."
      >
        <section className="content-grid">
          <article className="glass panel">
            <div className="section-title">
              <span>Turmas</span>
              <h2>Resumo do professor</h2>
              <p>Aqui ficam so os indicadores uteis para gestao da turma, sem moedas, XP ou nivel.</p>
            </div>
            <div className="teacher-list">
              {data.teacher_dashboard.classes.map((classroom) => (
                <div key={classroom.id} className="teacher-row-card">
                  <div>
                    <strong>{classroom.name}</strong>
                    <small>{classroom.grade_band}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{classroom.students} alunos</span>
                    <span className="tag">{classroom.average_accuracy}% media</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Atencao</span>
              <h2>Quem precisa de apoio</h2>
              <p>Use isso para decidir reforco, atividade aplicada e acompanhamento individual.</p>
            </div>
            <div className="teacher-list">
              {data.teacher_dashboard.attention_needed.map((student) => (
                <div key={student.student_name} className="teacher-row-card stacked">
                  <div>
                    <strong>{student.student_name}</strong>
                    <small>{student.weekly_minutes} min na semana</small>
                  </div>
                  <p>Fragilidade principal: {student.weak_topic}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Painel principal"
      description="Um painel mais leve para o aluno entender o que fazer agora e seguir a rotina sem se perder."
    >
      <section className="hero compact-hero">
        <div className="hero-copy hero-copy-compact">
          <div className="pill-row single">
            <span className="pill pill-hot"><Sparkles size={16} /> Rotina do dia</span>
          </div>
          <h1>Hoje o foco e entrar, praticar e avancar.</h1>
          <p>A home agora mostra so o essencial: sua rotina, o mundo atual e o proximo passo da trilha.</p>
          <div className="hero-inline-stats">
            <span className="tag"><Flame size={14} /> {profile.streak} dias</span>
            <span className="tag"><Gem size={14} /> {profile.coins} moedas</span>
            <span className="tag"><Heart size={14} /> {profile.lives}/5 vidas</span>
          </div>
        </div>

        <div className="hero-panel glass hero-panel-compact">
          <div className="student-header student-header-compact">
            <img alt="Avatar do usuario" className="avatar avatar-compact" src={profile.avatar_url ?? "https://api.dicebear.com/8.x/adventurer/svg?seed=Usuario"} />
            <div>
              <h3>{profile.full_name}</h3>
              <p>Nivel {profile.level} | foco sugerido: {data.dashboard.adaptive_plan.next_focus}</p>
            </div>
          </div>
          <div className="progress-block compact-progress">
            <div>
              <span>Seu progresso geral</span>
              <strong>{profile.xp}</strong>
            </div>
            <div className="progress-bar">
              <div style={{ width: `${data.dashboard.profile.progress_percent}%` }} />
            </div>
          </div>
          <div className="hero-actions-row">
            <Link className="primary-button" href="/atividades">
              <Sparkles size={16} />
              Abrir missao de hoje
            </Link>
            <Link className="secondary-button" href="/aprendizado">
              Ver trilha atual
            </Link>
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
            {dailyMissionSummary.map((mission) => (
              <div key={mission.id} className="mission-card mission-card-stacked">
                <div>
                  <strong>{mission.title}</strong>
                  <span>{mission.description}</span>
                </div>
                <div className="mission-card-side">
                  <strong>{mission.progress}/{mission.goal}</strong>
                  <small>+{mission.xp_reward} XP</small>
                </div>
              </div>
            ))}
          </div>
          <div className="inline-metrics">
            <Link className="tag link-tag" href="/atividades">Ir para atividades</Link>
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
          <div className="inline-metrics">
            <span className="tag"><Trophy size={14} /> {rewards.achievements.filter((item) => item.unlocked).length} badges ativas</span>
            <span className="tag"><Sparkles size={14} /> {rewards.cosmetics.filter((item) => item.unlocked).length} itens liberados</span>
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
