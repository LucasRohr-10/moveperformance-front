import Image from "next/image";

import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";

import { TeamBio } from "./team-bio";
import type { TeamMember } from "./team-data";

interface TeamCardsProps {
  members: readonly TeamMember[];
  className?: string;
}

export function TeamCards({ members, className }: TeamCardsProps) {
  return (
    <div className={cn("mt-12 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {members.map((member) => (
        <article
          key={member.slug}
          className="group relative flex flex-col overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] transition duration-300 ease-in-out hover:z-10 hover:border-white/50 hover:[transform:scale(1.04)] focus-within:z-10 focus-within:border-white/50 focus-within:[transform:scale(1.04)]"
        >
          <div className="relative aspect-[15/16] w-full overflow-hidden bg-[#181818]">
            <Image
              src={member.photo.src}
              alt={member.photo.alt}
              fill
              sizes="(min-width:1024px) 33vw, 50vw"
              className="object-cover grayscale transition-[filter] duration-300 ease-in-out group-hover:grayscale-0 group-focus-within:grayscale-0"
            />
          </div>
          <div className="flex flex-1 flex-col p-7">
            <h3 className="font-display text-2xl leading-tight font-extrabold uppercase">{member.name}</h3>
            <p className="mt-2 text-sm font-medium text-muted">{member.role}</p>
            <TeamBio bio={member.bio} />
            <ul className="mt-6 flex flex-wrap gap-2">
              {member.specialties.map((specialty) => (
                <li key={specialty}>
                  <Tag>{specialty}</Tag>
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
