"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

const PRESET_TAGS = ["VIP", "Novo", "Inativo", "Pacote", "Indicação"];

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Novo: "bg-blue-100 text-blue-700 border-blue-200",
  Inativo: "bg-gray-100 text-gray-600 border-gray-200",
  Pacote: "bg-violet-100 text-violet-700 border-violet-200",
  Indicação: "bg-green-100 text-green-700 border-green-200",
};

function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

export function ClientTags({
  clientId,
  initialTags,
}: {
  clientId: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const router = useRouter();

  async function updateTags(next: string[]) {
    setTags(next);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: next }),
    });
    router.refresh();
  }

  async function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    await updateTags([...tags, t]);
    setCustom("");
    setAdding(false);
  }

  async function removeTag(tag: string) {
    await updateTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tagColor(tag)}`}
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="ml-0.5 hover:opacity-70">
            <X size={10} />
          </button>
        </span>
      ))}

      {adding ? (
        <div className="flex items-center gap-1">
          <div className="flex gap-1 flex-wrap">
            {PRESET_TAGS.filter((t) => !tags.includes(t)).map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTag(custom);
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Outra..."
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-violet-300"
          />
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 px-2 py-0.5 rounded-full border border-dashed border-gray-200 hover:border-violet-300 transition-colors"
        >
          <Plus size={10} />
          Tag
        </button>
      )}
    </div>
  );
}
