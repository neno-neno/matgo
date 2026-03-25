"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BookOpen, Flame, LoaderCircle, ShieldPlus, Sparkles, Target, Trophy } from "@/lib/icons";
import { fetchDailyMissionAuthed, fetchRewardsOverviewAuthed, submitExerciseAttempt } from "@/lib/api";
import { DailyMission, DailyMissionExercise, fallbackDailyMission, fallbackRewardsOverview, RewardsOverview } from "@/lib/data";
import { useAuth } from "@/components/auth-provider";

type ConsistencyFocus = "routine" | "adaptive" | "reward";

export function DailyMissionBoard() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [mission, setMission] = useState<DailyMission>(fallbackDailyMission);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isMissionFinished, setIsMissionFinished] = useState(false);
  const [rewards, setRewards] = useState<RewardsOverview>(fallbackRewardsOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consistencyFocus, setConsistencyFocus] = useState<ConsistencyFocus>("routine");

  useEffect(() => {
    if (!token || user?.role !== "student") {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    fetchDailyMissionAuthed(token)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const seededCompletedIds = payload.completed_exercise_ids.filter((exerciseId) =>
          payload.exercises.some((exercise) => exercise.id === exerciseId),
        );
        const nextIndex = payload.exercises.findIndex((exercise) => !seededCompletedIds.includes(exercise.id));
        setMission(payload);
        setCompletedIds(seededCompletedIds);
        setIsMissionFinished(payload.exercises.length > 0 && seededCompletedIds.length >= payload.exercises.length);
        setActiveIndex(nextIndex >= 0 ? nextIndex : Math.max(payload.exercises.length - 1, 0));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setMission(fallbackDailyMission);
        setCompletedIds([]);
        setIsMissionFinished(false);
        setActiveIndex(0);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));

    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (mission.exercises.length === 0) {
      if (activeIndex !== 0) {
        setActiveIndex(0);
      }
      return;
    }
    const maxIndex = mission.exercises.length - 1;
    if (activeIndex > maxIndex) {
      setActiveIndex(maxIndex);
    }
  }, [activeIndex, mission.exercises.length]);

  const safeActiveIndex = mission.exercises.length === 0 ? 0 : Math.min(activeIndex, mission.exercises.length - 1);
  const activeExercise = mission.exercises[safeActiveIndex] ?? null;
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

  const consistencyContent: Record<ConsistencyFocus, { title: string; description: string; note: string; actionLabel: string; action: () => void }> = {
    routine: {
      title: "Rotina curta e diária",
      description: "A missão foi desenhada para caber na rotina do aluno, com poucos exercícios e objetivo claro.",
      note: `${mission.estimated_minutes} minutos estimados e ${mission.total_exercises} questões para manter constância sem sobrecarga.`,
      actionLabel: "Continuar missão",
      action: () => {
        document.getElementById("mission-roteiro")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
    adaptive: {
      title: "Foco adaptativo",
      description: "O tema do dia acompanha o ponto que mais precisa de reforço agora.",
      note: `Hoje o sistema priorizou ${mission.theme.toLowerCase()} para manter o avanço com segurança.`,
      actionLabel: "Ver trilha atual",
      action: () => router.push("/aprendizado"),
    },
    reward: {
      title: "Recompensa imediata",
      description: "Cada sessão curta gera XP, moedas e progresso visível para reforçar o hábito.",
      note: `${mission.xp_reward} XP em jogo e desbloqueios recentes aparecem aqui para manter a motivação.`,
      actionLabel: "Ver perfil e itens",
      action: () => router.push("/perfil"),
    },
  };

  async function handleSubmit() {
    if (!token || !user || !activeExercise || !answer.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitExerciseAttempt(token, user.id, activeExercise.id, answer, activeExercise.estimated_seconds);
      setFeedback(`${result.message} ${result.tutor_explanation}`);
      if (token) {
        fetchRewardsOverviewAuthed(token, user.id).then(setRewards).catch(() => setRewards(fallbackRewardsOverview));
      }
      if (result.status === "correct") {
        const nextCompletedIds = completedIds.includes(activeExercise.id)
          ? completedIds
          : [...completedIds, activeExercise.id];
        const nextExerciseIndex = mission.exercises.findIndex((exercise) => !nextCompletedIds.includes(exercise.id));

        setCompletedIds(nextCompletedIds);
        setAnswer("");

        if (nextExerciseIndex >= 0) {
          setActiveIndex(nextExerciseIndex);
          setIsMissionFinished(false);
        } else {
          setIsMissionFinished(true);
          setActiveIndex(Math.max(mission.exercises.length - 1, 0));
          setFeedback("Bloco concluído. Você fechou todas as tarefas de hoje.");
        }
      }
    } catch {
      setFeedback("Não foi possível registrar sua resposta agora. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectExercise(exercise: DailyMissionExercise, index: number) {
    setActiveIndex(index);
    setAnswer("");
    setFeedback(null);
    if (completedIds.includes(exercise.id)) {
      setFeedback("Questão já concluída hoje. Você pode revisitar o enunciado e a habilidade.");
    }
  }

  if (user?.role !== "student") {
    return (
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Missão diária</span>
            <h2>Disponível para alunos</h2>
            <p>Esta área foi desenhada como uma rotina objetiva de prática diária do aluno.</p>
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
            <span>Missão diária</span>
            <h2>{isMissionFinished ? "Bloco concluído" : "Preparando sua rotina de hoje"}</h2>
            <p>{isMissionFinished ? "Todas as tarefas do bloco do dia foram concluídas com sucesso." : "Carregando tema, questões objetivas e meta de constância."}</p>
          </div>
        </article>
      </section>
    );
  }

  const activeConsistency = consistencyContent[consistencyFocus];

  return (
    <section className="section-stack">
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Missão diária</span>
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
              <strong>{progressPercent}% concluído</strong>
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
              <span>questões restantes</span>
            </div>
            <div>
              <strong>{mission.mission_date}</strong>
              <span>data da missão</span>
            </div>
            <div>
              <strong>{activeExercise.topic}</strong>
              <span>foco atual</span>
            </div>
          </div>
        </article>

        <article className="glass panel" id="mission-roteiro">
          <div className="section-title">
            <span>Roteiro</span>
            <h2>Bloco do dia</h2>
            <p>Resolva na ordem ou pule para revisar um item específico.</p>
          </div>
          <div className="mission-step-list">
            {orderedExercises.map((exercise) => (
              <button
                key={exercise.id}
                className={exercise.index === safeActiveIndex && !isMissionFinished ? "mission-step active" : exercise.isDone ? "mission-step done" : "mission-step"}
                onClick={() => selectExercise(exercise, exercise.index)}
                type="button"
              >
                <div>
                  <strong>Questão {exercise.index + 1}</strong>
                  <small>{exercise.skill}</small>
                </div>
                <span className="tag">{exercise.isDone ? "Concluída" : `Nível ${exercise.difficulty}`}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="glass panel">
        <div className="section-title">
          <span>Questão ativa</span>
          <h2>{isMissionFinished ? "Bloco concluído" : activeExercise.lesson_title}</h2>
          <p>{isMissionFinished ? "Todas as questões do dia foram concluídas. Você pode revisar o roteiro ou voltar amanhã para a próxima rotina." : `${activeExercise.path_title} | habilidade: ${activeExercise.skill}`}</p>
        </div>
        <div className="exercise-box">
          {isMissionFinished ? (
            <>
              <p className="exercise-label">
                <Trophy size={16} />
                Rotina finalizada
              </p>
              <h3>Você concluiu todas as tarefas do bloco de hoje.</h3>
              <p className="exercise-support">Revise qualquer questão no roteiro acima ou siga para a próxima atividade publicada.</p>
            </>
          ) : (
            <>
              <p className="exercise-label">
                <BookOpen size={16} />
                {activeExercise.exercise_type === "multiple_choice" ? "Questão objetiva" : "Resposta curta"}
              </p>
              <h3>{activeExercise.prompt}</h3>
              {activeExercise.options.length > 0 ? (
                <div className="options-grid">
                  {activeExercise.options.map((option) => (
                    <button
                      key={`${activeExercise.id}-${option.id}`}
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
                  {completedIds.includes(activeExercise.id) ? "Questão concluída" : "Responder agora"}
                </button>
                <button className="secondary-button" onClick={() => setFeedback(activeExercise.hints[0] ?? activeExercise.explanation)} type="button">
                  <ShieldPlus size={16} />
                  Ver dica
                </button>
              </div>
            </>
          )}
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
        </div>
      </article>

      <article className="glass panel">
        <div className="section-title">
          <span>Constância</span>
          <h2>Por que esta missão existe</h2>
          <p>O objetivo aqui é criar ritmo diário com questões curtas, objetivas e com variedade de temas.</p>
        </div>
        <div className="tag-row">
          <button className={consistencyFocus === "routine" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setConsistencyFocus("routine")} type="button">
            <Flame size={14} />
            rotina curta e diária
          </button>
          <button className={consistencyFocus === "adaptive" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setConsistencyFocus("adaptive")} type="button">
            <Sparkles size={14} />
            foco adaptativo
          </button>
          <button className={consistencyFocus === "reward" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setConsistencyFocus("reward")} type="button">
            <Trophy size={14} />
            recompensa imediata
          </button>
        </div>
        <div className="mission-hero-card feature-panel">
          <strong>{activeConsistency.title}</strong>
          <p>{activeConsistency.description}</p>
          <p className="exercise-support">{activeConsistency.note}</p>
          <div className="hero-actions-row">
            <button className="primary-button" onClick={activeConsistency.action} type="button">
              {activeConsistency.actionLabel}
            </button>
          </div>
        </div>
        <div className="mission-list">
          {rewards.recent_unlocks.slice(0, 2).map((unlock) => (
            <div key={unlock.id} className="mission-card mission-card-stacked">
              <div>
                <strong>{unlock.title}</strong>
                <span>{unlock.kind === "cosmetic" ? "Item desbloqueado" : "Badge conquistada"}</span>
              </div>
              <div className="tag-row">
                <span className="tag">{unlock.rarity}</span>
                <button className="secondary-button" onClick={() => router.push(unlock.kind === "cosmetic" ? "/perfil" : "/loja")} type="button">
                  {unlock.kind === "cosmetic" ? "Ver no perfil" : "Abrir recompensas"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
