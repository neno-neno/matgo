import {
  AuthUser,
  BootstrapData,
  ClassReport,
  DailyMission,
  ProfileInventory,
  ProfileView,
  ShopData,
  RewardsOverview,
  StudentInsightsResponse,
  StudentLearningTrailsData,
  fallbackBootstrapData,
  fallbackClassReport,
  fallbackDailyMission,
  fallbackForumTopics,
  fallbackForumTopicDetail,
  fallbackProfileInventory,
  fallbackProfileView,
  fallbackShopData,
  fallbackRewardsOverview,
  fallbackStudentInsights,
  fallbackStudentReport,
  fallbackStudentLearningTrails,
  fallbackTeacherClasses,
  fallbackTeachers,
  ForumTopic,
  ForumTopicDetail,
  StudentMiniProfile,
  StudentReport,
  TeacherAccessStudent,
  TeacherClassSummary,
  TeacherDirectoryItem,
  TeacherTrail,
  TeacherTrailCreatePayload,
  TutorFeedback,
  LoginResponse,
  PublicClassOption,
  QuestionBankItem,
  QuestionBankLessonOption,
  RegisterPayload,
  SchoolSummary,
  SignupRequestSummary,
  TeacherPasswordResetApprovalResponse,
  TeacherPasswordResetRequestSummary,
} from "@/lib/data";

function normalizeApiUrl(value: string | undefined, fallback: string) {
  const normalized = (value ?? fallback).replace(/\s+/g, "").replace(/\/+$/, "");
  return normalized || fallback;
}

const publicApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL, "http://127.0.0.1:8000");
const serverApiUrl = normalizeApiUrl(process.env.API_URL, publicApiUrl);

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

export async function fetchStudentInsightsAuthed(token: string): Promise<StudentInsightsResponse> {
  return safeFetch(
    `${publicApiUrl}/api/student/insights`,
    {
      headers: authHeaders(token),
    },
    fallbackStudentInsights,
  );
}

export async function recordStudySessionPingAuthed(token: string, routePath: string, classId?: string | null): Promise<void> {
  const response = await fetch(`${publicApiUrl}/api/study-session/ping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      route_path: routePath,
      class_id: classId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível registrar o tempo de estudo."));
  }
}

export async function fetchStudentLearningTrailsAuthed(token: string): Promise<StudentLearningTrailsData> {
  return safeFetch(
    `${publicApiUrl}/api/student/learning-trails`,
    {
      headers: authHeaders(token),
    },
    fallbackStudentLearningTrails,
  );
}

export async function completeStudentTrailActivityAuthed(token: string, activityId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/student/trail-activities/${activityId}/complete`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível concluir a atividade da trilha."));
  }

  return (await response.json()) as { message: string };
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

export async function loginRequest(identifier: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${publicApiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    throw new Error("Credenciais inválidas.");
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
    const message = await extractErrorMessage(response, "Não foi possível criar a conta.");
    throw new Error(message || "Não foi possível criar a conta.");
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
    const message = await extractErrorMessage(response, "Não foi possível enviar a solicitação.");
    throw new Error(message || "Não foi possível enviar a solicitação.");
  }

  return (await response.json()) as { message: string };
}

export async function createTeacherPasswordResetRequest(email: string) {
  const response = await fetch(`${publicApiUrl}/api/auth/teacher-password-reset-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response, "Não foi possível registrar a solicitação de redefinição.");
    throw new Error(message || "Não foi possível registrar a solicitação de redefinição.");
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
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar o perfil."));
  }

  return (await response.json()) as AuthUser;
}

export async function changeTeacherPasswordAuthed(
  token: string,
  userId: string,
  payload: { current_password: string; new_password: string },
): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/profiles/${userId}/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível alterar a senha."));
  }

  return (await response.json()) as { message: string };
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
    throw new Error(errorText || "Não foi possível carregar este perfil.");
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
    throw new Error(await extractErrorMessage(response, "Não foi possível equipar o item."));
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
    throw new Error(await extractErrorMessage(response, "Não foi possível comprar este item."));
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

export async function fetchForumTopicsAuthed(token: string, classIds?: string[]): Promise<ForumTopic[]> {
  const query = classIds && classIds.length > 0
    ? `?${classIds.map((classId) => `class_ids=${encodeURIComponent(classId)}`).join("&")}`
    : "";
  return safeFetch(
    `${publicApiUrl}/api/forum/topics${query}`,
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

export async function fetchTeacherTrailsAuthed(token: string): Promise<TeacherTrail[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/trails`,
    {
      headers: authHeaders(token),
    },
    [],
  );
}

export async function createTeacherTrailAuthed(token: string, payload: TeacherTrailCreatePayload): Promise<TeacherTrail> {
  const response = await fetch(`${publicApiUrl}/api/teacher/trails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível criar a trilha."));
  }

  return (await response.json()) as TeacherTrail;
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
  return safeFetch(`${publicApiUrl}/api/teacher/question-bank/meta`, {
    headers: authHeaders(token),
  });
}

export async function fetchQuestionBankAuthed(token: string): Promise<QuestionBankItem[]> {
  return safeFetch(`${publicApiUrl}/api/teacher/question-bank`, {
    headers: authHeaders(token),
  });
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

export async function fetchSchoolsAuthed(token: string): Promise<SchoolSummary[]> {
  return safeFetch(
    `${publicApiUrl}/api/master/schools`,
    {
      headers: authHeaders(token),
    },
  );
}

export async function createSchoolAuthed(
  token: string,
  payload: { name: string; address?: string | null; director_name?: string | null },
): Promise<SchoolSummary> {
  const response = await fetch(`${publicApiUrl}/api/master/schools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível cadastrar a escola."));
  }

  return (await response.json()) as SchoolSummary;
}

export async function updateSchoolAuthed(
  token: string,
  schoolId: string,
  payload: { name: string; address?: string | null; director_name?: string | null },
): Promise<SchoolSummary> {
  const response = await fetch(`${publicApiUrl}/api/master/schools/${schoolId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar a escola."));
  }

  return (await response.json()) as SchoolSummary;
}

export async function fetchTeacherPasswordResetRequestsAuthed(token: string): Promise<TeacherPasswordResetRequestSummary[]> {
  return safeFetch(`${publicApiUrl}/api/master/teacher-password-resets`, {
    headers: authHeaders(token),
  }, []);
}

export async function approveTeacherPasswordResetRequestAuthed(
  token: string,
  requestId: string,
): Promise<TeacherPasswordResetApprovalResponse> {
  const response = await fetch(`${publicApiUrl}/api/master/teacher-password-resets/${requestId}/approve`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível aprovar a redefinição de senha do professor."));
  }

  return (await response.json()) as TeacherPasswordResetApprovalResponse;
}

export async function createTeacherClassAuthed(token: string, payload: { name: string; grade_band: string; school_id: string; teacher_id?: string | null }) {
  const response = await fetch(`${publicApiUrl}/api/teacher/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível criar a turma."));
  }

  return (await response.json()) as TeacherClassSummary;
}

export async function createTeacherStudentAuthed(
  token: string,
  payload: {
    full_name: string;
    email: string;
    username: string;
    pin: string;
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
    throw new Error(await extractErrorMessage(response, "Não foi possível criar o aluno."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function fetchTeacherAccessStudentsAuthed(token: string): Promise<TeacherAccessStudent[]> {
  return safeFetch(
    `${publicApiUrl}/api/teacher/access-logins`,
    {
      headers: authHeaders(token),
    },
    [],
  );
}

export async function updateStudentCoinsAuthed(token: string, studentId: string, coins: number): Promise<StudentMiniProfile> {
  const response = await fetch(`${publicApiUrl}/api/teacher/students/${studentId}/coins`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ coins }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar as moedas do aluno."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function deleteStudentAuthed(token: string, studentId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/teacher/students/${studentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível excluir o aluno."));
  }

  return (await response.json()) as { message: string };
}

export async function reassignStudentClassAuthed(token: string, studentId: string, classId: string): Promise<StudentMiniProfile> {
  const response = await fetch(`${publicApiUrl}/api/teacher/students/${studentId}/class`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ class_id: classId }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível mover o aluno de turma."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function resetTeacherStudentPasswordAuthed(
  token: string,
  studentId: string,
): Promise<{ message: string; temporary_pin: string }> {
  const response = await fetch(`${publicApiUrl}/api/teacher/students/${studentId}/reset-password`, {
    method: "POST",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível redefinir a senha do aluno."));
  }

  return (await response.json()) as { message: string; temporary_pin: string };
}

export async function approveTeacherSignupRequestAuthed(
  token: string,
  requestId: string,
  payload: { username: string; pin: string; class_id?: string | null },
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
    throw new Error(await extractErrorMessage(response, "Não foi possível aprovar a solicitação."));
  }

  return (await response.json()) as StudentMiniProfile;
}

export async function rejectTeacherSignupRequestAuthed(token: string, requestId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/teacher/signup-requests/${requestId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível rejeitar a solicitação."));
  }

  return (await response.json()) as { message: string };
}

export async function fetchTeacherAccessCodeAuthed(token: string): Promise<{ access_code: string }> {
  return safeFetch(`${publicApiUrl}/api/master/settings/teacher-access-code`, {
    headers: authHeaders(token),
  });
}

export async function updateTeacherAccessCodeAuthed(token: string, accessCode: string): Promise<{ access_code: string }> {
  const response = await fetch(`${publicApiUrl}/api/master/settings/teacher-access-code`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ access_code: accessCode }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar o código de acesso."));
  }

  return (await response.json()) as { access_code: string };
}

export async function assignClassTeacherAuthed(token: string, classId: string, teacherId: string): Promise<TeacherClassSummary> {
  const response = await fetch(`${publicApiUrl}/api/master/classes/${classId}/assign-teacher`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ teacher_id: teacherId }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível vincular a turma ao professor."));
  }

  return (await response.json()) as TeacherClassSummary;
}

export async function updateClassAuthed(
  token: string,
  classId: string,
  payload: { name: string; grade_band: string; school_id: string },
): Promise<TeacherClassSummary> {
  const response = await fetch(`${publicApiUrl}/api/master/classes/${classId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar a turma."));
  }

  return (await response.json()) as TeacherClassSummary;
}

export async function deleteClassAuthed(token: string, classId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/master/classes/${classId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível excluir a turma."));
  }

  return (await response.json()) as { message: string };
}

export async function deleteTeacherAuthed(token: string, teacherId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/master/teachers/${teacherId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível excluir o professor."));
  }

  return (await response.json()) as { message: string };
}

export async function deleteSchoolAuthed(token: string, schoolId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/master/schools/${schoolId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível excluir a escola."));
  }

  return (await response.json()) as { message: string };
}

export async function updateUserEmailAuthed(token: string, userId: string, email: string): Promise<LoginResponse["user"]> {
  const response = await fetch(`${publicApiUrl}/api/master/users/${userId}/email`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar o e-mail."));
  }

  return (await response.json()) as LoginResponse["user"];
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
    throw new Error(await extractErrorMessage(response, "Não foi possível criar a questão."));
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
    throw new Error(await extractErrorMessage(response, "Não foi possível atualizar a questão."));
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
    throw new Error(await extractErrorMessage(response, "Não foi possível criar o tópico."));
  }

  return (await response.json()) as ForumTopic;
}

export async function deleteForumTopicAuthed(token: string, topicId: string): Promise<{ message: string }> {
  const response = await fetch(`${publicApiUrl}/api/forum/topics/${topicId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível excluir o tópico."));
  }

  return (await response.json()) as { message: string };
}

export async function updateForumTopicClassAuthed(token: string, topicId: string, classId: string): Promise<ForumTopic> {
  const response = await fetch(`${publicApiUrl}/api/forum/topics/${topicId}/class`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ class_id: classId }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Não foi possível alterar a turma do tópico."));
  }

  return (await response.json()) as ForumTopic;
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
    throw new Error(await extractErrorMessage(response, "Não foi possível responder ao tópico."));
  }

  return (await response.json()) as ForumTopicDetail;
}

export async function submitExerciseAttempt(
  token: string,
  studentId: string,
  exerciseId: string,
  answer: string,
  elapsedSeconds: number,
  classId?: string | null,
): Promise<TutorFeedback> {
  const response = await fetch(`${publicApiUrl}/api/exercise-attempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      student_id: studentId,
      exercise_id: exerciseId,
      class_id: classId ?? null,
      answer,
      elapsed_seconds: elapsedSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível enviar a resposta do exercício.");
  }

  return (await response.json()) as TutorFeedback;
}
