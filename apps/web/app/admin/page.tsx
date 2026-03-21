"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserRoundCog } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PlatformShell } from "@/components/platform-shell";
import { fetchTeachersAuthed } from "@/lib/api";
import { fallbackTeachers, TeacherDirectoryItem } from "@/lib/data";

export default function AdminPage() {
  const { token, user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherDirectoryItem[]>(fallbackTeachers);

  useEffect(() => {
    if (!token || user?.role !== "master") {
      return;
    }
    fetchTeachersAuthed(token).then(setTeachers).catch(() => setTeachers(fallbackTeachers));
  }, [token, user?.role]);

  return (
    <PlatformShell
      heading="Area master"
      description="Visao administrativa para supervisionar professores, acessos e organizacao do campus."
    >
      <section className="section-stack">
        <article className="glass panel">
          <div className="section-title">
            <span>Governanca</span>
            <h2>Professores cadastrados</h2>
            <p>Base pronta para evoluir para multi-escola, subdominios e administracao segmentada.</p>
          </div>
          <div className="teacher-list">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teacher-row-card">
                <div>
                  <strong>{teacher.full_name}</strong>
                  <small>{teacher.email}</small>
                </div>
                <div className="inline-metrics">
                  <span className="tag"><UserRoundCog size={14} /> {teacher.grade_band ?? "multiserie"}</span>
                  <span className="tag"><ShieldCheck size={14} /> {teacher.students_count} alunos</span>
                  <span className="tag"><KeyRound size={14} /> acesso ativo</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
