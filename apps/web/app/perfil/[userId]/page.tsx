"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageLoadingState } from "@/components/page-loading-state";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchProfileViewAuthed, fetchTeacherClassesAuthed, reassignStudentClassAuthed, resetTeacherStudentPasswordAuthed, updateStudentCoinsAuthed } from "@/lib/api";
import { ProfileView, TeacherClassSummary } from "@/lib/data";

export default function ProfileViewPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const { ready, token, user } = useAuth();
  const [view, setView] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [coinDraft, setCoinDraft] = useState("");
  const [classDraft, setClassDraft] = useState("");
  const [savingStudentSettings, setSavingStudentSettings] = useState(false);

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

  useEffect(() => {
    if (!token || user?.role !== "master") {
      return;
    }
    fetchTeacherClassesAuthed(token).then(setTeacherClasses).catch(() => setTeacherClasses([]));
  }, [token, user]);

  useEffect(() => {
    if (!view?.student_report) {
      return;
    }
    setCoinDraft(String(view.student_report.student.coins));
    setClassDraft(view.classes[0]?.id ?? "");
  }, [view]);

  if (!ready || loading) {
    return (
      <PlatformShell
        heading="Perfil"
        description="Carregando as informações do perfil solicitado."
      >
        <section className="section-stack">
          <PageLoadingState
            title="Carregando perfil"
            subtitle="Buscando as informações do aluno ou professor selecionado."
          />
        </section>
      </PlatformShell>
    );
  }

  if (!view) {
    return (
      <PlatformShell
        heading="Perfil"
        description="Não foi possível abrir este perfil."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Perfil</span>
              <h2>Acesso indisponivel</h2>
              <p>{error ?? "Esse perfil não pode ser exibido agora."}</p>
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
  const showMathFrameDecor = view.equipped_frame_id === "frame-matematica";
  const showAuraPopDecor = view.equipped_frame_id === "frame-aura-pop";
  const showEleganceDecor = view.equipped_frame_id === "frame-elegancia-neon";

  async function handleResetStudentPassword() {
    if (!token || !view || !view.student_report || !user || (user.role !== "teacher" && user.role !== "master")) {
      return;
    }
    setResettingPassword(true);
    try {
      const result = await resetTeacherStudentPasswordAuthed(token, viewedProfile.id);
      setPasswordResetMessage(`${result.message} Novo PIN inicial: ${result.temporary_pin}`);
    } catch (requestError) {
      setPasswordResetMessage(requestError instanceof Error ? requestError.message : "Não foi possível redefinir a senha.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSaveStudentSettings() {
    if (!token || !view?.student_report || !user || (user.role !== "teacher" && user.role !== "master")) {
      return;
    }
    setSavingStudentSettings(true);
    setPasswordResetMessage(null);
    try {
      const parsedCoins = Number(coinDraft);
      if (!Number.isNaN(parsedCoins)) {
        await updateStudentCoinsAuthed(token, viewedProfile.id, parsedCoins);
      }
      if (user.role === "master" && classDraft) {
        await reassignStudentClassAuthed(token, viewedProfile.id, classDraft);
      }
      const refreshed = await fetchProfileViewAuthed(token, viewedProfile.id);
      setView(refreshed);
      setPasswordResetMessage("Dados do aluno atualizados com sucesso.");
    } catch (requestError) {
      setPasswordResetMessage(requestError instanceof Error ? requestError.message : "Não foi possível atualizar os dados do aluno.");
    } finally {
      setSavingStudentSettings(false);
    }
  }

  return (
    <PlatformShell
      heading="Perfil"
      description={isStudentReport ? "Visualizacao pedagogica completa do aluno." : "Perfil publico visivel dentro da plataforma."}
    >
      <section className="profile-grid">
        <article className={`glass panel profile-hero-card profile-card-frame ${view.equipped_frame_id ?? "frame-padrao"}`}>
          {showMathFrameDecor ? (
            <div aria-hidden="true" className="math-frame-decor">
              <span className="math-frame-token token-a">π</span>
              <span className="math-frame-token token-b">x²</span>
              <span className="math-frame-token token-c">2+2</span>
              <span className="math-frame-token token-d">√16</span>
              <span className="math-frame-token token-e">3/4</span>
              <span className="math-frame-token token-f">%</span>
              <span className="math-frame-token token-g">+</span>
              <span className="math-frame-token token-h">÷</span>
              <span className="math-frame-token token-i">=</span>
              <span className="math-frame-token token-j">7</span>
              <span className="math-frame-token token-k">0</span>
              <span className="math-frame-token token-l">×</span>
            </div>
          ) : null}
          {showAuraPopDecor ? (
            <div aria-hidden="true" className="kaomoji-frame-decor kaomoji-frame-pop">
              <span className="kaomoji-token token-a">•‿•</span>
              <span className="kaomoji-token token-b">* - *</span>
              <span className="kaomoji-token token-c">^_^</span>
              <span className="kaomoji-token token-d">&lt;3</span>
              <span className="kaomoji-token token-e">☆</span>
              <span className="kaomoji-token token-f">•‿•</span>
            </div>
          ) : null}
          {showEleganceDecor ? (
            <div aria-hidden="true" className="kaomoji-frame-decor kaomoji-frame-elegance">
              <span className="kaomoji-token token-a">^_^</span>
              <span className="kaomoji-token token-b">•‿•</span>
              <span className="kaomoji-token token-c">&lt;3</span>
              <span className="kaomoji-token token-d">✦</span>
              <span className="kaomoji-token token-e">☆</span>
              <span className="kaomoji-token token-f">*-*</span>
            </div>
          ) : null}
          <div className="profile-hero-top">
            <div className="profile-avatar-frame">
              <img alt={viewedProfile.full_name} className="profile-avatar-xl" src={viewedProfile.avatar_url ?? "/oficial.png"} />
            </div>
            <div className="profile-hero-copy">
              <p className="eyebrow">{viewedProfile.role === "student" ? "Aluno" : "Professor"}</p>
              <h2>{viewedProfile.full_name}</h2>
              <p>{viewedProfile.bio?.trim() || "Sem bio cadastrada ainda."}</p>
              <div className="tag-row">
                {viewedProfile.grade_band ? <span className="tag">{viewedProfile.grade_band}</span> : null}
                {view.student_report ? <span className="tag">user: {viewedProfile.username ?? "-"}</span> : null}
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
                  <small>{" | "}{classroom.grade_band}</small>
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
                <span>{" "}acerto</span>
              </div>
              <div>
                <strong>{view.student_report.student.study_minutes} min</strong>
                <span>{" "}estudo</span>
              </div>
              <div>
                <strong>{view.student_report.student.level}</strong>
                <span>{" "}nível</span>
              </div>
              <div>
                <strong>{view.student_report.student.xp}</strong>
                <span>{" "}XP</span>
              </div>
              <div>
                <strong>{view.student_report.student.coins}</strong>
                <span>{" "}moedas</span>
              </div>
            </div>
            {(user?.role === "teacher" || user?.role === "master") ? (
              <div className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>Ajustes administrativos</strong>
                  <small>Bonifique o aluno com moedas.</small>
                </div>
                <div className="teacher-batch-grid">
                  <label>
                    Moedas
                    <input
                      className="answer-input"
                      min={0}
                      onChange={(event) => setCoinDraft(event.target.value)}
                      type="number"
                      value={coinDraft}
                    />
                  </label>
                  {user?.role === "master" ? (
                    <label>
                      Turma atual
                      <select className="answer-input" onChange={(event) => setClassDraft(event.target.value)} value={classDraft}>
                        {teacherClasses.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="teacher-row-copy">
                      <strong>Turma atual</strong>
                      <small>{view.classes[0]?.name ?? "Sem turma vinculada"}</small>
                    </div>
                  )}
                </div>
                <div className="inline-metrics">
                  <button className="primary-button" disabled={savingStudentSettings} onClick={handleSaveStudentSettings} type="button">
                    {savingStudentSettings ? "Salvando..." : "Salvar ajustes"}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="content-grid">
              <div className="glass panel">
                <div className="section-title">
                  <span>Forcas</span>
                  <h2>Temas fortes</h2>
                </div>
                <div className="teacher-list">
                  {view.student_report.strengths.map((item) => (
                    <div key={item.topic} className="teacher-row-card stacked">
                      <strong>{" "}{item.topic}</strong>
                      <p>{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass panel">
                <div className="section-title">
                  <span>Atencão</span>
                  <h2>Pontos para reforcar</h2>
                </div>
                <div className="teacher-list">
                  {view.student_report.weaknesses.map((item) => (
                    <div key={item.topic} className="teacher-row-card stacked">
                      <strong>{" "}{item.topic}</strong>
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
