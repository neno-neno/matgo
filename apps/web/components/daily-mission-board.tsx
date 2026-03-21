"use client";

import { useEffect, useMemo, useState } from "react";

import { BookOpen, Flame, LoaderCircle, ShieldPlus, Sparkles, Target, Trophy } from "@/lib/icons";
import { fetchDailyMissionAuthed, fetchRewardsOverviewAuthed, submitExerciseAttempt } from "@/lib/api";
import { DailyMission, DailyMissionExercise, fallbackDailyMission, fallbackRewardsOverview, RewardsOverview } from "@/lib/data";
import { useAuth } from "@/components/auth-provider";

export function DailyMissionBoard() {
  const { token, user } = useAuth();
  const [mission, setMission] = useState<DailyMission>(fallbackDailyMission);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [rewards, setRewards] = useState<RewardsOverview>(fallbackRewardsOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== "student") {
      setIsLoading(false);
      return;
    }

    fetchDailyMissionAuthed(token)
      .then((payload) => {
        setMission(payload);
        setCompletedIds(payload.exercises.slice(0, payload.completed_exercises).map((exercise) => exercise.id));
        setActiveIndex(Math.min(payload.completed_exercises, Math.max(payload.exercises.length - 1, 0)));
      })
      .catch(() => {
        setMission(fallbackDailyMission);
        setCompletedIds([]);
        setActiveIndex(0);
      })
      .finally(() => setIsLoading(false));

    fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));
  }, [token, user?.id, user?.role]);

  const activeExercise = mission.exercises[activeIndex] ?? null;
  const progressPercent = mission.total_exercises === 0 ? 0 : Math.round((completedIds.length / mission.total_exercises) * 100);
  const remainingCount = Math.max(0, mission.total_exercises - completedIds.length);

  const orderedExercises = useMemo(
    () =>
      mission.exercises.map((exercise, index) => ({
        ...exercise,
        index,
        isDone: completedIds.includes(exercise.id),
      })),
    [completedIds, mission.exercises],
  );

  async function handleSubmit() {
    if (!user || !activeExercise || !answer.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitExerciseAttempt(user.id, activeExercise.id, answer, activeExercise.estimated_seconds);
      setFeedback(`${result.message} ${result.tutor_explanation}`);
      if (token) {
        fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));
      }
      if (result.status === "correct") {
        setCompletedIds((current) => (current.includes(activeExercise.id) ? current : [...current, activeExercise.id]));
        setTimeout(() => {
          const nextIndex = orderedExercises.findIndex((exercise) => !completedIds.includes(exercise.id) && exercise.id !== activeExercise.id);
          if (nextIndex >= 0) {
            setActiveIndex(nextIndex);
            setAnswer("");
          }
        }, 250);
      }
    } catch {
      setFeedback("Nao foi possivel registrar sua resposta agora. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectExercise(exercise: DailyMissionExercise, index: number) {
    setActiveIndex(index);
    setAnswer("");
    setFeedback(null);
    if (completedIds.includes(exercise.id)) {
      setFeedback("Questao ja concluida hoje. Voce pode revisitar o enunciado e a habilidade.");
    }
  }

  if (user?.role !== "student") {
    return (
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Missao diaria</span>
            <h2>Disponivel para alunos</h2>
            <p>Esta area foi desenhada como rotina objetiva de pratica diaria do aluno.</p>
          </div>
        </article>
      </section>
    );
  }

  if (isLoading || !activeExercise) {
    return (
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Missao diaria</span>
            <h2>Preparando sua rotina de hoje</h2>
            <p>Carregando tema, questoes objetivas e meta de constancia.</p>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="section-stack">
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Missao diaria</span>
            <h2>{mission.title}</h2>
            <p>{mission.focus_reason}</p>
          </div>
          <div className="mission-hero-grid">
            <div className="mission-hero-card">
              <span className="tag highlight">
                <Sparkles size={14} />
                Tema do dia: {mission.theme}
              </span>
              <strong>{mission.daily_goal}</strong>
              <p>{mission.recommendation}</p>
            </div>
            <div className="mission-hero-card">
              <span className="tag">
                <Trophy size={14} />
                {mission.xp_reward} XP em jogo
              </span>
              <strong>{progressPercent}% concluido</strong>
              <p>{mission.streak_target}</p>
            </div>
          </div>
          <div className="progress-block">
            <div>
              <span>Progresso do dia</span>
              <strong>{completedIds.length}/{mission.total_exercises}</strong>
            </div>
            <div className="progress-bar">
              <div style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{mission.estimated_minutes} min</strong>
              <span>tempo estimado</span>
            </div>
            <div>
              <strong>{remainingCount}</strong>
              <span>questoes restantes</span>
            </div>
            <div>
              <strong>{mission.mission_date}</strong>
              <span>data da missao</span>
            </div>
            <div>
              <strong>{activeExercise.topic}</strong>
              <span>foco atual</span>
            </div>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Roteiro</span>
            <h2>Bloco do dia</h2>
            <p>Resolva na ordem ou pule para revisar um item especifico.</p>
          </div>
          <div className="mission-step-list">
            {orderedExercises.map((exercise) => (
              <button
                key={exercise.id}
                className={exercise.index === activeIndex ? "mission-step active" : exercise.isDone ? "mission-step done" : "mission-step"}
                onClick={() => selectExercise(exercise, exercise.index)}
                type="button"
              >
                <div>
                  <strong>Questao {exercise.index + 1}</strong>
                  <small>{exercise.skill}</small>
                </div>
                <span className="tag">{exercise.isDone ? "Concluida" : `Nivel ${exercise.difficulty}`}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="glass panel">
        <div className="section-title">
          <span>Questao ativa</span>
          <h2>{activeExercise.lesson_title}</h2>
          <p>{activeExercise.path_title} | habilidade: {activeExercise.skill}</p>
        </div>
        <div className="exercise-box">
          <p className="exercise-label">
            <BookOpen size={16} />
            {activeExercise.exercise_type === "multiple_choice" ? "Questao objetiva" : "Resposta curta"}
          </p>
          <h3>{activeExercise.prompt}</h3>
          {activeExercise.options.length > 0 ? (
            <div className="options-grid">
              {activeExercise.options.map((option) => (
                <button
                  key={option.id}
                  className={answer === option.value ? "option selected" : "option"}
                  onClick={() => setAnswer(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <input
              className="answer-input"
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Digite sua resposta"
              value={answer}
            />
          )}
          <div className="exercise-actions">
            <button className="primary-button" disabled={isSubmitting || completedIds.includes(activeExercise.id)} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="spin" size={16} /> : <Target size={16} />}
              {completedIds.includes(activeExercise.id) ? "Questao concluida" : "Responder agora"}
            </button>
            <button className="secondary-button" onClick={() => setFeedback(activeExercise.hints[0] ?? activeExercise.explanation)} type="button">
              <ShieldPlus size={16} />
              Ver dica
            </button>
          </div>
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
        </div>
      </article>

      <article className="glass panel">
        <div className="section-title">
          <span>Constancia</span>
          <h2>Por que essa missao existe</h2>
          <p>O objetivo aqui e criar ritmo diario com questoes curtas, objetivas e com variedade de temas.</p>
        </div>
        <div className="tag-row">
          <span className="tag success"><Flame size={14} /> rotina curta e diaria</span>
          <span className="tag"><Sparkles size={14} /> foco adaptativo</span>
          <span className="tag warning"><Trophy size={14} /> recompensa imediata</span>
        </div>
        <div className="mission-list">
          {rewards.recent_unlocks.slice(0, 2).map((unlock) => (
            <div key={unlock.id} className="mission-card">
              <div>
                <strong>{unlock.title}</strong>
                <span>{unlock.kind === "cosmetic" ? "item desbloqueado" : "badge conquistada"}</span>
              </div>
              <p>{unlock.rarity}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
