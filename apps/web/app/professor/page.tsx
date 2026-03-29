"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Compass, KeyRound, PlusCircle, School, UserPlus, UserRoundCog, Users } from "@/lib/icons";

import { ActionModal } from "@/components/action-modal";
import { CreateTrailModal } from "@/components/create-trail-modal";
import { useAuth } from "@/components/auth-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { PlatformShell } from "@/components/platform-shell";
import {
  approveTeacherSignupRequestAuthed,
  createTeacherTrailAuthed,
  createQuestionBankItemAuthed,
  createTeacherClassAuthed,
  createTeacherStudentAuthed,
  deleteStudentAuthed,
  fetchQuestionBankAuthed,
  fetchQuestionBankMetaAuthed,
  fetchTeacherAccessStudentsAuthed,
  fetchTeacherClassesAuthed,
  fetchTeacherSignupRequestsAuthed,
  fetchTeacherStudentsAuthed,
  fetchTeacherTrailsAuthed,
  reassignStudentClassAuthed,
  updateStudentCoinsAuthed,
  updateQuestionBankItemAuthed,
} from "@/lib/api";
import { formatMathText } from "@/lib/math";
import { QuestionBankItem, QuestionBankLessonOption, SignupRequestSummary, StudentMiniProfile, TeacherAccessStudent, TeacherClassSummary, TeacherTrail, TeacherTrailCreatePayload } from "@/lib/data";
import { showToast } from "@/lib/toast";

const gradeBandOptions = ["6o ano", "7o ano", "8o ano", "9o ano", "1o EM", "2o EM", "3o EM"];
const exerciseTypeOptions = [
  { value: "multiple_choice", label: "Multipla escolha" },
  { value: "input", label: "Resposta curta" },
  { value: "timed", label: "Cronometrada" },
] as const;
const difficultyOptions = [
  { value: 1, label: "NÃ­vel 1" },
  { value: 2, label: "NÃ­vel 2" },
  { value: 3, label: "NÃ­vel 3" },
  { value: 4, label: "NÃ­vel 4" },
  { value: 5, label: "NÃ­vel 5" },
];

const sortOptions = [
  { value: "recent", label: "Mais recentes" },
  { value: "difficulty_asc", label: "NÃ­vel crescente" },
  { value: "difficulty_desc", label: "NÃ­vel decrescente" },
  { value: "theme", label: "Tema A-Z" },
] as const;

function buildPresetContent(lesson: QuestionBankLessonOption | null) {
  if (!lesson) {
    return {
      prompt: "",
      answer: "",
      explanation: "",
      hints: "",
      options: "",
      type: "multiple_choice" as (typeof exerciseTypeOptions)[number]["value"],
      estimatedSeconds: 30,
    };
  }

  if (lesson.lesson_id === "lesson-005") {
    return {
      prompt: "Quanto e 18 + 7?",
      answer: "25",
      explanation: "Some 18 com 7 para obter 25.",
      hints: "Some primeiro a dezena e depois as unidades.",
      options: "25\n24\n26\n27",
      type: "multiple_choice" as const,
      estimatedSeconds: 18,
    };
  }

  if (lesson.lesson_id === "lesson-006") {
    return {
      prompt: "Quanto e 63 - 19?",
      answer: "44",
      explanation: "Subtraia 19 de 63 para chegar a 44.",
      hints: "Retire 20 e depois devolva 1.",
      options: "",
      type: "input" as const,
      estimatedSeconds: 22,
    };
  }

  if (lesson.lesson_id === "lesson-007") {
    return {
      prompt: "Quanto e 8 x 7?",
      answer: "56",
      explanation: "Multiplique 8 por 7 para obter 56.",
      hints: "Use a tabuada do 7 ou do 8.",
      options: "56\n48\n54\n64",
      type: "multiple_choice" as const,
      estimatedSeconds: 20,
    };
  }

  if (lesson.lesson_id === "lesson-008") {
    return {
      prompt: "Quanto e 72 / 8?",
      answer: "9",
      explanation: "Divida 72 por 8. O quociente e 9.",
      hints: "Pense em qual numero vezes 8 da 72.",
      options: "9\n8\n10\n12",
      type: "multiple_choice" as const,
      estimatedSeconds: 20,
    };
  }

  if (lesson.lesson_id === "lesson-009") {
    return {
      prompt: "Quanto e 15% de 200?",
      answer: "30",
      explanation: "Calcule 15 por cento de 200. O resultado e 30.",
      hints: "Transforme 15% em 0,15 ou em 15/100.",
      options: "",
      type: "input" as const,
      estimatedSeconds: 24,
    };
  }

  if (lesson.lesson_id === "lesson-003") {
    return {
      prompt: "Resolva: 2x + 3 = 11",
      answer: "4",
      explanation: "Subtraia 3 dos dois lados e depois divida por 2.",
      hints: "Isole o x em duas etapas.",
      options: "",
      type: "input" as const,
      estimatedSeconds: 28,
    };
  }

  return {
    prompt: "",
    answer: "",
    explanation: "",
    hints: "",
    options: "",
    type: "input" as const,
    estimatedSeconds: 30,
  };
}

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

function parseBatchRows(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("||").map((part) => part.trim());
      if (parts.length < 2) {
        throw new Error(`Linha ${index + 1}: use o formato enunciado || resposta || nÃ­vel || dica || explicaÃ§Ã£o`);
      }
      return {
        prompt: parts[0],
        correctAnswer: parts[1],
        difficulty: Number(parts[2] || 1),
        hint: parts[3] || "Resolva a opera??o diretamente.",
        explanation: parts[4] || `A resposta correta e ${parts[1]}.`,
      };
    });
}

export default function ProfessorPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [students, setStudents] = useState<StudentMiniProfile[]>([]);
  const [accessStudents, setAccessStudents] = useState<TeacherAccessStudent[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequestSummary[]>([]);
  const [questionBankItems, setQuestionBankItems] = useState<QuestionBankItem[]>([]);
  const [questionBankLessons, setQuestionBankLessons] = useState<QuestionBankLessonOption[]>([]);
  const [className, setClassName] = useState("");
  const [classGradeBand, setClassGradeBand] = useState(gradeBandOptions[0]);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPin, setStudentPin] = useState("1234");
  const [studentGradeBand, setStudentGradeBand] = useState(gradeBandOptions[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [, setMessage] = useState<string | null>(null);
  const [approvalPins, setApprovalPins] = useState<Record<string, string>>({});
  const [approvalUsernames, setApprovalUsernames] = useState<Record<string, string>>({});
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionLessonId, setQuestionLessonId] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionType, setQuestionType] = useState<(typeof exerciseTypeOptions)[number]["value"]>("multiple_choice");
  const [questionDifficulty, setQuestionDifficulty] = useState(1);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionOptionsText, setQuestionOptionsText] = useState("");
  const [questionHintsText, setQuestionHintsText] = useState("");
  const [questionEstimatedSeconds, setQuestionEstimatedSeconds] = useState(30);
  const [questionSkill, setQuestionSkill] = useState("");
  const [filterTheme, setFilterTheme] = useState("todos");
  const [filterGradeBand, setFilterGradeBand] = useState("todas");
  const [filterExerciseType, setFilterExerciseType] = useState("todos");
  const [filterDifficulty, setFilterDifficulty] = useState("todas");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("recent");
  const [filterSearch, setFilterSearch] = useState("");
  const deferredSearch = useDeferredValue(filterSearch);
  const [batchPromptText, setBatchPromptText] = useState("");
  const [batchDifficulty, setBatchDifficulty] = useState(1);
  const [batchEstimatedSeconds, setBatchEstimatedSeconds] = useState(20);
  const [batchQuestionType, setBatchQuestionType] = useState<(typeof exerciseTypeOptions)[number]["value"]>("input");
  const [savingBatch, setSavingBatch] = useState(false);
  const [expandedArea, setExpandedArea] = useState<"classes" | "create" | "catalog" | null>(null);
  const [showClassAdminPanel, setShowClassAdminPanel] = useState(false);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [savingTrail, setSavingTrail] = useState(false);
  const [teacherTrails, setTeacherTrails] = useState<TeacherTrail[]>([]);
  const [coinDrafts, setCoinDrafts] = useState<Record<string, string>>({});
  const [classDrafts, setClassDrafts] = useState<Record<string, string>>({});
  const [studentFilterClassId, setStudentFilterClassId] = useState("todas");
  const [studentFilterSchoolId, setStudentFilterSchoolId] = useState("todas");
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "teacher" && user.role !== "master") {
      router.replace("/");
    }
  }, [router, user]);

  useEffect(() => {
    if (!token || (user?.role !== "teacher" && user?.role !== "master")) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([
      fetchTeacherClassesAuthed(token),
      fetchTeacherStudentsAuthed(token),
      fetchTeacherAccessStudentsAuthed(token),
      fetchTeacherSignupRequestsAuthed(token),
      fetchQuestionBankMetaAuthed(token),
      fetchQuestionBankAuthed(token),
      user?.role === "teacher" ? fetchTeacherTrailsAuthed(token) : Promise.resolve([] as TeacherTrail[]),
    ]).then(([classesResult, studentsResult, accessStudentsResult, signupResult, lessonsResult, itemsResult, trailsResult]) => {
      if (cancelled) {
        return;
      }
      setClasses(classesResult.status === "fulfilled" ? classesResult.value : []);
      setStudents(studentsResult.status === "fulfilled" ? studentsResult.value : []);
      const nextAccessStudents = accessStudentsResult.status === "fulfilled" ? accessStudentsResult.value : [];
      setAccessStudents(nextAccessStudents);
      setCoinDrafts(Object.fromEntries(nextAccessStudents.map((item) => [item.id, String(item.coins)])));
      setClassDrafts(Object.fromEntries(nextAccessStudents.map((item) => [item.id, item.current_class_id ?? ""])));
      setSignupRequests(signupResult.status === "fulfilled" ? signupResult.value : []);
      const lessons = lessonsResult.status === "fulfilled" ? lessonsResult.value : [];
      setQuestionBankLessons(lessons);
      setQuestionBankItems(itemsResult.status === "fulfilled" ? itemsResult.value : []);
      if (!editingQuestionId && lessons.length > 0) {
        setQuestionLessonId((current) => current || lessons[0].lesson_id);
        setQuestionSkill((current) => current || lessons[0].default_skill);
      }
      if (lessonsResult.status === "rejected" || itemsResult.status === "rejected") {
        const nextMessage = "Não foi possível carregar o banco de questões.";
        setMessage(nextMessage);
        showToast(nextMessage, "error");
      }
      setTeacherTrails(trailsResult.status === "fulfilled" ? trailsResult.value : []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editingQuestionId, token, user?.role]);

  const activeLesson = useMemo(
    () => questionBankLessons.find((lesson) => lesson.lesson_id === questionLessonId) ?? questionBankLessons[0] ?? null,
    [questionBankLessons, questionLessonId],
  );

  const availableThemes = useMemo(
    () => Array.from(new Set(questionBankLessons.map((lesson) => lesson.theme))).sort((left, right) => left.localeCompare(right)),
    [questionBankLessons],
  );

  const questionCountsByLesson = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of questionBankItems) {
      counts.set(item.lesson_id, (counts.get(item.lesson_id) ?? 0) + 1);
    }
    return counts;
  }, [questionBankItems]);

  const questionCountsByTheme = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of questionBankItems) {
      counts.set(item.theme, (counts.get(item.theme) ?? 0) + 1);
    }
    return counts;
  }, [questionBankItems]);

  const filteredQuestionBankItems = useMemo(() => {
    const filtered = questionBankItems.filter((item) => {
      const matchesTheme = filterTheme === "todos" || item.theme === filterTheme;
      const matchesGradeBand = filterGradeBand === "todas" || item.grade_band.toLowerCase().includes(filterGradeBand.toLowerCase());
      const matchesExerciseType = filterExerciseType === "todos" || item.exercise_type === filterExerciseType;
      const matchesDifficulty = filterDifficulty === "todas" || String(item.difficulty) === filterDifficulty;
      const matchesSearch =
        deferredSearch.trim().length === 0 ||
        item.prompt.toLowerCase().includes(deferredSearch.trim().toLowerCase()) ||
        item.lesson_title.toLowerCase().includes(deferredSearch.trim().toLowerCase()) ||
        item.skill.toLowerCase().includes(deferredSearch.trim().toLowerCase());
      return matchesTheme && matchesGradeBand && matchesExerciseType && matchesDifficulty && matchesSearch;
    });

    filtered.sort((left, right) => {
      if (sortBy === "difficulty_asc") {
        return left.difficulty - right.difficulty || left.prompt.localeCompare(right.prompt);
      }
      if (sortBy === "difficulty_desc") {
        return right.difficulty - left.difficulty || left.prompt.localeCompare(right.prompt);
      }
      if (sortBy === "theme") {
        return left.theme.localeCompare(right.theme) || left.lesson_title.localeCompare(right.lesson_title);
      }
      return right.id.localeCompare(left.id);
    });
    return filtered;
  }, [deferredSearch, filterDifficulty, filterExerciseType, filterGradeBand, filterTheme, questionBankItems, sortBy]);

  const hasQuestionSearch = useMemo(
    () =>
      filterSearch.trim().length > 0 ||
      filterTheme !== "todos" ||
      filterGradeBand !== "todas" ||
      filterExerciseType !== "todos" ||
      filterDifficulty !== "todas",
    [filterDifficulty, filterExerciseType, filterGradeBand, filterSearch, filterTheme],
  );

  const studentFilterSchools = useMemo(
    () =>
      Array.from(
        new Map(
          classes
            .filter((item) => item.school_id)
            .map((item) => [item.school_id as string, { id: item.school_id as string, name: item.school_name ?? "Escola" }]),
        ).values(),
      ),
    [classes],
  );

  const filteredAccessStudents = useMemo(
    () =>
      accessStudents.filter((student) => {
        const classroom = classes.find((item) => item.id === student.current_class_id);
        const matchesClass = studentFilterClassId === "todas" || student.current_class_id === studentFilterClassId;
        const matchesSchool = studentFilterSchoolId === "todas" || classroom?.school_id === studentFilterSchoolId;
        return matchesClass && matchesSchool;
      }),
    [accessStudents, classes, studentFilterClassId, studentFilterSchoolId],
  );

  if (isLoading) {
    return (
      <PlatformShell heading="Professor" description="Carregando turmas, alunos, trilhas e o banco de questões.">
        <PageLoadingState
          title="Carregando a área do professor"
          subtitle="Buscando turmas, alunos, aprovações e catálogo de questões antes de abrir o painel."
        />
      </PlatformShell>
    );
  }

  function resetQuestionForm(nextLessons = questionBankLessons) {
    const firstLesson = nextLessons[0] ?? null;
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

  function applyLessonPreset(lesson: QuestionBankLessonOption | null) {
    const preset = buildPresetContent(lesson);
    setQuestionPrompt(preset.prompt);
    setQuestionType(preset.type);
    setQuestionAnswer(preset.answer);
    setQuestionExplanation(preset.explanation);
    setQuestionHintsText(preset.hints);
    setQuestionOptionsText(preset.options);
    setQuestionEstimatedSeconds(preset.estimatedSeconds);
    setQuestionSkill(lesson?.default_skill ?? "");
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

  function duplicateQuestionToForm(item: QuestionBankItem) {
    populateQuestionForm(item);
    setEditingQuestionId(null);
    setQuestionPrompt(`${item.prompt} (variante)`);
  }

  function closeQuestionCreateModal() {
    setExpandedArea(null);
    resetQuestionForm();
  }

  function closeQuestionCatalogModal() {
    setExpandedArea(null);
    resetQuestionForm();
  }

  function openQuestionEditorFromCatalog(item: QuestionBankItem) {
    populateQuestionForm(item);
    setExpandedArea("create");
  }

  function openQuestionDuplicateFromCatalog(item: QuestionBankItem) {
    duplicateQuestionToForm(item);
    setExpandedArea("create");
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      const created = await createTeacherClassAuthed(token, {
        name: className,
        school_id: classes[0]?.school_id ?? "school-001",
        grade_band: classGradeBand,
        teacher_id: user?.role === "master" ? user.id : undefined,
      });
      setClasses((current) => [...current, created]);
      setSelectedClassId(created.id);
      setClassName("");
      setClassGradeBand(gradeBandOptions[0]);
      showToast(`Turma ${created.name} criada com sucesso.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel criar a turma.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
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
        username: studentUsername,
        pin: studentPin,
        grade_band: studentGradeBand,
        class_id: selectedClassId || undefined,
      });
      setStudents((current) => [...current, created]);
      setStudentName("");
      setStudentEmail("");
      setStudentUsername("");
      setStudentPin("1234");
      setStudentGradeBand(gradeBandOptions[0]);
      showToast(`Aluno ${created.full_name} criado com sucesso. UsuÃ¡rio: ${created.username ?? "-"} | PIN: ${created.student_pin ?? "-"}`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel criar o aluno.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
    }
  }

  async function handleCreateTrail(payload: TeacherTrailCreatePayload) {
    if (!token) {
      return;
    }
    setSavingTrail(true);
    try {
      const created = await createTeacherTrailAuthed(token, payload);
      setTeacherTrails((current) => [created, ...current]);
      showToast(`Trilha ${created.title} criada com sucesso para ${created.classes.length} turma(s).`);
    } finally {
      setSavingTrail(false);
    }
  }

  async function handleSaveStudentManagerSettings(studentId: string) {
    if (!token) {
      return;
    }
    try {
      const nextCoins = Number(coinDrafts[studentId] ?? 0);
      if (!Number.isNaN(nextCoins)) {
        await updateStudentCoinsAuthed(token, studentId, nextCoins);
      }
      const nextClassId = classDrafts[studentId];
      if (nextClassId) {
        await reassignStudentClassAuthed(token, studentId, nextClassId);
      }
      const refreshedAccess = await fetchTeacherAccessStudentsAuthed(token);
      setAccessStudents(refreshedAccess);
      setCoinDrafts(Object.fromEntries(refreshedAccess.map((item) => [item.id, String(item.coins)])));
      setClassDrafts(Object.fromEntries(refreshedAccess.map((item) => [item.id, item.current_class_id ?? ""])));
      const refreshedStudents = await fetchTeacherStudentsAuthed(token);
      setStudents(refreshedStudents);
      setMessage(null);
      showToast("Dados do aluno atualizados com sucesso.");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel atualizar o aluno.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
    }
  }

  async function handleDeleteStudent(studentId: string, studentName: string) {
    if (!token || deletingStudentId === studentId) {
      return;
    }
    const confirmed = window.confirm(`Excluir permanentemente o aluno ${studentName}? Essa ação não poderá ser desfeita.`);
    if (!confirmed) {
      return;
    }

    setDeletingStudentId(studentId);
    try {
      const result = await deleteStudentAuthed(token, studentId);
      const refreshedAccess = await fetchTeacherAccessStudentsAuthed(token);
      setAccessStudents(refreshedAccess);
      setCoinDrafts(Object.fromEntries(refreshedAccess.map((item) => [item.id, String(item.coins)])));
      setClassDrafts(Object.fromEntries(refreshedAccess.map((item) => [item.id, item.current_class_id ?? ""])));
      const refreshedStudents = await fetchTeacherStudentsAuthed(token);
      setStudents(refreshedStudents);
      showToast(result.message);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Não foi possível excluir o aluno.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
    } finally {
      setDeletingStudentId(null);
    }
  }

  async function handleApproveRequest(requestId: string, fallbackClassId: string) {
    if (!token || approvingRequestId === requestId) {
      return;
    }
    setApprovingRequestId(requestId);
    const request = signupRequests.find((item) => item.id === requestId);
    const username = approvalUsernames[requestId] || request?.full_name.split(" ")[0].toLowerCase() || "aluno";
    const pin = approvalPins[requestId] || "1234";
    try {
      const created = await approveTeacherSignupRequestAuthed(token, requestId, {
        username,
        pin,
        class_id: fallbackClassId,
      });
      setStudents((current) => [...current, created]);
      setSignupRequests((current) => current.filter((request) => request.id !== requestId));
      showToast(`SolicitaÃ§Ã£o aprovada. UsuÃ¡rio do aluno: ${created.username ?? username} | PIN inicial: ${created.student_pin ?? pin}`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel aprovar a solicitaÃ§Ã£o.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
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
        showToast("Questao atualizada com sucesso.");
      } else {
        const created = await createQuestionBankItemAuthed(token, payload);
        setQuestionBankItems((current) => [created, ...current]);
        showToast("Questao adicionada ao banco com sucesso.");
      }

      resetQuestionForm();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar a questÃ£o.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleSubmitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !questionLessonId) {
      return;
    }
    setSavingBatch(true);
    try {
      if (batchQuestionType === "multiple_choice") {
        throw new Error("A criacao em lote rapida funciona melhor com resposta curta ou cronometrada.");
      }
      const rows = parseBatchRows(batchPromptText);
      const createdItems: QuestionBankItem[] = [];

      for (const row of rows) {
        const created = await createQuestionBankItemAuthed(token, {
          lesson_id: questionLessonId,
          prompt: row.prompt,
          exercise_type: batchQuestionType,
          difficulty: row.difficulty || batchDifficulty,
          correct_answer: row.correctAnswer,
          explanation: row.explanation,
          options: [],
          hints: [row.hint],
          estimated_seconds: batchEstimatedSeconds,
          skill: questionSkill,
        });
        createdItems.push(created);
      }

      setQuestionBankItems((current) => [...createdItems.reverse(), ...current]);
      setBatchPromptText("");
      showToast(`${createdItems.length} questoes adicionadas em lote com sucesso.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "NÃ£o foi possÃ­vel importar o lote.";
      setMessage(nextMessage);
      showToast(nextMessage, "error");
    } finally {
      setSavingBatch(false);
    }
  }

  if (user && user.role !== "teacher" && user.role !== "master") {
    return null;
  }

  return (
    <PlatformShell
      heading="Ãrea do professor"
      description="Turmas, banco de questoes, acessos de alunos e visao pedagogica organizada em um painel proprio."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Painel</span>
            <h2 title = "Ãrea com atalhos rÃ¡pidos para o professor">
			Atalhos
			</h2>
          </div>
          <div className="action-launcher-grid">
            <button className="action-launcher" onClick={() => setExpandedArea("classes")} type="button">
              <span className="tag"><Users size={14} /> GestÃ£o de classes</span>
              <strong>Abrir turmas e logins</strong>
              <small>{classes.length} turmas | {students.length} alunos vinculados</small>
            </button>
            <button className="action-launcher" onClick={() => setExpandedArea("create")} type="button">
              <span className="tag"><BookOpenCheck size={14} /> Criar questÃµes</span>
              <strong>Abrir cadastro guiado</strong>
              <small>{questionBankLessons.length} temas base disponiveis</small>
            </button>
            <button className="action-launcher" onClick={() => setExpandedArea("catalog")} type="button">
              <span className="tag"><School size={14} /> Pesquisar no banco</span>
              <strong>Abrir busca e filtros</strong>
              <small>{questionBankItems.length} questoes no banco atual</small>
            </button>
            {user?.role === "teacher" ? (
              <button className="action-launcher" onClick={() => setShowTrailModal(true)} type="button">
                <span className="tag"><Compass size={14} /> Criar trilha</span>
                <strong>Montar mapa por turma</strong>
                <small>{teacherTrails.length} trilhas publicadas pelo professor</small>
              </button>
            ) : null}
          </div>
        </article>

      </section>

      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Alunos</span>
            <h2>Lista gerenciada pelo professor</h2>
            <p>Perfis cadastrados e vinculados ao seu acesso.</p>
          </div>
          <div className="teacher-batch-grid">
            <label>
              Filtrar por turma
              <select className="answer-input" onChange={(event) => setStudentFilterClassId(event.target.value)} value={studentFilterClassId}>
                <option value="todas">Todas as turmas</option>
                {classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                ))}
              </select>
            </label>
            <label>
              Filtrar por escola
              <select className="answer-input" onChange={(event) => setStudentFilterSchoolId(event.target.value)} value={studentFilterSchoolId}>
                <option value="todas">Todas as escolas</option>
                {studentFilterSchools.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="teacher-list">
            {filteredAccessStudents.map((student) => (
              <div key={student.id} className="teacher-row-card stacked">
                <div>
                  <strong>{student.full_name}</strong>
                  <small>{" | "}{student.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><Users size={14} /> {student.grade_band}</span>
                  <span className="tag"><KeyRound size={14} /> usuÃ¡rio: {student.username ?? "-"}</span>
                  <span className="tag highlight">PIN: {student.student_pin ?? "-"}</span>
                  <span className="tag"><School size={14} /> {student.current_class_name ?? "Sem turma"}</span>
                  <span className="tag"><KeyRound size={14} /> moedas: {student.coins}</span>
                  <Link className="tag link-tag" href={`/perfil/${student.id}`}>Ver perfil</Link>
                </div>
                <div className="teacher-batch-grid">
                  <label>
                    Moedas
                    <input
                      className="answer-input"
                      min={0}
                      onChange={(event) => setCoinDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                      type="number"
                      value={coinDrafts[student.id] ?? String(student.coins)}
                    />
                  </label>
                  {(user?.role === "master" || user?.role === "teacher") ? (
                    <label>
                      Turma
                      <select
                        className="answer-input"
                        onChange={(event) => setClassDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                        value={classDrafts[student.id] ?? student.current_class_id ?? ""}
                      >
                        <option value="">Selecione a turma</option>
                        {classes.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
                <div className="inline-metrics">
                  <button className="primary-button" onClick={() => handleSaveStudentManagerSettings(student.id)} type="button">
                    {(user?.role === "master" || user?.role === "teacher") ? "Salvar moedas e turma" : "Salvar moedas"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={deletingStudentId === student.id}
                    onClick={() => handleDeleteStudent(student.id, student.full_name)}
                    type="button"
                  >
                    {deletingStudentId === student.id ? "Excluindo..." : "Excluir aluno"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        {user?.role === "teacher" ? (
          <article className="glass panel">
            <div className="section-title">
              <span>Trilhas</span>
              <h2>Trilhas publicadas</h2>
              <p>Essas trilhas ja estao ligadas as turmas selecionadas e entram no mapa dos alunos automaticamente.</p>
            </div>
            <div className="teacher-list">
              {teacherTrails.length === 0 ? (
                <div className="teacher-row-card stacked">
                  <strong>Nenhuma trilha criada ainda</strong>
                  <p>Use o botao â€œCriar trilhaâ€ para montar um novo mapa para suas turmas.</p>
                </div>
              ) : (
                teacherTrails.map((trail) => (
                  <div key={trail.id} className="teacher-row-card stacked">
                    <div className="teacher-row-copy">
                      <strong>{trail.title}</strong>
                      <small>{trail.activities.length} atividades | {trail.classes.map((item) => item.name).join(", ")}</small>
                    </div>
                    <p>{trail.description || "Trilha publicada sem descricao complementar."}</p>
                    <div className="inline-metrics">
                      {trail.activities.slice(0, 3).map((activity) => (
                        <span key={activity.id} className="tag">
                          {activity.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ) : null}
      </section>

      <ActionModal
        description="Essa janela concentra a navegaÃ§Ã£o pelas turmas e os atalhos para abrir cada classe."
        onClose={() => setExpandedArea(null)}
        open={expandedArea === "classes"}
        subtitle="Turmas"
        title="GestÃ£o de classes"
      >
        <div className="teacher-list">
          {classes.map((classroom) => (
            <div key={classroom.id} className="teacher-row-card">
              <div>
                <strong>{classroom.name}</strong>
					{/*<small>{" | "}{classroom.grade_band}</small>*/}
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
        <div className="teacher-row-card stacked">
          <strong>Dica</strong>
          <p>Quando precisar cadastrar uma nova turma, criar aluno ou aprovar acesso, use os botÃµes secundÃ¡rios da tela principal.</p>
        </div>
      </ActionModal>

      <ActionModal
        description="Aqui o professor alimenta o banco de questÃµes base usado nas missÃµes diÃ¡rias e pode registrar vÃ¡rias questÃµes de forma guiada."
        onClose={closeQuestionCreateModal}
        open={expandedArea === "create"}
        subtitle="Banco de questÃµes"
        title={editingQuestionId ? "Editar questÃ£o" : "Nova questÃ£o"}
      >
        <div className="inline-metrics">
          <span className="tag highlight">{activeLesson ? `${questionCountsByLesson.get(activeLesson.lesson_id) ?? 0} questoes nessa liccao` : "Selecione um tema"}</span>
          <span className="tag success">{activeLesson?.default_skill ?? "Skill padrao"}</span>
        </div>
        <div className="inline-metrics">
          {questionBankLessons.slice(0, 6).map((lesson) => (
            <button
              key={lesson.lesson_id}
              className={`tag link-tag ${questionLessonId === lesson.lesson_id ? "active-toggle" : ""}`}
              onClick={() => {
                setQuestionLessonId(lesson.lesson_id);
                setQuestionSkill(lesson.default_skill);
              }}
              type="button"
            >
              {lesson.lesson_title}
            </button>
          ))}
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
            <span className="tag"><School size={14} /> {activeLesson?.grade_band ?? "Sem sÃ©rie"}</span>
            <button className="tag link-tag" onClick={() => applyLessonPreset(activeLesson)} type="button">
              Usar exemplo guiado
            </button>
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
            NÃ­vel
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
        <div className="teacher-row-card stacked batch-card">
          <div>
            <strong>Criacao rapida em lote</strong>
            <small>Ideal para cadastrar varias questoes objetivas de uma vez no mesmo tema.</small>
          </div>
          <form className="login-form" onSubmit={handleSubmitBatch}>
            <label>
              Tipo do lote
              <select className="answer-input" value={batchQuestionType} onChange={(event) => setBatchQuestionType(event.target.value as (typeof exerciseTypeOptions)[number]["value"])}>
                {exerciseTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="teacher-batch-grid">
              <label>
                NÃ­vel padrÃ£o
                <select className="answer-input" value={batchDifficulty} onChange={(event) => setBatchDifficulty(Number(event.target.value))}>
                  {difficultyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Tempo padrao
                <input className="answer-input" min={10} max={180} type="number" value={batchEstimatedSeconds} onChange={(event) => setBatchEstimatedSeconds(Number(event.target.value))} />
              </label>
            </div>
            <label>
              Linhas do lote
              <textarea
                className="answer-input teacher-batch-textarea"
                rows={7}
                placeholder={"Formato por linha:\nQuanto e 8 + 9? || 17 || 1 || Some os dois numeros. || Some 8 com 9 para obter 17.\nQuanto e 14 + 6? || 20 || 1 || Junte as unidades. || Some 14 com 6 para obter 20."}
                value={batchPromptText}
                onChange={(event) => setBatchPromptText(event.target.value)}
              />
            </label>
            <div className="inline-metrics">
              <span className="tag">enunciado || resposta || nÃ­vel || dica || explicaÃ§Ã£o</span>
              <button className="primary-button" disabled={savingBatch} type="submit">
                {savingBatch ? "Criando lote..." : "Adicionar lote"}
              </button>
            </div>
          </form>
        </div>
      </ActionModal>

      <ActionModal
        description="Essa janela concentra a busca no banco. O catalogo continua recolhido na tela principal e so abre quando o professor realmente quer pesquisar."
        onClose={closeQuestionCatalogModal}
        open={expandedArea === "catalog"}
        subtitle="Catalogo"
        title="Pesquisar questoes salvas"
      >
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
            SÃ©rie mÃ­nima
            <select className="answer-input" value={filterGradeBand} onChange={(event) => setFilterGradeBand(event.target.value)}>
              <option value="todas">Todas as sÃ©ries</option>
              {gradeBandOptions.map((gradeBand) => (
                <option key={gradeBand} value={gradeBand}>{gradeBand}</option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select className="answer-input" value={filterExerciseType} onChange={(event) => setFilterExerciseType(event.target.value)}>
              <option value="todos">Todos os tipos</option>
              {exerciseTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            NÃ­vel
            <select className="answer-input" value={filterDifficulty} onChange={(event) => setFilterDifficulty(event.target.value)}>
              <option value="todas">Todos os niveis</option>
              {difficultyOptions.map((option) => (
                <option key={option.value} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Buscar
            <input className="answer-input" value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} />
          </label>
          <label>
            Ordenar por
            <select className="answer-input" value={sortBy} onChange={(event) => setSortBy(event.target.value as (typeof sortOptions)[number]["value"])}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="inline-metrics">
          <span className="tag"><BookOpenCheck size={14} /> {hasQuestionSearch ? filteredQuestionBankItems.length : 0} questoes visiveis</span>
          <span className="tag"><School size={14} /> {questionBankLessons.length} temas predefinidos</span>
          {availableThemes.map((theme) => (
            <button
              key={theme}
              className={`tag link-tag ${filterTheme === theme ? "active-toggle" : ""}`}
              onClick={() => setFilterTheme((current) => current === theme ? "todos" : theme)}
              type="button"
            >
              {theme} ({questionCountsByTheme.get(theme) ?? 0})
            </button>
          ))}
        </div>
        {!hasQuestionSearch ? (
          <div className="teacher-row-card stacked">
            <strong>Comece pela busca</strong>
            <p>Escolha um tema, sÃ©rie, nÃ­vel ou digite uma palavra para abrir os resultados do banco de questÃµes.</p>
          </div>
        ) : (
          <div className="teacher-list">
            {filteredQuestionBankItems.map((item) => (
              <div key={item.id} className="teacher-row-card stacked">
                <div>
                  <strong>{formatMathText(item.prompt)}</strong>
                  <small>{item.theme} | {item.lesson_title} | {item.grade_band}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag">nÃ­vel {item.difficulty}</span>
                  <span className="tag">{item.exercise_type}</span>
                  <span className="tag">{item.skill}</span>
                  <span className="tag">{item.estimated_seconds}s</span>
                </div>
                <p><strong>Resposta:</strong> {formatMathText(item.correct_answer)}</p>
                <p>{formatMathText(item.explanation)}</p>
                {item.options.length > 0 ? (
                  <p><strong>Alternativas:</strong> {item.options.map((option) => formatMathText(option.label)).join(" | ")}</p>
                ) : null}
                <div className="inline-metrics">
                  <button className="primary-button" onClick={() => openQuestionEditorFromCatalog(item)} type="button">
                    <UserRoundCog size={16} />
                    Editar
                  </button>
                  <button className="tag link-tag" onClick={() => openQuestionDuplicateFromCatalog(item)} type="button">
                    Duplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ActionModal>

      <CreateTrailModal
        classes={classes}
        isSaving={savingTrail}
        onClose={() => setShowTrailModal(false)}
        onSubmit={handleCreateTrail}
        open={showTrailModal}
        questionBankItems={questionBankItems}
      />
    </PlatformShell>
  );
}

