import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  lockAgendaDate: vi.fn(),
  lockVetInterval: vi.fn(),
  vetHasHojaDeRutaOverlap: vi.fn(),
}));

vi.mock("../src/config/database", () => ({
  db: { connect: mocks.connect },
}));

vi.mock("../src/models/agenda-locks", () => ({
  lockAgendaDate: mocks.lockAgendaDate,
  lockVetInterval: mocks.lockVetInterval,
  lockVetDay: vi.fn(),
}));

vi.mock("../src/models/turno.model", () => ({
  vetHasHojaDeRutaOverlap: mocks.vetHasHojaDeRutaOverlap,
}));

const { createClientBooking } = await import("../src/models/booking.model");

describe("createClientBooking", () => {
  const statements: { sql: string; values?: unknown[] }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    statements.length = 0;
    mocks.vetHasHojaDeRutaOverlap.mockResolvedValue(false);

    const client = {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        statements.push({ sql, values });
        if (sql.includes("SELECT d.id_duenio")) {
          return {
            rows: [
              {
                id_duenio: "owner-id",
                tipo_atencion: "RURAL",
                id_finca: "farm-id",
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes("SELECT 1 FROM turno") && sql.includes("id_animal = $1")) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes("SELECT 1 FROM agenda_feriado")) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes("INSERT INTO turno")) {
          return { rows: [{ id_turno: "booking-id" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };
    mocks.connect.mockResolvedValue(client);
  });

  it("stores rural requests unassigned without requiring a published route slot", async () => {
    const id = await createClientBooking({
      userId: "client-id",
      animalId: "animal-id",
      vetId: null,
      dateTime: new Date("2030-03-04T09:00:00.000Z"),
      modality: "RURAL",
      reason: "Revisión clínica de lote",
      reasonCategory: "revision_lote",
      reasonDetail: null,
      durationMinutes: 120,
    });

    const insert = statements.find(({ sql }) => sql.includes("INSERT INTO turno"));
    expect(id).toBe("booking-id");
    expect(insert?.values?.[2]).toBeNull();
    expect(
      statements.some(({ sql }) => sql.includes("agenda_disponibilidad_rural")),
    ).toBe(false);
    expect(mocks.lockVetInterval).not.toHaveBeenCalled();
    expect(mocks.vetHasHojaDeRutaOverlap).not.toHaveBeenCalled();
  });

  it("rejects a second active booking for the same animal", async () => {
    const client = {
      query: vi.fn(async (sql: string, values?: unknown[]) => {
        statements.push({ sql, values });
        if (sql.includes("SELECT d.id_duenio")) {
          return {
            rows: [
              {
                id_duenio: "owner-id",
                tipo_atencion: "RURAL",
                id_finca: "farm-id",
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes("SELECT 1 FROM turno") && sql.includes("id_animal = $1")) {
          return { rows: [{}], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    };
    mocks.connect.mockResolvedValue(client);

    await expect(
      createClientBooking({
        userId: "client-id",
        animalId: "animal-id",
        vetId: null,
        dateTime: new Date("2030-03-04T09:00:00.000Z"),
        modality: "RURAL",
        reason: "Revisión clínica de lote",
        reasonCategory: "revision_lote",
        reasonDetail: null,
        durationMinutes: 120,
      }),
    ).rejects.toThrow("Este paciente ya tiene un turno reservado");
    expect(statements.some(({ sql }) => sql.includes("INSERT INTO turno"))).toBe(false);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });
});
