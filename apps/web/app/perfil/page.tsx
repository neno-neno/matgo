"use client";

import Link from "next/link";
import { BadgeCheck, Flame, Gem, Heart, Sparkles, Trophy, UserRound } from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";

import { ActionModal } from "@/components/action-modal";
import { PlatformShell } from "@/components/platform-shell";
import { useAuth } from "@/components/auth-provider";
import { changeTeacherPasswordAuthed, equipProfileItemAuthed, fetchBootstrapData, fetchProfileInventoryAuthed, fetchStudentInsightsAuthed, fetchTeacherStudentsAuthed, updateProfileAuthed } from "@/lib/api";
import { BootstrapData, fallbackBootstrapData, fallbackProfileInventory, fallbackStudentInsights, fallbackStudentReport, ProfileInventory, StudentInsightsResponse, StudentMiniProfile } from "@/lib/data";

function rarityLabel(rarity: "comum" | "raro" | "epico") {
  if (rarity === "epico") return "Épico";
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
  const [studentInsights, setStudentInsights] = useState<StudentInsightsResponse>(fallbackStudentInsights);
  const [managedStudents, setManagedStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);
  const [profilePanel, setProfilePanel] = useState<"avatar" | "frame" | "theme" | "edit" | "password" | "accuracy" | "study" | null>(null);
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
    if (user.role === "student") {
      fetchStudentInsightsAuthed(token).then(setStudentInsights).catch(() => setStudentInsights(fallbackStudentInsights));
    }
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
  const activeInsights = isStudent ? studentInsights : null;
  const weakestTopics = useMemo(
    () => (isStudent ? activeInsights?.adaptive_plan.weak_points.slice(0, 3) ?? [] : data.dashboard.adaptive_plan.weak_points.slice(0, 3)),
    [activeInsights?.adaptive_plan.weak_points, data.dashboard.adaptive_plan.weak_points, isStudent],
  );
  const strongestRevision = useMemo(
    () => (isStudent ? activeInsights?.adaptive_plan.suggested_revision.slice(0, 3) ?? [] : data.dashboard.adaptive_plan.suggested_revision.slice(0, 3)),
    [activeInsights?.adaptive_plan.suggested_revision, data.dashboard.adaptive_plan.suggested_revision, isStudent],
  );
  const evolutionHighlights = useMemo(
    () => (isStudent ? activeInsights?.evolution.slice(-3) ?? [] : data.dashboard.evolution.slice(-3)),
    [activeInsights?.evolution, data.dashboard.evolution, isStudent],
  );
  const weeklyAccuracyAverage = useMemo(() => {
    const sourceEvolution = isStudent ? activeInsights?.evolution ?? [] : data.dashboard.evolution;
    const sourceAccuracy = isStudent ? activeInsights?.accuracy ?? data.dashboard.profile.stats.accuracy : data.dashboard.profile.stats.accuracy;
    if (sourceEvolution.length === 0) {
      return sourceAccuracy;
    }
    const total = sourceEvolution.reduce((sum, item) => sum + item.accuracy, 0);
    return Math.round(total / sourceEvolution.length);
  }, [activeInsights?.accuracy, activeInsights?.evolution, data.dashboard.evolution, data.dashboard.profile.stats.accuracy, isStudent]);
  const strongestAccuracyDay = useMemo(() => {
    const sourceEvolution = isStudent ? activeInsights?.evolution ?? [] : data.dashboard.evolution;
    if (sourceEvolution.length === 0) {
      return null;
    }
    return sourceEvolution.reduce((best, item) => (item.accuracy > best.accuracy ? item : best));
  }, [activeInsights?.evolution, data.dashboard.evolution, isStudent]);
  const averageStudyMinutesPerCheckpoint = useMemo(() => {
    const sourceEvolution = isStudent ? activeInsights?.evolution ?? [] : data.dashboard.evolution;
    const sourceMinutes = isStudent ? activeInsights?.study_minutes ?? data.dashboard.profile.stats.study_minutes : data.dashboard.profile.stats.study_minutes;
    if (sourceEvolution.length === 0) {
      return sourceMinutes;
    }
    return Math.max(1, Math.round(sourceMinutes / sourceEvolution.length));
  }, [activeInsights?.evolution, activeInsights?.study_minutes, data.dashboard.evolution, data.dashboard.profile.stats.study_minutes, isStudent]);

  async function handleSave() {
    if (!token || !user) {
      setMessage("Sessão indisponível para atualizar o perfil.");
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
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEquipAvatar(itemId: string) {
    if (!token || !user) {
      setMessage("Sessão indisponível para equipar o item.");
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
      setMessage(error instanceof Error ? error.message : "Não foi possível equipar o item.");
    }
  }

  async function handleEquipFrame(itemId: string) {
    if (!token || !user) {
      setMessage("Sessão indisponível para equipar a moldura.");
      return;
    }
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, itemId);
      setInventory(nextInventory);
      setMessage("Moldura equipada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível equipar a moldura.");
    }
  }

  async function handleEquipTheme(itemId: string) {
    if (!token || !user) {
      setMessage("Sessão indisponível para aplicar o tema.");
      return;
    }
    try {
      const nextInventory = await equipProfileItemAuthed(token, user.id, itemId);
      setInventory(nextInventory);
      setActiveTheme(itemId);
      setMessage("Tema aplicado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível aplicar o tema.");
    }
  }

  async function handleChangePassword() {
    if (!token || !user || user.role !== "teacher") {
      setMessage("Apenas professores podem alterar a própria senha.");
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim()) {
      setMessage("Preencha a senha atual e a nova senha.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("A confirmação da nova senha precisa ser igual.");
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
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
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
      description="Personalize seu visual, acompanhe sua evolução e administre os acessos visíveis no seu perfil."
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
              <span className="kaomoji-token token-b">*-*</span>
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
                {profile.grade_band ?? (isMaster ? "Governança geral" : "Trilha em configuração")}
                {isStudent ? ` | nível ${profile.level}` : ""}
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
            {isStudent ? (
              <button className="profile-stat-chip profile-stat-button" onClick={() => setProfilePanel("accuracy")} type="button">
                <strong>{activeInsights?.accuracy ?? data.dashboard.profile.stats.accuracy}%</strong>
                <span>acerto médio</span>
              </button>
            ) : (
              <div className="profile-stat-chip">
                <strong>{activeInsights?.accuracy ?? data.dashboard.profile.stats.accuracy}%</strong>
                <span>{isMaster ? "média geral acompanhada" : "acerto médio da turma"}</span>
              </div>
            )}
            {isStudent ? (
              <button className="profile-stat-chip profile-stat-button" onClick={() => setProfilePanel("study")} type="button">
                <strong>{activeInsights?.study_minutes ?? data.dashboard.profile.stats.study_minutes} min</strong>
                <span>tempo estudado</span>
              </button>
            ) : (
              <div className="profile-stat-chip">
                <strong>{activeInsights?.study_minutes ?? data.dashboard.profile.stats.study_minutes} min</strong>
                <span>{isMaster ? "tempo de supervisão" : "tempo acompanhado"}</span>
              </div>
            )}
            <div className="profile-stat-chip">
              <strong>{isStudent ? data.dashboard.badges.filter((badge) => badge.unlocked).length : isMaster ? managedStudents.length : "Professor"}</strong>
              <span>{isStudent ? "conquistas liberadas" : isMaster ? "alunos visíveis" : "perfil profissional"}</span>
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
        description="Entenda como a plataforma calcula seu acerto médio e quais temas mais influenciam esse indicador."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "accuracy"}
        subtitle="Desempenho"
        title="Acerto médio"
      >
        <div className="mission-hero-grid">
          <div className="mission-hero-card feature-panel">
            <span className="tag highlight">Seu índice atual</span>
            <strong>{activeInsights?.accuracy ?? data.dashboard.profile.stats.accuracy}% de acerto</strong>
            <p>Esse valor resume sua taxa recente de respostas corretas nas missões, trilhas e atividades.</p>
          </div>
          <div className="mission-hero-card">
            <span className="tag">Média recente</span>
            <strong>{weeklyAccuracyAverage}% nos checkpoints</strong>
            <p>
              {strongestAccuracyDay
                ? `Seu melhor registro recente foi em ${strongestAccuracyDay.label.toLowerCase()}, com ${strongestAccuracyDay.accuracy}% de acerto.`
                : "Ainda não há checkpoints suficientes para comparar sua evolução recente."}
            </p>
          </div>
        </div>
        <article className="glass panel">
          <div className="section-title">
            <span>Leitura rápida</span>
            <h2>Onde revisar agora</h2>
            <p>Esses tópicos estão influenciando mais diretamente seu acerto médio neste momento.</p>
          </div>
          <div className="attention-list">
            {weakestTopics.map((item) => (
              <div key={item.topic} className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>{item.topic}</strong>
                  <small>{item.confidence}% de confiança atual</small>
                </div>
                <p>{item.recommendation}</p>
              </div>
            ))}
          </div>
          <div className="inline-metrics">
            {strongestRevision.map((topic) => (
              <span key={topic} className="tag success">{topic}</span>
            ))}
          </div>
        </article>
        <div className="exercise-actions">
          <Link className="primary-button" href="/atividades">
            Revisar agora
          </Link>
          <Link className="secondary-button" href="/aprendizado">
            Abrir trilha
          </Link>
        </div>
      </ActionModal>

      <ActionModal
        description="Veja como seu tempo estudado está sendo usado e como isso está virando avanço real."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "study"}
        subtitle="Rotina"
        title="Tempo estudado"
      >
        <div className="mission-hero-grid">
          <div className="mission-hero-card feature-panel">
            <span className="tag highlight">Acumulado</span>
            <strong>{activeInsights?.study_minutes ?? data.dashboard.profile.stats.study_minutes} minutos registrados</strong>
            <p>Esse total considera sua prática recente nas missões, nas trilhas e nas atividades concluídas.</p>
          </div>
          <div className="mission-hero-card">
            <span className="tag">Ritmo médio</span>
            <strong>{averageStudyMinutesPerCheckpoint} min por checkpoint</strong>
            <p>{profile.streak > 0 ? `Você já mantém uma sequência de ${profile.streak} dias.` : "Sua rotina ainda está começando. Sessões curtas já geram avanço."}</p>
          </div>
        </div>
        <article className="glass panel">
          <div className="section-title">
            <span>Evolução recente</span>
            <h2>Como esse tempo está rendendo</h2>
            <p>Os checkpoints mais recentes mostram como seu ritmo de estudo está virando XP e acerto.</p>
          </div>
          <div className="teacher-list">
            {evolutionHighlights.map((item) => (
              <div key={item.label} className="teacher-row-card">
                <div className="teacher-row-copy">
                  <strong>{item.label}</strong>
                  <small>{item.xp} XP acumulados</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">{item.accuracy}% de acerto</span>
                </div>
              </div>
            ))}
          </div>
        </article>
        <div className="exercise-actions">
          <Link className="primary-button" href="/atividades">
            Estudar agora
          </Link>
          <button className="secondary-button" onClick={() => setProfilePanel("accuracy")} type="button">
            Ver acerto médio
          </button>
        </div>
      </ActionModal>

      <ActionModal
        description="Escolha um visual para deixar seu perfil com a sua identidade dentro da MatGo."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "avatar"}
        subtitle="Aparência"
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
        description="Escolha um tema visual para aplicar em toda a experiência da MatGo."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "theme"}
        subtitle="Coleção"
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
        description="Escolha uma moldura para destacar seu perfil para professores, colegas da turma e usuário master."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "frame"}
        subtitle="Coleção"
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
        description="Atualize seus dados públicos de exibição."
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
              Ver como público
            </Link>
          ) : null}
        </div>
        {message ? <div className="feedback-box">{message}</div> : null}
      </ActionModal>

      <ActionModal
        description="Use a senha temporária recebida do usuário master ou sua senha atual para definir uma nova senha definitiva."
        onClose={() => setProfilePanel(null)}
        open={profilePanel === "password"}
        subtitle="Segurança"
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
              <span>Evolução</span>
              <h2>Marcos pessoais</h2>
            </div>
            <div className="mission-list">
              <div className="mission-card"><div><strong>Maior sequência</strong></div><p>{profile.streak} dias</p></div>
              <div className="mission-card"><div><strong>Nível atual</strong></div><p>{profile.level}</p></div>
              <div className="mission-card"><div><strong>Medalhas ativas</strong></div><p>{data.dashboard.badges.filter((badge) => badge.unlocked).length}</p></div>
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Temas</span>
              <h2>Onde você está forte</h2>
            </div>
            <div className="teacher-list">
              {(activeInsights?.adaptive_plan.suggested_revision ?? data.dashboard.adaptive_plan.suggested_revision).slice(0, 3).map((topic) => (
                <div key={topic} className="teacher-row-card stacked">
                  <strong>{topic}</strong>
                  <p>Revisão sugerida pela plataforma.</p>
                </div>
              ))}
            </div>
          </article>

          <article className="glass panel">
            <div className="section-title">
              <span>Status</span>
              <h2>Prestígio na MatGo</h2>
            </div>
            <div className="rank-list">
              <div className="rank-item"><strong><Trophy size={18} /></strong><div><span>Perfil em evolução</span></div></div>
              <div className="rank-item"><strong><UserRound size={18} /></strong><div><span>Avatar equipado</span></div></div>
            </div>
          </article>
        </section>
      ) : (
        <section className="section-stack">
          <article className="glass panel">
            <div className="section-title">
              <span>{isMaster ? "Master" : "Professor"}</span>
              <h2>Informações principais</h2>
              <p>{isMaster ? "Área de governança com visão central dos acessos dos alunos e do perfil de administração." : "Identidade profissional, avatar, tema e apresentação do perfil."}</p>
            </div>
            <div className="teacher-list">
              <div className="teacher-row-card stacked">
                <strong>Bio atual</strong>
                <p>{bio.trim() || "Sem bio cadastrada ainda."}</p>
              </div>
              <div className="teacher-row-card stacked">
                <strong>Perfil público</strong>
                <p>Esse perfil pode ser visto pelos alunos quando eles acessam suas atividades e tópicos do fórum.</p>
              </div>
            </div>
          </article>

          {isMaster ? (
            <article className="glass panel">
              <div className="section-title">
                <span>Credenciais</span>
                <h2>Acessos dos alunos</h2>
                <p>Usuário e PIN ficam centralizados para o TI da escola ou para a equipe responsável pelo ambiente.</p>
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
                      <span className="tag">usuário: {student.username ?? "-"}</span>
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
