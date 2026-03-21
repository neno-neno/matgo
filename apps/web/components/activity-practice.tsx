"use client";

import { useMemo, useState } from "react";
import { BookOpen, LoaderCircle, ShieldPlus } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { submitExerciseAttempt } from "@/lib/api";
import { BootstrapData, Exercise, getFirstExercise } from "@/lib/data";

function getAllExercises(data: BootstrapData): Exercise[] {
  return data.learning_paths.flatMap((path) => path.lessons).flatMap((lesson) => lesson.exercises);
}

export function ActivityPractice({ data }: { data: BootstrapData }) {
  const { user } = useAuth();
  const exercises = useMemo(() => getAllExercises(data), [data]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(getFirstExercise(data)?.id ?? null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId) ?? null;

  async function handleSubmit() {
    if (!activeExercise || !answer.trim()) {
      setFeedback("Digite ou selecione uma resposta antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitExerciseAttempt(user?.id ?? "student-001", activeExercise.id, answer, activeExercise.estimated_seconds);
      setFeedback(`${result.message} ${result.tutor_explanation}`);
    } catch {
      setFeedback(`Nao foi possivel falar com a API. Resposta esperada: ${activeExercise.correct_answer}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeExercise) {
    return (
      <div className="glass panel">
        <p>Nenhum exercicio disponivel no momento.</p>
      </div>
    );
  }

  return (
    <section className="section-stack">
      <article className="glass panel">
        <div className="section-title">
          <span>Atividade ativa</span>
          <h2>Exercicios guiados</h2>
          <p>Separe a pratica da visao geral para uma experiencia mais fluida.</p>
        </div>
        <div className="exercise-tabs">
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              className={activeExercise.id === exercise.id ? "exercise-tab active" : "exercise-tab"}
              onClick={() => {
                setActiveExerciseId(exercise.id);
                setAnswer("");
                setFeedback(null);
              }}
              type="button"
            >
              {exercise.exercise_type.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="exercise-box">
          <p className="exercise-label">
            <BookOpen size={16} />
            {activeExercise.exercise_type === "timed" ? "Desafio cronometrado" : "Pratica guiada"}
          </p>
          <h3>{activeExercise.prompt}</h3>
          <p className="exercise-support">Habilidade em foco: {activeExercise.skill}</p>
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
            <button className="primary-button" disabled={isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="spin" size={16} /> : null}
              Enviar resposta
            </button>
            <button className="secondary-button" onClick={() => setFeedback(activeExercise.hints[0] ?? "Tente decompor o problema em etapas menores.")} type="button">
              <ShieldPlus size={16} />
              Pedir dica
            </button>
          </div>
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
        </div>
      </article>
    </section>
  );
}
