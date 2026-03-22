"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { fetchClassReportAuthed } from "@/lib/api";
import { ClassReport, fallbackClassReport } from "@/lib/data";

export default function RelatoriosPage() {
  const { token, user } = useAuth();
  const [classReport, setClassReport] = useState<ClassReport>(fallbackClassReport);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (user?.role === "teacher" || user?.role === "master") {
      fetchClassReportAuthed(token).then(setClassReport).catch(() => setClassReport(fallbackClassReport));
    }
  }, [token, user?.role]);

  return (
    <PlatformShell
      heading="Relatorios e analytics"
      description="Leitura individual e coletiva de progresso, ranking, forcas e pontos de intervencao."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Turma</span>
            <h2>{classReport.class_info.name}</h2>
            <p>{classReport.class_info.students_count} alunos | {classReport.class_info.average_accuracy}% media geral</p>
          </div>
          <div className="rank-list">
            {classReport.ranking.map((entry) => (
              <Link key={entry.student_id} className="rank-item rank-link-card" href={`/perfil/${entry.student_id}`}>
                <strong>#{entry.position}</strong>
                <div>
                  <span>{entry.student_name}</span>
                  <small>{entry.xp} XP | {entry.accuracy}% acerto</small>
                </div>
                <Trophy size={18} />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Panorama</span>
            <h2>Forcas coletivas</h2>
            <p>Conceitos em que a turma esta mais confiante.</p>
          </div>
          <div className="tag-row">
            {classReport.top_strengths.map((topic) => (
              <span key={topic} className="tag success">{topic}</span>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Intervencao</span>
            <h2>Pontos de reforco</h2>
            <p>Assuntos que pedem mais revisao e alunos para acompanhamento.</p>
          </div>
          <div className="tag-row">
            {classReport.top_weaknesses.map((topic) => (
              <span key={topic} className="tag warning">{topic}</span>
            ))}
          </div>
          <div className="attention-list">
            {classReport.students_needing_attention.map((student) => (
              <div key={student.id} className="teacher-row-card">
                <div>
                  <strong>
                    <Link href={`/perfil/${student.id}`}>{student.full_name}</Link>
                  </strong>
                  <small>{student.accuracy}% acerto</small>
                </div>
                <span className="tag">{student.weak_areas.join(", ")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
