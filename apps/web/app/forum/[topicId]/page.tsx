"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, MessageCircleReply, Pin, Send, Swords, Tags } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { createForumPostAuthed, fetchForumTopicDetailAuthed } from "@/lib/api";
import { fallbackForumTopicDetail, ForumTopicDetail } from "@/lib/data";

export default function ForumTopicPage() {
  const params = useParams<{ topicId: string }>();
  const { token, user } = useAuth();
  const [detail, setDetail] = useState<ForumTopicDetail>(fallbackForumTopicDetail);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params?.topicId) {
      return;
    }
    fetchForumTopicDetailAuthed(token, params.topicId).then(setDetail).catch(() => setDetail(fallbackForumTopicDetail));
  }, [params?.topicId, token]);

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user || !reply.trim()) {
      return;
    }
    const updated = await createForumPostAuthed(token, detail.topic.id, {
      author_id: user.id,
      body: reply,
    });
    setDetail(updated);
    setReply("");
    setMessage("Resposta publicada com sucesso.");
  }

  return (
    <PlatformShell
      heading="Tópico do fórum"
      description="Discussão detalhada entre alunos e professores."
    >
      <section className="section-stack">
        <article className="glass panel forum-topic">
          <div className="forum-header">
            <div>
              <p className="eyebrow">
                <Link href={`/perfil/${detail.topic.author_id}`}>{detail.topic.author_name}</Link>
              </p>
              <h2>{detail.topic.title}</h2>
            </div>
            <div className="tag-row">
              {detail.topic.topic_type === "challenge" ? (
                <span className="tag highlight">
                  <Swords size={14} />
                  Desafio
                </span>
              ) : null}
              {detail.topic.topic_type === "activity" ? (
                <span className="tag highlight">
                  <BookOpen size={14} />
                  Atividade
                </span>
              ) : null}
              {detail.topic.is_pinned ? (
                <span className="tag highlight">
                  <Pin size={14} />
                  Fixado
                </span>
              ) : null}
            </div>
          </div>
          <p className="forum-body">{detail.topic.body}</p>
          <div className="forum-footer">
            <div className="tag-row">
              {detail.topic.tags.map((tag) => (
                <span key={tag} className="tag">
                  <Tags size={14} />
                  {tag}
                </span>
              ))}
              {detail.topic.due_at ? <span className="tag warning">Entrega até {new Date(detail.topic.due_at).toLocaleDateString("pt-BR")}</span> : null}
            </div>
            <span className="tag">
              <MessageCircleReply size={14} />
              {detail.posts.length} respostas
            </span>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Respostas</span>
            <h2>Thread da discussão</h2>
            <p>Espaço para interação entre professor e alunos.</p>
          </div>
          <div className="activity-feed">
            {detail.posts.map((post) => (
              <div key={post.id} className="feed-item">
                <strong>
                  <Link href={`/perfil/${post.author_id}`}>{post.author_name}</Link>
                </strong>
                <p>{post.body}</p>
                <small>{post.created_at}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Responder</span>
            <h2>Nova mensagem</h2>
            <p>Publique sua resposta.</p>
          </div>
          <form className="login-form" onSubmit={handleReply}>
            <textarea className="answer-input textarea-input" value={reply} onChange={(event) => setReply(event.target.value)} />
            <button className="primary-button wide" type="submit">
              <Send size={16} />
              {" "}Responder tópico
            </button>
          </form>
          {message ? <div className="feedback-box">{message}</div> : null}
        </article>
      </section>
    </PlatformShell>
  );
}
