"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { BadgeCheck, BookOpen, Clock3, Compass, Gem, Lock, Sparkles, Star, Target, Trophy } from "@/lib/icons";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { fetchStudentLearningTrailsAuthed } from "@/lib/api";
import { fallbackStudentLearningTrails, LearningPath, Lesson, StudentLearningTrailsData, TeacherTrail } from "@/lib/data";

function matchesStudentGrade(studentGradeBand: string | null | undefined, pathGradeBand: string) {
  if (!studentGradeBand) {
    return false;
  }
  return pathGradeBand.toLowerCase().includes(studentGradeBand.toLowerCase());
}

function lessonIcon(category: string, lessonTitle: string) {
  const source = `${category} ${lessonTitle}`.toLowerCase();
  if (source.includes("fracao")) {
    return "◔";
  }
  if (source.includes("soma") || source.includes("adicao")) {
    return "+";
  }
  if (source.includes("compar")) {
    return "≈";
  }
  if (source.includes("equa")) {
    return "x";
  }
  if (source.includes("porcent")) {
    return "%";
  }
  return "★";
}

function lessonState(lesson: Lesson, hasCurrent: boolean) {
  if (lesson.completed) {
    return "completed" as const;
  }
  if (lesson.locked) {
    return "locked" as const;
  }
  if (!hasCurrent) {
    return "current" as const;
  }
  return "available" as const;
}

function trailActivityIcon(trail: TeacherTrail, activityTitle: string) {
  return lessonIcon(trail.title, activityTitle);
}

export default function AprendizadoPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<StudentLearningTrailsData>(fallbackStudentLearningTrails);
  const didScrollToCurrent = useRef(false);

  useEffect(() => {
    if (!token || user?.role !== "student") {
      return;
    }
    fetchStudentLearningTrailsAuthed(token).then(setData).catch(() => setData(fallbackStudentLearningTrails));
  }, [token, user?.role]);

  const visiblePaths = useMemo(() => {
    if (user?.role !== "student") {
      return [];
    }
    return data.base_paths.filter((path) => matchesStudentGrade(user.grade_band, path.grade_band));
  }, [data.base_paths, user?.grade_band, user?.role]);

  const pathMaps = useMemo(() => {
    return visiblePaths.map((path) => {
      let currentAssigned = false;
      const nodes = path.lessons.map((lesson, index) => {
        const state = lessonState(lesson, currentAssigned);
        if (state === "current") {
          currentAssigned = true;
        }
        const xpBonus = Math.max(12, Math.round(lesson.xp_reward * 0.25));
        return {
          lesson,
          index,
          side: index % 2 === 0 ? "left" : "right",
          state,
          icon: lessonIcon(path.category, lesson.title),
          xpBonus,
          href: `/atividades?lesson=${lesson.id}`,
        };
      });

      const completedCount = nodes.filter((node) => node.state === "completed").length;
      const currentNode = nodes.find((node) => node.state === "current") ?? null;
      const totalXp = nodes.reduce((sum, node) => sum + node.lesson.xp_reward, 0);

      return {
        path,
        nodes,
        completedCount,
        currentNode,
        totalXp,
      };
    });
  }, [visiblePaths]);

  const teacherTrailMaps = useMemo(() => {
    return data.teacher_trails.map((trail) => {
      let currentAssigned = false;
      const nodes = trail.activities.map((activity, index) => {
        const state = activity.completed ? "completed" : activity.locked ? "locked" : !currentAssigned ? "current" : "available";
        if (state === "current") {
          currentAssigned = true;
        }
        return {
          activity,
          index,
          side: index % 2 === 0 ? "left" : "right",
          state,
          icon: trailActivityIcon(trail, activity.title),
          href: `/atividades?trailActivity=${activity.id}`,
        };
      });

      return {
        trail,
        nodes,
        completedCount: nodes.filter((node) => node.state === "completed").length,
        currentNode: nodes.find((node) => node.state === "current") ?? null,
        totalXp: nodes.reduce((sum, node) => sum + node.activity.xp_reward, 0),
      };
    });
  }, [data.teacher_trails]);

  useEffect(() => {
    if (didScrollToCurrent.current) {
      return;
    }
    const currentNode = document.querySelector<HTMLElement>("[data-current-node='true']");
    if (currentNode) {
      currentNode.scrollIntoView({ behavior: "smooth", block: "center" });
      didScrollToCurrent.current = true;
    }
  }, [pathMaps, teacherTrailMaps]);

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
              <p>Professor acompanha a evolucao do aluno pelos relatorios e pelas atividades, sem precisar dessa tela.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  const totalLessons = pathMaps.reduce((sum, item) => sum + item.nodes.length, 0) + teacherTrailMaps.reduce((sum, item) => sum + item.nodes.length, 0);
  const totalCompleted = pathMaps.reduce((sum, item) => sum + item.completedCount, 0) + teacherTrailMaps.reduce((sum, item) => sum + item.completedCount, 0);
  const currentLessonFocus = pathMaps.find((item) => item.currentNode)?.currentNode ?? pathMaps[0]?.nodes[0] ?? null;
  const currentTrailFocus = teacherTrailMaps.find((item) => item.currentNode)?.currentNode ?? teacherTrailMaps[0]?.nodes[0] ?? null;
  const currentFocusLabel = currentLessonFocus?.lesson.title ?? currentTrailFocus?.activity.title ?? null;
  const currentFocusDescription = currentLessonFocus
    ? `${currentLessonFocus.lesson.summary} +${currentLessonFocus.lesson.xp_reward} XP nesta fase.`
    : currentTrailFocus
      ? `Atividade da trilha do professor com +${currentTrailFocus.activity.xp_reward} XP.`
      : "Escolha uma fase para comecar a pratica.";

  return (
    <PlatformShell
      heading="Aprendizado"
      description={`Mapa de progresso do ${user.grade_band ?? "nivel do aluno"}.`}
    >
      <section className="section-stack">
        <article className="glass panel game-map-hero">
          <div className="section-title">
            <span>Sua jornada</span>
            <h2>Mapa do {user.grade_band}</h2>
            <p>Suba a trilha em ordem, ganhe XP em cada parada e avance ate o proximo marco do dia.</p>
          </div>

          <div className="game-map-summary">
            <div className="game-map-progress-card">
              <span className="tag success"><Trophy size={14} /> {totalCompleted}/{totalLessons} fases concluidas</span>
              <strong>{currentFocusLabel ?? "Sua trilha esta pronta"}</strong>
              <p>{currentFocusDescription}</p>
              <div className="progress-bar">
                <div style={{ width: `${totalLessons === 0 ? 0 : Math.round((totalCompleted / totalLessons) * 100)}%` }} />
              </div>
            </div>

            <div className="game-map-summary-grid">
              <div className="mission-hero-card feature-panel">
                <span className="tag highlight"><Compass size={14} /> Fase atual</span>
                <strong>{currentFocusLabel ?? "Tudo concluido"}</strong>
                <p>
                  {currentLessonFocus
                    ? `${currentLessonFocus.lesson.estimated_minutes} min | ${currentLessonFocus.lesson.xp_reward} XP`
                    : currentTrailFocus
                      ? `${currentTrailFocus.activity.estimated_minutes} min | ${currentTrailFocus.activity.xp_reward} XP`
                      : "Revise uma fase ja concluida ou siga para a pratica diaria."}
                </p>
              </div>
              <div className="mission-hero-card">
                <span className="tag"><Gem size={14} /> Recompensas</span>
                <strong>{pathMaps.reduce((sum, item) => sum + item.totalXp, 0) + teacherTrailMaps.reduce((sum, item) => sum + item.totalXp, 0)} XP no mapa</strong>
                <p>Cada no entrega XP principal e um bonus visual para sustentar a progressao.</p>
              </div>
            </div>
          </div>
        </article>

        {pathMaps.map(({ path, nodes, completedCount, currentNode }) => (
          <article key={path.id} className="glass panel game-map-panel">
            <div className="game-map-panel-head">
              <div className="section-title">
                <span>{path.grade_band}</span>
                <h2>{path.title}</h2>
                <p>{path.world_name} | {path.category} | dificuldade {path.difficulty}</p>
              </div>
              <div className="game-map-panel-metrics">
                <span className="tag success"><BadgeCheck size={14} /> {completedCount}/{nodes.length} fases</span>
                <span className="tag"><Star size={14} /> {path.completion_rate}% do mundo</span>
                <Link className="tag link-tag" href="/atividades">
                  <Sparkles size={14} />
                  Abrir pratica diaria
                </Link>
              </div>
            </div>

            <div className="game-map-scenery" aria-hidden="true">
              <span className="game-map-island game-map-island-a" />
              <span className="game-map-island game-map-island-b" />
              <span className="game-map-sign game-map-sign-a">XP</span>
              <span className="game-map-sign game-map-sign-b">Meta</span>
            </div>

            <div className="game-map-track">
              {nodes.map((node) => {
                const isClickable = node.state !== "locked";
                return (
                  <div
                    key={node.lesson.id}
                    className={`game-map-row ${node.side === "right" ? "right" : "left"}`}
                  >
                    <div className="game-map-connector" aria-hidden="true">
                      <span className="game-map-line" />
                    </div>

                    <Link
                      href={node.href}
                      aria-disabled={!isClickable}
                      tabIndex={isClickable ? 0 : -1}
                      data-current-node={node.state === "current" ? "true" : "false"}
                      className={`game-map-node-card ${node.state}${!isClickable ? " disabled" : ""}`}
                      onClick={(event) => {
                        if (!isClickable) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <div className="game-map-node-button">
                        <span className="game-map-node-icon" aria-hidden="true">
                          {node.state === "completed" ? "✓" : node.state === "locked" ? <Lock size={18} /> : node.icon}
                        </span>
                      </div>

                      <div className="game-map-node-copy">
                        <div className="game-map-node-topline">
                          <strong>Fase {node.index + 1}</strong>
                          <span className="tag">{node.lesson.estimated_minutes} min</span>
                        </div>
                        <h3>{node.lesson.title}</h3>
                        <p>{node.lesson.summary}</p>
                        <div className="game-map-node-meta">
                          <span className="tag"><Target size={14} /> +{node.lesson.xp_reward} XP</span>
                          <span className="tag warning"><Gem size={14} /> +{node.xpBonus} bonus</span>
                          <span className={`tag ${node.state === "completed" ? "success" : node.state === "current" ? "highlight" : ""}`}>
                            {node.state === "completed" ? "Concluida" : node.state === "current" ? "Atual" : node.state === "locked" ? "Bloqueada" : "Disponivel"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="game-map-footer">
              <p>{currentNode ? `Seu proximo passo esta em ${currentNode.lesson.title}. Clique no no destacado para continuar.` : "Voce concluiu este mundo. Revise fases concluídas ou abra a pratica diaria."}</p>
            </div>
          </article>
        ))}

        {teacherTrailMaps.map(({ trail, nodes, completedCount, currentNode, totalXp }) => (
          <article key={trail.id} className="glass panel game-map-panel">
            <div className="game-map-panel-head">
              <div className="section-title">
                <span>Trilha do professor</span>
                <h2>{trail.title}</h2>
                <p>{trail.description || `Mapa publicado por ${trail.teacher_name}.`}</p>
              </div>
              <div className="game-map-panel-metrics">
                <span className="tag success"><BadgeCheck size={14} /> {completedCount}/{nodes.length} fases</span>
                <span className="tag"><Star size={14} /> {totalXp} XP no mapa</span>
                <span className="tag">{trail.classes.map((item) => item.name).join(", ")}</span>
              </div>
            </div>

            <div className="game-map-scenery" aria-hidden="true">
              <span className="game-map-island game-map-island-a" />
              <span className="game-map-island game-map-island-b" />
              <span className="game-map-sign game-map-sign-a">Prof</span>
              <span className="game-map-sign game-map-sign-b">XP</span>
            </div>

            <div className="game-map-track">
              {nodes.map((node) => {
                const isClickable = node.state !== "locked";
                return (
                  <div key={node.activity.id} className={`game-map-row ${node.side === "right" ? "right" : "left"}`}>
                    <div className="game-map-connector" aria-hidden="true">
                      <span className="game-map-line" />
                    </div>

                    <Link
                      href={node.href}
                      aria-disabled={!isClickable}
                      tabIndex={isClickable ? 0 : -1}
                      data-current-node={node.state === "current" ? "true" : "false"}
                      className={`game-map-node-card ${node.state}${!isClickable ? " disabled" : ""}`}
                      onClick={(event) => {
                        if (!isClickable) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <div className="game-map-node-button">
                        <span className="game-map-node-icon" aria-hidden="true">
                          {node.state === "completed" ? "✓" : node.state === "locked" ? <Lock size={18} /> : node.icon}
                        </span>
                      </div>
                      <div className="game-map-node-copy">
                        <div className="game-map-node-topline">
                          <strong>Desafio {node.index + 1}</strong>
                          <span className="tag">{node.activity.estimated_minutes} min</span>
                        </div>
                        <h3>{node.activity.title}</h3>
                        <p>{trail.teacher_name} | {trail.classes.map((item) => item.grade_band).join(", ")}</p>
                        <div className="game-map-node-meta">
                          <span className="tag"><Target size={14} /> +{node.activity.xp_reward} XP</span>
                          {node.activity.difficulty ? <span className="tag warning"><Gem size={14} /> Nivel {node.activity.difficulty}</span> : null}
                          <span className={`tag ${node.state === "completed" ? "success" : node.state === "current" ? "highlight" : ""}`}>
                            {node.state === "completed" ? "Concluida" : node.state === "current" ? "Atual" : node.state === "locked" ? "Bloqueada" : "Disponivel"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="game-map-footer">
              <p>{currentNode ? `Seu proximo passo nessa trilha e ${currentNode.activity.title}. Clique no no destacado para continuar.` : "Essa trilha ja foi concluida. Revise os desafios ou abra outra trilha."}</p>
            </div>
          </article>
        ))}

        {pathMaps.length === 0 && teacherTrailMaps.length === 0 ? (
          <article className="glass panel">
            <div className="section-title">
              <span>Trilhas</span>
              <h2>Nenhuma trilha liberada ainda</h2>
              <p>Assim que a serie do aluno estiver definida corretamente, o mapa desse nivel aparece aqui.</p>
            </div>
          </article>
        ) : null}
      </section>
    </PlatformShell>
  );
}
