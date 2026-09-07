"use client";

import { SKILLS, GROUPS } from "@/data/skills";

export function SkillsViz() {
  return (
    <div className="flex flex-col lg:flex-row">
      {GROUPS.map(({ key, label }) => {
        const skills = SKILLS.filter((s) => s.group === key);
        return (
          <div key={key} className="break-inside-avoid flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-white/60 py-4 border-b border-white/[0.06]">
              {label}
            </p>
            <div>
              {skills.map((skill) => (
                <div 
                  key={skill.name} 
                  className="flex flex-row lg:flex-col items-center lg:items-start gap-1 pt-2 pb-3 border-b-1 border-white/[.06]"
                >
                  <span className="min-w-45 text-lg text-white/90 shrink-0 truncate">
                    {skill.name}
                  </span>
                  <div className="flex gap-2 w-full justify-end lg:justify-start">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            i < skill.score
                              ? "#FF5F15"
                              : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
