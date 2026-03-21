"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, ChartColumnIncreasing, Trophy } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { fetchClassReportAuthed, fetchStudentReportAuthed } from "@/lib/api";
import { ClassReport, fallbackClassReport, fallbackStudentReport, StudentReport } from "@/lib/data";

export default function RelatoriosPage() {
  const { token, user } = useAuth();
  const [classReport, setClassReport] = useState<ClassReport>(fallbackClassReport);
  const [studentReport, setStudentReport] = useState<StudentReport>(fallbackStudentReport);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (user?.role === "teacher" || user?.role === "master") {
      fetchClassReportAuthed(token).then(setClassReport).catch(() => setClassReport(fallbackClassReport));
      fetchStudentReportAuthed(token).then(setStudentReport).catch(() => setStudentReport(fallbackStudentReport));
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
              <div key={entry.student_id} className="rank-item">
                <strong>#{entry.position}</strong>
                <div>
                  <span>{entry.student_name}</span>
                  <small>{entry.xp} XP | {entry.accuracy}% acerto</small>
                </div>
                <Trophy size={18} />
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Aluno</span>
            <h2>{studentReport.student.full_name}</h2>
            <p>Resumo individual com historico recente.</p>
          </div>
          <div className="report-points">
            <div className="tag"><BadgeCheck size={14} /> Fortes: {studentReport.student.strong_areas.join(", ")}</div>
            <div className="tag"><AlertTriangle size={14} /> Fracas: {studentReport.student.weak_areas.join(", ")}</div>
            <div className="tag"><ChartColumnIncreasing size={14} /> {studentReport.student.study_minutes} min estudados</div>
          </div>
          <div className="activity-feed">
            {studentReport.recent_activity.map((activity) => (
              <div key={activity} className="feed-item">
                {activity}
              </div>
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
                  <strong>{student.full_name}</strong>
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
