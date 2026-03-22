"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchProfileViewAuthed, resetTeacherStudentPasswordAuthed } from "@/lib/api";
import { ProfileView } from "@/lib/data";

export default function ProfileViewPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const { ready, token, user } = useAuth();
  const [view, setView] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [ready, router, user]);

  useEffect(() => {
    if (!ready || !token || !params?.userId) {
      return;
    }
    setLoading(true);
    setError(null);
    setPasswordResetMessage(null);
    fetchProfileViewAuthed(token, params.userId)
      .then((payload) => setView(payload))
      .catch((requestError) => {
        setView(null);
        setError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar este perfil.");
      })
      .finally(() => setLoading(false));
  }, [params?.userId, ready, token]);

  if (!ready || loading) {
    return (
      <PlatformShell
        heading="Perfil"
        description="Carregando as informacoes do perfil solicitado."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Perfil</span>
              <h2>Carregando perfil</h2>
              <p>Buscando as informacoes do aluno ou professor selecionado.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  if (!view) {
    return (
      <PlatformShell
        heading="Perfil"
        description="Nao foi possivel abrir este perfil."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Perfil</span>
              <h2>Acesso indisponivel</h2>
              <p>{error ?? "Esse perfil nao pode ser exibido agora."}</p>
            </div>
            <div className="inline-metrics">
              <Link className="tag link-tag" href="/perfil">
                Voltar ao meu perfil
              </Link>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  const isStudentReport = !!view.student_report;
  const viewedProfile = view.profile;

  async function handleResetStudentPassword() {
    if (!token || !view || !view.student_report || !user || (user.role !== "teacher" && user.role !== "master")) {
      return;
    }
    setResettingPassword(true);
    try {
      const result = await resetTeacherStudentPasswordAuthed(token, viewedProfile.id);
      setPasswordResetMessage(`${result.message} Novo PIN inicial: ${result.temporary_pin}`);
    } catch (requestError) {
      setPasswordResetMessage(requestError instanceof Error ? requestError.message : "Nao foi possivel redefinir a senha.");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <PlatformShell
      heading="Perfil"
      description={isStudentReport ? "Visualizacao pedagogica completa do aluno." : "Perfil publico visivel dentro da plataforma."}
    >
      <section className="profile-grid">
        <article className="glass panel profile-hero-card">
          <div className="profile-hero-top">
            <img alt={viewedProfile.full_name} className="profile-avatar-xl" src={viewedProfile.avatar_url ?? "/oficial.png"} />
            <div className="profile-hero-copy">
              <p className="eyebrow">{viewedProfile.role === "student" ? "Aluno" : "Professor"}</p>
              <h2>{viewedProfile.full_name}</h2>
              <p>{viewedProfile.bio?.trim() || "Sem bio cadastrada ainda."}</p>
              <div className="tag-row">
                {viewedProfile.grade_band ? <span className="tag">{viewedProfile.grade_band}</span> : null}
                {view.student_report ? <span className="tag">usuario: {viewedProfile.username ?? "-"}</span> : null}
                {view.student_report ? <span className="tag highlight">PIN: {viewedProfile.student_pin ?? "-"}</span> : null}
                {user?.id !== viewedProfile.id ? <Link className="tag link-tag" href="/perfil">Voltar ao meu perfil</Link> : null}
                {view.student_report && (user?.role === "teacher" || user?.role === "master") ? (
                  <button className="tag link-tag" disabled={resettingPassword} onClick={handleResetStudentPassword} type="button">
                    {resettingPassword ? "Resetando senha..." : "Resetar senha"}
                  </button>
                ) : null}
              </div>
              {passwordResetMessage ? <div className="feedback-box">{passwordResetMessage}</div> : null}
            </div>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Turmas</span>
            <h2>{viewedProfile.role === "student" ? "Turmas vinculadas" : "Turmas do professor"}</h2>
            <p>Informacoes basicas para navegar melhor dentro da MatGo.</p>
          </div>
          <div className="teacher-list">
            {view.classes.length === 0 ? (
              <div className="teacher-row-card">
                <strong>Nenhuma turma vinculada no momento.</strong>
              </div>
            ) : (
              view.classes.map((classroom) => (
                <div key={classroom.id} className="teacher-row-card">
                  <div>
                    <strong>{classroom.name}</strong>
                    <small>{classroom.grade_band}</small>
                  </div>
                  {(user?.role === "teacher" || user?.role === "master") ? (
                    <Link className="tag link-tag" href={`/professor/turmas/${classroom.id}`}>
                      Abrir turma
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {view.student_report ? (
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Relatorio</span>
              <h2>Painel completo do aluno</h2>
              <p>{view.student_report.performance_summary}</p>
            </div>
            <div className="mini-grid">
              <div>
                <strong>{view.student_report.student.accuracy}%</strong>
                <span>acerto</span>
              </div>
              <div>
                <strong>{view.student_report.student.study_minutes} min</strong>
                <span>estudo</span>
              </div>
              <div>
                <strong>{view.student_report.student.level}</strong>
                <span>nivel</span>
              </div>
              <div>
                <strong>{view.student_report.student.xp}</strong>
                <span>XP</span>
              </div>
            </div>
            <div className="content-grid">
              <div className="glass panel">
                <div className="section-title">
                  <span>Forcas</span>
                  <h2>Temas fortes</h2>
                </div>
                <div className="teacher-list">
                  {view.student_report.strengths.map((item) => (
                    <div key={item.topic} className="teacher-row-card stacked">
                      <strong>{item.topic}</strong>
                      <p>{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass panel">
                <div className="section-title">
                  <span>Atencao</span>
                  <h2>Pontos para reforcar</h2>
                </div>
                <div className="teacher-list">
                  {view.student_report.weaknesses.map((item) => (
                    <div key={item.topic} className="teacher-row-card stacked">
                      <strong>{item.topic}</strong>
                      <p>{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : null}
    </PlatformShell>
  );
}
