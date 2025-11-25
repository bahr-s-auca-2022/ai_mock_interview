import { cn, getTechLogos } from "@/lib/utils";
import React from "react";
import Image from "next/image";

const DisplayTechIcons = async ({ techStack }: TechIconProps) => {
  const TechIcons = await getTechLogos(techStack);

  return (
    <div className="flex flex-row">
      {TechIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex-center border border-light-400/20 hover:border-accent-teal/40 transition-all duration-200 hover:scale-110",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip whitespace-nowrap">{tech}</span>
          <Image
            src={url}
            alt={`${tech} icon`}
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </div>
      ))}
      {techStack.length > 3 && (
        <div className="relative group bg-dark-300 rounded-full p-2 flex-center border border-light-400/20 -ml-3">
          <span className="tech-tooltip">
            +{techStack.length - 3} more technologies
          </span>
          <span className="text-xs text-light-400 font-medium">
            +{techStack.length - 3}
          </span>
        </div>
      )}
    </div>
  );
};

export default DisplayTechIcons;
