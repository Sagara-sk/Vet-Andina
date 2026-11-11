import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwnerIdForUser: vi.fn(),
  findTurnoById: vi.fn(),
  isAssignableVet: vi.fn(),
  rescheduleTurno: vi.fn(),
  updateTurnoStatus: vi.fn(),
  vetHasTurnoAt: vi.fn(),
}));

vi.mock("../src/models/booking.model", () => ({
  findOwnerIdForUser: mocks.findOwnerIdForUser,
}));

vi.mock("../src/models/turno.model", () => ({
  findTurnoById: mocks.findTurnoById,
  isAssignableVet: mocks.isAssignableVet,
  rescheduleTurno: mocks.rescheduleTurno,
  updateTurnoStatus: mocks.updateTurnoStatus,
  vetHasTurnoAt: mocks.vetHasTurnoAt,
}));

const { rescheduleTurnoFor } = await import("../src/services/turno.service");

interface TestUser {
  userId: string;
  fullName: string;
  email: string;
  role: "CLIENTE";
  profileComplete: boolean;
  personType: null;
  careType: "RURAL";
}

const clientUser = {
  userId: "client-user-id",
  fullName: "Tutor",
  email: "tutor@example.com",
  role: "CLIENTE",
  profileComplete: true,
  personType: null,
  careType: "RURAL",
} satisfies TestUser;

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findTurnoById.mockResolvedValue(ruralTurn);
  mocks.findOwnerIdForUser.mockResolvedValue("owner-id");
  mocks.rescheduleTurno.mockResolvedValue(true);
});

describe("client turn rescheduling", () => {
  it("allows a client to reschedule their own rural request without assigning a vet", async () => {
    const newDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await expect(
      rescheduleTurnoFor(clientUser, "turn-id", newDate, null),
    ).resolves.toEqual(ruralTurn);
    expect(mocks.rescheduleTurno).toHaveBeenCalledWith(
      "turn-id",
      ["PENDIENTE", "PENDIENTE_PAGO", "CONFIRMADO", "REPROGRAMADO"],
      newDate,
      null,
    );
  });

  it("does not allow a client to change another owner's turn", async () => {
    mocks.findOwnerIdForUser.mockResolvedValue("different-owner");

    await expect(
      rescheduleTurnoFor(
        clientUser,
        "turn-id",
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        null,
      ),
    ).rejects.toThrow("Solo podés modificar turnos de tus propios pacientes");
    expect(mocks.rescheduleTurno).not.toHaveBeenCalled();
  });

  it("does not allow clients to assign a veterinarian while rescheduling", async () => {
    await expect(
      rescheduleTurnoFor(
        clientUser,
        "turn-id",
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        "vet-id",
      ),
    ).rejects.toThrow("No podés asignar un veterinario al turno");
    expect(mocks.rescheduleTurno).not.toHaveBeenCalled();
  });
});
