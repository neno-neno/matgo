"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchProfileViewAuthed } from "@/lib/api";
import { fallbackProfileView, ProfileView } from "@/lib/data";

export default function ProfileViewPage() {
  const params = useParams<{ userId: string }>();
  const { token, user } = useAuth();
  const [view, setView] = useState<ProfileView>(fallbackProfileView);

  useEffect(() => {
    if (!token || !params?.userId) {
      return;
    }
    fetchProfileViewAuthed(token, params.userId).then(setView).catch(() => setView(fallbackProfileView));
  }, [params?.userId, token]);

  const isStudentReport = !!view.student_report;
  const viewedProfile = view.profile;

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
                {user?.id !== viewedProfile.id ? <Link className="tag link-tag" href="/perfil">Voltar ao meu perfil</Link> : null}
              </div>
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
