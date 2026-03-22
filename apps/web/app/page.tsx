"use client";

import Link from "next/link";
import { Flame, Gem, Heart, Sparkles, Trophy } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { StudentActivityFocus } from "@/components/student-activity-focus";
import { fetchBootstrapData, fetchForumTopicsAuthed, fetchRewardsOverviewAuthed, fetchTeacherClassesAuthed, fetchTeacherStudentsAuthed } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData, fallbackForumTopics, fallbackRewardsOverview, ForumTopic, RewardsOverview } from "@/lib/data";

export default function HomePage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<BootstrapData>(fallbackBootstrapData);
  const [rewards, setRewards] = useState<RewardsOverview>(fallbackRewardsOverview);
  const [teacherClasses, setTeacherClasses] = useState(data.teacher_dashboard.classes);
  const [teacherStudents, setTeacherStudents] = useState<typeof data.teacher_dashboard.attention_needed>([]);
  const [teacherTopics, setTeacherTopics] = useState<ForumTopic[]>(fallbackForumTopics);

  useEffect(() => {
    fetchBootstrapData().then(setData).catch(() => setData(fallbackBootstrapData));
  }, []);

  useEffect(() => {
    if (!token || !user?.id || user.role !== "student") {
      setRewards(fallbackRewardsOverview);
      return;
    }
    fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (!token || (user?.role !== "teacher" && user?.role !== "master")) {
      return;
    }
    fetchTeacherClassesAuthed(token)
      .then((items) =>
        setTeacherClasses(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            grade_band: item.grade_band,
            students: item.students_count,
            average_accuracy: item.average_accuracy,
            pending_challenges: 0,
          })),
        ),
      )
      .catch(() => setTeacherClasses(data.teacher_dashboard.classes));
    fetchTeacherStudentsAuthed(token)
      .then((items) =>
        setTeacherStudents(
          items.map((student) => ({
            student_name: student.full_name,
            progress_percent: student.level * 5,
            accuracy: student.accuracy,
            weekly_minutes: student.study_minutes,
            strongest_topic: student.strong_areas[0] ?? "Em consolidacao",
            weak_topic: student.weak_areas[0] ?? "Sem alerta forte",
          })),
        ),
      )
      .catch(() => setTeacherStudents(data.teacher_dashboard.attention_needed));
    fetchForumTopicsAuthed(token).then(setTeacherTopics).catch(() => setTeacherTopics(fallbackForumTopics));
  }, [data.teacher_dashboard.attention_needed, data.teacher_dashboard.classes, token, user?.role]);

  const profile = user ?? data.dashboard.profile;
  const dailyMissionSummary = useMemo(() => {
    return data.dashboard.missions.slice(0, 3);
  }, [data.dashboard.missions]);

  if (user?.role === "teacher" || user?.role === "master") {
    return (
      <PlatformShell
        heading="Painel principal"
        description="Turmas e acompanhamento da rotina da turma em primeiro plano."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Turmas</span>
              <h2>Acesso rapido as turmas</h2>
              <p>Entradas diretas para abrir a turma, ver codigo e seguir organizando logins reais.</p>
            </div>
            <div className="teacher-list">
              {teacherClasses.map((classroom) => (
                <div key={classroom.id} className="teacher-row-card teacher-row-card-fit">
                  <div>
                    <strong>{classroom.name}</strong>
                    <small>{classroom.grade_band}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{classroom.students} alunos</span>
                    <span className="tag">{classroom.average_accuracy}% media</span>
                    <Link className="tag link-tag" href={`/professor/turmas/${classroom.id}`}>Abrir turma</Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="content-grid teacher-home-grid">
          <article className="glass panel">
            <div className="section-title">
              <span>Execucao</span>
              <h2>Andamento das tarefas da turma</h2>
              <p>Leitura em tempo real do ritmo dos alunos para decidir reforco e acompanhamento rapido.</p>
            </div>
            <div className="teacher-list">
              {teacherStudents.slice(0, 6).map((student) => (
                <div key={student.student_name} className="teacher-row-card stacked">
                  <div>
                    <strong>{student.student_name}</strong>
                    <small>{student.weekly_minutes} min estudados</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{student.accuracy}% acerto</span>
                    <span className="tag">forte: {student.strongest_topic}</span>
                    <span className="tag warning">atenção: {student.weak_topic}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-metrics">
              <Link className="tag link-tag" href="/atividades">Abrir aba de atividades</Link>
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Forum</span>
              <h2>Topicos recentes da turma</h2>
              <p>Visao rapida dos foruns mais novos para o professor acompanhar e criar novos topicos sem sair do ritmo da home.</p>
            </div>
            <div className="teacher-list">
              {teacherTopics.slice(0, 4).map((topic) => (
                <div key={topic.id} className="teacher-row-card stacked">
                  <div>
                    <strong>{topic.title}</strong>
                    <small>{topic.author_name} | {topic.tags.join(" | ") || "sem tags"}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{topic.topic_type === "activity" ? "atividade" : "discussao"}</span>
                    <span className="tag">{topic.replies} respostas</span>
                    <Link className="tag link-tag" href={`/forum/${topic.id}`}>Abrir topico</Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-metrics">
              <Link className="primary-button" href="/forum">Criar novo forum</Link>
              <Link className="tag link-tag" href="/forum">Ver todos os foruns</Link>
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
