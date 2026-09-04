"use client";

import { useRef } from "react";
import { SKILLS, GROUPS, type ProjectSkill } from "@/data/skills";

function FullViz() {
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

function CompactViz({ skills }: { skills: ProjectSkill[] }) {
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);

  const adjustTooltip = (i: number) => {
    const tooltip = tooltipRefs.current[i];
    if (!tooltip) return;

    // Reset to default centered position
    tooltip.style.left = "";
    tooltip.style.right = "";
    tooltip.style.transform = "";

    const rect = tooltip.getBoundingClientRect();

    if (rect.left < 8) {
      tooltip.style.left = "0";
      tooltip.style.transform = "none";
    } else if (rect.right > window.innerWidth - 8) {
      tooltip.style.left = "auto";
      tooltip.style.right = "0";
      tooltip.style.transform = "none";
    }
  };

  return (
    <div className="flex items-end gap-[3px] h-8">
      {skills.map((skill, i) => (
        <div
          key={i}
          className="relative group/bar w-[10px] h-full flex items-end"
          onMouseEnter={() => adjustTooltip(i)}
        >
          <div
            ref={(el) => { tooltipRefs.current[i] = el; }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-mono text-white/90 bg-[#0e0e10] border border-white/[0.08] rounded whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity duration-100 pointer-events-none z-50"
          >
            {skill.name}
          </div>
          <div
            className="w-full rounded-[1px]"
            style={{
              height: `${skill.score * 10}%`,
              backgroundColor: "#FF5F15",
              opacity: skill.score === 0 ? 0.08 : 0.2 + (skill.score / 10) * 0.7,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function SkillsViz({
  variant = "full",
  skills = SKILLS,
}: {
  variant?: "full" | "compact";
  skills?: ProjectSkill[];
}) {
  return variant === "compact" ? <CompactViz skills={skills} /> : <FullViz />;
}
