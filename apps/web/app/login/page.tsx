"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, LogIn, Sparkles } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { createStudentSignupRequest, fetchPublicClasses, loginRequest, registerRequest } from "@/lib/api";
import { PublicClassOption } from "@/lib/data";

const presets = [
  { label: "Aluno", email: "ana@matematica.local", password: "Aluno@123" },
  { label: "Professor", email: "carla@matematica.local", password: "Professor@123" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, ready, user } = useAuth();
  const [email, setEmail] = useState("carla@matematica.local");
  const [password, setPassword] = useState("Professor@123");
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
        const payload = await loginRequest(email, password);
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
          throw new Error("Selecione a turma e preencha os dados do aluno antes de enviar a solicitacao.");
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
      setError(submitError instanceof Error ? submitError.message : "Falha ao entrar.");
    } finally {
      setSubmitting(false);
    }
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
          <span>Bem-vindo a MatGo</span>
          <h2>Entrar no universo da matematica</h2>
          <p>Pratica diaria, trilhas objetivas e uma experiencia visual alinhada com a nova marca.</p>
        </div>

        <div className="preset-row">
          {presets.map((preset) => (
            <button
              key={preset.label}
              className="secondary-button"
              onClick={() => {
                setMode("login");
                setEmail(preset.email);
                setPassword(preset.password);
              }}
              type="button"
            >
              <Sparkles size={14} />
              {preset.label}
            </button>
          ))}
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
                  Codigo de acesso do professor
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
          <label>
            Email
            <input className="answer-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {mode === "login" || role === "teacher" ? (
            <label>
              Senha
              <input className="answer-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          ) : null}
          <button className="primary-button wide" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}
            {mode === "login" ? "Entrar" : role === "student" ? "Enviar solicitacao" : "Criar conta"}
          </button>
        </form>

        {error ? <div className="feedback-box">{error}</div> : null}
        {success ? <div className="feedback-box">{success}</div> : null}

        <div className="login-hint">
          <KeyRound size={16} />
          Alunos solicitam entrada na turma e o professor libera o acesso inicial.
        </div>
      </section>
    </main>
  );
}
