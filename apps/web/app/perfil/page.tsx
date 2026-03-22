"use client";

import Link from "next/link";
import { BadgeCheck, Flame, Gem, Heart, Sparkles, Trophy, UserRound } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

import { ActionModal } from "@/components/action-modal";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { equipProfileItemAuthed, fetchBootstrapData, fetchProfileInventoryAuthed, updateProfileAuthed } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData, fallbackProfileInventory, ProfileInventory } from "@/lib/data";

function rarityLabel(rarity: "comum" | "raro" | "epico") {
  if (rarity === "epico") return "Epico";
  if (rarity === "raro") return "Raro";
  return "Comum";
}

export default function PerfilPage() {
  const { ready, token, user, updateUser, activeTheme, setActiveTheme } = useAuth();
  const [data, setData] = useState<BootstrapData>(fallbackBootstrapData);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inventory, setInventory] = useState<ProfileInventory>(fallbackProfileInventory);
  const [profilePanel, setProfilePanel] = useState<"avatar" | "theme" | "edit" | null>(null);

  useEffect(() => {
    fetchBootstrapData().then(setData).catch(() => setData(fallbackBootstrapData));
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setBio(user.bio ?? "");
      if (token) {
        fetchProfileInventoryAuthed(token, user.id).then(setInventory).catch(() => setInventory(fallbackProfileInventory));
      }
    }
  }, [token, user]);

  const avatarOptions = useMemo(() => inventory.items.filter((item) => item.category === "avatar"), [inventory.items]);
  const themeOptions = useMemo(() => inventory.items.filter((item) => item.category === "theme"), [inventory.items]);
  const equippedAvatar = avatarOptions.find((item) => item.equipped)?.asset_url ?? user?.avatar_url ?? "/oficial.png";
  const profile = user ?? data.dashboard.profile;

  async function handleSave() {
    if (!token || !user) {
      setMessage("Sessao indisponivel para atualizar o perfil.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfileAuthed(token, user.id, {
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: equippedAvatar,
      });
      updateUser(updated);
      setMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEquipAvatar(itemId: string) {
    if (!token || !user) {
      setMessage("Sessao indisponivel para equipar o item.");
      return;
    }
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, itemId);
      setInventory(nextInventory);
      const nextAvatar = nextInventory.items.find((item) => item.id === itemId)?.asset_url;
      if (nextAvatar) {
        updateUser({ ...user, avatar_url: nextAvatar });
      }
      setMessage("Avatar equipado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel equipar o item.");
    }
  }

  async function handleEquipTheme(itemId: string) {
    if (!token || !user) {
      setMessage("Sessao indisponivel para aplicar o tema.");
      return;
    }
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, itemId);
      setInventory(nextInventory);
      setActiveTheme(itemId);
      setMessage("Tema aplicado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel aplicar o tema.");
    }
  }

  if (!ready) {
    return null;
  }

  if (user?.role === "master") {
    return (
      <PlatformShell
        heading="Perfil"
        description="O perfil master nao fica ativo na interface da plataforma."
      >
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>Master</span>
              <h2>Perfil desativado no frontend</h2>
              <p>As funcoes de master ficam reservadas para administracao do SaaS e nao aparecem como experiencia principal da plataforma.</p>
            </div>
          </article>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Seu perfil"
      description="Personalize seu visual, acompanhe sua evolucao e equipe os itens que voce desbloqueou na MatGo."
    >
      <section className="section-stack">
        <article className="glass panel profile-hero-card">
          <div className="profile-hero-top">
            <img alt="Avatar atual" className="profile-avatar-xl" src={equippedAvatar} />
            <div className="profile-hero-copy">
              <p className="eyebrow">Identidade MatGo</p>
              <h2>{profile.full_name}</h2>
              <p>
                {profile.grade_band ?? "Trilha em configuracao"}
                {user?.role === "student" ? ` | nivel ${profile.level}` : ""}
                {" | "}
                {profile.role}
              </p>
              {user?.role === "student" ? (
                <div className="tag-row">
                  <span className="tag success"><Flame size={14} /> {profile.streak} dias</span>
                  <span className="tag"><Gem size={14} /> {profile.coins} moedas</span>
                  <span className="tag"><Heart size={14} /> {profile.lives} vidas</span>
                </div>
              ) : (
                <div className="tag-row">
                  <span className="tag success">perfil profissional</span>
                  <span className="tag">{profile.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-progress-strip">
            <div className="profile-stat-chip">
              <strong>{user?.role === "student" ? profile.xp : profile.grade_band ?? "-"}</strong>
              <span>{user?.role === "student" ? "XP total" : "serie principal"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.accuracy}%</strong>
              <span>{user?.role === "student" ? "acerto medio" : "media acompanhada"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.study_minutes} min</strong>
              <span>{user?.role === "student" ? "tempo estudado" : "tempo acompanhado"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{user?.role === "student" ? data.dashboard.badges.filter((badge) => badge.unlocked).length : "Professor"}</strong>
              <span>{user?.role === "student" ? "badges liberadas" : "perfil profissional"}</span>
            </div>
          </div>
          <div className="inline-metrics profile-action-row">
            <button className={`tag link-tag ${profilePanel === "avatar" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("avatar")} type="button">
              Trocar avatar
            </button>
            <button className={`tag link-tag ${profilePanel === "theme" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("theme")} type="button">
              Trocar tema
            </button>
            <button className={`tag link-tag ${profilePanel === "edit" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("edit")} type="button">
              Editar nome e bio
            </button>
          </div>
        </article>
      </section>

      <ActionModal
        description="Escolha um visual para deixar seu perfil mais com a sua cara dentro da MatGo."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "avatar"}
        subtitle="Cosmeticos"
        title="Avatar e itens raros"
      >
        <div className="avatar-grid">
          {avatarOptions.map((avatar) => {
            const active = avatar.equipped;
            return (
              <button
                key={avatar.id}
                className={`avatar-option ${active ? "active" : ""} ${avatar.unlocked ? "" : "locked"}`}
                disabled={!avatar.unlocked}
                onClick={() => handleEquipAvatar(avatar.id)}
                type="button"
              >
                <img alt={avatar.name} className="avatar-option-image" src={avatar.asset_url} />
                <div>
                  <strong>{avatar.name}</strong>
                  <p>{avatar.unlock_hint}</p>
                </div>
                <span className={`tag ${avatar.rarity === "epico" ? "highlight" : avatar.rarity === "raro" ? "warning" : ""}`}>
                  {rarityLabel(avatar.rarity)}
                </span>
              </button>
            );
          })}
        </div>
      </ActionModal>

      <ActionModal
        description="Os temas ficam no perfil tambem e podem ser trocados a qualquer momento."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "theme"}
        subtitle="Colecao"
        title="Temas e recompensas do perfil"
      >
        <div className="avatar-grid">
          {themeOptions.map((theme) => {
            const active = activeTheme === theme.id || theme.equipped;
            return (
              <button
                key={theme.id}
                className={`avatar-option ${active ? "active" : ""} ${theme.unlocked ? "" : "locked"}`}
                disabled={!theme.unlocked}
                onClick={() => handleEquipTheme(theme.id)}
                type="button"
              >
                <div className={`shop-item-symbol ${theme.id}`}>T</div>
                <div>
                  <strong>{theme.name}</strong>
                  <p>{theme.description}</p>
                </div>
                <span className={`tag ${theme.rarity === "epico" ? "highlight" : theme.rarity === "raro" ? "warning" : ""}`}>
                  {active ? "Em uso" : rarityLabel(theme.rarity)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="insights-grid">
          <div className="insight-card">
            <Sparkles size={18} />
            <div>
              <strong>Objetos raros</strong>
              <p>Itens epicos devem virar metas de longo prazo e incentivar constancia, nao compra solta sem sentido.</p>
            </div>
          </div>
          <div className="insight-card">
            <BadgeCheck size={18} />
            <div>
              <strong>Equipar no perfil</strong>
              <p>O aluno desbloqueia, escolhe e equipa o visual. Isso conecta progresso a identidade.</p>
            </div>
          </div>
        </div>

        <div className="badge-list">
          {inventory.items.map((item) => (
            <div key={item.id} className={`badge ${item.unlocked ? "unlocked" : ""}`}>
              <span>{item.category === "avatar" ? "A" : item.category === "theme" ? "T" : "P"}</span>
              <div>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <small>{item.rarity} | {item.unlocked ? "desbloqueado" : item.unlock_hint}</small>
              </div>
            </div>
          ))}
        </div>
      </ActionModal>

      <ActionModal
        description="Essa parte continua secundaria, mas agora abre como uma janela separada para nao poluir a tela principal."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "edit"}
        subtitle="Secundario"
        title="Editar nome e bio"
      >
        <div className="profile-form">
          <label>
            Nome exibido
            <input className="answer-input" onChange={(event) => setFullName(event.target.value)} value={fullName} />
          </label>
          <label>
            E-mail
            <input className="answer-input" disabled value={profile.email} />
          </label>
          <label>
            Bio
            <textarea
              className="answer-input textarea-input"
              onChange={(event) => setBio(event.target.value)}
              placeholder="Conte um pouco do seu momento na matematica."
              value={bio}
            />
          </label>
        </div>

        <div className="exercise-actions">
          <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
          {user ? (
            <Link className="secondary-button" href={`/perfil/${user.id}`}>
              Ver como publico
            </Link>
          ) : null}
        </div>

        {message ? <div className="feedback-box">{message}</div> : null}
      </ActionModal>

      {user?.role === "student" ? (
      <section className="content-grid three-up">
        <article className="glass panel">
          <div className="section-title">
            <span>Evolucao</span>
            <h2>Marcos pessoais</h2>
          </div>
          <div className="mission-list">
            <div className="mission-card">
              <div>
                <strong>Maior streak</strong>
                <span>consistencia</span>
              </div>
              <p>{profile.streak} dias</p>
            </div>
            <div className="mission-card">
              <div>
                <strong>Nivel atual</strong>
                <span>crescimento</span>
              </div>
              <p>{user?.role === "student" ? profile.level : "perfil profissional"}</p>
            </div>
            <div className="mission-card">
              <div>
                <strong>Badges ativas</strong>
                <span>colecao</span>
              </div>
              <p>{data.dashboard.badges.filter((badge) => badge.unlocked).length}</p>
            </div>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Temas</span>
            <h2>Onde voce esta forte</h2>
          </div>
          <div className="teacher-list">
            {(data.dashboard.adaptive_plan.weak_points.length ? data.dashboard.adaptive_plan.suggested_revision : []).slice(0, 3).map((topic) => (
              <div key={topic} className="teacher-row-card stacked">
                <strong>{topic}</strong>
                <p>Esse tema pode virar treino rapido, badge ou item raro ligado ao seu desempenho.</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Status</span>
            <h2>Prestigio na MatGo</h2>
          </div>
          <div className="rank-list">
            <div className="rank-item">
              <strong><Trophy size={18} /></strong>
              <div>
                <span>Perfil em evolucao</span>
                <small>quanto mais joga, mais personaliza</small>
              </div>
            </div>
            <div className="rank-item">
              <strong><UserRound size={18} /></strong>
              <div>
                <span>Avatar equipado</span>
                <small>aparece na home, no forum e nos rankings</small>
              </div>
            </div>
          </div>
        </article>
      </section>
      ) : (
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Professor</span>
            <h2>Informacoes principais</h2>
            <p>O foco desta aba para o professor e identidade profissional, avatar, tema e apresentacao do perfil.</p>
          </div>
          <div className="teacher-list">
            <div className="teacher-row-card stacked">
              <strong>Bio atual</strong>
              <p>{bio.trim() || "Sem bio cadastrada ainda."}</p>
            </div>
            <div className="teacher-row-card stacked">
              <strong>Perfil publico</strong>
              <p>Esse perfil pode ser visto pelos alunos quando eles acessam suas atividades e topicos do forum.</p>
            </div>
          </div>
        </article>
      </section>
      )}
    </PlatformShell>
  );
}
