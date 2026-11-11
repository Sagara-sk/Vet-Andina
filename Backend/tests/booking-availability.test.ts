import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAgendaHolidays: vi.fn(),
  listBusySlots: vi.fn(),
  createClientBooking: vi.fn(),
  listAssignableVets: vi.fn(),
  listHojaDeRutaBlocks: vi.fn(),
}));

vi.mock("../src/models/booking.model", () => ({
  listAgendaHolidays: mocks.listAgendaHolidays,
  listBusySlots: mocks.listBusySlots,
  createClientBooking: mocks.createClientBooking,
}));

vi.mock("../src/models/turno.model", () => ({
  listAssignableVets: mocks.listAssignableVets,
  listHojaDeRutaBlocks: mocks.listHojaDeRutaBlocks,
}));

const { getAvailability, requestClientBooking } =
  await import("../src/services/booking.service");

const VET_ID = "11111111-1111-4111-8111-111111111111";
const MONDAY = "2030-03-04";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listAgendaHolidays.mockResolvedValue([]);
  mocks.listBusySlots.mockResolvedValue([]);
  mocks.createClientBooking.mockResolvedValue("booking-id");
  mocks.listAssignableVets.mockResolvedValue([
    { id: VET_ID, fullName: "Veterinario de prueba" },
  ]);
  mocks.listHojaDeRutaBlocks.mockResolvedValue([]);
});

describe("getAvailability", () => {
  it("omits urban slots that overlap a veterinarian's route block", async () => {
    mocks.listHojaDeRutaBlocks.mockResolvedValue([
      {
        vetId: VET_ID,
        startsAt: new Date(`${MONDAY}T11:30:00.000Z`),
        endsAt: new Date(`${MONDAY}T12:30:00.000Z`),
      },
    ]);

    const [day] = await getAvailability({
      from: new Date(`${MONDAY}T00:00:00.000Z`),
      to: new Date("2030-03-05T00:00:00.000Z"),
      modality: "URBANO",
      vetId: VET_ID,
    });

    const times = day!.horarios.map((slot) => slot.fechaHora);
    expect(times).not.toContain(`${MONDAY}T11:30:00.000Z`);
    expect(times).not.toContain(`${MONDAY}T12:00:00.000Z`);
    expect(times).toContain(`${MONDAY}T12:30:00.000Z`);
  });

  it("offers tentative rural times without published route slots or assigned vets", async () => {
    const days = await getAvailability({
      from: new Date(`${MONDAY}T00:00:00.000Z`),
      to: new Date("2030-03-11T00:00:00.000Z"),
      modality: "RURAL",
      vetId: null,
    });

    const monday = days.find((day) => day.fecha === MONDAY);
    expect(monday?.lleno).toBe(false);
    expect(monday?.horarios).toHaveLength(24);
    expect(monday?.horarios[0]).toMatchObject({
      fechaHora: `${MONDAY}T09:00:00.000Z`,
      idVeterinario: null,
      duracionMinutos: 120,
    });
    expect(days.find((day) => day.fecha === "2030-03-09")?.lleno).toBe(true);
    expect(days.find((day) => day.fecha === "2030-03-10")?.lleno).toBe(true);
    expect(mocks.listBusySlots).not.toHaveBeenCalled();
    expect(mocks.listAssignableVets).not.toHaveBeenCalled();
    expect(mocks.listHojaDeRutaBlocks).not.toHaveBeenCalled();
  });
});

describe("requestClientBooking", () => {
  it("accepts a future weekday rural proposal without assigning a veterinarian", async () => {
    const input = {
      userId: "client-id",
      animalId: "animal-id",
      vetId: null,
      dateTime: new Date(`${MONDAY}T09:00:00.000Z`),
      modality: "RURAL" as const,
      reason: "Revisión clínica de lote",
      reasonCategory: "revision_lote",
      reasonDetail: null,
      durationMinutes: 120,
    };

    await expect(requestClientBooking(input)).resolves.toBe("booking-id");
    expect(mocks.createClientBooking).toHaveBeenCalledWith(input);
  });

  it("rejects rural proposals outside the weekday field window", async () => {
    await expect(
      requestClientBooking({
        userId: "client-id",
        animalId: "animal-id",
        vetId: null,
        dateTime: new Date("2030-03-09T09:00:00.000Z"),
        modality: "RURAL",
        reason: "Revisión clínica de lote",
        reasonCategory: "revision_lote",
        reasonDetail: null,
        durationMinutes: 120,
      }),
    ).rejects.toThrow("La solicitud rural debe ser de lunes a viernes");
    expect(mocks.createClientBooking).not.toHaveBeenCalled();
  });
});
