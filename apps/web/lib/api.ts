import {
  AuthUser,
  BootstrapData,
  ClassReport,
  DailyMission,
  ProfileInventory,
  ProfileView,
  ShopData,
  RewardsOverview,
  fallbackBootstrapData,
  fallbackClassReport,
  fallbackDailyMission,
  fallbackForumTopics,
  fallbackForumTopicDetail,
  fallbackProfileInventory,
  fallbackProfileView,
  fallbackShopData,
  fallbackRewardsOverview,
  fallbackQuestionBankItems,
  fallbackQuestionBankLessons,
  fallbackStudentReport,
  fallbackTeacherClasses,
  fallbackTeachers,
  ForumTopic,
  ForumTopicDetail,
  StudentMiniProfile,
  StudentReport,
  TeacherClassSummary,
  TeacherDirectoryItem,
  TutorFeedback,
  LoginResponse,
  PublicClassOption,
  QuestionBankItem,
  QuestionBankLessonOption,
  RegisterPayload,
  SignupRequestSummary,
} from "@/lib/data";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const serverApiUrl = process.env.API_URL ?? publicApiUrl;

async function safeFetch<T>(url: string, init?: RequestInit, fallback?: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error("Request failed");
  }
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (payload?.detail) {
      return String(payload.detail);
    }
  } catch {
    try {
      const text = await response.text();
      if (text) {
        return text;
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchBootstrapData(): Promise<BootstrapData> {
  return safeFetch(`${serverApiUrl}/api/bootstrap`, undefined, fallbackBootstrapData);
}

export async function fetchDailyMissionAuthed(token: string): Promise<DailyMission> {
  return safeFetch(
    `${publicApiUrl}/api/daily-mission`,
    {
      headers: authHeaders(token),
    },
    fallbackDailyMission,
  );
}

export async function fetchTeacherToken(): Promise<string | null> {
  try {
    const response = await fetch(`${serverApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        email: "carla@matematica.local",
        password: "Professor@123",
      }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { token: string };
    return payload.token;
  } catch {
    return null;
  }
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${publicApiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error("Credenciais invalidas.");
  }

  return (await response.json()) as LoginResponse;
}

export async function registerRequest(payload: RegisterPayload): Promise<LoginResponse> {
  const response = await fetch(`${publicApiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, "Nao foi possivel criar a conta.");
    throw new Error(message || "Nao foi possivel criar a conta.");
  }

  return (await response.json()) as LoginResponse;
}

export async function fetchPublicClasses(): Promise<PublicClassOption[]> {
  return safeFetch(`${publicApiUrl}/api/public/classes`, undefined, []);
}

export async function createStudentSignupRequest(payload: {
  class_id: string;
  full_name: string;
  email: string;
  note?: string;
}) {
  const response = await fetch(`${publicApiUrl}/api/auth/student-signup-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, "Nao foi possivel enviar a solicitacao.");
    throw new Error(message || "Nao foi possivel enviar a solicitacao.");
  }

  return (await response.json()) as { message: string };
}

export async function fetchMe(token: string): Promise<AuthUser> {
  return safeFetch(`${publicApiUrl}/api/auth/me`, { headers: authHeaders(token) });
}

export async function updateProfileAuthed(
  token: string,
  userId: string,
  payload: {
    full_name?: string;
    avatar_url?: string;
    bio?: string;
  },
): Promise<AuthUser> {
  const response = await fetch(`${publicApiUrl}/api/profiles/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel atualizar o perfil."));
  }

  return (await response.json()) as AuthUser;
}

export async function fetchProfileInventoryAuthed(token: string, userId: string): Promise<ProfileInventory> {
  return safeFetch(
    `${publicApiUrl}/api/profiles/${userId}/inventory`,
    {
      headers: authHeaders(token),
    },
    fallbackProfileInventory,
  );
}

export async function fetchProfileViewAuthed(token: string, userId: string): Promise<ProfileView> {
  const response = await fetch(`${publicApiUrl}/api/profiles/${userId}/view`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Nao foi possivel carregar este perfil.");
  }

  return (await response.json()) as ProfileView;
}

export async function equipProfileItemAuthed(token: string, userId: string, itemId: string): Promise<ProfileInventory> {
  const response = await fetch(`${publicApiUrl}/api/profiles/${userId}/equip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ item_id: itemId }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel equipar o item."));
  }

  return (await response.json()) as ProfileInventory;
}

export async function fetchRewardsOverviewAuthed(token: string, userId: string): Promise<RewardsOverview> {
  return safeFetch(
    `${publicApiUrl}/api/profiles/${userId}/rewards`,
    {
      headers: authHeaders(token),
    },
    fallbackRewardsOverview,
  );
}

export async function fetchShopAuthed(token: string, userId: string): Promise<ShopData> {
  return safeFetch(
    `${publicApiUrl}/api/profiles/${userId}/shop`,
    {
      headers: authHeaders(token),
    },
    fallbackShopData,
  );
}

export async function purchaseShopItemAuthed(token: string, userId: string, itemId: string): Promise<ShopData> {
  const response = await fetch(`${publicApiUrl}/api/profiles/${userId}/shop/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ item_id: itemId }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel comprar este item."));
  }

  return (await response.json()) as ShopData;
}

export async function fetchForumTopics(): Promise<ForumTopic[]> {
  const token = await fetchTeacherToken();
  if (!token) {
    return fallbackForumTopics;
  }
  return safeFetch(
    `${serverApiUrl}/api/forum/topics`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    fallbackForumTopics,
  );
}

export async function fetchForumTopicsAuthed(token: string): Promise<ForumTopic[]> {
  return safeFetch(
    `${publicApiUrl}/api/forum/topics`,
    {
      headers: authHeaders(token),
    },
    fallbackForumTopics,
  );
}

export async function fetchForumTopicDetailAuthed(token: string, topicId: string): Promise<ForumTopicDetail> {
  return safeFetch(
    `${publicApiUrl}/api/forum/topics/${topicId}`,
    {
      headers: authHeaders(token),
    },
    fallbackForumTopicDetail,
  );
}

export async function fetchTeacherClasses(): Promise<TeacherClassSummary[]> {
  const token = await fetchTeacherToken();
  if (!token) {
    return fallbackTeacherClasses;
  }
  return safeFetch(
    `${serverApiUrl}/api/teacher/classes`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    fallbackTeacherClasses,
  );
}

export async function fetchTeacherClassesAuthed(token: string): Promise<TeacherClassSummary[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/classes`,
    {
      headers: authHeaders(token),
    },
    fallbackTeacherClasses,
  );
}

export async function fetchTeacherStudentsAuthed(token: string): Promise<StudentMiniProfile[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/students`,
    {
      headers: authHeaders(token),
    },
    [fallbackStudentReport.student],
  );
}

export async function fetchTeacherSignupRequestsAuthed(token: string): Promise<SignupRequestSummary[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/signup-requests`,
    {
      headers: authHeaders(token),
    },
    [],
  );
}

export async function fetchQuestionBankMetaAuthed(token: string): Promise<QuestionBankLessonOption[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/question-bank/meta`,
    {
      headers: authHeaders(token),
    },
    fallbackQuestionBankLessons,
  );
}

export async function fetchQuestionBankAuthed(token: string): Promise<QuestionBankItem[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/question-bank`,
    {
      headers: authHeaders(token),
    },
    fallbackQuestionBankItems,
  );
}

export async function fetchStudentReport(studentId = "student-001"): Promise<StudentReport> {
  const token = await fetchTeacherToken();
  if (!token) {
    return fallbackStudentReport;
  }
  return safeFetch(
    `${serverApiUrl}/api/students/${studentId}/report`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    fallbackStudentReport,
  );
}

export async function fetchStudentReportAuthed(token: string, studentId = "student-001"): Promise<StudentReport> {
  return safeFetch(
    `${publicApiUrl}/api/students/${studentId}/report`,
    {
      headers: authHeaders(token),
    },
    fallbackStudentReport,
  );
}

export async function fetchClassReport(classId = "class-001"): Promise<ClassReport> {
  const token = await fetchTeacherToken();
  if (!token) {
    return fallbackClassReport;
  }
  return safeFetch(
    `${serverApiUrl}/api/teacher/classes/${classId}/report`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    fallbackClassReport,
  );
}

export async function fetchClassReportAuthed(token: string, classId = "class-001"): Promise<ClassReport> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/classes/${classId}/report`,
    {
      headers: authHeaders(token),
    },
    fallbackClassReport,
  );
}

export async function fetchTeachers(): Promise<TeacherDirectoryItem[]> {
  try {
    const response = await fetch(`${serverApiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        email: "master@matematica.local",
        password: "Master@123",
      }),
    });
    if (!response.ok) {
      return fallbackTeachers;
    }
    const payload = (await response.json()) as { token: string };
    return await safeFetch(
      `${serverApiUrl}/api/master/teachers`,
      {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      },
      fallbackTeachers,
    );
  } catch {
    return fallbackTeachers;
  }
}

export async function fetchTeachersAuthed(token: string): Promise<TeacherDirectoryItem[]> {
  return safeFetch(
    `${publicApiUrl}/api/master/teachers`,
    {
      headers: authHeaders(token),
    },
    fallbackTeachers,
  );
}

export async function createTeacherClassAuthed(token: string, payload: { name: string; grade_band: string }) {
  const response = await fetch(`${publicApiUrl}/api/teacher/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel criar a turma."));
  }

  return (await response.json()) as TeacherClassSummary;
}

export async function createTeacherStudentAuthed(
  token: string,
  payload: {
    full_name: string;
    email: string;
    password: string;
    grade_band: string;
    bio?: string;
    class_id?: string | null;
  },
): Promise<StudentMiniProfile> {
  const response = await fetch(`${publicApiUrl}/api/teacher/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel criar o aluno."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function approveTeacherSignupRequestAuthed(
  token: string,
  requestId: string,
  payload: { password: string; class_id?: string | null },
): Promise<StudentMiniProfile> {
  const response = await fetch(`${publicApiUrl}/api/teacher/signup-requests/${requestId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel aprovar a solicitacao."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function createQuestionBankItemAuthed(
  token: string,
  payload: {
    lesson_id: string;
    prompt: string;
    exercise_type: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
    difficulty: number;
    correct_answer: string;
    explanation: string;
    options: { id: string; label: string; value: string }[];
    hints: string[];
    estimated_seconds: number;
    skill?: string | null;
  },
): Promise<QuestionBankItem> {
  const response = await fetch(`${publicApiUrl}/api/teacher/question-bank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel criar a questao."));
  }

  return (await response.json()) as QuestionBankItem;
}

export async function updateQuestionBankItemAuthed(
  token: string,
  exerciseId: string,
  payload: {
    lesson_id?: string;
    prompt?: string;
    exercise_type?: "multiple_choice" | "input" | "drag_drop" | "step_by_step" | "timed";
    difficulty?: number;
    correct_answer?: string;
    explanation?: string;
    options?: { id: string; label: string; value: string }[];
    hints?: string[];
    estimated_seconds?: number;
    skill?: string | null;
  },
): Promise<QuestionBankItem> {
  const response = await fetch(`${publicApiUrl}/api/teacher/question-bank/${exerciseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel atualizar a questao."));
  }

  return (await response.json()) as QuestionBankItem;
}

export async function createForumTopicAuthed(
  token: string,
  payload: {
    class_id?: string | null;
    author_id: string;
    title: string;
    body: string;
    tags: string[];
    topic_type: "discussion" | "challenge" | "activity";
    due_at?: string | null;
  },
): Promise<ForumTopic> {
  const response = await fetch(`${publicApiUrl}/api/forum/topics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel criar o topico."));
  }

  return (await response.json()) as ForumTopic;
}

export async function deleteForumTopicAuthed(token: string, topicId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/forum/topics/${topicId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel excluir o topico."));
  }

  return (await response.json()) as { message: string };
}

export async function createForumPostAuthed(
  token: string,
  topicId: string,
  payload: {
    author_id: string;
    body: string;
  },
): Promise<ForumTopicDetail> {
  const response = await fetch(`${publicApiUrl}/api/forum/topics/${topicId}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Nao foi possivel responder ao topico."));
  }

  return (await response.json()) as ForumTopicDetail;
}

export async function submitExerciseAttempt(
  studentId: string,
  exerciseId: string,
  answer: string,
  elapsedSeconds: number,
): Promise<TutorFeedback> {
  const response = await fetch(`${publicApiUrl}/api/exercise-attempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      student_id: studentId,
      exercise_id: exerciseId,
      answer,
      elapsed_seconds: elapsedSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel enviar a resposta do exercicio.");
  }

  return (await response.json()) as TutorFeedback;
}
