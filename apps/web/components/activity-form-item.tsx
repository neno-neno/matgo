"use client";

import { PlusCircle } from "@/lib/icons";

type TrailActivityFormValue = {
  title: string;
  activity_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: string;
  estimated_minutes: string;
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
  canRemove: boolean;
  onChange: (nextValue: TrailActivityFormValue) => void;
  onRemove: () => void;
};

export function ActivityFormItem({ index, value, canRemove, onChange, onRemove }: ActivityFormItemProps) {
  return (
    <div className="teacher-row-card stacked">
      <div className="teacher-row-copy">
        <strong>Atividade {index + 1}</strong>
        <small>Configure o desafio que vai aparecer como no da trilha.</small>
      </div>
      <label>
        Titulo da atividade
        <input
          className="answer-input"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
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
        {canRemove ? (
          <button className="tag link-tag" onClick={onRemove} type="button">
            Remover atividade
          </button>
        ) : null}
      </div>
    </div>
  );
}
