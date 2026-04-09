"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy } from "@/lib/icons";

import { useAuth } from "@/components/auth-provider";
import { PageLoadingState } from "@/components/page-loading-state";
import { PlatformShell } from "@/components/platform-shell";
import { fetchClassReportAuthed, fetchTeacherClassesAuthed } from "@/lib/api";
import { ClassReport, TeacherClassSummary } from "@/lib/data";

export default function RelatoriosPage() {
  const { token, user } = useAuth();
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || (user?.role !== "teacher" && user?.role !== "master")) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchTeacherClassesAuthed(token)
      .then((items) => {
        if (cancelled) {
          return;
        }
        setClasses(items);
        const nextClassId = items[0]?.id ?? "";
        setSelectedClassId((current) => current || nextClassId);
      })
      .catch(() => {
        if (!cancelled) {
          setClasses([]);
          setSelectedClassId("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || !selectedClassId || (user?.role !== "teacher" && user?.role !== "master")) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchClassReportAuthed(token, selectedClassId)
      .then((report) => {
        if (!cancelled) {
          setClassReport(report);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClassReport(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, token, user?.role]);

  if (isLoading || !classReport) {
    return (
      <PlatformShell heading="Relatórios" description="Leitura individual e coletiva de progresso, ranking, forças e pontos de intervenção.">
        <PageLoadingState
          title="Carregando relatórios"
          subtitle="Buscando turmas e métricas reais antes de montar os relatórios da turma."
        />
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      heading="Relatórios"
      description="Leitura individual e coletiva de progresso, ranking, forças e pontos de intervenção."
    >
      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Turma</span>
            <h2>{classReport.class_info.name}</h2>
            <p>{classReport.class_info.students_count} alunos | {classReport.class_info.average_accuracy}% de média geral</p>
          </div>
          <div className="inline-metrics">
            {classes.map((classroom) => (
              <button
                key={classroom.id}
                className={`tag link-tag ${selectedClassId === classroom.id ? "active-toggle" : ""}`}
                onClick={() => setSelectedClassId(classroom.id)}
                type="button"
              >
                {classroom.name}
              </button>
            ))}
          </div>
          <div className="rank-list">
            {classReport.ranking.map((entry) => (
              <Link key={entry.student_id} className="rank-item rank-link-card" href={`/perfil/${entry.student_id}`}>
                <strong>#{entry.position}</strong>
                <div>
                  <span>{entry.student_name}</span>
                  <small> {entry.xp} XP | {entry.accuracy}% acerto</small>
                </div>
                <Trophy size={18} />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="glass panel">
          <div className="section-title">
            <span>Panorama</span>
            <h2>Forças coletivas</h2>
            <p>Conceitos em que a turma está mais confiante.</p>
          </div>
          <div className="tag-row">
            {classReport.top_strengths.map((topic) => (
              <span key={topic} className="tag success">{topic}</span>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <div className="section-title">
            <span>Intervenção</span>
            <h2>Pontos de reforço</h2>
            <p>Assuntos que pedem mais revisão e alunos para acompanhamento.</p>
          </div>
          <div className="tag-row">
            {classReport.top_weaknesses.map((topic) => (
              <span key={topic} className="tag warning">{topic}</span>
            ))}
          </div>
          <div className="attention-list">
            {classReport.students_needing_attention.map((student) => (
              <div key={student.id} className="teacher-row-card">
                <div>
                  <strong>
                    <Link href={`/perfil/${student.id}`}>{student.full_name}</Link>
                  </strong>
                  <small>{student.accuracy}% acerto</small>
                </div>
                <span className="tag">{student.weak_areas.join(", ")}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PlatformShell>
  );
}
