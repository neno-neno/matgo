"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchClassReportAuthed, fetchTeacherStudentsAuthed } from "@/lib/api";
import { fallbackClassReport, fallbackStudentReport, ClassReport, StudentMiniProfile } from "@/lib/data";

export default function TeacherClassPage() {
  const params = useParams<{ classId: string }>();
  const { token, user } = useAuth();
  const [report, setReport] = useState<ClassReport>(fallbackClassReport);
  const [students, setStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);

  useEffect(() => {
    if (!token || !params?.classId) {
      return;
    }
    fetchClassReportAuthed(token, params.classId).then(setReport).catch(() => setReport(fallbackClassReport));
    fetchTeacherStudentsAuthed(token).then(setStudents).catch(() => setStudents([fallbackStudentReport.student]));
  }, [params?.classId, token]);

  const classStudents = useMemo(
    () => students.filter((student) => report.ranking.some((entry) => entry.student_id === student.id)),
    [report.ranking, students],
  );

  if (user?.role !== "teacher" && user?.role !== "master") {
    return null;
  }

  return (
    <PlatformShell
      heading={report.class_info.name}
      description="Pagina da turma para organizar alunos, acessos e acompanhamento."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Turma</span>
            <h2>Informacoes principais</h2>
            <p></p>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{report.class_info.grade_band}</strong>
              <span> serie</span>
            </div>
            <div>
              <strong>{report.class_info.invite_code}</strong>
              <span> codigo de entrada</span>
            </div>
            <div>
              <strong>{report.class_info.students_count}</strong>
              <span> alunos</span>
            </div>
            <div>
              <strong>{report.class_info.average_accuracy}%</strong>
              <span> media da turma</span>
            </div>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Navegacao</span>
            <h2>Atalhos</h2>
            <p></p>
          </div>
          <div className="tag-row">
            <Link className="tag link-tag" href="/professor">Painel do professor</Link>
            <Link className="tag link-tag" href="/forum">Abrir fórum da turma</Link>
            <Link className="tag link-tag" href="/perfil">Meu perfil</Link>
          </div>
        </article>
      </section>

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Alunos</span>
            <h2>Perfis de alunos</h2>
            <p>Clique em um aluno para abrir o relatorio individual completo.</p>
          </div>
          <div className="teacher-list">
            {classStudents.map((student) => (
              <div key={student.id} className="teacher-row-card">
                <div className="teacher-row-copy">
                  <strong>{student.full_name}</strong>
                  <small>{student.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">{student.grade_band}</span>
                  <span className="tag">{student.accuracy}% acerto</span>
                  <Link className="tag link-tag" href={`/perfil/${student.id}`}>
                    Ver perfil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
