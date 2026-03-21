"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, KeyRound, PlusCircle, School, UserPlus, UserRoundCog, Users } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import {
  approveTeacherSignupRequestAuthed,
  createQuestionBankItemAuthed,
  createTeacherClassAuthed,
  createTeacherStudentAuthed,
  fetchQuestionBankAuthed,
  fetchQuestionBankMetaAuthed,
  fetchStudentReportAuthed,
  fetchTeacherClassesAuthed,
  fetchTeacherSignupRequestsAuthed,
  fetchTeacherStudentsAuthed,
  updateQuestionBankItemAuthed,
} from "@/lib/api";
import {
  fallbackQuestionBankItems,
  fallbackQuestionBankLessons,
  fallbackStudentReport,
  fallbackTeacherClasses,
  QuestionBankItem,
  QuestionBankLessonOption,
  SignupRequestSummary,
  StudentMiniProfile,
  StudentReport,
  TeacherClassSummary,
} from "@/lib/data";

const gradeBandOptions = ["6o ano", "7o ano", "8o ano", "9o ano", "1o EM", "2o EM", "3o EM"];
const exerciseTypeOptions = [
  { value: "multiple_choice", label: "Multipla escolha" },
  { value: "input", label: "Resposta curta" },
  { value: "timed", label: "Cronometrada" },
] as const;
const difficultyOptions = [
  { value: 1, label: "Nivel 1" },
  { value: 2, label: "Nivel 2" },
  { value: 3, label: "Nivel 3" },
  { value: 4, label: "Nivel 4" },
  { value: 5, label: "Nivel 5" },
];

function buildOptionsFromText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, index) => {
      const id = String.fromCharCode(97 + index);
      return { id, label, value: label };
    });
}

function buildLinesFromOptions(options: QuestionBankItem["options"]) {
  return options.map((option) => option.label).join("\n");
}

function buildHintsFromText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ProfessorPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [classes, setClasses] = useState<TeacherClassSummary[]>(fallbackTeacherClasses);
  const [students, setStudents] = useState<StudentMiniProfile[]>([fallbackStudentReport.student]);
  const [signupRequests, setSignupRequests] = useState<SignupRequestSummary[]>([]);
  const [sampleStudent, setSampleStudent] = useState<StudentReport>(fallbackStudentReport);
  const [questionBankItems, setQuestionBankItems] = useState<QuestionBankItem[]>(fallbackQuestionBankItems);
  const [questionBankLessons, setQuestionBankLessons] = useState<QuestionBankLessonOption[]>(fallbackQuestionBankLessons);
  const [className, setClassName] = useState("");
  const [classGradeBand, setClassGradeBand] = useState(gradeBandOptions[0]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("Aluno@123");
  const [studentGradeBand, setStudentGradeBand] = useState(gradeBandOptions[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [approvalPasswords, setApprovalPasswords] = useState<Record<string, string>>({});
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionLessonId, setQuestionLessonId] = useState(fallbackQuestionBankLessons[0]?.lesson_id ?? "");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionType, setQuestionType] = useState<(typeof exerciseTypeOptions)[number]["value"]>("multiple_choice");
  const [questionDifficulty, setQuestionDifficulty] = useState(1);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionOptionsText, setQuestionOptionsText] = useState("");
  const [questionHintsText, setQuestionHintsText] = useState("");
  const [questionEstimatedSeconds, setQuestionEstimatedSeconds] = useState(30);
  const [questionSkill, setQuestionSkill] = useState(fallbackQuestionBankLessons[0]?.default_skill ?? "");
  const [filterTheme, setFilterTheme] = useState("todos");
  const [filterGradeBand, setFilterGradeBand] = useState("todas");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    if (user && user.role !== "teacher" && user.role !== "master") {
      router.replace("/");
    }
  }, [router, user]);

  useEffect(() => {
    if (!token || (user?.role !== "teacher" && user?.role !== "master")) {
      return;
    }
    fetchTeacherClassesAuthed(token).then(setClasses).catch(() => setClasses(fallbackTeacherClasses));
    fetchTeacherStudentsAuthed(token).then(setStudents).catch(() => setStudents([fallbackStudentReport.student]));
    fetchTeacherSignupRequestsAuthed(token).then(setSignupRequests).catch(() => setSignupRequests([]));
    fetchStudentReportAuthed(token).then(setSampleStudent).catch(() => setSampleStudent(fallbackStudentReport));
    fetchQuestionBankMetaAuthed(token).then((items) => {
      setQuestionBankLessons(items);
      if (!editingQuestionId && items.length > 0) {
        setQuestionLessonId(items[0].lesson_id);
        setQuestionSkill(items[0].default_skill);
      }
    }).catch(() => {
      setQuestionBankLessons(fallbackQuestionBankLessons);
      if (!editingQuestionId && fallbackQuestionBankLessons.length > 0) {
        setQuestionLessonId(fallbackQuestionBankLessons[0].lesson_id);
        setQuestionSkill(fallbackQuestionBankLessons[0].default_skill);
      }
    });
    fetchQuestionBankAuthed(token).then(setQuestionBankItems).catch(() => setQuestionBankItems(fallbackQuestionBankItems));
  }, [editingQuestionId, token, user?.role]);

  const activeLesson = useMemo(
    () => questionBankLessons.find((lesson) => lesson.lesson_id === questionLessonId) ?? questionBankLessons[0] ?? null,
    [questionBankLessons, questionLessonId],
  );

  const availableThemes = useMemo(
    () => Array.from(new Set(questionBankLessons.map((lesson) => lesson.theme))).sort((left, right) => left.localeCompare(right)),
    [questionBankLessons],
  );

  const filteredQuestionBankItems = useMemo(() => {
    return questionBankItems.filter((item) => {
      const matchesTheme = filterTheme === "todos" || item.theme === filterTheme;
      const matchesGradeBand = filterGradeBand === "todas" || item.grade_band.toLowerCase().includes(filterGradeBand.toLowerCase());
      const matchesSearch =
        filterSearch.trim().length === 0 ||
        item.prompt.toLowerCase().includes(filterSearch.trim().toLowerCase()) ||
        item.lesson_title.toLowerCase().includes(filterSearch.trim().toLowerCase()) ||
        item.skill.toLowerCase().includes(filterSearch.trim().toLowerCase());
      return matchesTheme && matchesGradeBand && matchesSearch;
    });
  }, [filterGradeBand, filterSearch, filterTheme, questionBankItems]);

  function resetQuestionForm(nextLessons = questionBankLessons) {
    const firstLesson = nextLessons[0] ?? fallbackQuestionBankLessons[0] ?? null;
    setEditingQuestionId(null);
    setQuestionLessonId(firstLesson?.lesson_id ?? "");
    setQuestionPrompt("");
    setQuestionType("multiple_choice");
    setQuestionDifficulty(1);
    setQuestionAnswer("");
    setQuestionExplanation("");
    setQuestionOptionsText("");
    setQuestionHintsText("");
    setQuestionEstimatedSeconds(30);
    setQuestionSkill(firstLesson?.default_skill ?? "");
  }

  function populateQuestionForm(item: QuestionBankItem) {
    setEditingQuestionId(item.id);
    setQuestionLessonId(item.lesson_id);
    setQuestionPrompt(item.prompt);
    setQuestionType(item.exercise_type === "multiple_choice" || item.exercise_type === "input" || item.exercise_type === "timed" ? item.exercise_type : "input");
    setQuestionDifficulty(item.difficulty);
    setQuestionAnswer(item.correct_answer);
    setQuestionExplanation(item.explanation);
    setQuestionOptionsText(buildLinesFromOptions(item.options));
    setQuestionHintsText(item.hints.join("\n"));
    setQuestionEstimatedSeconds(item.estimated_seconds);
    setQuestionSkill(item.skill);
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      const created = await createTeacherClassAuthed(token, {
        name: className,
        grade_band: classGradeBand,
      });
      setClasses((current) => [...current, created]);
      setSelectedClassId(created.id);
      setClassName("");
      setClassGradeBand(gradeBandOptions[0]);
      setMessage(`Turma ${created.name} criada com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel criar a turma.");
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      const created = await createTeacherStudentAuthed(token, {
        full_name: studentName,
        email: studentEmail,
        password: studentPassword,
        grade_band: studentGradeBand,
        class_id: selectedClassId || undefined,
      });
      setStudents((current) => [...current, created]);
      setStudentName("");
      setStudentEmail("");
      setStudentPassword("Aluno@123");
      setStudentGradeBand(gradeBandOptions[0]);
      setMessage(`Aluno ${created.full_name} criado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel criar o aluno.");
    }
  }

  async function handleApproveRequest(requestId: string, fallbackClassId: string) {
    if (!token || approvingRequestId === requestId) {
      return;
    }
    setApprovingRequestId(requestId);
    const password = approvalPasswords[requestId] || "Aluno@123";
    try {
      const created = await approveTeacherSignupRequestAuthed(token, requestId, {
        password,
        class_id: fallbackClassId,
      });
      setStudents((current) => [...current, created]);
      setSignupRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage(`Solicitacao aprovada. Senha inicial do aluno: ${password}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel aprovar a solicitacao.");
    } finally {
      setApprovingRequestId(null);
    }
  }

  async function handleSubmitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !questionLessonId) {
      return;
    }
    setSavingQuestion(true);
    try {
      const payload = {
        lesson_id: questionLessonId,
        prompt: questionPrompt,
        exercise_type: questionType,
        difficulty: questionDifficulty,
        correct_answer: questionAnswer,
        explanation: questionExplanation,
        options: questionType === "multiple_choice" ? buildOptionsFromText(questionOptionsText) : [],
        hints: buildHintsFromText(questionHintsText),
        estimated_seconds: questionEstimatedSeconds,
        skill: questionSkill,
      };

      if (editingQuestionId) {
        const updated = await updateQuestionBankItemAuthed(token, editingQuestionId, payload);
        setQuestionBankItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("Questao atualizada com sucesso.");
      } else {
        const created = await createQuestionBankItemAuthed(token, payload);
        setQuestionBankItems((current) => [created, ...current]);
        setMessage("Questao adicionada ao banco com sucesso.");
      }

      resetQuestionForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar a questao.");
    } finally {
      setSavingQuestion(false);
    }
  }

  if (user && user.role !== "teacher" && user.role !== "master") {
    return null;
  }

  return (
    <PlatformShell
      heading="Area do professor"
      description="Turmas, banco de questoes, acessos de alunos e visao pedagogica organizada em um painel proprio."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Turmas</span>
            <h2>Gestao de classes</h2>
            <p>Convites, acuracia media e organizacao por serie.</p>
          </div>
          <div className="teacher-list">
            {classes.map((classroom) => (
              <div key={classroom.id} className="teacher-row-card">
                <div>
                  <strong>{classroom.name}</strong>
                  <small>{classroom.grade_band}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><Users size={14} /> {classroom.students_count} alunos</span>
                  <span className="tag"><School size={14} /> {classroom.average_accuracy}% media</span>
                  <span className="tag"><KeyRound size={14} /> {classroom.invite_code}</span>
                  <Link className="tag link-tag" href={`/professor/turmas/${classroom.id}`}>Abrir turma</Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Aluno em foco</span>
            <h2>{sampleStudent.student.full_name}</h2>
            <p>{sampleStudent.performance_summary}</p>
          </div>
          <div className="mini-grid">
            <div>
              <strong>{sampleStudent.student.accuracy}%</strong>
              <span>acerto</span>
            </div>
            <div>
              <strong>{sampleStudent.student.study_minutes} min</strong>
              <span>estudo</span>
            </div>
            <div>
              <strong>{sampleStudent.student.strong_areas.join(", ")}</strong>
              <span>areas fortes</span>
            </div>
            <div>
              <strong>{sampleStudent.student.weak_areas.join(", ")}</strong>
              <span>areas fracas</span>
            </div>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Criacao</span>
            <h2>Nova turma</h2>
            <p>Cadastre turmas reais diretamente pela interface.</p>
          </div>
          <form className="login-form" onSubmit={handleCreateClass}>
            <label>
              Nome da turma
              <input className="answer-input" value={className} onChange={(event) => setClassName(event.target.value)} />
            </label>
            <label>
              Serie
              <select className="answer-input" value={classGradeBand} onChange={(event) => setClassGradeBand(event.target.value)}>
                {gradeBandOptions.map((gradeBand) => (
                  <option key={gradeBand} value={gradeBand}>{gradeBand}</option>
                ))}
              </select>
            </label>
            <button className="primary-button wide" type="submit">
              <PlusCircle size={16} />
              Criar turma
            </button>
          </form>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Criacao</span>
            <h2>Novo aluno</h2>
            <p>Crie conta, senha inicial e vinculo com uma turma.</p>
          </div>
          <form className="login-form" onSubmit={handleCreateStudent}>
            <label>
              Nome do aluno
              <input className="answer-input" value={studentName} onChange={(event) => setStudentName(event.target.value)} />
            </label>
            <label>
              Email
              <input className="answer-input" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} />
            </label>
            <label>
              Senha inicial
              <input className="answer-input" value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} />
            </label>
            <label>
              Serie
              <select className="answer-input" value={studentGradeBand} onChange={(event) => setStudentGradeBand(event.target.value)}>
                {gradeBandOptions.map((gradeBand) => (
                  <option key={gradeBand} value={gradeBand}>{gradeBand}</option>
                ))}
              </select>
            </label>
            <label>
              Turma
              <select className="answer-input" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                <option value="">Sem turma inicial</option>
                {classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                ))}
              </select>
            </label>
            <button className="primary-button wide" type="submit">
              <UserPlus size={16} />
              Criar aluno
            </button>
          </form>
        </article>
      </section>

      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Banco de questoes</span>
            <h2>{editingQuestionId ? "Editar questao" : "Nova questao objetiva"}</h2>
            <p>O professor pode alimentar e ajustar o banco base usado nas missoes diarias.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmitQuestion}>
            <label>
              Tema predefinido
              <select
                className="answer-input"
                value={questionLessonId}
                onChange={(event) => {
                  const nextLessonId = event.target.value;
                  const nextLesson = questionBankLessons.find((lesson) => lesson.lesson_id === nextLessonId);
                  setQuestionLessonId(nextLessonId);
                  if (!editingQuestionId || questionSkill.trim().length === 0 || questionSkill === activeLesson?.default_skill) {
                    setQuestionSkill(nextLesson?.default_skill ?? "");
                  }
                }}
              >
                {questionBankLessons.map((lesson) => (
                  <option key={lesson.lesson_id} value={lesson.lesson_id}>
                    {lesson.theme} - {lesson.lesson_title} - {lesson.grade_band}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-metrics">
              <span className="tag"><BookOpenCheck size={14} /> {activeLesson?.path_title ?? "Sem trilha"}</span>
              <span className="tag"><School size={14} /> {activeLesson?.grade_band ?? "Sem serie"}</span>
            </div>
            <label>
              Enunciado
              <textarea className="answer-input" rows={4} value={questionPrompt} onChange={(event) => setQuestionPrompt(event.target.value)} />
            </label>
            <label>
              Tipo de questao
              <select className="answer-input" value={questionType} onChange={(event) => setQuestionType(event.target.value as (typeof exerciseTypeOptions)[number]["value"])}>
                {exerciseTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Nivel
              <select className="answer-input" value={questionDifficulty} onChange={(event) => setQuestionDifficulty(Number(event.target.value))}>
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {questionType === "multiple_choice" ? (
              <label>
                Alternativas
                <textarea
                  className="answer-input"
                  rows={5}
                  placeholder={"Uma alternativa por linha\nEx.: 25%\n30%\n35%\n40%"}
                  value={questionOptionsText}
                  onChange={(event) => setQuestionOptionsText(event.target.value)}
                />
              </label>
            ) : null}
            <label>
              Resposta correta
              <input className="answer-input" value={questionAnswer} onChange={(event) => setQuestionAnswer(event.target.value)} />
            </label>
            <label>
              Explicacao
              <textarea className="answer-input" rows={4} value={questionExplanation} onChange={(event) => setQuestionExplanation(event.target.value)} />
            </label>
            <label>
              Dicas
              <textarea
                className="answer-input"
                rows={3}
                placeholder={"Uma dica por linha"}
                value={questionHintsText}
                onChange={(event) => setQuestionHintsText(event.target.value)}
              />
            </label>
            <label>
              Skill interna
              <input className="answer-input" value={questionSkill} onChange={(event) => setQuestionSkill(event.target.value)} />
            </label>
            <label>
              Tempo estimado em segundos
              <input
                className="answer-input"
                max={180}
                min={10}
                type="number"
                value={questionEstimatedSeconds}
                onChange={(event) => setQuestionEstimatedSeconds(Number(event.target.value))}
              />
            </label>
            <div className="inline-metrics">
              <button className="primary-button" disabled={savingQuestion} type="submit">
                {savingQuestion ? "Salvando..." : editingQuestionId ? "Salvar edicao" : "Adicionar questao"}
              </button>
              <button className="tag link-tag" onClick={() => resetQuestionForm()} type="button">
                Limpar formulario
              </button>
            </div>
          </form>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Catalogo</span>
            <h2>Questoes salvas</h2>
            <p>Filtre por tema, serie e busque por palavra-chave antes de editar.</p>
          </div>
          <div className="login-form">
            <label>
              Tema
              <select className="answer-input" value={filterTheme} onChange={(event) => setFilterTheme(event.target.value)}>
                <option value="todos">Todos os temas</option>
                {availableThemes.map((theme) => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </label>
            <label>
              Serie minima
              <select className="answer-input" value={filterGradeBand} onChange={(event) => setFilterGradeBand(event.target.value)}>
                <option value="todas">Todas as series</option>
                {gradeBandOptions.map((gradeBand) => (
                  <option key={gradeBand} value={gradeBand}>{gradeBand}</option>
                ))}
              </select>
            </label>
            <label>
              Buscar
              <input className="answer-input" value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} />
            </label>
          </div>
          <div className="inline-metrics">
            <span className="tag"><BookOpenCheck size={14} /> {filteredQuestionBankItems.length} questoes visiveis</span>
            <span className="tag"><School size={14} /> {questionBankLessons.length} temas predefinidos</span>
          </div>
          <div className="teacher-list">
            {filteredQuestionBankItems.map((item) => (
              <div key={item.id} className="teacher-row-card stacked">
                <div>
                  <strong>{item.prompt}</strong>
                  <small>{item.theme} | {item.lesson_title} | {item.grade_band}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">nivel {item.difficulty}</span>
                  <span className="tag">{item.exercise_type}</span>
                  <span className="tag">{item.skill}</span>
                  <span className="tag">{item.estimated_seconds}s</span>
                </div>
                <p><strong>Resposta:</strong> {item.correct_answer}</p>
                <p>{item.explanation}</p>
                {item.options.length > 0 ? (
                  <p><strong>Alternativas:</strong> {item.options.map((option) => option.label).join(" | ")}</p>
                ) : null}
                <div className="inline-metrics">
                  <button className="primary-button" onClick={() => populateQuestionForm(item)} type="button">
                    <UserRoundCog size={16} />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Alunos</span>
            <h2>Lista gerenciada pelo professor</h2>
            <p>Perfis reais cadastrados e vinculados ao seu acesso.</p>
          </div>
          {message ? <div className="feedback-box">{message}</div> : null}
          <div className="teacher-list">
            {students.map((student) => (
              <div key={student.id} className="teacher-row-card">
                <div>
                  <strong>{student.full_name}</strong>
                  <small>{student.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><Users size={14} /> {student.grade_band}</span>
                  <span className="tag"><School size={14} /> nivel {student.level}</span>
                  <span className="tag"><KeyRound size={14} /> {student.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Solicitacoes</span>
            <h2>Acessos aguardando aprovacao</h2>
            <p>O aluno solicita entrada na turma e o professor aprova gerando a senha inicial.</p>
          </div>
          <div className="teacher-list">
            {signupRequests.filter((request) => request.status === "pending").length === 0 ? (
              <div className="teacher-row-card">
                <strong>Nenhuma solicitacao pendente no momento.</strong>
              </div>
            ) : signupRequests.filter((request) => request.status === "pending").map((request) => (
              <div key={request.id} className="teacher-row-card stacked">
                <div>
                  <strong>{request.full_name}</strong>
                  <small>{request.email} | {request.grade_band}</small>
                </div>
                <p>{request.note || "Sem recado adicional."}</p>
                <div className="inline-metrics">
                  <input
                    className="answer-input inline-input"
                    placeholder="Senha inicial"
                    value={approvalPasswords[request.id] ?? "Aluno@123"}
                    onChange={(event) => setApprovalPasswords((current) => ({ ...current, [request.id]: event.target.value }))}
                  />
                  <button className="primary-button" disabled={approvingRequestId === request.id} onClick={() => handleApproveRequest(request.id, request.class_id)} type="button">
                    {approvingRequestId === request.id ? "Aprovando..." : "Aprovar e gerar senha"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
