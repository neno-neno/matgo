"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, PlusCircle, School, ShieldCheck, UserPlus, UserRoundCog } from "@/lib/icons";

import { ActionModal } from "@/components/action-modal";
import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import {
  approveTeacherPasswordResetRequestAuthed,
  approveTeacherSignupRequestAuthed,
  assignClassTeacherAuthed,
  createTeacherClassAuthed,
  createTeacherStudentAuthed,
  fetchTeacherAccessCodeAuthed,
  fetchTeacherClassesAuthed,
  fetchTeacherPasswordResetRequestsAuthed,
  fetchTeacherSignupRequestsAuthed,
  fetchTeachersAuthed,
  updateTeacherAccessCodeAuthed,
} from "@/lib/api";
import { fallbackTeacherClasses, fallbackTeachers, SignupRequestSummary, TeacherClassSummary, TeacherDirectoryItem, TeacherPasswordResetRequestSummary } from "@/lib/data";

const gradeBandOptions = ["6o ano", "7o ano", "8o ano", "9o ano", "1o EM", "2o EM", "3o EM"];

export default function AdminPage() {
  const { token, user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>(fallbackTeachers);
  const [resetRequests, setResetRequests] = useState<TeacherPasswordResetRequestSummary[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequestSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [processingResetId, setProcessingResetId] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>(fallbackTeacherClasses);
  const [teacherAccessCode, setTeacherAccessCode] = useState<string>("");
  const [savingAccessCode, setSavingAccessCode] = useState(false);
  const [assigningClass, setAssigningClass] = useState<TeacherClassSummary | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [className, setClassName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [classGradeBand, setClassGradeBand] = useState(gradeBandOptions[0]);
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPin, setStudentPin] = useState("1234");
  const [studentGradeBand, setStudentGradeBand] = useState(gradeBandOptions[0]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [approvalPins, setApprovalPins] = useState<Record<string, string>>({});
  const [approvalUsernames, setApprovalUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || user?.role !== "master") {
      return;
    }
    const load = () => {
      fetchTeachersAuthed(token).then(setTeachers).catch(() => setTeachers(fallbackTeachers));
      fetchTeacherPasswordResetRequestsAuthed(token).then(setResetRequests).catch(() => setResetRequests([]));
      fetchTeacherClassesAuthed(token).then((items) => {
        setTeacherClasses(items);
        if (!selectedClassId && items.length > 0) {
          setSelectedClassId(items[0].id);
        }
      }).catch(() => setTeacherClasses(fallbackTeacherClasses));
      fetchTeacherAccessCodeAuthed(token).then((payload) => setTeacherAccessCode(payload.access_code)).catch(() => setTeacherAccessCode(""));
      fetchTeacherSignupRequestsAuthed(token).then(setSignupRequests).catch(() => setSignupRequests([]));
    };
    load();
    const intervalId = window.setInterval(load, 15000);
    return () => window.clearInterval(intervalId);
  }, [selectedClassId, token, user?.role]);

  const pendingOrActiveResets = resetRequests.filter((item) => item.status !== "completed");
  const pendingSignupRequests = useMemo(() => signupRequests.filter((item) => item.status === "pending"), [signupRequests]);

  async function handleApproveReset(requestId: string) {
    if (!token) {
      return;
    }
    setProcessingResetId(requestId);
    setFeedback(null);
    try {
      const result = await approveTeacherPasswordResetRequestAuthed(token, requestId);
      setFeedback(`${result.message} Mensagem pronta para envio manual gerada abaixo.`);
      const nextRequests = await fetchTeacherPasswordResetRequestsAuthed(token);
      setResetRequests(nextRequests);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel aprovar o reset.");
    } finally {
      setProcessingResetId(null);
    }
  }

  async function handleSaveAccessCode() {
    if (!token) {
      return;
    }
    setSavingAccessCode(true);
    try {
      const result = await updateTeacherAccessCodeAuthed(token, teacherAccessCode);
      setTeacherAccessCode(result.access_code);
      setFeedback("Codigo de cadastro de professores atualizado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel atualizar o codigo.");
    } finally {
      setSavingAccessCode(false);
    }
  }

  async function handleAssignClassTeacher() {
    if (!token || !assigningClass || !selectedTeacherId) {
      setFeedback("Escolha um professor para vincular a turma.");
      return;
    }
    try {
      const updatedClass = await assignClassTeacherAuthed(token, assigningClass.id, selectedTeacherId);
      setTeacherClasses((current) => current.map((item) => (item.id === assigningClass.id ? updatedClass : item)));
      setFeedback(`Turma ${updatedClass.name} vinculada ao professor selecionado.`);
      setAssigningClass(null);
      setSelectedTeacherId("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel vincular a turma.");
    }
  }

  async function handleCreateClass() {
    if (!token) {
      return;
    }
    if (!targetTeacherId) {
      setFeedback("Selecione o professor responsavel antes de salvar a turma.");
      return;
    }
    try {
      const created = await createTeacherClassAuthed(token, {
        name: className,
        school_name: schoolName,
        grade_band: classGradeBand,
        teacher_id: targetTeacherId,
      });
      setTeacherClasses((current) => [...current, created]);
      setClassName("");
      setSchoolName("");
      setTargetTeacherId("");
      setClassGradeBand(gradeBandOptions[0]);
      setShowClassModal(false);
      setFeedback(`Turma ${created.name} criada com sucesso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel criar a turma.");
    }
  }

  async function handleCreateStudent() {
    if (!token) {
      return;
    }
    try {
      await createTeacherStudentAuthed(token, {
        full_name: studentName,
        email: studentEmail,
        username: studentUsername,
        pin: studentPin,
        grade_band: studentGradeBand,
        class_id: selectedClassId || null,
      });
      setStudentName("");
      setStudentEmail("");
      setStudentUsername("");
      setStudentPin("1234");
      setStudentGradeBand(gradeBandOptions[0]);
      setShowStudentModal(false);
      setFeedback("Aluno cadastrado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel cadastrar o aluno.");
    }
  }

  async function handleApproveSignup(requestId: string) {
    if (!token) {
      return;
    }
    try {
      await approveTeacherSignupRequestAuthed(token, requestId, {
        username: approvalUsernames[requestId] || "",
        pin: approvalPins[requestId] || "1234",
        class_id: selectedClassId || undefined,
      });
      setSignupRequests((current) => current.filter((item) => item.id !== requestId));
      setFeedback("Cadastro de aluno aprovado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Nao foi possivel aprovar o cadastro.");
    }
  }

  return (
    <PlatformShell
      heading="Area master"
      description="Governanca central para professores, turmas, alunos e codigos de acesso."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Acesso</span>
            <h2>Codigo para cadastro de professores</h2>
            <p>O master pode alterar esse codigo sempre que precisar renovar o acesso de novos professores.</p>
          </div>
          {feedback ? <div className="feedback-box">{feedback}</div> : null}
          <div className="teacher-batch-grid">
            <label>
              Codigo de acesso
              <input className="answer-input" onChange={(event) => setTeacherAccessCode(event.target.value)} value={teacherAccessCode} />
            </label>
            <div className="inline-metrics">
              <button className="primary-button" disabled={savingAccessCode} onClick={handleSaveAccessCode} type="button">
                {savingAccessCode ? "Salvando..." : "Salvar codigo"}
              </button>
            </div>
          </div>
          <div className="inline-metrics section-actions">
            <button className="tag link-tag" onClick={() => setShowClassModal(true)} type="button">
              <School size={14} />
              Criar turma
            </button>
            <button className="tag link-tag" onClick={() => setShowStudentModal(true)} type="button">
              <UserPlus size={14} />
              Cadastrar aluno
            </button>
            <button className="tag link-tag" onClick={() => setShowApprovalModal(true)} type="button">
              <ShieldCheck size={14} />
              Aprovar cadastros de alunos
            </button>
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Credenciais</span>
            <h2>Resets de senha de professores</h2>
            <p>O professor solicita no login, o master aprova aqui e envia a mensagem manualmente por email.</p>
          </div>
          <div className="teacher-list">
            {pendingOrActiveResets.length === 0 ? (
              <div className="teacher-row-card stacked">
                <strong>Nenhuma solicitacao aberta no momento.</strong>
                <p>Quando um professor usar "Esqueci minha senha", a solicitacao vai aparecer aqui.</p>
              </div>
            ) : (
              pendingOrActiveResets.map((request) => (
                <div key={request.id} className="teacher-row-card stacked">
                  <div>
                    <strong>{request.teacher_name}</strong>
                    <p>{request.teacher_email}</p>
                  </div>
                  <div className="inline-metrics">
                    <span className={`tag ${request.status === "approved" ? "highlight" : ""}`}>
                      {request.status === "pending" ? "aguardando aprovacao" : "senha temporaria ativa"}
                    </span>
                    <Link className="tag link-tag" href={`/perfil/${request.teacher_id}`}>Ver perfil</Link>
                    {request.status === "pending" ? (
                      <button className="tag link-tag" disabled={processingResetId === request.id} onClick={() => handleApproveReset(request.id)} type="button">
                        {processingResetId === request.id ? "Aprovando..." : "Aprovar reset"}
                      </button>
                    ) : null}
                  </div>
                  {request.status === "approved" ? (
                    <div className="teacher-row-card stacked">
                      <strong>Senha temporaria atual</strong>
                      <p>{request.temporary_password ?? "-"}</p>
                      <strong>Mensagem pronta para email</strong>
                      <textarea className="answer-input textarea-input" readOnly value={request.email_message ?? ""} />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Governanca</span>
            <h2>Professores cadastrados</h2>
            <p>Veja quais turmas cada professor acompanha e abra o perfil profissional diretamente daqui.</p>
          </div>
          <div className="teacher-list">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>{teacher.full_name}</strong>
                  <small>{teacher.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><UserRoundCog size={14} /> {teacher.grade_band ?? "multiserie"}</span>
                  <span className="tag"><ShieldCheck size={14} /> {teacher.students_count} alunos</span>
                  <span className="tag">{teacher.classes_count} turmas</span>
                  <Link className="tag link-tag" href={`/perfil/${teacher.id}`}>Ver perfil</Link>
                </div>
                <div className="tag-row">
                  {teacher.classes.length > 0 ? teacher.classes.map((className) => (
                    <span key={`${teacher.id}-${className}`} className="tag">{className}</span>
                  )) : <span className="tag">Sem turmas vinculadas</span>}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Turmas</span>
            <h2>Selecionar turmas por professor</h2>
            <p>O master pode reorganizar turmas e escolher o professor responsavel usando uma janela dedicada.</p>
          </div>
          <div className="teacher-list">
            {teacherClasses.map((classroom) => (
              <div key={classroom.id} className="teacher-row-card">
                <div className="teacher-row-copy">
                  <strong>{classroom.name}</strong>
                  <small>{classroom.school_name ?? "Escola nao informada"} | {classroom.grade_band} | {classroom.students_count} alunos</small>
                </div>
                <button className="tag link-tag" onClick={() => setAssigningClass(classroom)} type="button">
                  Selecionar professor
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ActionModal
        description="Crie uma nova turma ja definindo escola, serie e professor responsavel."
        onClose={() => setShowClassModal(false)}
        open={showClassModal}
        subtitle="Turmas"
        title="Criar turma"
      >
        <div className="profile-form">
          <label>
            Escola
            <input className="answer-input" onChange={(event) => setSchoolName(event.target.value)} value={schoolName} />
          </label>
          <label>
            Nome da turma
            <input className="answer-input" onChange={(event) => setClassName(event.target.value)} value={className} />
          </label>
          <label>
            Serie
            <select className="answer-input" onChange={(event) => setClassGradeBand(event.target.value)} value={classGradeBand}>
              {gradeBandOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label>
            Professor responsavel
            <select className="answer-input" onChange={(event) => setTargetTeacherId(event.target.value)} value={targetTeacherId}>
              <option value="">Escolha o professor</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="exercise-actions">
          <button className="primary-button" onClick={handleCreateClass} type="button">
            <PlusCircle size={16} />
            Salvar turma
          </button>
        </div>
      </ActionModal>

      <ActionModal
        description="Cadastre um novo aluno diretamente em uma turma e defina seu usuario e PIN inicial."
        onClose={() => setShowStudentModal(false)}
        open={showStudentModal}
        subtitle="Alunos"
        title="Cadastrar aluno"
      >
        <div className="profile-form">
          <label>
            Nome completo
            <input className="answer-input" onChange={(event) => setStudentName(event.target.value)} value={studentName} />
          </label>
          <label>
            Email
            <input className="answer-input" onChange={(event) => setStudentEmail(event.target.value)} value={studentEmail} />
          </label>
          <label>
            Usuario
            <input className="answer-input" onChange={(event) => setStudentUsername(event.target.value)} value={studentUsername} />
          </label>
          <label>
            PIN inicial
            <input className="answer-input" maxLength={4} onChange={(event) => setStudentPin(event.target.value)} value={studentPin} />
          </label>
          <label>
            Serie
            <select className="answer-input" onChange={(event) => setStudentGradeBand(event.target.value)} value={studentGradeBand}>
              {gradeBandOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label>
            Turma
            <select className="answer-input" onChange={(event) => setSelectedClassId(event.target.value)} value={selectedClassId}>
              {teacherClasses.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="exercise-actions">
          <button className="primary-button" onClick={handleCreateStudent} type="button">
            <UserPlus size={16} />
            Salvar aluno
          </button>
        </div>
      </ActionModal>

      <ActionModal
        description="Revise as solicitacoes de novos alunos e aprove o cadastro para a turma correta."
        onClose={() => setShowApprovalModal(false)}
        open={showApprovalModal}
        subtitle="Cadastros"
        title="Aprovar alunos"
      >
        <div className="teacher-list">
          {pendingSignupRequests.length === 0 ? (
            <div className="teacher-row-card stacked">
              <strong>Nenhum cadastro pendente no momento.</strong>
              <p>As novas solicitacoes de alunos vao aparecer aqui para aprovacao.</p>
            </div>
          ) : pendingSignupRequests.map((request) => (
            <div key={request.id} className="teacher-row-card stacked">
              <div className="teacher-row-copy">
                <strong>{request.full_name}</strong>
                <small>{request.email} | {request.grade_band}</small>
              </div>
              <div className="teacher-batch-grid">
                <label>
                  Usuario
                  <input
                    className="answer-input"
                    onChange={(event) => setApprovalUsernames((current) => ({ ...current, [request.id]: event.target.value }))}
                    value={approvalUsernames[request.id] ?? ""}
                  />
                </label>
                <label>
                  PIN
                  <input
                    className="answer-input"
                    maxLength={4}
                    onChange={(event) => setApprovalPins((current) => ({ ...current, [request.id]: event.target.value }))}
                    value={approvalPins[request.id] ?? "1234"}
                  />
                </label>
              </div>
              <div className="inline-metrics">
                <button className="primary-button" onClick={() => handleApproveSignup(request.id)} type="button">
                  Aprovar cadastro
                </button>
              </div>
            </div>
          ))}
        </div>
      </ActionModal>

      <ActionModal
        description="Escolha um professor disponivel para assumir a turma selecionada."
        onClose={() => {
          setAssigningClass(null);
          setSelectedTeacherId("");
        }}
        open={!!assigningClass}
        subtitle="Turmas"
        title={assigningClass ? `Selecionar professor para ${assigningClass.name}` : "Selecionar professor"}
      >
        {assigningClass ? (
          <>
            <div className="profile-form">
              <label>
                Professor responsavel
                <select className="answer-input" onChange={(event) => setSelectedTeacherId(event.target.value)} value={selectedTeacherId}>
                  <option value="">Escolha o professor</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="exercise-actions">
              <button className="primary-button" onClick={handleAssignClassTeacher} type="button">
                Salvar professor da turma
              </button>
            </div>
          </>
        ) : null}
      </ActionModal>
    </PlatformShell>
  );
}
