"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BookOpen, MessageCircleReply, Pin, PlusCircle, Swords, Tags } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { createForumTopicAuthed, fetchForumTopicsAuthed } from "@/lib/api";
import { ForumTopic, fallbackForumTopics } from "@/lib/data";

export default function ForumPage() {
  const { token, user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>(fallbackForumTopics);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [publishMode, setPublishMode] = useState<"discussion" | "activity">("discussion");

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchForumTopicsAuthed(token).then(setTopics).catch(() => setTopics(fallbackForumTopics));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) {
      return;
    }
    const created = await createForumTopicAuthed(token, {
      class_id: "class-001",
      author_id: user.id,
      title,
      body,
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
      topic_type: publishMode,
      due_at: publishMode === "activity" && dueAt ? dueAt : null,
    });
    setTopics((current) => [created, ...current]);
    setTitle("");
    setBody("");
    setTags("");
    setDueAt("");
  }

  return (
    <PlatformShell
      heading="Forum de questoes"
      description="Espaco para duvidas, revisoes e desafios publicados pelo professor."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Topicos</span>
            <h2>Comunidade da turma</h2>
            <p>Agora o forum tambem funciona como mural de desafios do professor.</p>
          </div>
          <div className="section-stack">
            {topics.map((topic) => (
              <article key={topic.id} className="forum-topic">
                <div className="forum-header">
                  <div>
                    <p className="eyebrow">{topic.author_name}</p>
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
                    {topic.due_at ? <span className="tag warning">Prazo: {topic.due_at}</span> : null}
                  </div>
                  <span className="tag">
                    <MessageCircleReply size={14} />
                    {topic.replies} respostas
                  </span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Publicar</span>
            <h2>{user?.role === "teacher" || user?.role === "master" ? "Criar topico ou atividade" : "Abrir nova discussao"}</h2>
            <p>As atividades do professor podem ser publicadas aqui e aparecem tambem na area de atividades do aluno.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Titulo
              <input className="answer-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Conteudo
              <textarea className="answer-input textarea-input" value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <label>
              Tags
              <input className="answer-input" placeholder="fracoes, desafio, revisao" value={tags} onChange={(event) => setTags(event.target.value)} />
            </label>
            {user?.role === "teacher" || user?.role === "master" ? (
              <>
                <div className="inline-metrics">
                  <button className={publishMode === "discussion" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setPublishMode("discussion")} type="button">
                    Discussao
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
              </>
            ) : null}
            <button className="primary-button wide" type="submit">
              <PlusCircle size={16} />
              Publicar
            </button>
          </form>
        </article>
      </section>
    </PlatformShell>
  );
}
