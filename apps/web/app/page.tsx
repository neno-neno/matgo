"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Flame, Gem, Heart, Sparkles, Trophy } from "@/lib/icons";
import { useAuth } from "@/components/auth-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { PlatformShell } from "@/components/platform-shell";
import { StudentActivityFocus } from "@/components/student-activity-focus";
import {
  fetchBootstrapData,
  fetchDailyMissionAuthed,
  fetchForumTopicsAuthed,
  fetchRewardsOverviewAuthed,
  fetchStudentInsightsAuthed,
  fetchTeacherClassesAuthed,
  fetchTeacherStudentsAuthed,
} from "@/lib/api";
import { BootstrapData, DailyMission, ForumTopic, RewardsOverview, StudentInsightsResponse } from "@/lib/data";

type TeacherHomeClass = {
  id: string;
  name: string;
  grade_band: string;
  students: number;
  average_accuracy: number;
  pending_challenges: number;
};

type TeacherHomeStudent = {
  student_name: string;
  progress_percent: number;
  accuracy: number;
  weekly_minutes: number;
  strongest_topic: string;
  weak_topic: string;
};

export default function HomePage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [rewards, setRewards] = useState<RewardsOverview | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherHomeClass[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<TeacherHomeStudent[]>([]);
  const [teacherTopics, setTeacherTopics] = useState<ForumTopic[]>([]);
  const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);
  const [studentInsights, setStudentInsights] = useState<StudentInsightsResponse | null>(null);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [isRoleDataLoading, setIsRoleDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsBootstrapLoading(true);

    fetchBootstrapData()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !user?.id) {
      setRewards(null);
      setDailyMission(null);
      setStudentInsights(null);
      setTeacherClasses([]);
      setTeacherStudents([]);
      setTeacherTopics([]);
      setIsRoleDataLoading(false);
      return;
    }

    let cancelled = false;
    setIsRoleDataLoading(true);

    if (user.role === "student") {
      Promise.allSettled([
        fetchRewardsOverviewAuthed(token, user.id),
        fetchDailyMissionAuthed(token),
        fetchStudentInsightsAuthed(token),
      ]).then(([rewardsResult, missionResult, insightsResult]) => {
        if (cancelled) {
          return;
        }
        setRewards(rewardsResult.status === "fulfilled" ? rewardsResult.value : null);
        setDailyMission(missionResult.status === "fulfilled" ? missionResult.value : null);
        setStudentInsights(insightsResult.status === "fulfilled" ? insightsResult.value : null);
        setIsRoleDataLoading(false);
      });
    } else if (user.role === "teacher" || user.role === "master") {
      Promise.allSettled([
        fetchTeacherClassesAuthed(token),
        fetchTeacherStudentsAuthed(token),
        fetchForumTopicsAuthed(token),
      ]).then(([classesResult, studentsResult, topicsResult]) => {
        if (cancelled) {
          return;
        }

        setTeacherClasses(
          classesResult.status === "fulfilled"
            ? classesResult.value.map((item) => ({
                id: item.id,
                name: item.name,
                grade_band: item.grade_band,
                students: item.students_count,
                average_accuracy: item.average_accuracy,
                pending_challenges: 0,
              }))
            : [],
        );

        setTeacherStudents(
          studentsResult.status === "fulfilled"
            ? studentsResult.value.map((student) => ({
                student_name: student.full_name,
                progress_percent: student.level * 5,
                accuracy: student.accuracy,
                weekly_minutes: student.study_minutes,
                strongest_topic: student.strong_areas[0] ?? "Em consolidação",
                weak_topic: student.weak_areas[0] ?? "Sem alerta forte",
              }))
            : [],
        );

        setTeacherTopics(topicsResult.status === "fulfilled" ? topicsResult.value : []);
        setIsRoleDataLoading(false);
      });
    } else {
      setIsRoleDataLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.role]);

  if (
    isBootstrapLoading ||
    !data ||
    (user?.role === "student" && (isRoleDataLoading || !dailyMission || !studentInsights || !rewards)) ||
    ((user?.role === "teacher" || user?.role === "master") && isRoleDataLoading)
  ) {
    return (
      <PlatformShell heading="Painel principal" description="Carregando os dados mais recentes do seu painel.">
        <PageLoadingState
          title="Montando seu painel"
          subtitle="Buscando missões, trilhas, turmas e indicadores reais antes de mostrar a interface."
        />
      </PlatformShell>
    );
  }

  const profile = user ?? data.dashboard.profile;
  const activeDailyMission = dailyMission as DailyMission;
  const activeStudentInsights = studentInsights as StudentInsightsResponse;
  const activeRewards = rewards as RewardsOverview;
  const dailyMissionSummary = data.dashboard.missions.slice(0, 3);
  const missionProgressPercent =
    activeDailyMission.total_exercises === 0 ? 0 : Math.round((activeDailyMission.completed_exercises / activeDailyMission.total_exercises) * 100);
  const missionRewardCoins = Math.max(50, activeDailyMission.estimated_minutes * 10);
  const missionBonusCoins = Math.max(30, Math.round(missionRewardCoins * 0.4));
  const missionRemaining = Math.max(0, activeDailyMission.total_exercises - activeDailyMission.completed_exercises);
  const missionRecordStreak = Math.max(profile.streak + 3, 12);
  const effectiveAccuracy = user?.role === "student" ? activeStudentInsights.accuracy : data.dashboard.profile.stats.accuracy;
  const effectiveStudyMinutes = user?.role === "student" ? activeStudentInsights.study_minutes : data.dashboard.profile.stats.study_minutes;
  const currentFocus = user?.role === "student" ? activeStudentInsights.adaptive_plan.next_focus : activeDailyMission.theme;
  const missionMotivation =
    missionProgressPercent >= 70
      ? "Você já engrenou hoje. Falta pouco para fechar a missão."
      : effectiveAccuracy >= 80
        ? `Você está com ${effectiveAccuracy}% de acerto. Mantenha esse ritmo.`
        : profile.streak >= 5
          ? `Sequência de ${profile.streak} dias. Não quebre agora.`
          : `Só mais ${activeDailyMission.estimated_minutes} minutos para manter sua rotina viva.`;
  const missionDifficulty =
    activeStudentInsights.adaptive_plan.current_difficulty >= 4
      ? "desafiador"
      : activeStudentInsights.adaptive_plan.current_difficulty >= 3
        ? "médio"
        : activeStudentInsights.adaptive_plan.current_difficulty >= 2
          ? "leve"
          : "inicial";

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
              <h2>Acesso rápido às turmas</h2>
              <p>Entradas diretas para abrir a turma, ver o código e seguir organizando logins e aprovações.</p>
            </div>
            <div className="teacher-list">
              {teacherClasses.map((classroom) => (
                <div key={classroom.id} className="teacher-row-card teacher-row-card-fit">
                  <div className="teacher-row-copy">
                    <strong>{classroom.name}</strong>
                    <small>{classroom.grade_band}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{classroom.students} alunos</span>
                    <span className="tag">{classroom.average_accuracy}% média</span>
                    <Link className="tag link-tag" href={`/professor/turmas/${classroom.id}`}>
                      Abrir turma
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="content-grid teacher-home-grid">
          <article className="glass panel">
            <div className="section-title">
              <span>Execução</span>
              <h2>Acompanhamento das tarefas da turma</h2>
            </div>
            <div className="teacher-list">
              {teacherStudents.slice(0, 6).map((student) => (
                <div key={student.student_name} className="teacher-row-card stacked">
                  <div className="teacher-row-copy">
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
              <Link className="tag link-tag" href="/atividades">
                Abrir aba de atividades
              </Link>
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Fórum</span>
              <h2>Tópicos recentes da turma</h2>
            </div>
            <div className="teacher-list">
              {teacherTopics.slice(0, 4).map((topic) => (
                <div key={topic.id} className="teacher-row-card stacked">
                  <div className="teacher-row-copy">
                    <strong>{topic.title}</strong>
                    <small>{topic.author_name} | {topic.tags.join(" | ") || "sem tags"}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{topic.topic_type === "activity" ? "atividade" : "discussão"}</span>
                    <span className="tag">{topic.replies} respostas</span>
                    <Link className="tag link-tag" href={`/forum/${topic.id}`}>
                      Abrir tópico
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-metrics">
              <Link className="primary-button" href="/forum">
                Criar novo fórum
              </Link>
              <Link className="tag link-tag" href="/forum">
                Ver todos os fóruns
              </Link>
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
            <span className="pill pill-hot">
              <Sparkles size={16} /> Rotina do dia
            </span>
          </div>
          <h1>Missão de hoje: {activeDailyMission.theme.toLowerCase()}.</h1>
          <p>{activeDailyMission.focus_reason}</p>
          <div className="hero-mission-callout">
            <strong>+{activeDailyMission.xp_reward} XP e +{missionRewardCoins} moedas</strong>
            <span>Conclua agora para liberar a recompensa principal do dia.</span>
          </div>
          <div className="hero-mission-progress">
            <div className="hero-mission-progress-copy">
              <strong>
                {activeDailyMission.completed_exercises}/{activeDailyMission.total_exercises} exercícios
              </strong>
              <span>{missionRemaining === 0 ? "Missão concluída." : `Faltam ${missionRemaining} para fechar a rotina.`}</span>
            </div>
            <div className="progress-bar compact">
              <div style={{ width: `${missionProgressPercent}%` }} />
            </div>
          </div>
          <div className="hero-inline-stats">
            <span className="tag">
              <Flame size={14} /> Sequência: {profile.streak} dias
            </span>
            <span className="tag">
              <Trophy size={14} /> Recorde: {missionRecordStreak}
            </span>
            <span className="tag">
              <Gem size={14} /> Bônus: +{missionBonusCoins} moedas
            </span>
            <span className="tag">
              <Heart size={14} /> {profile.lives}/5 vidas
            </span>
          </div>
          <p className="hero-mission-note">{missionMotivation}</p>
        </div>

        <div className="hero-panel glass hero-panel-compact">
          <div className="student-header student-header-compact">
            <img
              alt="Avatar do usuário"
              className="avatar avatar-compact"
              src={profile.avatar_url ?? "https://api.dicebear.com/8.x/adventurer/svg?seed=Usuario"}
            />
            <div>
              <h3>{profile.full_name}</h3>
              <p>Nível {profile.level} | foco sugerido: {currentFocus.toLowerCase()}</p>
            </div>
          </div>
          <div className="mission-hero-grid home-mission-grid">
            <div className="mission-hero-card feature-panel">
              <span className="tag highlight">Tempo estimado</span>
              <strong>{activeDailyMission.estimated_minutes} min</strong>
              <p>Tempo curto para reduzir a resistência e facilitar a constância.</p>
            </div>
            <div className="mission-hero-card">
              <span className="tag">Nível ideal</span>
              <strong>{missionDifficulty}</strong>
              <p>Nem fácil demais, nem difícil demais para o seu ritmo de hoje.</p>
            </div>
          </div>
          <div className="progress-block compact-progress">
            <div className="hero-progress-summary">
              <div>
                <span>Progresso da missão</span>
                <strong>{missionProgressPercent}%</strong>
              </div>
              <div>
                <span>Tempo estudado</span>
                <strong>{effectiveStudyMinutes} min</strong>
              </div>
            </div>
            <div className="progress-bar">
              <div style={{ width: `${missionProgressPercent}%` }} />
            </div>
          </div>
          <p className="hero-side-insight">{missionMotivation}</p>
          <div className="hero-actions-row">
            <Link className="primary-button" href="/atividades">
              <Sparkles size={16} />
              Começar agora ({activeDailyMission.estimated_minutes} min)
            </Link>
            <Link className="secondary-button" href="/aprendizado">
              Ver trilha atual
            </Link>
          </div>
        </div>
      </section>

      <StudentActivityFocus insights={activeStudentInsights} />

      <section className="content-grid three-up">
        <article className="glass panel">
          <div className="section-title">
            <span>Hoje</span>
            <h2>Missões do dia</h2>
            <p>{activeStudentInsights.adaptive_plan.daily_goal}</p>
          </div>
          <div className="mission-list">
            {dailyMissionSummary.map((mission) => (
              <div key={mission.id} className="mission-card mission-card-stacked">
                <div>
                  <strong>{mission.title}</strong>
                  <span>{mission.description}</span>
                </div>
                <div className="mission-card-side">
                  <strong>
                    {mission.progress}/{mission.goal}
                  </strong>
                  <small>+{mission.xp_reward} XP</small>
                </div>
              </div>
            ))}
          </div>
          <div className="inline-metrics">
            <Link className="tag link-tag" href="/atividades">
              Ir para atividades
            </Link>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Desbloqueios</span>
            <h2>Seu progresso aparece aqui</h2>
            <p>Itens raros e badges ganhos automaticamente pela sua rotina na MatGo.</p>
          </div>
          <div className="rank-list">
            {activeRewards.recent_unlocks.slice(0, 3).map((unlock) => (
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
            <span className="tag">
              <Trophy size={14} /> {activeRewards.achievements.filter((item) => item.unlocked).length} badges ativas
            </span>
            <span className="tag">
              <Sparkles size={14} /> {activeRewards.cosmetics.filter((item) => item.unlocked).length} itens liberados
            </span>
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
