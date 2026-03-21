"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookOpen, MessageCircleReply, Sparkles } from "@/lib/icons";
import { DailyMissionBoard } from "@/components/daily-mission-board";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchForumTopicsAuthed } from "@/lib/api";
import { fallbackForumTopics, ForumTopic } from "@/lib/data";

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

export default function AtividadesPage() {
  const { token, user } = useAuth();
  const [teacherActivities, setTeacherActivities] = useState<ForumTopic[]>(fallbackForumTopics.filter((topic) => topic.topic_type === "activity"));

  useEffect(() => {
    if (!token || user?.role !== "student") {
      return;
    }
    fetchForumTopicsAuthed(token)
      .then((topics) => setTeacherActivities(topics.filter((topic) => topic.topic_type === "activity")))
      .catch(() => setTeacherActivities(fallbackForumTopics.filter((topic) => topic.topic_type === "activity")));
  }, [token, user?.role]);

  const nextActivities = useMemo(() => teacherActivities.slice(0, 4), [teacherActivities]);

  if (user?.role !== "student") {
    return (
      <PlatformShell
        heading="Atividades"
        description="Essa area foi organizada para a rotina diaria do aluno."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Aluno</span>
              <h2>Rotina diaria focada no aluno</h2>
              <p>Professor e master continuam acompanhando o trabalho da turma pelo forum, banco de questoes e relatorios.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Atividades"
      description="Primeiro vem a pratica diaria. Depois aparecem as atividades publicadas pelo professor."
    >
      <DailyMissionBoard />

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Professor</span>
            <h2>Atividades complementares</h2>
            <p>Depois da missao diaria, o aluno encontra aqui as atividades aplicadas publicadas pelo professor.</p>
          </div>
          <div className="teacher-list">
            {nextActivities.length === 0 ? (
              <div className="teacher-row-card">
                <strong>Nenhuma atividade complementar publicada no momento.</strong>
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
                      Prazo ate {formatDueDate(topic.due_at)}
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
          <div className="inline-metrics">
            <span className="tag success"><Sparkles size={14} /> prioridade: missao diaria primeiro</span>
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
