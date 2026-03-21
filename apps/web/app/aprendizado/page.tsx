"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Compass, Lock, Sparkles } from "@/lib/icons";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchBootstrapData } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData } from "@/lib/data";

function matchesStudentGrade(studentGradeBand: string | null | undefined, pathGradeBand: string) {
  if (!studentGradeBand) {
    return false;
  }
  return pathGradeBand.toLowerCase().includes(studentGradeBand.toLowerCase());
}

export default function AprendizadoPage() {
  const { user } = useAuth();
  const [data, setData] = useState<BootstrapData>(fallbackBootstrapData);

  useEffect(() => {
    fetchBootstrapData().then(setData).catch(() => setData(fallbackBootstrapData));
  }, []);

  const visiblePaths = useMemo(() => {
    if (user?.role !== "student") {
      return [];
    }
    return data.learning_paths.filter((path) => matchesStudentGrade(user.grade_band, path.grade_band));
  }, [data.learning_paths, user?.grade_band, user?.role]);

  if (user?.role !== "student") {
    return (
      <PlatformShell
        heading="Aprendizado"
        description="Essa area fica focada na jornada do aluno por serie e pratica guiada."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Aluno</span>
              <h2>Area focada na jornada do aluno</h2>
              <p>Professor e master acompanham a evolucao pelos relatorios e pelas atividades, sem precisar dessa tela.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Aprendizado"
      description={`Aqui aparecem so as trilhas do seu nivel atual: ${user.grade_band ?? "serie do aluno"}.`}
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Sua serie</span>
            <h2>Trilhas do {user.grade_band}</h2>
            <p>Essa tela agora mostra apenas o que faz sentido para o aluno no momento, sem mapa de ilha nem blocos extras.</p>
          </div>
          <div className="tag-row">
            <span className="tag success"><Sparkles size={14} /> foco no seu nivel</span>
            <Link className="tag link-tag" href="/atividades">Abrir pratica diaria</Link>
          </div>
        </article>

        {visiblePaths.map((path) => (
          <article key={path.id} className="glass panel">
            <div className="section-title">
              <span>{path.grade_band}</span>
              <h2>{path.title}</h2>
              <p>{path.category} | dificuldade {path.difficulty}</p>
            </div>
            <div className="path-grid">
              {path.lessons.map((lesson) => (
                <div key={lesson.id} className={lesson.locked ? "path-card locked-card" : "path-card"}>
                  <div className="path-meta">
                    <span>{lesson.estimated_minutes} min</span>
                    <span>+{lesson.xp_reward} XP</span>
                  </div>
                  <strong>{lesson.title}</strong>
                  <p>{lesson.summary}</p>
                  <div className="lesson-status">
                    {lesson.locked ? <Lock size={16} /> : <Compass size={16} />}
                    {lesson.locked ? "Bloqueada" : lesson.completed ? "Concluida" : "Disponivel"}
                  </div>
                  {!lesson.locked ? (
                    <div className="inline-metrics">
                      <Link className="tag link-tag" href="/atividades">
                        {lesson.completed ? "Revisar" : "Treinar agora"}
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}

        {visiblePaths.length === 0 ? (
          <article className="glass panel">
            <div className="section-title">
              <span>Trilhas</span>
              <h2>Nenhuma trilha liberada ainda</h2>
              <p>Assim que a serie do aluno estiver definida corretamente, as trilhas desse nivel aparecem aqui.</p>
            </div>
          </article>
        ) : null}
      </section>
    </PlatformShell>
  );
}
