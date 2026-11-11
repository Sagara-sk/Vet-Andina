import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findTurnoByIdForUser: vi.fn(),
  findTurnoById: vi.fn(),
  rescheduleTurno: vi.fn(),
  getAvailability: vi.fn(),
}));

vi.mock("../src/models/turno.model", () => ({
  findTurnoByIdForUser: mocks.findTurnoByIdForUser,
  findTurnoById: mocks.findTurnoById,
  rescheduleTurno: mocks.rescheduleTurno,
}));

vi.mock("../src/services/booking.service", () => ({
  getAvailability: mocks.getAvailability,
}));

const { rescheduleClientTurno } = await import("../src/services/turno.service");

const clientUser = {
  userId: "client-user-id",
  fullName: "Tutor",
  email: "tutor@example.com",
  role: "CLIENTE" as const,
  profileComplete: true,
  personType: null,
  careType: "RURAL" as const,
};

const ruralTurn = {
  id: "turn-id",
  dateTime: new Date("2030-03-04T09:00:00.000Z"),
  durationMinutes: 120,
  modality: "RURAL" as const,
  status: "PENDIENTE" as const,
  reason: "Revisión de lote",
  reasonCategory: "revision_lote",
  reasonDetail: null,
  cancellationReason: null,
  animal: { id: "animal-id", name: "Lote 1", species: "Bovino" },
  tutor: { id: "owner-id", fullName: "Tutor", phone: "" },
  vet: null,
};

const newDate = new Date("2030-03-05T12:00:00.000Z");
const RESCHEDULABLE = ["PENDIENTE", "PENDIENTE_PAGO", "CONFIRMADO", "REPROGRAMADO"];

function availabilityWith(dateTime: Date, durationMinutes: number) {
  return [
    {
      fecha: "2030-03-05",
      lleno: false,
      horarios: [
        {
          fechaHora: dateTime.toISOString(),
          idVeterinario: null,
          nombreVeterinario: null,
          duracionMinutos: durationMinutes,
        },
      ],
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findTurnoByIdForUser.mockResolvedValue(ruralTurn);
  mocks.findTurnoById.mockResolvedValue(ruralTurn);
  mocks.rescheduleTurno.mockResolvedValue(true);
  mocks.getAvailability.mockResolvedValue(availabilityWith(newDate, 120));
});

describe("client turn rescheduling", () => {
  it("allows a client to reschedule their own rural request without an assigned vet", async () => {
    await expect(
      rescheduleClientTurno(clientUser, "turn-id", newDate),
    ).resolves.toEqual(ruralTurn);
    expect(mocks.findTurnoByIdForUser).toHaveBeenCalledWith("turn-id", "client-user-id");
    expect(mocks.getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ modality: "RURAL", vetId: null }),
    );
    expect(mocks.rescheduleTurno).toHaveBeenCalledWith(
      "turn-id",
      RESCHEDULABLE,
      newDate,
      null,
    );
  });

  it("does not let a client change a turn that belongs to another owner", async () => {
    mocks.findTurnoByIdForUser.mockResolvedValue(undefined);

    await expect(
      rescheduleClientTurno(clientUser, "turn-id", newDate),
    ).rejects.toThrow("El turno no existe");
    expect(mocks.rescheduleTurno).not.toHaveBeenCalled();
  });

  it("keeps the assigned vet when rescheduling an urban turn", async () => {
    const urbanTurn = {
      ...ruralTurn,
      modality: "URBANO" as const,
      durationMinutes: 30,
      vet: { id: "vet-id", fullName: "Dra. Vet" },
    };
    mocks.findTurnoByIdForUser.mockResolvedValue(urbanTurn);
    mocks.getAvailability.mockResolvedValue(availabilityWith(newDate, 30));

    await rescheduleClientTurno(clientUser, "turn-id", newDate);

    expect(mocks.getAvailability).toHaveBeenCalledWith(
      expect.objectContaining({ modality: "URBANO", vetId: "vet-id" }),
    );
    expect(mocks.rescheduleTurno).toHaveBeenCalledWith(
      "turn-id",
      RESCHEDULABLE,
      newDate,
      "vet-id",
    );
  });

  it("rejects an urban turn without an assigned vet", async () => {
    mocks.findTurnoByIdForUser.mockResolvedValue({
      ...ruralTurn,
      modality: "URBANO" as const,
      durationMinutes: 30,
    });

    await expect(
      rescheduleClientTurno(clientUser, "turn-id", newDate),
    ).rejects.toThrow("sin veterinario asignado");
    expect(mocks.rescheduleTurno).not.toHaveBeenCalled();
  });

  it("rejects a date that is not offered by the availability", async () => {
    mocks.getAvailability.mockResolvedValue(
      availabilityWith(new Date("2030-03-05T15:00:00.000Z"), 120),
    );

    await expect(
      rescheduleClientTurno(clientUser, "turn-id", newDate),
    ).rejects.toThrow("Ese horario ya no está disponible");
    expect(mocks.rescheduleTurno).not.toHaveBeenCalled();
  });
});
