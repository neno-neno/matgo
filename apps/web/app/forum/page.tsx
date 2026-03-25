"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BookOpen, MessageCircleReply, Pin, PlusCircle, Swords, Tags } from "@/lib/icons";

import { ActionModal } from "@/components/action-modal";
import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import {
  createForumTopicAuthed,
  deleteForumTopicAuthed,
  fetchForumTopicsAuthed,
  fetchTeacherClassesAuthed,
  updateForumTopicClassAuthed,
} from "@/lib/api";
import { ForumTopic, fallbackForumTopics, TeacherClassSummary } from "@/lib/data";
import { showToast } from "@/lib/toast";

function ForumPageContent() {
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>(fallbackForumTopics);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [publishMode, setPublishMode] = useState<"discussion" | "activity">("discussion");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [selectedCreateClassId, setSelectedCreateClassId] = useState("");
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);
  const [editingTopicClassId, setEditingTopicClassId] = useState("");
  const [editClassModalError, setEditClassModalError] = useState<string | null>(null);

  useEffect(() => {
    const requestedClassId = searchParams.get("classId");
    if (requestedClassId) {
      setSelectedClassIds([requestedClassId]);
      setSelectedCreateClassId(requestedClassId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (user?.role === "teacher" || user?.role === "master") {
      fetchTeacherClassesAuthed(token)
        .then((items) => {
          setTeacherClasses(items);
          if (!selectedCreateClassId && items.length > 0) {
            setSelectedCreateClassId(items[0].id);
          }
        })
        .catch(() => setTeacherClasses([]));
    } else {
      setTeacherClasses([]);
    }
  }, [selectedCreateClassId, token, user?.role]);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchForumTopicsAuthed(token, selectedClassIds.length > 0 ? selectedClassIds : undefined)
      .then(setTopics)
      .catch(() => setTopics(fallbackForumTopics));
  }, [selectedClassIds, token]);

  const canManageTopics = user?.role === "teacher" || user?.role === "master";
  const visibleClassChips = useMemo(() => teacherClasses, [teacherClasses]);

  function toggleClassFilter(classId: string) {
    setSelectedClassIds((current) =>
      current.includes(classId) ? current.filter((item) => item !== classId) : [...current, classId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user || !canManageTopics) {
      return;
    }
    const targetClassId = selectedCreateClassId || selectedClassIds[0] || teacherClasses[0]?.id;
    if (!targetClassId) {
      setCreateModalError("Selecione a turma do fórum antes de publicar.");
      return;
    }
    try {
      setCreateModalError(null);
      const created = await createForumTopicAuthed(token, {
        class_id: targetClassId,
        author_id: user.id,
        title,
        body,
        tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
        topic_type: publishMode,
        due_at: publishMode === "activity" && dueAt ? dueAt : null,
      });
      const nextFilters = selectedClassIds.length > 0 ? selectedClassIds : [targetClassId];
      setSelectedClassIds(nextFilters);
      setTopics((current) => [created, ...current.filter((topic) => !nextFilters.length || nextFilters.includes(topic.class_id ?? ""))]);
      setTitle("");
      setBody("");
      setTags("");
      setDueAt("");
      setShowCreatePanel(false);
      showToast("Tópico criado com sucesso.");
    } catch (error) {
      setCreateModalError(error instanceof Error ? error.message : "Não foi possível criar o tópico.");
    }
  }

  async function handleDelete(topicId: string) {
    if (!token || !user || !canManageTopics) {
      return;
    }
    try {
      const result = await deleteForumTopicAuthed(token, topicId);
      setTopics((current) => current.filter((topic) => topic.id !== topicId));
      showToast(result.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível excluir o tópico.", "error");
    }
  }

  async function handleUpdateTopicClass() {
    if (!token || !editingTopic || !editingTopicClassId) {
      setEditClassModalError("Selecione a turma do tópico.");
      return;
    }
    try {
      setEditClassModalError(null);
      const updated = await updateForumTopicClassAuthed(token, editingTopic.id, editingTopicClassId);
      setTopics((current) => current.map((topic) => (topic.id === updated.id ? updated : topic)));
      setEditingTopic(null);
      setEditingTopicClassId("");
      showToast("Turma do tópico atualizada com sucesso.");
    } catch (error) {
      setEditClassModalError(error instanceof Error ? error.message : "Não foi possível alterar a turma do tópico.");
    }
  }

  return (
    <PlatformShell
      heading="Fórum de questões"
      description="Espaço para dúvidas, revisões e atividades separadas por turma."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Tópicos</span>
            <h2>Comunidade da turma</h2>
            <p>Os fóruns visíveis respeitam a turma do aluno e o conjunto de turmas do professor.</p>
          </div>

          <div className="inline-metrics section-actions">
            {canManageTopics ? (
              <button className="tag link-tag" onClick={() => setShowCreatePanel(true)} type="button">
                <PlusCircle size={14} />
                Novo fórum
              </button>
            ) : null}
            {visibleClassChips.length > 0 ? (
              <button
                className={`tag link-tag ${selectedClassIds.length === 0 ? "active-toggle" : ""}`}
                onClick={() => setSelectedClassIds([])}
                type="button"
              >
                Todas as turmas
              </button>
            ) : null}
            {visibleClassChips.map((classroom) => (
              <button
                key={classroom.id}
                className={`tag link-tag ${selectedClassIds.includes(classroom.id) ? "active-toggle" : ""}`}
                onClick={() => toggleClassFilter(classroom.id)}
                type="button"
              >
                {classroom.name}
              </button>
            ))}
          </div>

          <div className="section-stack">
            {topics.map((topic) => (
              <article key={topic.id} className="forum-topic">
                <div className="forum-header">
                  <div>
                    <p className="eyebrow">
                      <Link href={`/perfil/${topic.author_id}`}>{topic.author_name}</Link>
                    </p>
                    <Link href={`/forum/${topic.id}`}>
                      <h2>{topic.title}</h2>
                    </Link>
                  </div>
                  <div className="tag-row">
                    {topic.topic_type === "challenge" ? (
                      <span className="tag highlight">
                        <Swords size={14} />
                        Desafio
                      </span>
                    ) : null}
                    {topic.topic_type === "activity" ? (
                      <span className="tag highlight">
                        <BookOpen size={14} />
                        Atividade
                      </span>
                    ) : null}
                    {topic.is_pinned ? (
                      <span className="tag highlight">
                        <Pin size={14} />
                        Fixado
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="forum-body">{topic.body}</p>
                <div className="forum-footer">
                  <div className="tag-row">
                    {topic.tags.map((tag) => (
                      <span key={tag} className="tag">
                        <Tags size={14} />
                        {tag}
                      </span>
                    ))}
                    {topic.due_at ? <span className="tag warning">Entrega até {new Date(topic.due_at).toLocaleDateString("pt-BR")}</span> : null}
                  </div>
                  <div className="inline-metrics">
                    <span className="tag">
                      <MessageCircleReply size={14} />
                      {topic.replies} respostas
                    </span>
                    {(user?.role === "master" || topic.author_id === user?.id) ? (
                      <button
                        className="tag link-tag"
                        onClick={() => {
                          setEditingTopic(topic);
                          setEditingTopicClassId(topic.class_id ?? "");
                          setEditClassModalError(null);
                        }}
                        type="button"
                      >
                        Alterar turma
                      </button>
                    ) : null}
                    {canManageTopics ? (
                      <button className="tag link-tag danger-tag" onClick={() => handleDelete(topic.id)} type="button">
                        <AlertTriangle size={14} />
                        Excluir
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <ActionModal
        description="Selecione a turma e publique um tópico, atividade ou desafio diretamente no fórum correto."
        onClose={() => {
          setShowCreatePanel(false);
          setCreateModalError(null);
        }}
        open={showCreatePanel}
        subtitle="Novo fórum"
        title="Criar tópico ou atividade"
      >
        {canManageTopics ? (
          <form className="login-form" onSubmit={handleSubmit}>
            {createModalError ? <div className="feedback-box error">{createModalError}</div> : null}
            <label>
              Turma
              <select className="answer-input" onChange={(event) => setSelectedCreateClassId(event.target.value)} value={selectedCreateClassId}>
                {teacherClasses.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input className="answer-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Conteúdo
              <textarea className="answer-input textarea-input" value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <label>
              Tags
              <input className="answer-input" placeholder="frações, desafio, revisão" value={tags} onChange={(event) => setTags(event.target.value)} />
            </label>
            <div className="inline-metrics">
              <button className={publishMode === "discussion" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setPublishMode("discussion")} type="button">
                Discussão
              </button>
              <button className={publishMode === "activity" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setPublishMode("activity")} type="button">
                <BookOpen size={16} />
                Atividade
              </button>
            </div>
            {publishMode === "activity" ? (
              <label>
                Data limite
                <input className="answer-input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
            ) : null}
            <button className="primary-button wide" type="submit">
              <PlusCircle size={16} />
              Publicar
            </button>
          </form>
        ) : (
          <div className="teacher-row-card stacked">
            <strong>Leitura e resposta liberadas</strong>
            <p>Abra um tópico da lista para responder uma atividade, tirar dúvida ou participar da discussão da sua turma.</p>
          </div>
        )}
      </ActionModal>

      <ActionModal
        description="Altere a turma do tópico mantendo o fórum organizado por turma."
        onClose={() => {
          setEditingTopic(null);
          setEditingTopicClassId("");
          setEditClassModalError(null);
        }}
        open={!!editingTopic}
        subtitle="Fórum"
        title={editingTopic ? `Alterar turma de ${editingTopic.title}` : "Alterar turma"}
      >
        {editingTopic ? (
          <>
            {editClassModalError ? <div className="feedback-box error">{editClassModalError}</div> : null}
            <label>
              Turma
              <select className="answer-input" onChange={(event) => setEditingTopicClassId(event.target.value)} value={editingTopicClassId}>
                <option value="">Selecione a turma</option>
                {teacherClasses.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="exercise-actions">
              <button className="primary-button" onClick={handleUpdateTopicClass} type="button">
                Salvar turma do tópico
              </button>
            </div>
          </>
        ) : null}
      </ActionModal>
    </PlatformShell>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={null}>
      <ForumPageContent />
    </Suspense>
  );
}
