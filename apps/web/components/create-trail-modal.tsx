"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionModal } from "@/components/action-modal";
import { ActivityFormItem } from "@/components/activity-form-item";
import { ClassSelector } from "@/components/class-selector";
import { PlusCircle, Sparkles } from "@/lib/icons";
import { QuestionBankItem, TeacherClassSummary, TeacherTrailCreatePayload } from "@/lib/data";

type TrailActivityFormValue = {
  title: string;
  activity_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
  difficulty: string;
  estimated_minutes: string;
  source_exercise_id: string;
};

const defaultActivity = (): TrailActivityFormValue => ({
  title: "",
  activity_type: "multiple_choice",
  difficulty: "",
  estimated_minutes: "8",
  source_exercise_id: "",
});

type CreateTrailModalProps = {
  open: boolean;
  classes: TeacherClassSummary[];
  questionBankItems: QuestionBankItem[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: TeacherTrailCreatePayload) => Promise<void>;
};

export function CreateTrailModal({ open, classes, questionBankItems, isSaving, onClose, onSubmit }: CreateTrailModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [activities, setActivities] = useState<TrailActivityFormValue[]>([defaultActivity()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
  }, [open]);

  const totalEstimatedMinutes = useMemo(
    () => activities.reduce((sum, item) => sum + (Number(item.estimated_minutes) || 0), 0),
    [activities],
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedClassIds([]);
    setActivities([defaultActivity()]);
    setError(null);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Adicione um titulo para a trilha.");
      return;
    }
    if (activities.length === 0 || activities.every((activity) => !activity.title.trim())) {
      setError("Adicione pelo menos uma atividade.");
      return;
    }
    if (selectedClassIds.length === 0) {
      setError("Selecione ao menos uma turma.");
      return;
    }

    const payload: TeacherTrailCreatePayload = {
      title: title.trim(),
      description: description.trim(),
      class_ids: selectedClassIds,
      activities: activities
        .filter((activity) => activity.title.trim())
        .map((activity) => ({
          title: activity.title.trim(),
          activity_type: activity.activity_type,
          difficulty: activity.difficulty ? Number(activity.difficulty) : null,
          estimated_minutes: Number(activity.estimated_minutes) || 1,
          source_exercise_id: activity.source_exercise_id || null,
        })),
    };

    try {
      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel publicar a trilha.");
    }
  }

  return (
    <ActionModal
      title="Criar trilha"
      subtitle="Mapa do professor"
      description="Monte uma trilha nova, escolha as turmas e publique sem sair do painel."
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
    >
      <div className="teacher-row-card stacked">
        <label>
          Titulo da trilha
          <input className="answer-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Cidade das Potencias" />
        </label>
        <label>
          Descricao
          <textarea
            className="answer-input"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explique o objetivo da trilha e como ela vai aparecer para os alunos."
          />
        </label>
        <div className="inline-metrics">
          <span className="tag success">
            <Sparkles size={14} />
            {activities.length} atividades
          </span>
          <span className="tag">{totalEstimatedMinutes} min estimados</span>
        </div>
      </div>

      <div className="teacher-row-card stacked">
        <div className="teacher-row-copy">
          <strong>Turmas que vao receber a trilha</strong>
          <small>Os alunos dessas turmas vao ver automaticamente o mapa novo em Aprendizado.</small>
        </div>
        <ClassSelector
          classes={classes}
          selectedClassIds={selectedClassIds}
          onToggle={(classId) =>
            setSelectedClassIds((current) =>
              current.includes(classId) ? current.filter((item) => item !== classId) : [...current, classId],
            )
          }
        />
      </div>

      <div className="teacher-row-card stacked">
        <div className="teacher-row-copy">
          <strong>Atividades da trilha</strong>
          <small>Esses nos vao aparecer no mapa em ordem de progressao.</small>
        </div>
        <div className="teacher-list">
          {activities.map((activity, index) => (
            <ActivityFormItem
              key={`trail-activity-form-${index}`}
              index={index}
              questionBankItems={questionBankItems}
              value={activity}
              canRemove={activities.length > 1}
              onChange={(nextValue) =>
                setActivities((current) => current.map((item, currentIndex) => (currentIndex === index ? nextValue : item)))
              }
              onRemove={() => setActivities((current) => current.filter((_, currentIndex) => currentIndex !== index))}
            />
          ))}
        </div>
        <div className="inline-metrics">
          <button className="tag link-tag" onClick={() => setActivities((current) => [...current, defaultActivity()])} type="button">
            <PlusCircle size={14} />
            Adicionar atividade
          </button>
        </div>
      </div>

      {error ? <div className="feedback-box">{error}</div> : null}

      <div className="inline-metrics modal-sticky-actions">
        <button className="primary-button" disabled={isSaving} onClick={handleSubmit} type="button">
          {isSaving ? "Publicando..." : "Publicar trilha"}
        </button>
      </div>
    </ActionModal>
  );
}
