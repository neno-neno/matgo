"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookOpen, MessageCircleReply, Sparkles } from "@/lib/icons";
import { DailyMissionBoard } from "@/components/daily-mission-board";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchForumTopicsAuthed, fetchTeacherStudentsAuthed } from "@/lib/api";
import { fallbackForumTopics, fallbackStudentReport, ForumTopic, StudentMiniProfile } from "@/lib/data";

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
  const [teacherStudents, setTeacherStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchForumTopicsAuthed(token)
      .then((topics) => setTeacherActivities(topics.filter((topic) => topic.topic_type === "activity")))
      .catch(() => setTeacherActivities(fallbackForumTopics.filter((topic) => topic.topic_type === "activity")));
    if (user?.role === "teacher" || user?.role === "master") {
      fetchTeacherStudentsAuthed(token).then(setTeacherStudents).catch(() => setTeacherStudents([fallbackStudentReport.student]));
    }
  }, [token, user?.role]);

  const nextActivities = useMemo(() => teacherActivities.slice(0, 4), [teacherActivities]);

  if (user?.role !== "student") {
    return (
      <PlatformShell
        heading="Atividades"
        description="Acompanhamento da execucao das tarefas dos alunos da turma."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Turma</span>
              <h2>Execucao das tarefas em tempo real</h2>
              <p>O professor acompanha daqui quem esta praticando, onde esta indo bem e quais pontos pedem reforco.</p>
            </div>
            <div className="teacher-list">
              {teacherStudents.map((student) => (
                <div key={student.id} className="teacher-row-card stacked">
                  <div className="teacher-row-copy">
                    <strong>{student.full_name}</strong>
                    <small>{student.grade_band}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{student.study_minutes} min</span>
                    <span className="tag">{student.accuracy}% acerto</span>
                    <span className="tag warning">{student.weak_areas[0] ?? "Sem alerta forte"}</span>
                    <Link className="tag link-tag" href={`/perfil/${student.id}`}>Ver aluno</Link>
                  </div>
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
                    <small>
                      <Link href={`/perfil/${topic.author_id}`}>{topic.author_name}</Link>
                    </small>
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
