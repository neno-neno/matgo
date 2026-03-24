"use client";

import Link from "next/link";
import { BadgeCheck, Flame, Gem, Heart, Sparkles, Trophy, UserRound } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

import { ActionModal } from "@/components/action-modal";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { changeTeacherPasswordAuthed, equipProfileItemAuthed, fetchBootstrapData, fetchProfileInventoryAuthed, fetchTeacherStudentsAuthed, updateProfileAuthed } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData, fallbackProfileInventory, fallbackStudentReport, ProfileInventory, StudentMiniProfile } from "@/lib/data";

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
  const [managedStudents, setManagedStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);
  const [profilePanel, setProfilePanel] = useState<"avatar" | "frame" | "theme" | "edit" | "password" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchBootstrapData().then(setData).catch(() => setData(fallbackBootstrapData));
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFullName(user.full_name);
    setBio(user.bio ?? "");
    if (!token) {
      return;
    }
    fetchProfileInventoryAuthed(token, user.id).then(setInventory).catch(() => setInventory(fallbackProfileInventory));
    if (user.role === "master") {
      fetchTeacherStudentsAuthed(token).then(setManagedStudents).catch(() => setManagedStudents([fallbackStudentReport.student]));
    }
  }, [token, user]);

  const avatarOptions = useMemo(() => inventory.items.filter((item) => item.category === "avatar"), [inventory.items]);
  const frameOptions = useMemo(() => inventory.items.filter((item) => item.category === "frame"), [inventory.items]);
  const themeOptions = useMemo(() => inventory.items.filter((item) => item.category === "theme"), [inventory.items]);
  const equippedAvatar = avatarOptions.find((item) => item.equipped)?.asset_url ?? user?.avatar_url ?? "/oficial.png";
  const equippedFrameId = inventory.equipped_frame_id ?? frameOptions.find((item) => item.equipped)?.id ?? null;
  const profile = user ?? data.dashboard.profile;
  const isStudent = user?.role === "student";
  const isMaster = user?.role === "master";
  const showMathFrameDecor = equippedFrameId === "frame-matematica";
  const showAuraPopDecor = equippedFrameId === "frame-aura-pop";
  const showEleganceDecor = equippedFrameId === "frame-elegancia-neon";

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

  async function handleEquipFrame(itemId: string) {
    if (!token || !user) {
      setMessage("Sessao indisponivel para equipar a moldura.");
      return;
    }
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, itemId);
      setInventory(nextInventory);
      setMessage("Moldura equipada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel equipar a moldura.");
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

  async function handleChangePassword() {
    if (!token || !user || user.role !== "teacher") {
      setMessage("Apenas professores podem alterar a propria senha.");
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim()) {
      setMessage("Preencha a senha atual e a nova senha.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("A confirmacao da nova senha precisa ser igual.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await changeTeacherPasswordAuthed(token, user.id, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setProfilePanel(null);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return null;
  }

  return (
    <PlatformShell
      heading="Seu perfil"
      description="Personalize seu visual, acompanhe sua evolucao e administre os acessos visiveis no seu perfil."
    >
      <section className="section-stack">
        <article className={`glass panel profile-hero-card profile-card-frame ${equippedFrameId ?? "frame-padrao"}`}>
          {showMathFrameDecor ? (
            <div aria-hidden="true" className="math-frame-decor">
              <span className="math-frame-token token-a">π</span>
              <span className="math-frame-token token-b">x²</span>
              <span className="math-frame-token token-c">2+2</span>
              <span className="math-frame-token token-d">√16</span>
              <span className="math-frame-token token-e">3/4</span>
              <span className="math-frame-token token-f">%</span>
              <span className="math-frame-token token-g">+</span>
              <span className="math-frame-token token-h">÷</span>
              <span className="math-frame-token token-i">=</span>
              <span className="math-frame-token token-j">7</span>
              <span className="math-frame-token token-k">0</span>
              <span className="math-frame-token token-l">×</span>
            </div>
          ) : null}
          {showAuraPopDecor ? (
            <div aria-hidden="true" className="kaomoji-frame-decor kaomoji-frame-pop">
              <span className="kaomoji-token token-a">•‿•</span>
              <span className="kaomoji-token token-b">* - *</span>
              <span className="kaomoji-token token-c">^_^</span>
              <span className="kaomoji-token token-d">&lt;3</span>
              <span className="kaomoji-token token-e">☆</span>
              <span className="kaomoji-token token-f">•‿•</span>
            </div>
          ) : null}
          {showEleganceDecor ? (
            <div aria-hidden="true" className="kaomoji-frame-decor kaomoji-frame-elegance">
              <span className="kaomoji-token token-a">^_^</span>
              <span className="kaomoji-token token-b">•‿•</span>
              <span className="kaomoji-token token-c">&lt;3</span>
              <span className="kaomoji-token token-d">✦</span>
              <span className="kaomoji-token token-e">☆</span>
              <span className="kaomoji-token token-f">*-*</span>
            </div>
          ) : null}
          <div className="profile-hero-top">
            <div className="profile-avatar-frame">
              <img alt="Avatar atual" className="profile-avatar-xl" src={equippedAvatar} />
            </div>
            <div className="profile-hero-copy">
              <p className="eyebrow">Identidade MatGo</p>
              <h2>{profile.full_name}</h2>
              <p>
                {profile.grade_band ?? (isMaster ? "Governanca geral" : "Trilha em configuracao")}
                {isStudent ? ` | nivel ${profile.level}` : ""}
                {" | "}
                {profile.role}
              </p>
              {isStudent ? (
                <div className="tag-row">
                  <span className="tag success"><Flame size={14} /> {profile.streak} dias</span>
                  <span className="tag"><Gem size={14} /> {profile.coins} moedas</span>
                  <span className="tag"><Heart size={14} /> {profile.lives} vidas</span>
                </div>
              ) : (
                <div className="tag-row">
                  <span className="tag success">{isMaster ? "Perfil master" : "Perfil profissional"}</span>
                  <span className="tag">{profile.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="profile-progress-strip">
            <div className="profile-stat-chip">
              <strong>{isStudent ? profile.xp : isMaster ? "todas" : "Professor"}</strong>
              <span>{isStudent ? "XP total" : isMaster ? "escopo de acesso" : "identidade profissional"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.accuracy}%</strong>
              <span>{isStudent ? "acerto medio" : isMaster ? "media geral acompanhada" : "acerto medio da turma"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{data.dashboard.profile.stats.study_minutes} min</strong>
              <span>{isStudent ? "tempo estudado" : isMaster ? "tempo de supervisao" : "tempo acompanhado"}</span>
            </div>
            <div className="profile-stat-chip">
              <strong>{isStudent ? data.dashboard.badges.filter((badge) => badge.unlocked).length : isMaster ? managedStudents.length : "Professor"}</strong>
              <span>{isStudent ? "conquistas liberadas" : isMaster ? "alunos visiveis" : "perfil profissional"}</span>
            </div>
          </div>

          <div className="inline-metrics profile-action-row">
            <button className={`tag link-tag ${profilePanel === "avatar" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("avatar")} type="button">
              Trocar avatar
            </button>
            <button className={`tag link-tag ${profilePanel === "frame" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("frame")} type="button">
              Trocar moldura
            </button>
            <button className={`tag link-tag ${profilePanel === "theme" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("theme")} type="button">
              Trocar tema
            </button>
            <button className={`tag link-tag ${profilePanel === "edit" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("edit")} type="button">
              Editar nome e bio
            </button>
            {user?.role === "teacher" ? (
              <button className={`tag link-tag ${profilePanel === "password" ? "active-toggle" : ""}`} onClick={() => setProfilePanel("password")} type="button">
                Alterar senha
              </button>
            ) : null}
          </div>
        </article>
      </section>

      <ActionModal
        description="Escolha um visual para deixar seu perfil mais a sua cara dentro da MatGo."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "avatar"}
        subtitle="Aparencia"
        title="Avatar"
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
        description="Escolha um tema visual para aplicar em toda a experiencia da MatGo."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "theme"}
        subtitle="Colecao"
        title="Temas do perfil"
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
      </ActionModal>

      <ActionModal
        description="Escolha uma moldura para destacar seu perfil para professores, colegas da turma e usuario master."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "frame"}
        subtitle="Colecao"
        title="Molduras do perfil"
      >
        <div className="avatar-grid">
          {frameOptions.map((frame) => {
            const active = equippedFrameId === frame.id || frame.equipped;
            return (
              <button
                key={frame.id}
                className={`avatar-option ${active ? "active" : ""} ${frame.unlocked ? "" : "locked"}`}
                disabled={!frame.unlocked}
                onClick={() => handleEquipFrame(frame.id)}
                type="button"
              >
                <div className={`profile-frame-preview profile-card-frame ${frame.id}`}>
                  <div className="profile-frame-preview-content">
                    <strong>{profile.full_name}</strong>
                    <small>{frame.name}</small>
                  </div>
                </div>
                <div>
                  <strong>{frame.name}</strong>
                  <p>{frame.description}</p>
                </div>
                <span className={`tag ${frame.rarity === "epico" ? "highlight" : frame.rarity === "raro" ? "warning" : ""}`}>
                  {active ? "Em uso" : rarityLabel(frame.rarity)}
                </span>
              </button>
            );
          })}
        </div>
      </ActionModal>

      <ActionModal
        description="Atualize seus dados publicos de exibicao."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "edit"}
        subtitle="Perfil"
        title="Editar nome e bio"
      >
        <div className="profile-form">
          <label>
            Nome exibido
            <input className="answer-input" disabled={isStudent} onChange={(event) => setFullName(event.target.value)} value={fullName} />
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
              placeholder="Conte um pouco sobre este perfil na plataforma."
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

      <ActionModal
        description="Use a senha temporaria recebida do usuario master ou sua senha atual para definir uma nova senha definitiva."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "password"}
        subtitle="Seguranca"
        title="Alterar senha"
      >
        <div className="profile-form">
          <label>
            Senha atual
            <input className="answer-input" onChange={(event) => setCurrentPassword(event.target.value)} type="password" value={currentPassword} />
          </label>
          <label>
            Nova senha
            <input className="answer-input" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
          </label>
          <label>
            Confirmar nova senha
            <input className="answer-input" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
          </label>
        </div>
        <div className="exercise-actions">
          <button className="primary-button" disabled={saving} onClick={handleChangePassword} type="button">
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </div>
      </ActionModal>

      {isStudent ? (
        <section className="content-grid three-up">
          <article className="glass panel">
            <div className="section-title">
              <span>Evolucao</span>
              <h2>Marcos pessoais</h2>
            </div>
            <div className="mission-list">
              <div className="mission-card"><div><strong>Maior sequencia</strong></div><p>{profile.streak} dias</p></div>
              <div className="mission-card"><div><strong>Nivel atual</strong></div><p>{profile.level}</p></div>
              <div className="mission-card"><div><strong>Medalhas ativas</strong></div><p>{data.dashboard.badges.filter((badge) => badge.unlocked).length}</p></div>
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Temas</span>
              <h2>Onde voce esta forte</h2>
            </div>
            <div className="teacher-list">
              {data.dashboard.adaptive_plan.suggested_revision.slice(0, 3).map((topic) => (
                <div key={topic} className="teacher-row-card stacked">
                  <strong>{topic}</strong>
                  <p>Revisao sugerida pela plataforma.</p>
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
              <div className="rank-item"><strong><Trophy size={18} /></strong><div><span>Perfil em evolucao</span></div></div>
              <div className="rank-item"><strong><UserRound size={18} /></strong><div><span>Avatar equipado</span></div></div>
            </div>
          </article>
        </section>
      ) : (
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>{isMaster ? "Master" : "Professor"}</span>
              <h2>Informacoes principais</h2>
              <p>{isMaster ? "Area de governanca com visao central dos acessos dos alunos e do perfil de administracao." : "Identidade profissional, avatar, tema e apresentacao do perfil."}</p>
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

          {isMaster ? (
            <article className="glass panel">
              <div className="section-title">
                <span>Credenciais</span>
                <h2>Acessos dos alunos</h2>
                <p>Usuario e PIN ficam centralizados para o TI da escola ou para a equipe responsavel pelo ambiente.</p>
              </div>
              <div className="teacher-list">
                {managedStudents.map((student) => (
                  <div key={student.id} className="teacher-row-card">
                    <div>
                      <strong>{student.full_name}</strong>
                      <small>{student.email}</small>
                    </div>
                    <div className="inline-metrics">
                      <span className="tag">{student.grade_band}</span>
                      <span className="tag">usuario: {student.username ?? "-"}</span>
                      <span className="tag highlight">PIN: {student.student_pin ?? "-"}</span>
                      <Link className="tag link-tag" href={`/perfil/${student.id}`}>Ver perfil</Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </section>
      )}
    </PlatformShell>
  );
}
