"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchClassReportAuthed, fetchTeacherStudentsAuthed, resetTeacherStudentPasswordAuthed, updateStudentCoinsAuthed } from "@/lib/api";
import { fallbackClassReport, fallbackStudentReport, ClassReport, StudentMiniProfile } from "@/lib/data";

export default function TeacherClassPage() {
  const params = useParams<{ classId: string }>();
  const { token, user } = useAuth();
  const [report, setReport] = useState<ClassReport>(fallbackClassReport);
  const [students, setStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);
  const [coinDrafts, setCoinDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params?.classId) {
      return;
    }
    fetchClassReportAuthed(token, params.classId).then(setReport).catch(() => setReport(fallbackClassReport));
    fetchTeacherStudentsAuthed(token)
      .then((items) => {
        setStudents(items);
        setCoinDrafts(Object.fromEntries(items.map((student) => [student.id, String(student.coins)])));
      })
      .catch(() => setStudents([fallbackStudentReport.student]));
  }, [params?.classId, token]);

  const classStudents = useMemo(
    () => students.filter((student) => report.ranking.some((entry) => entry.student_id === student.id)),
    [report.ranking, students],
  );

  async function handleSaveCoins(studentId: string) {
    if (!token) {
      return;
    }
    try {
      const updated = await updateStudentCoinsAuthed(token, studentId, Number(coinDrafts[studentId] ?? 0));
      setStudents((current) => current.map((student) => (student.id === studentId ? updated : student)));
      setFeedback(`Moedas de ${updated.full_name} atualizadas com sucesso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar as moedas.");
    }
  }

  async function handleResetPin(studentId: string) {
    if (!token) {
      return;
    }
    try {
      const result = await resetTeacherStudentPasswordAuthed(token, studentId);
      setStudents((current) =>
        current.map((student) => (student.id === studentId ? { ...student, student_pin: result.temporary_pin } : student)),
      );
      setFeedback(`${result.message} Novo PIN: ${result.temporary_pin}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível redefinir o PIN.");
    }
  }

  if (user?.role !== "teacher" && user?.role !== "master") {
    return null;
  }

  return (
    <PlatformShell
      heading={report.class_info.name}
      description="Página da turma para organizar alunos, acessos e acompanhamento."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Turma</span>
            <h2>Informações principais</h2>
            <p>Resumo rápido para acompanhar a turma, seus alunos e o código de entrada.</p>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{report.class_info.grade_band}</strong>
              <span>série</span>
            </div>
            <div>
              <strong>{report.class_info.invite_code}</strong>
              <span>código de entrada</span>
            </div>
            <div>
              <strong>{report.class_info.students_count}</strong>
              <span>alunos</span>
            </div>
            <div>
              <strong>{report.class_info.average_accuracy}%</strong>
              <span>média da turma</span>
            </div>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Navegação</span>
            <h2>Atalhos</h2>
            <p>Volte ao painel, abra o fórum da turma ou retorne ao seu próprio perfil.</p>
          </div>
          <div className="tag-row">
            <Link className="tag link-tag" href="/professor">Painel do professor</Link>
            <Link className="tag link-tag" href={`/forum?classId=${report.class_info.id}`}>Abrir fórum da turma</Link>
            <Link className="tag link-tag" href="/perfil">Meu perfil</Link>
          </div>
        </article>
      </section>

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Alunos</span>
            <h2>Perfis dos alunos</h2>
            <p>O professor pode ver usuário, PIN, ajustar moedas e abrir o perfil detalhado de cada aluno.</p>
          </div>
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
          <div className="teacher-list">
            {classStudents.map((student) => (
              <div key={student.id} className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>{student.full_name}</strong>
                  <small>{student.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">{student.grade_band}</span>
                  <span className="tag">{student.accuracy}% acerto</span>
                  <span className="tag">usuário: {student.username ?? "-"}</span>
                  <span className="tag highlight">PIN: {student.student_pin ?? "-"}</span>
                  <span className="tag">{student.coins} moedas</span>
                  <Link className="tag link-tag" href={`/perfil/${student.id}`}>
                    Ver perfil
                  </Link>
                </div>
                <div className="teacher-batch-grid">
                  <label>
                    Moedas
                    <input
                      className="answer-input"
                      min={0}
                      onChange={(event) => setCoinDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                      type="number"
                      value={coinDrafts[student.id] ?? String(student.coins)}
                    />
                  </label>
                  <div className="inline-metrics">
                    <button className="primary-button" onClick={() => handleSaveCoins(student.id)} type="button">
                      Salvar moedas
                    </button>
                    <button className="secondary-button" onClick={() => handleResetPin(student.id)} type="button">
                      Redefinir PIN
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
