export function clientPlansWhere(clientId: string) {
  return {
    OR: [
      { clientId },
      { members: { some: { clientId } } }
    ]
  };
}

export function pickPlanWithBalance<
  T extends { sessionsUsed: number; purchasedAt: Date; plan: { sessions: number } }
>(subs: T[]): T | null {
  let best: T | null = null;
  let bestDate: Date | null = null;

  for (const sub of subs) {
    const remaining = sub.plan.sessions - sub.sessionsUsed;
    if (remaining <= 0) continue;

    if (!bestDate || sub.purchasedAt < bestDate) {
      best = sub;
      bestDate = sub.purchasedAt;
    }
  }

  return best;
}

export function normalizeMemberIds(
  ownerId: string,
  ids: string[]
): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (ids.includes(ownerId)) {
    return { ok: false, error: "O titular já faz parte do pacote." };
  }

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }

  return { ok: true, ids: unique };
}

export function pickSuccessor(sub: {
  sessionsUsed: number;
  plan: { sessions: number };
  members: { clientId: string; createdAt: Date }[];
}): string | null {
  const remaining = sub.plan.sessions - sub.sessionsUsed;
  if (remaining <= 0) return null;
  if (sub.members.length === 0) return null;

  let oldest = sub.members[0];
  for (const m of sub.members) {
    if (m.createdAt < oldest.createdAt) {
      oldest = m;
    }
  }

  return oldest.clientId;
}