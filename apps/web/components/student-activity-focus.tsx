"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchDailyMissionAuthed, fetchForumTopicsAuthed } from "@/lib/api";
import { DailyMission, fallbackDailyMission, fallbackForumTopics, ForumTopic } from "@/lib/data";
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

export function StudentActivityFocus() {
  const { token, user } = useAuth();
  const [mission, setMission] = useState<DailyMission>(fallbackDailyMission);
  const [teacherActivities, setTeacherActivities] = useState<ForumTopic[]>(fallbackForumTopics.filter((topic) => topic.topic_type === "activity"));

  useEffect(() => {
    if (!token || user?.role !== "student") {
      return;
    }
    fetchDailyMissionAuthed(token).then(setMission).catch(() => setMission(fallbackDailyMission));
    fetchForumTopicsAuthed(token)
      .then((topics) => setTeacherActivities(topics.filter((topic) => topic.topic_type === "activity")))
      .catch(() => setTeacherActivities(fallbackForumTopics.filter((topic) => topic.topic_type === "activity")));
  }, [token, user?.role]);

  const progressPercent = mission.total_exercises === 0 ? 0 : Math.round((mission.completed_exercises / mission.total_exercises) * 100);
  const nextActivities = useMemo(() => teacherActivities.slice(0, 3), [teacherActivities]);

  if (user?.role !== "student") {
    return null;
  }

  return (
    <section className="content-grid">
      <article className="glass panel feature-panel">
        <div className="section-title">
          <span>Prioridade do dia</span>
          <h2>Missão diária em destaque</h2>
          <p>Esta é a primeira tarefa do aluno ao entrar: 5 questões objetivas já salvas no banco, com tema do dia e foco adaptativo.</p>
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
            <strong>{mission.exercises[0]?.skill ?? mission.theme}</strong>
            <span>primeiro tema</span>
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
