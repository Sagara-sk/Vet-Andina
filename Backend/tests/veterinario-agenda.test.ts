import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUserRecord } from "../src/models/owner.model";

// Usuarios de sesión ficticios, resueltos por id como lo hace la estrategia JWT.
const users: Record<string, AuthenticatedUserRecord> = {};

vi.mock("../src/models/owner.model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/models/owner.model")>()),
  findAuthenticatedUserById: vi.fn(async (id: string) => users[id]),
}));

vi.mock("../src/models/turno.model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/models/turno.model")>()),
  listAgendaTurnos: vi.fn(),
  listHojaDeRutaRecords: vi.fn(),
  isAssignableVet: vi.fn(),
  listTurnos: vi.fn(),
}));

const { app } = await import("../src/app");
const { createSessionToken, SESSION_COOKIE_NAME } =
  await import("../src/services/auth.service");
const turnoModel = await import("../src/models/turno.model");

const listAgendaTurnos = vi.mocked(turnoModel.listAgendaTurnos);
const listHojaDeRutaRecords = vi.mocked(turnoModel.listHojaDeRutaRecords);
const isAssignableVet = vi.mocked(turnoModel.isAssignableVet);
const listTurnos = vi.mocked(turnoModel.listTurnos);

const VET_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_VET_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const SUPERADMIN_ID = "44444444-4444-4444-8444-444444444444";
const CLIENT_ID = "55555555-5555-4555-8555-555555555555";

function addUser(userId: string, role: string) {
  users[userId] = {
    userId,
    fullName: `Usuario ${role}`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    profileComplete: true,
    personType: null,
    careType: null,
  };
}

addUser(VET_ID, "VETERINARIO");
addUser(ADMIN_ID, "ADMINISTRATIVO");
addUser(SUPERADMIN_ID, "SUPERADMIN");
addUser(CLIENT_ID, "CLIENTE");

function cookieFor(userId: string): string {
  const token = createSessionToken({ userId, role: users[userId]!.role });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

const RANGE = "desde=2026-11-09T03:00:00.000Z&hasta=2026-11-16T03:00:00.000Z";

const turno = {
  id: "t-1",
  dateTime: new Date("2026-11-10T12:00:00.000Z"),
  durationMinutes: 30,
  modality: "URBANO" as const,
  status: "CONFIRMADO" as const,
  reason: "Control",
  reasonCategory: "Control",
  reasonDetail: null,
  cancellationReason: null,
  animal: { id: "a-1", name: "Toby", species: "Canino" },
  tutor: { id: "d-1", fullName: "Ana Pérez", phone: "299000000" },
  vet: { id: VET_ID, fullName: "Usuario VETERINARIO" },
};

const hojaDeRuta = {
  id: "7",
  startsAt: new Date("2026-11-11T11:00:00.000Z"),
  endsAt: new Date("2026-11-11T15:00:00.000Z"),
  detail: "Recorrida Allen",
  vet: { id: VET_ID, fullName: "Usuario VETERINARIO" },
};

beforeEach(() => {
  vi.clearAllMocks();
  listAgendaTurnos.mockResolvedValue([turno]);
  listHojaDeRutaRecords.mockResolvedValue([hojaDeRuta]);
  isAssignableVet.mockResolvedValue(true);
  listTurnos.mockResolvedValue([turno]);
});

describe("GET /api/veterinarios/me/agenda", () => {
  it("rechaza pedidos sin sesión", async () => {
    const response = await request(app).get(
      `/api/veterinarios/me/agenda?${RANGE}`,
    );

    expect(response.status).toBe(401);
    expect(listAgendaTurnos).not.toHaveBeenCalled();
  });

  it.each([
    ["CLIENTE", CLIENT_ID],
    ["ADMINISTRATIVO", ADMIN_ID],
  ])("deniega el acceso a %s", async (_role, userId) => {
    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${RANGE}`)
      .set("Cookie", cookieFor(userId));

    expect(response.status).toBe(403);
    expect(listAgendaTurnos).not.toHaveBeenCalled();
    expect(listHojaDeRutaRecords).not.toHaveBeenCalled();
  });

  it("combina turnos y hojas de ruta del veterinario autenticado", async () => {
    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${RANGE}`)
      .set("Cookie", cookieFor(VET_ID));

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.agenda).toEqual({
      desde: "2026-11-09T03:00:00.000Z",
      hasta: "2026-11-16T03:00:00.000Z",
      veterinario: VET_ID,
      turnos: [{ ...turno, dateTime: turno.dateTime.toISOString() }],
      hojasDeRuta: [
        {
          ...hojaDeRuta,
          startsAt: hojaDeRuta.startsAt.toISOString(),
          endsAt: hojaDeRuta.endsAt.toISOString(),
        },
      ],
    });

    const from = new Date("2026-11-09T03:00:00.000Z");
    const to = new Date("2026-11-16T03:00:00.000Z");
    expect(listAgendaTurnos).toHaveBeenCalledWith(from, to, VET_ID);
    expect(listHojaDeRutaRecords).toHaveBeenCalledWith(from, to, VET_ID);
  });

  it("no permite consultar la agenda de otro veterinario por query", async () => {
    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${RANGE}&veterinario=${OTHER_VET_ID}`)
      .set("Cookie", cookieFor(VET_ID));

    expect(response.status).toBe(400);
    expect(listAgendaTurnos).not.toHaveBeenCalled();
  });

  it("permite al SUPERADMIN consultar su propia agenda", async () => {
    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${RANGE}`)
      .set("Cookie", cookieFor(SUPERADMIN_ID));

    expect(response.status).toBe(200);
    expect(listAgendaTurnos).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      SUPERADMIN_ID,
    );
  });

  it.each([
    [
      "hasta anterior a desde",
      "desde=2026-11-16T00:00:00.000Z&hasta=2026-11-09T00:00:00.000Z",
    ],
    [
      "rango mayor a 92 días",
      "desde=2026-01-01T00:00:00.000Z&hasta=2026-06-01T00:00:00.000Z",
    ],
    ["fecha inválida", "desde=no-es-fecha"],
  ])("responde 400 ante %s", async (_case, query) => {
    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${query}`)
      .set("Cookie", cookieFor(VET_ID));

    expect(response.status).toBe(400);
    expect(listAgendaTurnos).not.toHaveBeenCalled();
  });

  it("responde 500 sin exponer detalles si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    listAgendaTurnos.mockRejectedValue(
      new Error("connection refused 10.0.0.1"),
    );

    const response = await request(app)
      .get(`/api/veterinarios/me/agenda?${RANGE}`)
      .set("Cookie", cookieFor(VET_ID));

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("10.0.0.1");
  });
});

describe("GET /api/veterinarios/agenda", () => {
  it("deniega el acceso a VETERINARIO y CLIENTE", async () => {
    for (const userId of [VET_ID, CLIENT_ID]) {
      const response = await request(app)
        .get(`/api/veterinarios/agenda?${RANGE}`)
        .set("Cookie", cookieFor(userId));

      expect(response.status).toBe(403);
    }
    expect(listAgendaTurnos).not.toHaveBeenCalled();
  });

  describe("GET /api/turnos", () => {
    it("limita al veterinario a sus turnos aunque solicite otro profesional", async () => {
      const response = await request(app)
        .get(`/api/turnos?${RANGE}&veterinario=${OTHER_VET_ID}`)
        .set("Cookie", cookieFor(VET_ID));

      expect(response.status).toBe(200);
      expect(listTurnos).toHaveBeenCalledWith(
        expect.objectContaining({ vetId: VET_ID }),
      );
    });

    it.each([
      ["ADMINISTRATIVO", ADMIN_ID],
      ["SUPERADMIN", SUPERADMIN_ID],
    ])("%s conserva el acceso a la agenda general", async (_role, userId) => {
      const response = await request(app)
        .get(`/api/turnos?${RANGE}`)
        .set("Cookie", cookieFor(userId));

      expect(response.status).toBe(200);
      expect(listTurnos).toHaveBeenCalledWith(
        expect.objectContaining({ vetId: null }),
      );
    });
  });

  it.each([
    ["ADMINISTRATIVO", ADMIN_ID],
    ["SUPERADMIN", SUPERADMIN_ID],
  ])("%s ve la agenda de todos los veterinarios", async (_role, userId) => {
    const response = await request(app)
      .get(`/api/veterinarios/agenda?${RANGE}`)
      .set("Cookie", cookieFor(userId));

    expect(response.status).toBe(200);
    expect(response.body.agenda.veterinario).toBeNull();
    expect(response.body.agenda.turnos).toHaveLength(1);
    expect(response.body.agenda.hojasDeRuta).toHaveLength(1);
    expect(listAgendaTurnos).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      null,
    );
    expect(listHojaDeRutaRecords).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      null,
    );
  });

  it("filtra por veterinario", async () => {
    const response = await request(app)
      .get(`/api/veterinarios/agenda?${RANGE}&veterinario=${OTHER_VET_ID}`)
      .set("Cookie", cookieFor(ADMIN_ID));

    expect(response.status).toBe(200);
    expect(isAssignableVet).toHaveBeenCalledWith(OTHER_VET_ID);
    expect(listAgendaTurnos).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      OTHER_VET_ID,
    );
    expect(listHojaDeRutaRecords).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      OTHER_VET_ID,
    );
  });

  it("responde 404 si el veterinario no existe o no es asignable", async () => {
    isAssignableVet.mockResolvedValue(false);

    const response = await request(app)
      .get(`/api/veterinarios/agenda?${RANGE}&veterinario=${OTHER_VET_ID}`)
      .set("Cookie", cookieFor(ADMIN_ID));

    expect(response.status).toBe(404);
    expect(listAgendaTurnos).not.toHaveBeenCalled();
  });

  it("responde 400 si el filtro de veterinario no es un UUID", async () => {
    const response = await request(app)
      .get(`/api/veterinarios/agenda?${RANGE}&veterinario=123`)
      .set("Cookie", cookieFor(ADMIN_ID));

    expect(response.status).toBe(400);
    expect(isAssignableVet).not.toHaveBeenCalled();
  });
});
