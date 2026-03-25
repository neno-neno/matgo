"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, LogIn, Sparkles } from "@/lib/icons";

import { BrandLoadingScreen } from "@/components/brand-loading-screen";
import { PlatformFooter } from "@/components/platform-footer";
import { useAuth } from "@/components/auth-provider";
import { createStudentSignupRequest, createTeacherPasswordResetRequest, fetchPublicClasses, loginRequest, registerRequest } from "@/lib/api";
import { PublicClassOption } from "@/lib/data";

export default function LoginPage() {
  const router = useRouter();
  const { login, ready, user } = useAuth();
  const [loginRole, setLoginRole] = useState<"student" | "teacher" | "master">("student");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [accessCode, setAccessCode] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publicClasses, setPublicClasses] = useState<PublicClassOption[]>([]);
  const [requestingTeacherReset, setRequestingTeacherReset] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/");
    }
  }, [ready, router, user]);

  useEffect(() => {
    if (mode === "register" && role === "student") {
      fetchPublicClasses().then(setPublicClasses).catch(() => setPublicClasses([]));
    }
  }, [mode, role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "login") {
        const payload = await loginRequest(identifier, password);
        login(payload.token, payload.user);
        router.replace("/");
      } else if (role === "teacher") {
        if (!fullName.trim() || !email.trim() || !password.trim() || !accessCode.trim()) {
          throw new Error("Preencha todos os campos do cadastro de professor.");
        }
        const payload = await registerRequest({
          full_name: fullName,
          email,
          password,
          role,
          access_code: accessCode,
        });
        login(payload.token, payload.user);
        router.replace("/");
      } else {
        if (!fullName.trim() || !email.trim() || !selectedClassId) {
          throw new Error("Selecione a turma e preencha os dados do aluno antes de enviar a solicitação.");
        }
        const result = await createStudentSignupRequest({
          class_id: selectedClassId,
          full_name: fullName,
          email,
          note,
        });
        setSuccess(result.message);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTeacherPasswordReset() {
    if (!identifier.trim()) {
      setError("Digite o e-mail do professor antes de solicitar a redefinição.");
      return;
    }
    setRequestingTeacherReset(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createTeacherPasswordResetRequest(identifier.trim());
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível solicitar a redefinição de senha.");
    } finally {
      setRequestingTeacherReset(false);
    }
  }

  if (submitting) {
    return (
      <main className="login-page">
        <BrandLoadingScreen
          subtitle={mode === "login" ? "Entrando no seu perfil e preparando sua experiência na MatGo." : "Enviando seus dados e preparando a próxima etapa do cadastro."}
          title="Entrando na MatGo"
        />
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-card glass">
        <div className="login-brand-row">
          <div className="brand-mark login-brand-mark">
            <Image alt="Coruja oficial da MatGo" className="brand-image" height={72} src="/oficial.png" width={72} />
          </div>
          <div>
            <p className="eyebrow">Mascote oficial</p>
            <strong className="login-brand-title">MatGo</strong>
          </div>
        </div>

        <div className="section-title">
          <span>Boas-vindas à MatGo</span>
          <h2>Entrar no universo da matemática</h2>
          <p>Prática diária, trilhas objetivas e uma experiência visual alinhada com a nova marca.</p>
        </div>

        <div className="preset-row">
          <button className={mode === "login" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setMode("login")} type="button">
            Entrar
          </button>
          <button className={mode === "register" ? "secondary-button active-toggle" : "secondary-button"} onClick={() => setMode("register")} type="button">
            Criar conta
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label>
                Nome completo
                <input className="answer-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label>
                Perfil
                <select className="answer-input" value={role} onChange={(event) => setRole(event.target.value as "student" | "teacher")}>
                  <option value="student">Aluno</option>
                  <option value="teacher">Professor</option>
                </select>
              </label>
              {role === "teacher" ? (
                <label>
                  Código de acesso do professor
                  <input className="answer-input" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} />
                </label>
              ) : (
                <>
                  <label>
                    Turma desejada
                    <select className="answer-input" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                      <option value="">Selecione a turma</option>
                      {publicClasses.map((classOption) => (
                        <option key={classOption.id} value={classOption.id}>
                          {classOption.name} | {classOption.teacher_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Recado para o professor
                    <textarea className="answer-input textarea-input" value={note} onChange={(event) => setNote(event.target.value)} />
                  </label>
                </>
              )}
            </>
          ) : null}
          {mode === "login" ? (
            <label>
              {loginRole === "student" ? "Usuário do aluno" : "E-mail"}
              <input className="answer-input" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
            </label>
          ) : (
            <label>
              E-mail
              <input className="answer-input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          )}
          {mode === "login" || role === "teacher" ? (
            <label>
              {mode === "login" && loginRole === "student" ? "PIN de 4 dígitos" : "Senha"}
              <input className="answer-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          ) : null}
          <button className="primary-button wide" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}
            {mode === "login" ? "Entrar" : role === "student" ? "Enviar solicitação" : "Criar conta"}
          </button>
          {mode === "login" && loginRole === "teacher" ? (
            <button className="secondary-button wide" disabled={requestingTeacherReset} onClick={handleTeacherPasswordReset} type="button">
              {requestingTeacherReset ? "Solicitando redefinição..." : "Esqueci minha senha"}
            </button>
          ) : null}
        </form>

        {error ? <div className="feedback-box">{error}</div> : null}
        {success ? <div className="feedback-box">{success}</div> : null}

        <div className="login-hint">
          <KeyRound size={16} />
          {mode === "login" && loginRole === "student"
            ? "O aluno entra com usuário e PIN de 4 dígitos definidos pela escola."
            : "Alunos solicitam entrada na turma e o professor libera o acesso inicial."}
        </div>
      </section>
      <PlatformFooter />
    </main>
  );
}
