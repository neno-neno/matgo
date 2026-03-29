"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchDailyMissionAuthed, fetchForumTopicsAuthed } from "@/lib/api";
import { DailyMission, ForumTopic, StudentInsightsResponse } from "@/lib/data";
import { BookOpen, MessageCircleReply, Sparkles, Target, Trophy } from "@/lib/icons";
import { useAuth } from "@/components/auth-provider";

function formatDueDate(value: string | null | undefined) {
  if (!value) {
    return "Sem prazo";
  }
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function StudentActivityFocus({ insights }: { insights?: StudentInsightsResponse | null }) {
  const { token, user } = useAuth();
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [teacherActivities, setTeacherActivities] = useState<ForumTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== "student") {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([fetchDailyMissionAuthed(token), fetchForumTopicsAuthed(token)]).then(([missionResult, topicsResult]) => {
      if (cancelled) {
        return;
      }
      setMission(missionResult.status === "fulfilled" ? missionResult.value : null);
      setTeacherActivities(
        topicsResult.status === "fulfilled"
          ? topicsResult.value.filter((topic) => topic.topic_type === "activity")
          : [],
      );
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  if (user?.role !== "student") {
    return null;
  }

  if (isLoading || !mission) {
    return (
      <section className="content-grid">
        <article className="glass panel feature-panel">
          <div className="page-loading-state">
            <div className="brand-loading-copy">
              <span className="brand-loading-kicker">Prioridade do dia</span>
              <strong>Carregando foco e atividades</strong>
              <p>Buscando missão diária e atividades do professor antes de montar este bloco.</p>
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

  const progressPercent = mission.total_exercises === 0 ? 0 : Math.round((mission.completed_exercises / mission.total_exercises) * 100);
  const nextActivities = teacherActivities.slice(0, 3);
  const dailyGoal = insights?.adaptive_plan.daily_goal ?? "Mantenha uma rotina curta e consistente para avançar com segurança.";
  const currentFocus = insights?.adaptive_plan.next_focus ?? mission.exercises[0]?.skill ?? mission.theme;

  return (
    <section className="content-grid">
      <article className="glass panel feature-panel">
        <div className="section-title">
          <span>Prioridade do dia</span>
          <h2>Missão diária em destaque</h2>
          <p>{dailyGoal}</p>
        </div>
        <div className="mission-hero-grid">
          <div className="mission-hero-card">
            <span className="tag highlight">
              <Sparkles size={14} />
              {mission.theme}
            </span>
            <strong>{mission.title}</strong>
            <p>{mission.focus_reason}</p>
          </div>
          <div className="mission-hero-card">
            <span className="tag">
              <Trophy size={14} />
              {mission.xp_reward} XP
            </span>
            <strong>{mission.completed_exercises}/{mission.total_exercises} concluídas</strong>
            <p>{mission.streak_target}</p>
          </div>
        </div>
        <div className="progress-block">
          <div>
            <span>Progresso da rotina</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-bar">
            <div style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
          <div className="mini-grid">
          <div>
            <strong>{mission.estimated_minutes} min</strong>
            <span>duração prevista</span>
          </div>
            <div>
              <strong>{currentFocus}</strong>
              <span>foco adaptativo</span>
            </div>
          <div>
            <strong>{mission.total_exercises}</strong>
            <span>questões objetivas</span>
          </div>
          <div>
            <strong>{mission.mission_date}</strong>
            <span>missão de hoje</span>
          </div>
        </div>
        <div className="hero-actions-row">
          <Link className="primary-button" href="/atividades">
            <Target size={16} />
            Abrir missão diária
          </Link>
        </div>
      </article>

      <article className="glass panel">
        <div className="section-title">
          <span>Professor</span>
          <h2>Atividades publicadas</h2>
          <p>Quando o professor publica no fórum como atividade, ela também aparece aqui para o aluno com prazo final por data.</p>
        </div>
        <div className="teacher-list">
          {nextActivities.length === 0 ? (
            <div className="teacher-row-card">
              <strong>Nenhuma atividade do professor publicada no momento.</strong>
            </div>
          ) : (
            nextActivities.map((topic) => (
              <div key={topic.id} className="teacher-row-card stacked">
                <div>
                  <strong>{topic.title}</strong>
                  <small>{topic.author_name}</small>
                </div>
                <p>{topic.body}</p>
                <div className="inline-metrics">
                  <span className="tag warning">
                    <BookOpen size={14} />
                    Prazo até {formatDueDate(topic.due_at)}
                  </span>
                  <Link className="tag link-tag" href={`/forum/${topic.id}`}>
                    <MessageCircleReply size={14} />
                    Abrir atividade
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
