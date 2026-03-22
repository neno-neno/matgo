"use client";

import { School } from "@/lib/icons";
import { TeacherClassSummary } from "@/lib/data";

type ClassSelectorProps = {
  classes: TeacherClassSummary[];
  selectedClassIds: string[];
  onToggle: (classId: string) => void;
};

export function ClassSelector({ classes, selectedClassIds, onToggle }: ClassSelectorProps) {
  return (
    <div className="teacher-list">
      {classes.map((classroom) => {
        const checked = selectedClassIds.includes(classroom.id);
        return (
          <label key={classroom.id} className={`teacher-row-card ${checked ? "active-toggle" : ""}`}>
            <div className="teacher-row-copy">
              <strong>{classroom.name}</strong>
              <small>{classroom.grade_band} | {classroom.students_count} alunos</small>
            </div>
            <div className="inline-metrics">
              <span className="tag">
                <School size={14} />
                {classroom.average_accuracy}% media
              </span>
              <input checked={checked} onChange={() => onToggle(classroom.id)} type="checkbox" />
            </div>
          </label>
        );
      })}
    </div>
  );
}
