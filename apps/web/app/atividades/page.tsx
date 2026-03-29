"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BookOpen, Compass, MessageCircleReply, ShieldPlus, Sparkles, Target } from "@/lib/icons";
import { DailyMissionBoard } from "@/components/daily-mission-board";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { completeStudentTrailActivityAuthed, fetchForumTopicsAuthed, fetchStudentLearningTrailsAuthed, fetchTeacherStudentsAuthed, submitExerciseAttempt } from "@/lib/api";
import { formatMathText } from "@/lib/math";
import { ForumTopic, StudentLearningTrailsData, StudentMiniProfile } from "@/lib/data";

function formatDueDate(value: string | null | undefined) {
  if (!value) {
    return "Sem prazo";
  }
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

function matchesStudentGrade(studentGradeBand: string | null | undefined, pathGradeBand: string) {
  if (!studentGradeBand) {
    return false;
  }
  return pathGradeBand.toLowerCase().includes(studentGradeBand.toLowerCase());
}

function AtividadesPageContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson");
  const trailActivityId = searchParams.get("trailActivity");
  const lessonPanelRef = useRef<HTMLElement | null>(null);

  const [teacherActivities, setTeacherActivities] = useState<ForumTopic[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<StudentMiniProfile[]>([]);
  const [studentTrails, setStudentTrails] = useState<StudentLearningTrailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<string[]>([]);
  const [selectedSubmitting, setSelectedSubmitting] = useState(false);
  const [trailActivitySubmitting, setTrailActivitySubmitting] = useState(false);
  const [trailActivityFeedback, setTrailActivityFeedback] = useState<string | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<{ id: string; label: string; value: string }[]>([]);

  useEffect(() => {
    if (!token || user?.role !== "student") {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchStudentLearningTrailsAuthed(token)
      .then((payload) => {
        if (!cancelled) {
          setStudentTrails(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudentTrails(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchForumTopicsAuthed(token)
      .then((topics) => setTeacherActivities(topics.filter((topic) => topic.topic_type === "activity")))
      .catch(() => setTeacherActivities([]));
    if (user?.role === "teacher" || user?.role === "master") {
      fetchTeacherStudentsAuthed(token).then(setTeacherStudents).catch(() => setTeacherStudents([]));
    }
  }, [token, user?.role]);

  const nextActivities = useMemo(() => teacherActivities.slice(0, 4), [teacherActivities]);

  const visiblePaths = useMemo(() => {
    if (user?.role !== "student") {
      return [];
    }
    return (studentTrails?.base_paths ?? []).filter((path) => matchesStudentGrade(user.grade_band, path.grade_band));
  }, [studentTrails?.base_paths, user?.grade_band, user?.role]);

  const selectedLessonData = useMemo(() => {
    if (!lessonId || user?.role !== "student") {
      return null;
    }
    for (const path of visiblePaths) {
      const lesson = path.lessons.find((item) => item.id === lessonId);
      if (lesson) {
        return { path, lesson };
      }
    }
    return null;
  }, [lessonId, user?.role, visiblePaths]);

  const selectedTrailActivityData = useMemo(() => {
    if (!trailActivityId || user?.role !== "student") {
      return null;
    }
    for (const trail of studentTrails?.teacher_trails ?? []) {
      const activity = trail.activities.find((item) => item.id === trailActivityId);
      if (activity) {
        return { trail, activity };
      }
    }
    return null;
  }, [studentTrails?.teacher_trails, trailActivityId, user?.role]);

  const selectedExercise = selectedLessonData?.lesson.exercises[selectedExerciseIndex] ?? null;

  useEffect(() => {
    if (!selectedExercise || selectedExercise.options.length === 0) {
      setShuffledOptions([]);
    } else {
      setShuffledOptions([...selectedExercise.options].sort(() => Math.random() - 0.5));
    }
  }, [selectedExercise?.id]);

  useEffect(() => {
    setSelectedExerciseIndex(0);
    setSelectedAnswer("");
    setSelectedFeedback(null);
    setSelectedCompletedIds(selectedLessonData?.lesson.completed_exercise_ids ?? []);
    setTrailActivityFeedback(null);
  }, [lessonId, trailActivityId, selectedLessonData?.lesson.completed_exercise_ids]);

  useEffect(() => {
    if (!selectedLessonData) {
      return;
    }
    setSelectedCompletedIds(selectedLessonData.lesson.completed_exercise_ids);
  }, [selectedLessonData]);

  useEffect(() => {
    if ((selectedLessonData || selectedTrailActivityData) && lessonPanelRef.current) {
      lessonPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedLessonData, selectedTrailActivityData]);

  async function handleSelectedExerciseSubmit() {
    if (!user || !token || !selectedExercise || !selectedAnswer.trim() || selectedSubmitting) {
      return;
    }
    setSelectedSubmitting(true);
    try {
      const result = await submitExerciseAttempt(
        token,
        user.id,
        selectedExercise.id,
        selectedAnswer,
        selectedExercise.estimated_seconds,
      );
      setSelectedFeedback(result.message);
      if (result.status === "correct") {
        const nextCompletedIds = selectedCompletedIds.includes(selectedExercise.id)
          ? selectedCompletedIds
          : [...selectedCompletedIds, selectedExercise.id];
        setSelectedCompletedIds(nextCompletedIds);
        setSelectedAnswer("");
        const refreshedTrails = await fetchStudentLearningTrailsAuthed(token);
        setStudentTrails(refreshedTrails);
        const refreshedLesson = refreshedTrails.base_paths
          .flatMap((path) => path.lessons)
          .find((lesson) => lesson.id === selectedLessonData?.lesson.id);
        const persistedCompletedIds = refreshedLesson?.completed_exercise_ids ?? nextCompletedIds;
        setSelectedCompletedIds(persistedCompletedIds);
        const nextIndex = (refreshedLesson?.exercises ?? selectedLessonData?.lesson.exercises ?? []).findIndex(
          (exercise) => !persistedCompletedIds.includes(exercise.id),
        );
        if (nextIndex >= 0) {
          setSelectedExerciseIndex(nextIndex);
        }
      }
    } catch {
      setSelectedFeedback("Não foi possível registrar sua resposta nesta fase agora.");
    } finally {
      setSelectedSubmitting(false);
    }
  }

  async function handleTrailActivityComplete() {
    if (!token || !selectedTrailActivityData || trailActivitySubmitting) {
      return;
    }
    setTrailActivitySubmitting(true);
    try {
      const response = await completeStudentTrailActivityAuthed(token, selectedTrailActivityData.activity.id);
      setTrailActivityFeedback(response.message);
      const refreshed = await fetchStudentLearningTrailsAuthed(token);
      setStudentTrails(refreshed);
    } catch (error) {
      setTrailActivityFeedback(error instanceof Error ? error.message : "Não foi possível concluir a atividade da trilha.");
    } finally {
      setTrailActivitySubmitting(false);
    }
  }

  if (user?.role !== "student") {
    return (
      <PlatformShell
        heading="Atividades"
        description="Acompanhamento da execução das atividades."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Turma</span>
              <h2>Execução das tarefas em tempo real</h2>
              <p>Acompanhe quem está praticando, onde está indo bem e quais pontos pedem reforço.</p>
            </div>
            <div className="teacher-list">
              {teacherStudents.map((student) => (
                <div key={student.id} className="teacher-row-card stacked">
                  <div className="teacher-row-copy">
                    <strong>{student.full_name}</strong>
                    <small>{student.grade_band}</small>
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">{student.study_minutes} min</span>
                    <span className="tag">{student.accuracy}% de acerto</span>
                    <span className="tag warning">{student.weak_areas[0] ?? "Sem alerta forte"}</span>
                    <Link className="tag link-tag" href={`/perfil/${student.id}`}>Ver aluno</Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-metrics">
              <Link className="tag link-tag" href="/professor">
                <Compass size={14} />
                Montar ou criar trilhas
              </Link>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  if (isLoading || !studentTrails) {
    return (
      <PlatformShell heading="Atividades" description="Primeiro vem a prática diária. Mantenha o foco no seu objetivo e garanta seus bônus.">
        <PageLoadingState
          title="Carregando suas atividades"
          subtitle="Buscando missão, trilhas e atividades complementares diretamente da base atual."
        />
      </PlatformShell>
    );
  }

  const selectedCompletedCount = selectedCompletedIds.length;

  return (
    <PlatformShell
      heading="Atividades"
      description="Primeiro vem a prática diária. Mantenha o foco no seu objetivo e garanta seus bônus."
    >
      {selectedLessonData ? (
        <section ref={lessonPanelRef} className="section-stack">
          <article className="glass panel feature-panel">
            <div className="section-title">
              <span>Fase selecionada</span>
              <h2>{selectedLessonData.lesson.title}</h2>
              <p>{selectedLessonData.path.title} | {selectedLessonData.lesson.summary}</p>
            </div>
            <div className="mission-hero-grid">
              <div className="mission-hero-card">
                <span className="tag highlight"><Compass size={14} /> Trilha aberta pelo mapa</span>
                <strong>{selectedLessonData.lesson.exercise_count} desafios nesta fase</strong>
                <p>{selectedLessonData.lesson.estimated_minutes} min | +{selectedLessonData.lesson.xp_reward} XP ao completar.</p>
              </div>
              <div className="mission-hero-card">
                <span className="tag success"><Sparkles size={14} /> Progresso da fase</span>
                <strong>{selectedCompletedCount}/{selectedLessonData.lesson.exercise_count} concluídos</strong>
                <p>Ao clicar no nó do mapa, esta área abre a lição correspondente para prática direta.</p>
              </div>
            </div>
            <div className="mission-step-list">
              {selectedLessonData.lesson.exercises.map((exercise, index) => (
                <button
                  key={exercise.id}
                  className={index === selectedExerciseIndex ? "mission-step active" : selectedCompletedIds.includes(exercise.id) ? "mission-step done" : "mission-step"}
                  onClick={() => {
                    setSelectedExerciseIndex(index);
                    setSelectedAnswer("");
                    setSelectedFeedback(null);
                  }}
                  type="button"
                >
                  <div>
                    <strong>Desafio {index + 1}</strong>
                    <small>{exercise.skill}</small>
                  </div>
                  <span className="tag">{selectedCompletedIds.includes(exercise.id) ? "Concluído" : `Nível ${exercise.difficulty}`}</span>
                </button>
              ))}
            </div>
          </article>

          {selectedExercise ? (
            <article className="glass panel">
              <div className="section-title">
                <span>Atividade da fase</span>
                <h2>{selectedLessonData.lesson.title}</h2>
                <p>{selectedLessonData.path.title} | habilidade: {selectedExercise.skill}</p>
              </div>
              <div className="exercise-box">
                <p className="exercise-label">
                  <BookOpen size={16} />
                  {selectedExercise.exercise_type === "multiple_choice" ? "Questão objetiva" : "Resposta curta"}
                </p>
                <h3>{formatMathText(selectedExercise.prompt)}</h3>
                {selectedExercise.options.length > 0 ? (
                  <div className="options-grid">
                    {shuffledOptions.map((option) => (
                      <button
                        key={`${selectedExercise.id}-${option.id}`}
                        className={selectedAnswer === option.value ? "option selected" : "option"}
                        onClick={() => setSelectedAnswer(option.value)}
                        type="button"
                      >
                        {formatMathText(option.label)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    className="answer-input"
                    onChange={(event) => setSelectedAnswer(event.target.value)}
                    placeholder="Digite sua resposta"
                    value={selectedAnswer}
                  />
                )}
                <div className="exercise-actions">
                  <button
                    className="primary-button"
                    disabled={selectedSubmitting || selectedCompletedIds.includes(selectedExercise.id)}
                    onClick={handleSelectedExerciseSubmit}
                    type="button"
                  >
                    <Target size={16} />
                    {selectedCompletedIds.includes(selectedExercise.id) ? "Desafio concluído" : "Responder fase"}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => setSelectedFeedback(selectedExercise.hints[0] ?? selectedExercise.explanation)}
                    type="button"
                  >
                    <ShieldPlus size={16} />
                    Ver dica
                  </button>
                </div>
                {selectedFeedback ? <div className="feedback-box">{selectedFeedback}</div> : null}
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {selectedTrailActivityData ? (
        <section ref={lessonPanelRef} className="section-stack">
          <article className="glass panel feature-panel">
            <div className="section-title">
              <span>Trilha do professor</span>
              <h2>{selectedTrailActivityData.activity.title}</h2>
              <p>{selectedTrailActivityData.trail.title} | {selectedTrailActivityData.trail.teacher_name}</p>
            </div>
            <div className="mission-hero-grid">
              <div className="mission-hero-card">
                <span className="tag highlight"><Compass size={14} /> Atividade selecionada</span>
                <strong>{selectedTrailActivityData.activity.estimated_minutes} min</strong>
                <p>Tipo: {selectedTrailActivityData.activity.activity_type} | recompensa: +{selectedTrailActivityData.activity.xp_reward} XP</p>
              </div>
              <div className="mission-hero-card">
                <span className="tag success"><Sparkles size={14} /> Progresso da trilha</span>
                <strong>{selectedTrailActivityData.trail.activities.filter((activity) => activity.completed).length}/{selectedTrailActivityData.trail.activities.length} fases concluídas</strong>
                <p>Conclua esta etapa para liberar a próxima dentro do mapa criado pelo professor.</p>
              </div>
            </div>
            <div className="teacher-row-card stacked">
              <strong>O que fazer nesta fase</strong>
              <p>{selectedTrailActivityData.trail.description || "Atividade guiada pelo professor. Complete esta etapa para manter sua progressão no mapa."}</p>
              <div className="inline-metrics">
                {selectedTrailActivityData.activity.difficulty ? <span className="tag">Nível {selectedTrailActivityData.activity.difficulty}</span> : null}
                <span className="tag">{selectedTrailActivityData.activity.completed ? "Concluída" : "Em andamento"}</span>
              </div>
              <div className="exercise-actions">
                <button
                  className="primary-button"
                  disabled={trailActivitySubmitting || selectedTrailActivityData.activity.completed}
                  onClick={handleTrailActivityComplete}
                  type="button"
                >
                  <Target size={16} />
                  {selectedTrailActivityData.activity.completed ? "Atividade concluída" : "Concluir atividade"}
                </button>
              </div>
              {trailActivityFeedback ? <div className="feedback-box">{trailActivityFeedback}</div> : null}
            </div>
          </article>
        </section>
      ) : null}

      <DailyMissionBoard />

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Professor</span>
            <h2>Atividades complementares</h2>
            <p>Depois da missão diária, o aluno encontra aqui as atividades aplicadas pelo professor.</p>
          </div>
          <div className="teacher-list">
            {nextActivities.length === 0 ? (
              <div className="teacher-row-card">
                <strong>Nenhuma atividade complementar publicada no momento.</strong>
              </div>
            ) : (
              nextActivities.map((topic) => (
                <div key={topic.id} className="teacher-row-card stacked">
                  <div>
                    <strong>{topic.title}</strong>
                    <small>
                      <Link href={`/perfil/${topic.author_id}`}>{topic.author_name}</Link>
                    </small>
                  </div>
                  <p>{topic.body}</p>
                  <div className="inline-metrics">
                    <span className="tag warning">
                      <BookOpen size={14} />
                      Prazo até {formatDueDate(topic.due_at)}
                    </span>
                    <Link className="tag link-tag" href={`/forum/${topic.id}`}>
                      <MessageCircleReply size={14} />
                      Abrir atividade
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="inline-metrics">
            <span className="tag success"><Sparkles size={14} /> Prioridade: missão diária primeiro</span>
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}

export default function AtividadesPage() {
  return (
    <Suspense fallback={<div className="page-content" />}>
      <AtividadesPageContent />
    </Suspense>
  );
}
