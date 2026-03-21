"use client";

import { BadgeCheck, Flame, Gem, Heart, Sparkles, Trophy, UserRound } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

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
  const { ready, token, user, updateUser } = useAuth();
  const [data, setData] = useState<BootstrapData>(fallbackBootstrapData);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inventory, setInventory] = useState<ProfileInventory>(fallbackProfileInventory);

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

  if (!ready) {
    return null;
  }

  return (
    <PlatformShell
      heading="Seu perfil"
      description="Personalize seu visual, acompanhe sua evolucao e equipe os itens que voce desbloqueou na MatGo."
    >
      <section className="profile-grid">
        <article className="glass panel profile-hero-card">
          <div className="profile-hero-top">
            <img alt="Avatar atual" className="profile-avatar-xl" src={equippedAvatar} />
            <div className="profile-hero-copy">
              <p className="eyebrow">Identidade MatGo</p>
              <h2>{profile.full_name}</h2>
              <p>{profile.grade_band ?? "Trilha em configuracao"} | nivel {profile.level} | {profile.role}</p>
              <div className="tag-row">
                <span className="tag success"><Flame size={14} /> {profile.streak} dias</span>
                <span className="tag"><Gem size={14} /> {profile.coins} moedas</span>
                <span className="tag"><Heart size={14} /> {profile.lives} vidas</span>
              </div>
            </div>
          </div>

          <div className="profile-progress-strip">
            <div className="profile-stat-chip">
              <strong>{profile.xp}</strong>
              <span>XP total</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.accuracy}%</strong>
              <span>acerto medio</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.study_minutes} min</strong>
              <span>tempo estudado</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.badges.filter((badge) => badge.unlocked).length}</strong>
              <span>badges liberadas</span>
            </div>
          </div>
        </article>

        <article className="glass panel profile-edit-card">
          <div className="section-title">
            <span>Dados</span>
            <h2>Editar perfil</h2>
            <p>Deixe seu nome, bio e avatar prontos para aparecer bem em toda a plataforma.</p>
          </div>

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
          </div>

          {message ? <div className="feedback-box">{message}</div> : null}
        </article>
      </section>

      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Cosmeticos</span>
            <h2>Avatar e itens raros</h2>
            <p>Seu perfil precisa refletir seu progresso. Quanto mais voce evolui, mais visuais e raridades libera.</p>
          </div>

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
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Colecao</span>
            <h2>Recompensas do perfil</h2>
            <p>Esses itens ajudam a construir a identidade do aluno dentro da plataforma.</p>
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
        </article>
      </section>

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
              <p>{profile.level}</p>
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
    </PlatformShell>
  );
}
