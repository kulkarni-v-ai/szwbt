"use client";

import React, { useState } from "react";
import { PARTICIPANTS_DATA, Participant } from "@/data/participants";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { Search, UserCheck, ShieldAlert } from "lucide-react";

interface PersonSearchProps {
  hostelId: "SHALMALA" | "VINDHYA";
  onSelectPerson: (person: Participant) => void;
}

export const PersonSearch: React.FC<PersonSearchProps> = ({
  hostelId,
  onSelectPerson,
}) => {
  const [query, setQuery] = useState("");

  const filtered = PARTICIPANTS_DATA.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.playerId.toLowerCase().includes(q) ||
      p.institution.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      <div className="relative">
        <PixelInput
          label="FIND PERSON TO ALLOCATE BED"
          placeholder="Search by name, email, team, institution or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 border border-pixel-gray-800 p-2 bg-pixel-black">
        {filtered.length === 0 ? (
          <p className="p-4 text-center font-pixel text-[10px] text-pixel-gray-500">
            NO MATCHING PERSON FOUND
          </p>
        ) : (
          filtered.map((person) => {
            const isEligible =
              hostelId === "SHALMALA"
                ? person.hostelEligible === "SHALMALA" || person.gender === "FEMALE"
                : person.hostelEligible === "VINDHYA" || person.gender === "MALE";

            return (
              <div
                key={person.id}
                className="p-3 bg-pixel-dark border border-pixel-gray-800 hover:border-pixel-orange-fiery flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-pixel-cream font-bold">
                      {person.name}
                    </span>
                    <PixelBadge variant={isEligible ? "green" : "red"}>
                      {person.category}
                    </PixelBadge>
                  </div>
                  <p className="font-mono text-[10px] text-pixel-amber">
                    {person.playerId} • {person.institution} ({person.gender})
                  </p>
                </div>

                {isEligible ? (
                  <PixelButton
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectPerson(person)}
                  >
                    SELECT
                  </PixelButton>
                ) : (
                  <span className="font-pixel text-[9px] text-pixel-red uppercase">
                    NOT ELIGIBLE FOR {hostelId}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
