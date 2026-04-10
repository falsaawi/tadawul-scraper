"use client";

import { useState } from "react";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  date: string | null;
  category: string | null;
}

export function AnnouncementsCard({ announcements }: { announcements: Announcement[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? announcements : announcements.slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Announcements</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{announcements.length}</span>
        </div>
        {announcements.length > 5 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {expanded ? <>Less <ChevronUp className="h-3 w-3" /></> : <>All <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}
      </div>
      {announcements.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No announcements found</div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {visible.map((a) => (
            <div key={a.id} className="px-4 py-3 hover:bg-accent/30 transition-colors">
              <p className="text-sm text-foreground leading-snug">{a.title}</p>
              {a.date && (
                <p className="text-[10px] text-muted-foreground mt-1">{a.date}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
