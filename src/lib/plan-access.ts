/** Pacotes do cliente: os que ele comprou (titular) e os de que é membro (pacote familiar). */
export function clientPlansWhere(clientId: string) {
  return {
    OR: [
      { clientId },
      { members: { some: { clientId } } }
    ]
  };
}

/** Pacote usado ao concluir: o mais antigo que ainda tem sessões. */
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

/** Membros escolhidos na venda, sem repetidos; o titular não entra na lista. */
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

/** Ao excluir o titular: o membro mais antigo herda o pacote, se ainda houver saldo. */
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

/** Pacotes do cliente: os dele e os de que é membro, sem repetir. */
export function mergePlans<T extends { id: string }>(
  owned: T[],
  memberships: { subscription: T }[]
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const sub of owned) {
    if (!seen.has(sub.id)) {
      seen.add(sub.id);
      result.push(sub);
    }
  }

  for (const m of memberships) {
    const sub = m.subscription;
    if (!seen.has(sub.id)) {
      seen.add(sub.id);
      result.push(sub);
    }
  }

  return result;
}
