"use client";

import { PlusCircle } from "@/lib/icons";
import { QuestionBankItem } from "@/lib/data";

type TrailActivityFormValue = {
  title: string;
  activity_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: string;
  estimated_minutes: string;
  source_exercise_id: string;
};

const activityTypeLabels: Record<TrailActivityFormValue["activity_type"], string> = {
  multiple_choice: "Multipla escolha",
  input: "Resposta curta",
  drag_drop: "Arrastar e soltar",
  step_by_step: "Passo a passo",
  timed: "Cronometrada",
};

type ActivityFormItemProps = {
  index: number;
  value: TrailActivityFormValue;
  questionBankItems: QuestionBankItem[];
  canRemove: boolean;
  onChange: (nextValue: TrailActivityFormValue) => void;
  onRemove: () => void;
};

export function ActivityFormItem({ index, value, questionBankItems, canRemove, onChange, onRemove }: ActivityFormItemProps) {
  const linkedQuestion = questionBankItems.find((item) => item.id === value.source_exercise_id);

  return (
    <div className="teacher-row-card stacked">
      <div className="teacher-row-copy">
        <strong>Atividade {index + 1}</strong>
        <small>Configure o desafio que vai aparecer como no da trilha.</small>
      </div>
      <label>
        Questao do banco (opcional)
        <select
          className="answer-input"
          value={value.source_exercise_id}
          onChange={(event) => {
            const sourceExerciseId = event.target.value;
            const sourceQuestion = questionBankItems.find((item) => item.id === sourceExerciseId);
            if (!sourceQuestion) {
              onChange({ ...value, source_exercise_id: "", title: "", activity_type: "multiple_choice", difficulty: "", estimated_minutes: "8" });
              return;
            }
            onChange({
              ...value,
              source_exercise_id: sourceExerciseId,
              title: sourceQuestion.prompt,
              activity_type: sourceQuestion.exercise_type,
              difficulty: String(sourceQuestion.difficulty),
              estimated_minutes: String(Math.max(1, Math.round(sourceQuestion.estimated_seconds / 60))),
            });
          }}
        >
          <option value="">Criar atividade manual</option>
          {questionBankItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.lesson_title} · {item.prompt}
            </option>
          ))}
        </select>
      </label>
      <label>
        Titulo da atividade
        <input
          className="answer-input"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          placeholder={linkedQuestion ? "Titulo derivado da questao do banco" : "Ex.: Desafio de potenciação"}
        />
      </label>
      <div className="teacher-batch-grid">
        <label>
          Tipo
          <select
            className="answer-input"
            value={value.activity_type}
            onChange={(event) =>
              onChange({
                ...value,
                activity_type: event.target.value as TrailActivityFormValue["activity_type"],
              })
            }
          >
            {Object.entries(activityTypeLabels).map(([optionValue, optionLabel]) => (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dificuldade
          <select
            className="answer-input"
            value={value.difficulty}
            onChange={(event) => onChange({ ...value, difficulty: event.target.value })}
          >
            <option value="">Sem nivel</option>
            <option value="1">Nivel 1</option>
            <option value="2">Nivel 2</option>
            <option value="3">Nivel 3</option>
            <option value="4">Nivel 4</option>
            <option value="5">Nivel 5</option>
          </select>
        </label>
      </div>
      <label>
        Tempo estimado (min)
        <input
          className="answer-input"
          min={1}
          max={180}
          type="number"
          value={value.estimated_minutes}
          onChange={(event) => onChange({ ...value, estimated_minutes: event.target.value })}
        />
      </label>
      <div className="inline-metrics">
        <span className="tag">
          <PlusCircle size={14} />
          {activityTypeLabels[value.activity_type]}
        </span>
        {linkedQuestion ? <span className="tag success">Ligada ao banco</span> : null}
        {canRemove ? (
          <button className="tag link-tag" onClick={onRemove} type="button">
            Remover atividade
          </button>
        ) : null}
      </div>
    </div>
  );
}
