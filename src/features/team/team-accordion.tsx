"use client";

import Image from "next/image";
import { useState } from "react";

import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";

import type { TeamMember } from "./team-data";

interface TeamAccordionProps {
  members: readonly TeamMember[];
  className?: string;
}

export function TeamAccordion({ members, className }: TeamAccordionProps) {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <div className={cn("mt-12 border-t border-[#2a2a2a]", className)}>
      {members.map((member, index) => {
        const isOpen = index === openIndex;
        return (
          <div key={member.slug} className="border-b border-[#2a2a2a]">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 py-6 text-left"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span>
                <h3 className="font-display text-xl leading-tight font-extrabold uppercase">{member.name}</h3>
                <p className="mt-1 text-sm font-medium text-muted">{member.role}</p>
              </span>
              <span
                className={cn(
                  "shrink-0 text-2xl leading-none transition-transform duration-300 ease-in-out",
                  isOpen && "rotate-45",
                )}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-[400ms] ease-in-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div
                  aria-hidden={!isOpen}
                  className={cn(
                    "pb-6 transition-all duration-300 ease-in-out",
                    isOpen ? "translate-y-0 opacity-100 delay-150" : "-translate-y-2 opacity-0",
                  )}
                >
                  <div className="relative aspect-[15/16] w-full overflow-hidden bg-[#181818]">
                    <Image src={member.photo.src} alt={member.photo.alt} fill sizes="100vw" className="object-cover" />
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">{member.bio}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {member.specialties.map((specialty) => (
                      <li key={specialty}>
                        <Tag>{specialty}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
