"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserRoundCog } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { approveTeacherPasswordResetRequestAuthed, fetchTeacherPasswordResetRequestsAuthed, fetchTeachersAuthed } from "@/lib/api";
import { fallbackTeachers, TeacherDirectoryItem, TeacherPasswordResetRequestSummary } from "@/lib/data";

export default function AdminPage() {
  const { token, user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>(fallbackTeachers);
  const [resetRequests, setResetRequests] = useState<TeacherPasswordResetRequestSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [processingResetId, setProcessingResetId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "master") {
      return;
    }
    const load = () => {
      fetchTeachersAuthed(token).then(setTeachers).catch(() => setTeachers(fallbackTeachers));
      fetchTeacherPasswordResetRequestsAuthed(token).then(setResetRequests).catch(() => setResetRequests([]));
    };
    load();
    const intervalId = window.setInterval(load, 15000);
    return () => window.clearInterval(intervalId);
  }, [token, user?.role]);

  async function handleApproveReset(requestId: string) {
    if (!token) {
      return;
    }
    setProcessingResetId(requestId);
    setFeedback(null);
    try {
      const result = await approveTeacherPasswordResetRequestAuthed(token, requestId);
      setFeedback(`${result.message} Mensagem pronta para envio manual gerada abaixo.`);
      const nextRequests = await fetchTeacherPasswordResetRequestsAuthed(token);
      setResetRequests(nextRequests);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel aprovar o reset.");
    } finally {
      setProcessingResetId(null);
    }
  }

  const pendingOrActiveResets = resetRequests.filter((item) => item.status !== "completed");

  return (
    <PlatformShell
      heading="Area master"
      description="Visao administrativa para supervisionar professores, resets de senha e organizacao do campus."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Credenciais</span>
            <h2>Resets de senha de professores</h2>
            <p>O professor solicita no login, o master aprova aqui e copia a mensagem pronta para enviar manualmente por email.</p>
          </div>
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
          <div className="teacher-list">
            {pendingOrActiveResets.length === 0 ? (
              <div className="teacher-row-card stacked">
                <strong>Nenhuma solicitacao aberta no momento.</strong>
                <p>Quando um professor usar “Esqueci minha senha”, a solicitacao vai aparecer aqui.</p>
              </div>
            ) : (
              pendingOrActiveResets.map((request) => (
                <div key={request.id} className="teacher-row-card stacked">
                  <div>
                    <strong>{request.teacher_name}</strong>
                    <p>{request.teacher_email}</p>
                  </div>
                  <div className="inline-metrics">
                    <span className={`tag ${request.status === "approved" ? "highlight" : ""}`}>
                      {request.status === "pending" ? "aguardando aprovacao" : "senha temporaria ativa"}
                    </span>
                    <span className="tag">solicitado em {new Date(request.requested_at).toLocaleString("pt-BR")}</span>
                    <Link className="tag link-tag" href={`/perfil/${request.teacher_id}`}>Ver perfil</Link>
                    {request.status === "pending" ? (
                      <button
                        className="tag link-tag"
                        disabled={processingResetId === request.id}
                        onClick={() => handleApproveReset(request.id)}
                        type="button"
                      >
                        {processingResetId === request.id ? "Aprovando..." : "Aprovar reset"}
                      </button>
                    ) : null}
                  </div>
                  {request.status === "approved" ? (
                    <div className="teacher-row-card stacked">
                      <strong>Senha temporaria atual</strong>
                      <p>{request.temporary_password ?? "-"}</p>
                      <strong>Mensagem pronta para email</strong>
                      <textarea className="answer-input textarea-input" readOnly value={request.email_message ?? ""} />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Governanca</span>
            <h2>Professores cadastrados</h2>
            <p>Base pronta para evoluir para multi-escola, subdominios e administracao segmentada.</p>
          </div>
          <div className="teacher-list">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teacher-row-card">
                <div>
                  <strong>{teacher.full_name}</strong>
                  <small>{teacher.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><UserRoundCog size={14} /> {teacher.grade_band ?? "multiserie"}</span>
                  <span className="tag"><ShieldCheck size={14} /> {teacher.students_count} alunos</span>
                  <span className="tag"><KeyRound size={14} /> acesso ativo</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
