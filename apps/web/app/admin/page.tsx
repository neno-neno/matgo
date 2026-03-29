"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, PlusCircle, School, ShieldCheck, UserPlus, UserRoundCog } from "@/lib/icons";

import { ActionModal } from "@/components/action-modal";
import { useAuth } from "@/components/auth-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { PlatformShell } from "@/components/platform-shell";
import {
  approveTeacherPasswordResetRequestAuthed,
  approveTeacherSignupRequestAuthed,
  rejectTeacherSignupRequestAuthed,
  assignClassTeacherAuthed,
  createSchoolAuthed,
  createTeacherClassAuthed,
  createTeacherStudentAuthed,
  deleteSchoolAuthed,
  deleteStudentAuthed,
  deleteTeacherAuthed,
  fetchSchoolsAuthed,
  fetchTeacherAccessCodeAuthed,
  fetchTeacherClassesAuthed,
  fetchTeacherPasswordResetRequestsAuthed,
  fetchTeacherSignupRequestsAuthed,
  fetchTeachersAuthed,
  fetchTeacherAccessStudentsAuthed,
  resetTeacherStudentPasswordAuthed,
  updateUserEmailAuthed,
  updateStudentCoinsAuthed,
  updateClassAuthed,
  deleteClassAuthed,
  updateSchoolAuthed,
  updateTeacherAccessCodeAuthed,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { SchoolSummary, SignupRequestSummary, TeacherClassSummary, TeacherDirectoryItem, TeacherPasswordResetRequestSummary, TeacherAccessStudent } from "@/lib/data";

const gradeBandOptions = ["6o ano", "7o ano", "8o ano", "9o ano", "1o EM", "2o EM", "3o EM"];

export default function AdminPage() {
  const { token, user, updateUser } = useAuth();
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>([]);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [resetRequests, setResetRequests] = useState<TeacherPasswordResetRequestSummary[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequestSummary[]>([]);
  const [students, setStudents] = useState<TeacherAccessStudent[]>([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [processingResetId, setProcessingResetId] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherAccessCode, setTeacherAccessCode] = useState<string>("");
  const [savingAccessCode, setSavingAccessCode] = useState(false);
  const [assigningClass, setAssigningClass] = useState<TeacherClassSummary | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingClass, setEditingClass] = useState<TeacherClassSummary | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolSummary | null>(null);
  const [schoolModalError, setSchoolModalError] = useState<string | null>(null);
  const [classModalError, setClassModalError] = useState<string | null>(null);
  const [studentModalError, setStudentModalError] = useState<string | null>(null);
  const [approvalModalError, setApprovalModalError] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolDirector, setSchoolDirector] = useState("");

  const [className, setClassName] = useState("");
  const [classSchoolId, setClassSchoolId] = useState("");
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

    let cancelled = false;

    const load = async () => {
      if (!cancelled) {
        setIsLoading(true);
      }
      const [
        teachersResult,
        schoolsResult,
        resetRequestsResult,
        classesResult,
        accessCodeResult,
        signupRequestsResult,
        studentsResult,
      ] = await Promise.allSettled([
        fetchTeachersAuthed(token),
        fetchSchoolsAuthed(token),
        fetchTeacherPasswordResetRequestsAuthed(token),
        fetchTeacherClassesAuthed(token),
        fetchTeacherAccessCodeAuthed(token),
        fetchTeacherSignupRequestsAuthed(token),
        fetchTeacherAccessStudentsAuthed(token),
      ]);

      if (cancelled) {
        return;
      }

      setTeachers(teachersResult.status === "fulfilled" ? teachersResult.value : []);
      setSchools(schoolsResult.status === "fulfilled" ? schoolsResult.value : []);
      setResetRequests(resetRequestsResult.status === "fulfilled" ? resetRequestsResult.value : []);
      const nextClasses = classesResult.status === "fulfilled" ? classesResult.value : [];
      setTeacherClasses(nextClasses);
      setTeacherAccessCode(accessCodeResult.status === "fulfilled" ? accessCodeResult.value.access_code : "");
      setSignupRequests(signupRequestsResult.status === "fulfilled" ? signupRequestsResult.value : []);
      setStudents(studentsResult.status === "fulfilled" ? studentsResult.value : []);
      if (!selectedClassId && nextClasses.length > 0) {
        setSelectedClassId(nextClasses[0].id);
      }
      setIsLoading(false);
    };

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedClassId, token, user?.role]);

  const pendingOrActiveResets = resetRequests.filter((item) => item.status !== "completed");
  const pendingSignupRequests = useMemo(() => signupRequests.filter((item) => item.status === "pending"), [signupRequests]);

  if (user?.role === "master" && isLoading) {
    return (
      <PlatformShell
        heading="Área master"
        description="Governança central para escolas, professores, turmas, alunos e códigos de acesso."
      >
        <PageLoadingState
          title="Carregando a área master"
          subtitle="Buscando escolas, turmas, professores e alunos diretamente da base atual antes de montar a tela."
        />
      </PlatformShell>
    );
  }

  function resetClassForm() {
    setEditingClass(null);
    setClassModalError(null);
    setClassName("");
    setClassGradeBand(gradeBandOptions[0]);
    setClassSchoolId(schools[0]?.id ?? "");
    setTargetTeacherId("");
  }

  function resetSchoolForm() {
    setEditingSchool(null);
    setSchoolModalError(null);
    setSchoolName("");
    setSchoolAddress("");
    setSchoolDirector("");
  }

  function openCreateSchoolModal() {
    resetSchoolForm();
    setShowSchoolModal(true);
  }

  function openEditSchoolModal(school: SchoolSummary) {
    setEditingSchool(school);
    setSchoolModalError(null);
    setSchoolName(school.name);
    setSchoolAddress(school.address ?? "");
    setSchoolDirector(school.director_name ?? "");
    setShowSchoolModal(true);
  }

  function closeSchoolModal() {
    setShowSchoolModal(false);
    resetSchoolForm();
  }

  function openCreateClassModal() {
    resetClassForm();
    setShowClassModal(true);
  }

  function openEditClassModal(classroom: TeacherClassSummary) {
    setEditingClass(classroom);
    setClassName(classroom.name);
    setClassGradeBand(classroom.grade_band);
    setClassSchoolId(classroom.school_id ?? schools[0]?.id ?? "");
    setTargetTeacherId(classroom.teacher_id ?? "");
    setShowClassModal(true);
  }

  function closeClassModal() {
    setShowClassModal(false);
    resetClassForm();
  }

  async function handleApproveReset(requestId: string) {
    if (!token) {
      return;
    }
    setProcessingResetId(requestId);
    try {
      const result = await approveTeacherPasswordResetRequestAuthed(token, requestId);
      showToast(`${result.message} Mensagem pronta para envio manual gerada abaixo.`);
      const nextRequests = await fetchTeacherPasswordResetRequestsAuthed(token);
      setResetRequests(nextRequests);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível aprovar a redefinição.", "error");
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
      showToast("Código de cadastro de professores atualizado com sucesso.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível atualizar o código.", "error");
    } finally {
      setSavingAccessCode(false);
    }
  }

  async function handleSaveSchool() {
    if (!token) {
      return;
    }
    if (!schoolName.trim()) {
      setSchoolModalError("Informe o nome da escola antes de salvar.");
      return;
    }
    try {
      setSchoolModalError(null);
      const payload = {
        name: schoolName.trim(),
        address: schoolAddress.trim() || null,
        director_name: schoolDirector.trim() || null,
      };
      if (editingSchool) {
        const updated = await updateSchoolAuthed(token, editingSchool.id, payload);
        setSchools((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        closeSchoolModal();
        showToast(`Escola ${updated.name} atualizada com sucesso.`);
      } else {
        const created = await createSchoolAuthed(token, payload);
        setSchools((current) => [...current, created]);
        setClassSchoolId((current) => current || created.id);
        closeSchoolModal();
        showToast(`Escola ${created.name} cadastrada com sucesso.`);
      }
    } catch (error) {
      setSchoolModalError(error instanceof Error ? error.message : "Não foi possível salvar a escola.");
    }
  }

  async function handleSaveClass() {
    if (!token) {
      return;
    }
    if (!className.trim()) {
      setClassModalError("Informe o nome da turma.");
      return;
    }
    if (!classSchoolId) {
      setClassModalError("Selecione a escola da turma.");
      return;
    }
    try {
      setClassModalError(null);
      if (editingClass) {
        const updated = await updateClassAuthed(token, editingClass.id, {
          name: className.trim(),
          grade_band: classGradeBand,
          school_id: classSchoolId,
        });
        setTeacherClasses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        closeClassModal();
        showToast(`Turma ${updated.name} atualizada com sucesso.`);
      } else {
        const created = await createTeacherClassAuthed(token, {
          name: className.trim(),
          school_id: classSchoolId,
          grade_band: classGradeBand,
          teacher_id: targetTeacherId || null,
        });
        setTeacherClasses((current) => [...current, created]);
        if (!selectedClassId) {
          setSelectedClassId(created.id);
        }
        closeClassModal();
        showToast(`Turma ${created.name} criada com sucesso.`);
      }
    } catch (error) {
      setClassModalError(error instanceof Error ? error.message : "Não foi possível salvar a turma.");
    }
  }

  async function handleAssignClassTeacher() {
    if (!token || !assigningClass || !selectedTeacherId) {
      showToast("Escolha um professor para vincular a turma.", "error");
      return;
    }
    try {
      const updatedClass = await assignClassTeacherAuthed(token, assigningClass.id, selectedTeacherId);
      setTeacherClasses((current) => current.map((item) => (item.id === assigningClass.id ? updatedClass : item)));
      showToast(`Turma ${updatedClass.name} vinculada ao professor selecionado.`);
      setAssigningClass(null);
      setSelectedTeacherId("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível vincular a turma.", "error");
    }
  }

  async function handleCreateStudent() {
    if (!token) {
      return;
    }
    try {
      setStudentModalError(null);
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
      showToast("Aluno cadastrado com sucesso.");
    } catch (error) {
      setStudentModalError(error instanceof Error ? error.message : "Não foi possível cadastrar o aluno.");
    }
  }

  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  async function handleApproveSignup(requestId: string) {
    if (!token) {
      return;
    }
    setProcessingApprovalId(requestId);
    try {
      setApprovalModalError(null);
      await approveTeacherSignupRequestAuthed(token, requestId, {
        username: approvalUsernames[requestId] || "",
        pin: approvalPins[requestId] || "1234",
        class_id: selectedClassId || undefined,
      });
      setSignupRequests((current) => current.filter((item) => item.id !== requestId));
      showToast("Cadastro de aluno aprovado com sucesso.");
    } catch (error) {
      setApprovalModalError(error instanceof Error ? error.message : "Não foi possível aprovar o cadastro.");
    } finally {
      setProcessingApprovalId(null);
    }
  }

  async function handleRejectSignup(requestId: string) {
    if (!token) return;
    if (!confirm("Tem certeza que deseja rejeitar esta solicitação? Ela será excluída permanentemente.")) return;
    setProcessingApprovalId(requestId);
    try {
      setApprovalModalError(null);
      await rejectTeacherSignupRequestAuthed(token, requestId);
      setSignupRequests((current) => current.filter((item) => item.id !== requestId));
      showToast("Solicitação de cadastro rejeitada.");
    } catch (error) {
      setApprovalModalError(error instanceof Error ? error.message : "Não foi possível rejeitar a solicitação.");
    } finally {
      setProcessingApprovalId(null);
    }
  }

  async function handleResetPassword(studentId: string) {
    if (!token) return;
    if (!confirm("Tem certeza que deseja redefinir o PIN deste aluno? O PIN passara a ser 1234 temporariamente.")) return;
    try {
      const response = await resetTeacherStudentPasswordAuthed(token, studentId);
      showToast(response.message || "PIN redefinido com sucesso.");
      fetchTeacherAccessStudentsAuthed(token).then(setStudents);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao resetar senha.");
    }
  }

  async function handleEditCoins(studentId: string, currentCoins: number) {
    if (!token) return;
    const newCoinsRaw = prompt("Digite o novo valor de moedas:", currentCoins.toString());
    if (newCoinsRaw === null) return;
    const newCoins = parseInt(newCoinsRaw, 10);
    if (isNaN(newCoins)) return showToast("Valor invalido.");
    try {
      await updateStudentCoinsAuthed(token, studentId, newCoins);
      showToast("Moedas atualizadas com sucesso.");
      fetchTeacherAccessStudentsAuthed(token).then(setStudents);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao editar moedas.");
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!token) return;
    if (!confirm("Tem certeza que deseja excluir esta turma? Todos os vinculos de alunos e atividades associadas serao removidos. Os alunos continuarao na plataforma sem turma.")) return;
    try {
      await deleteClassAuthed(token, classId);
      showToast("Turma excluida com sucesso.");
      fetchTeacherClassesAuthed(token).then((items) => {
        setTeacherClasses(items);
        if (selectedClassId === classId) {
          setSelectedClassId(items[0]?.id || "");
        }
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir turma.");
    }
  }

  async function handleDeleteSchool(schoolId: string, schoolName: string) {
    if (!token) return;
    if (!confirm(`Tem certeza que deseja excluir a escola ${schoolName}? As turmas e usuários continuarão cadastrados, mas ficarão sem escola vinculada.`)) return;
    try {
      const result = await deleteSchoolAuthed(token, schoolId);
      showToast(result.message);
      const [nextSchools, nextClasses] = await Promise.all([
        fetchSchoolsAuthed(token),
        fetchTeacherClassesAuthed(token),
      ]);
      setSchools(nextSchools);
      setTeacherClasses(nextClasses);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir escola.", "error");
    }
  }

  async function handleDeleteTeacher(teacherId: string, teacherName: string) {
    if (!token) return;
    if (!confirm(`Tem certeza que deseja excluir permanentemente o professor ${teacherName}? As turmas permanecerão no sistema, mas ficarão sem professor vinculado.`)) return;
    try {
      const result = await deleteTeacherAuthed(token, teacherId);
      showToast(result.message);
      const [nextTeachers, nextClasses, nextSignupRequests, nextStudents] = await Promise.all([
        fetchTeachersAuthed(token),
        fetchTeacherClassesAuthed(token),
        fetchTeacherSignupRequestsAuthed(token),
        fetchTeacherAccessStudentsAuthed(token),
      ]);
      setTeachers(nextTeachers);
      setTeacherClasses(nextClasses);
      setSignupRequests(nextSignupRequests);
      setStudents(nextStudents);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir professor.", "error");
    }
  }

  async function handleDeleteStudent(studentId: string, studentName: string) {
    if (!token) return;
    if (!confirm(`Tem certeza que deseja excluir permanentemente o aluno ${studentName}? Essa ação não poderá ser desfeita.`)) return;
    try {
      const result = await deleteStudentAuthed(token, studentId);
      showToast(result.message);
      const nextStudents = await fetchTeacherAccessStudentsAuthed(token);
      setStudents(nextStudents);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir aluno.", "error");
    }
  }

  async function handleUpdateUserEmail(userId: string, currentEmail: string, label: string) {
    if (!token) return;
    const nextEmail = prompt(`Digite o novo e-mail para ${label}:`, currentEmail);
    if (nextEmail === null) return;
    if (!nextEmail.trim()) {
      showToast("Informe um e-mail válido.", "error");
      return;
    }
    try {
      const updated = await updateUserEmailAuthed(token, userId, nextEmail.trim());
      showToast("E-mail atualizado com sucesso.");
      if (updated.role === "teacher") {
        const nextTeachers = await fetchTeachersAuthed(token);
        setTeachers(nextTeachers);
      } else if (updated.role === "student") {
        const nextStudents = await fetchTeacherAccessStudentsAuthed(token);
        setStudents(nextStudents);
      } else if (updated.role === "master" && user?.id === userId) {
        updateUser(updated);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao atualizar o e-mail.", "error");
    }
  }

  return (
    <PlatformShell
      heading="Area master"
        description="Governança central para escolas, professores, turmas, alunos e códigos de acesso."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Acesso</span>
            <h2>Código para cadastro de professores</h2>
            <p>O master pode renovar esse código sempre que precisar liberar novas contas de professores.</p>
          </div>
          <div className="teacher-batch-grid">
            <label>
              Código de acesso
              <input className="answer-input" onChange={(event) => setTeacherAccessCode(event.target.value)} value={teacherAccessCode} />
            </label>
            <div className="inline-metrics">
              <button className="primary-button" disabled={savingAccessCode} onClick={handleSaveAccessCode} type="button">
                {savingAccessCode ? "Salvando..." : "Salvar código"}
              </button>
            </div>
          </div>
          <div className="inline-metrics section-actions">
            <button className="tag link-tag" onClick={() => user ? handleUpdateUserEmail(user.id, user.email, "Administrador Master") : null} type="button">
              <UserRoundCog size={14} />
              Alterar meu e-mail
            </button>
            <button className="tag link-tag" onClick={openCreateSchoolModal} type="button">
              <School size={14} />
              Nova escola
            </button>
            <button className="tag link-tag" onClick={openCreateClassModal} type="button">
              <PlusCircle size={14} />
              Nova turma
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
            <span>Escolas</span>
            <h2>Escolas cadastradas</h2>
            <p>O master alimenta as escolas e depois usa essa base ao montar novas turmas.</p>
          </div>
          <div className="teacher-list">
            {schools.map((school) => (
              <div key={school.id} className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>{school.name}</strong>
                  <small>{school.address || "Endereco nao informado"}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">{school.classes_count} turmas</span>
                  <span className="tag">Direcao: {school.director_name || "nao informada"}</span>
                  <button className="tag link-tag" onClick={() => openEditSchoolModal(school)} type="button">
                    Editar escola
                  </button>
                  <button className="tag link-tag" onClick={() => handleDeleteSchool(school.id, school.name)} style={{ color: "var(--color-hazard-red)" }} type="button">
                    Excluir escola
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Governança</span>
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
                  <span className="tag"><UserRoundCog size={14} /> {teacher.grade_band ?? "multissérie"}</span>
                  <span className="tag"><ShieldCheck size={14} /> {teacher.students_count} alunos</span>
                  <span className="tag">{teacher.classes_count} turmas</span>
                  <Link className="tag link-tag" href={`/perfil/${teacher.id}`}>Ver perfil</Link>
                  <button className="tag link-tag" onClick={() => handleUpdateUserEmail(teacher.id, teacher.email, teacher.full_name)} type="button">
                    Alterar e-mail
                  </button>
                  <button className="tag link-tag" onClick={() => handleDeleteTeacher(teacher.id, teacher.full_name)} style={{ color: "var(--color-hazard-red)" }} type="button">
                    Excluir professor
                  </button>
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
            <h2>Turmas cadastradas</h2>
            <p>Cadastre novas turmas, edite os dados salvos e vincule o professor depois em uma janela dedicada.</p>
          </div>
          <div className="inline-metrics section-actions">
            <button className="tag link-tag" onClick={openCreateClassModal} type="button">
              <PlusCircle size={14} />
              Nova turma
            </button>
          </div>
          <div className="teacher-list">
            {teacherClasses.map((classroom) => (
              <div key={classroom.id} className="teacher-row-card stacked">
                <div className="teacher-row-copy">
                  <strong>{classroom.name}</strong>
                  <small>{classroom.school_name ?? "Escola nao informada"} | {classroom.grade_band} | {classroom.students_count} alunos</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">Professor: {classroom.teacher_name ?? "nao vinculado"}</span>
                  <span className="tag">Código: {classroom.invite_code}</span>
                </div>
                <div className="inline-metrics">
                  <button className="tag link-tag" onClick={() => openEditClassModal(classroom)} type="button">
                    Editar turma
                  </button>
                  <button className="tag link-tag" onClick={() => {
                    setAssigningClass(classroom);
                    setSelectedTeacherId(classroom.teacher_id ?? "");
                  }} type="button">
                    Selecionar professor
                  </button>
                  <button className="tag link-tag" style={{ color: "var(--color-hazard-red)" }} onClick={() => handleDeleteClass(classroom.id)} type="button">
                    Excluir turma
                  </button>
                </div>
              </div>
            ))}
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
                <strong>Nenhuma solicitação aberta no momento.</strong>
                <p>Quando um professor usar "Esqueci minha senha", a solicitação vai aparecer aqui.</p>
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
            <span>Alunos</span>
            <h2>Gerenciamento Completo de Alunos</h2>
            <p>Busque qualquer aluno, visualize PINs e edite moedas rapidamente.</p>
          </div>
          <div className="search-bar" style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              className="answer-input"
              style={{ width: "100%" }}
              placeholder="Buscar aluno por nome ou usuário..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
            />
          </div>
          <div className="teacher-list">
            {students.filter(s => s.full_name.toLowerCase().includes(searchStudent.toLowerCase()) || (s.username || "").toLowerCase().includes(searchStudent.toLowerCase())).map(student => (
              <div key={student.id} className="teacher-row-card">
                <div className="teacher-row-copy">
                  <strong>{student.full_name} (@{student.username})</strong>
                  <small>PIN: {student.student_pin} | Moedas: {student.coins}</small>
                </div>
                <div className="teacher-row-actions">
                    <button className="secondary-button" onClick={() => handleResetPassword(student.id)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }} type="button">
                      Resetar Senha
                    </button>
                    <button className="secondary-button" onClick={() => handleEditCoins(student.id, student.coins)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }} type="button">
                      Editar Moedas
                    </button>
                    <button className="secondary-button" onClick={() => handleUpdateUserEmail(student.id, student.email, student.full_name)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }} type="button">
                      Alterar e-mail
                    </button>
                    <button className="secondary-button" onClick={() => handleDeleteStudent(student.id, student.full_name)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", color: "var(--color-hazard-red)" }} type="button">
                      Excluir aluno
                    </button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="teacher-row-card stacked"><p>Nenhum aluno cadastrado no sistema.</p></div>
            )}
          </div>
        </article>
      </section>

      <ActionModal
        description="Cadastre uma nova escola com os dados basicos que vao ser usados nas turmas."
        onClose={closeSchoolModal}
        open={showSchoolModal}
        subtitle="Escolas"
        title={editingSchool ? "Editar escola" : "Nova escola"}
      >
        {schoolModalError ? <div className="feedback-box error">{schoolModalError}</div> : null}
        <div className="profile-form">
          <label>
            Nome da escola
            <input className="answer-input" onChange={(event) => setSchoolName(event.target.value)} value={schoolName} />
          </label>
          <label>
            Endereco
            <input className="answer-input" onChange={(event) => setSchoolAddress(event.target.value)} value={schoolAddress} />
          </label>
          <label>
            Diretor(a)
            <input className="answer-input" onChange={(event) => setSchoolDirector(event.target.value)} value={schoolDirector} />
          </label>
        </div>
        <div className="exercise-actions">
          <button className="primary-button" onClick={handleSaveSchool} type="button">
            <PlusCircle size={16} />
            {editingSchool ? "Salvar escola" : "Criar escola"}
          </button>
        </div>
      </ActionModal>

      <ActionModal
        description="Cadastre ou edite uma turma informando nome, escola, série e deixando o professor opcional para ajuste posterior."
        onClose={closeClassModal}
        open={showClassModal}
        subtitle="Turmas"
        title={editingClass ? "Editar turma" : "Nova turma"}
      >
        {classModalError ? <div className="feedback-box error">{classModalError}</div> : null}
        <div className="profile-form">
          <label>
            Nome da turma
            <input className="answer-input" onChange={(event) => setClassName(event.target.value)} value={className} />
          </label>
          <label>
            Escola
            <select className="answer-input" onChange={(event) => setClassSchoolId(event.target.value)} value={classSchoolId}>
              <option value="">Selecione a escola</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </label>
          <label>
            Série
            <select className="answer-input" onChange={(event) => setClassGradeBand(event.target.value)} value={classGradeBand}>
              {gradeBandOptions.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label>
            Professor
            <select className="answer-input" disabled={!!editingClass} onChange={(event) => setTargetTeacherId(event.target.value)} value={targetTeacherId}>
              <option value="">Deixar em branco por enquanto</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="exercise-actions">
          <button className="primary-button" onClick={handleSaveClass} type="button">
            <PlusCircle size={16} />
            {editingClass ? "Salvar turma" : "Criar turma"}
          </button>
        </div>
      </ActionModal>

      <ActionModal
        description="Cadastre um novo aluno diretamente em uma turma e defina seu usuário e PIN inicial."
        onClose={() => setShowStudentModal(false)}
        open={showStudentModal}
        subtitle="Alunos"
        title="Cadastrar aluno"
      >
        {studentModalError ? <div className="feedback-box error">{studentModalError}</div> : null}
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
            Usuário
            <input className="answer-input" onChange={(event) => setStudentUsername(event.target.value)} value={studentUsername} />
          </label>
          <label>
            PIN inicial
            <input className="answer-input" maxLength={4} onChange={(event) => setStudentPin(event.target.value)} value={studentPin} />
          </label>
          <label>
            Série
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
        {approvalModalError ? <div className="feedback-box error">{approvalModalError}</div> : null}
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
                  Usuário
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
              <div className="inline-metrics" style={{ gap: "1rem" }}>
                <button className="primary-button" disabled={processingApprovalId === request.id} onClick={() => handleApproveSignup(request.id)} type="button">
                  {processingApprovalId === request.id ? "Aprovando..." : "Aprovar cadastro"}
                </button>
                <button className="secondary-button" disabled={processingApprovalId === request.id} onClick={() => handleRejectSignup(request.id)} style={{ borderColor: 'var(--color-hazard-red)', color: 'var(--color-hazard-red)' }} type="button">
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </ActionModal>

      <ActionModal
        description="Escolha um professor disponível para assumir a turma selecionada."
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
