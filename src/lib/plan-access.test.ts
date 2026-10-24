import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clientPlansWhere,
  pickPlanWithBalance,
  normalizeMemberIds,
  pickSuccessor
} from "./plan-access.ts";

test("clientPlansWhere retorna OR com clientId e members.some", () => {
  const result = clientPlansWhere("c1");
  assert.deepEqual(result, {
    OR: [
      { clientId: "c1" },
      { members: { some: { clientId: "c1" } } }
    ]
  });
});

test("pickPlanWithBalance escolhe o mais antigo com saldo", () => {
  const subs = [
    {
      sessionsUsed: 4,
      purchasedAt: new Date("2024-01-01"),
      plan: { sessions: 4 }
    },
    {
      sessionsUsed: 1,
      purchasedAt: new Date("2024-03-01"),
      plan: { sessions: 4 }
    },
    {
      sessionsUsed: 0,
      purchasedAt: new Date("2024-02-01"),
      plan: { sessions: 4 }
    }
  ];
  const result = pickPlanWithBalance(subs);
  assert.equal(result?.purchasedAt.toISOString(), new Date("2024-02-01").toISOString());
});

test("pickPlanWithBalance retorna null quando todos esgotados", () => {
  const subs = [
    {
      sessionsUsed: 4,
      purchasedAt: new Date("2024-01-01"),
      plan: { sessions: 4 }
    },
    {
      sessionsUsed: 4,
      purchasedAt: new Date("2024-02-01"),
      plan: { sessions: 4 }
    }
  ];
  const result = pickPlanWithBalance(subs);
  assert.equal(result, null);
});

test("pickPlanWithBalance retorna null para array vazio", () => {
  const result = pickPlanWithBalance([]);
  assert.equal(result, null);
});

test("pickPlanWithBalance não altera a ordem do array recebido", () => {
  const subs = [
    {
      sessionsUsed: 1,
      purchasedAt: new Date("2024-03-01"),
      plan: { sessions: 4 }
    },
    {
      sessionsUsed: 0,
      purchasedAt: new Date("2024-02-01"),
      plan: { sessions: 4 }
    }
  ];
  const originalOrder = [...subs];
  pickPlanWithBalance(subs);
  assert.deepEqual(subs, originalOrder);
});

test("normalizeMemberIds remove duplicados mantendo ordem", () => {
  const result = normalizeMemberIds("o", ["a", "a", "b"]);
  assert.deepEqual(result, { ok: true, ids: ["a", "b"] });
});

test("normalizeMemberIds retorna erro se contiver ownerId", () => {
  const result = normalizeMemberIds("o", ["a", "o"]);
  assert.deepEqual(result, { ok: false, error: "O titular já faz parte do pacote." });
});

test("pickSuccessor retorna o membro mais antigo quando há saldo", () => {
  const sub = {
    sessionsUsed: 2,
    plan: { sessions: 4 },
    members: [
      { clientId: "x", createdAt: new Date("2024-05-01") },
      { clientId: "y", createdAt: new Date("2024-04-01") }
    ]
  };
  const result = pickSuccessor(sub);
  assert.equal(result, "y");
});

test("pickSuccessor retorna null quando sem saldo", () => {
  const sub = {
    sessionsUsed: 4,
    plan: { sessions: 4 },
    members: [
      { clientId: "x", createdAt: new Date("2024-05-01") }
    ]
  };
  const result = pickSuccessor(sub);
  assert.equal(result, null);
});

test("pickSuccessor retorna null quando sem membros", () => {
  const sub = {
    sessionsUsed: 2,
    plan: { sessions: 4 },
    members: []
  };
  const result = pickSuccessor(sub);
  assert.equal(result, null);
});