"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export interface PersonSearchItem {
  id: string;
  name: string;
  playerId?: string;
  email?: string;
  phone?: string;
  gender: string;
  role: string;
  institution: string;
  teamName: string;
  hostelEligible: string;
  isAllocated: boolean;
  allocation?: {
    hostelName: string;
    roomNumber: string;
    bedNumber: string;
  } | null;
}

interface PersonSearchProps {
  hostelId: string;
  onSelectPerson: (person: PersonSearchItem) => void;
}

export const PersonSearch: React.FC<PersonSearchProps> = ({
  hostelId,
  onSelectPerson,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search via backend endpoint /api/accommodation/people/search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accommodation/people/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.people)) {
            setResults(data.people);
          }
        }
      } catch (err) {
        console.error("Failed to search people:", err);
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      <div className="relative">
        <label className="font-pixel text-[9px] text-[#FF5A16] uppercase tracking-wider block mb-1">
          FIND PERSON TO ALLOCATE BED
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full bg-slate-50 text-slate-900 border-2 border-slate-200 focus:border-[#FF5A16] rounded-xl px-3 py-2 pl-9 font-sans text-xs outline-none transition-colors"
            placeholder="Search by athlete name, ID, team, institution..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {loading && (
            <Loader2 className="w-4 h-4 text-[#FF5A16] animate-spin absolute right-3 top-2.5" />
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 p-2 bg-slate-50 rounded-xl">
        {loading && results.length === 0 ? (
          <div className="p-6 text-center text-slate-500 font-pixel text-[10px] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF5A16]" />
            <span>SEARCHING AUTHORITATIVE DATABASE...</span>
          </div>
        ) : results.length === 0 && hasSearched ? (
          <div className="p-6 text-center text-slate-500 font-pixel text-[10px]">
            {query.trim() ? "NO ELIGIBLE PARTICIPANT FOUND MATCHING QUERY" : "TYPE TO SEARCH UNALLOCATED ATHLETES OR STAFF"}
          </div>
        ) : (
          results.map((person) => {
            const isEligible =
              hostelId === "SHALMALA"
                ? person.hostelEligible === "SHALMALA" || person.gender === "FEMALE"
                : person.hostelEligible === "VINDHYA" || person.gender === "MALE";

            const alreadyAllocated = person.isAllocated;

            return (
              <div
                key={person.id}
                className="p-3 bg-white border border-slate-200 hover:border-[#FF5A16] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-slate-900 font-bold">
                      {person.name}
                    </span>
                    <span
                      className={`text-[8px] font-pixel px-2 py-0.5 rounded border ${
                        person.role === "PLAYER"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-orange-50 text-[#FF5A16] border-orange-200"
                      }`}
                    >
                      {person.role}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 uppercase">
                      ({person.gender})
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                    {person.playerId || "REG-ID"} • {person.teamName || person.institution}
                  </p>
                  {alreadyAllocated && person.allocation && (
                    <p className="text-[9px] text-amber-600 font-pixel mt-0.5">
                      ALREADY ALLOCATED: {person.allocation.hostelName} • {person.allocation.roomNumber} • {person.allocation.bedNumber}
                    </p>
                  )}
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  {alreadyAllocated ? (
                    <span className="font-pixel text-[9px] text-amber-700 uppercase tracking-wider px-2 py-1 bg-amber-50 border border-amber-300 rounded">
                      ALLOCATED
                    </span>
                  ) : !isEligible ? (
                    <span className="font-pixel text-[8px] text-rose-700 uppercase tracking-wider px-2 py-1 bg-rose-50 border border-rose-300 rounded">
                      RESTRICTED ({hostelId} ONLY)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectPerson(person)}
                      className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#e04808] text-white rounded-lg font-pixel text-[9px] font-bold tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SELECT</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
