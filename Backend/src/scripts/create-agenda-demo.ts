import "../config/env";
import type { PoolClient } from "pg";
import { db } from "../config/database";

// Carga turnos y hojas de ruta ficticios para los próximos 7 días, para que los
// veterinarios vean datos en /panel-veterinario/agenda y administración en
// /panel-administrativo/agenda. Usa cuentas existentes:
// - Profesionales con matrícula: Martín Sosa, Veterinario Demo (VETERINARIO),
//   Julián Paredes y Super Admin (SUPERADMIN). Los crea `npm run seed:test-users`.
// - Particulares: Cliente Demo (se le agrega la mascota "Milo (demo)"), Rogelio
//   (Erick Leyton) y Rocky (manzana).
// - Productores y lotes de `npm run seed:rural-demo`.
// Los turnos llevan "(demo)" en el detalle del motivo y las hojas de ruta en su
// detalle. No duplica lo que ya existe y omite (con aviso) cualquier ítem que se
// cruce con un turno o una hoja de ruta ya cargados del mismo profesional.

const TIME_ZONE_OFFSET = "-03:00"; // America/Argentina/Buenos_Aires, sin horario de verano.
const DEMO_DETAIL = "Turno de demostración (demo)";

type VetKey = "martin" | "vetDemo" | "julian" | "superAdmin";
type AnimalKey =
  | "milo"
  | "rogelio"
  | "rocky"
  | "lauraVacas"
  | "productorVacas"
  | "productorOvejas"
  | "ricardoNovillos"
  | "martaCabras"
  | "hugoRodeo";

const VETS: Record<VetKey, string> = {
  martin: "martin.sosa@vetandina.com.ar",
  vetDemo: "veterinario@vetandina.com",
  julian: "julian.paredes@vetandina.com.ar",
  superAdmin: "superadmin@vetandina.com",
};

const ANIMALS: Record<AnimalKey, { ownerEmail: string; name: string }> = {
  milo: { ownerEmail: "cliente@vetandina.com", name: "Milo (demo)" },
  rogelio: { ownerEmail: "papita@gmail.com", name: "Rogelio" },
  rocky: { ownerEmail: "manzana_rallada@hotmail.com", name: "Rocky" },
  lauraVacas: { ownerEmail: "laura.gimenez@example.com", name: "Vacas de cría" },
  productorVacas: { ownerEmail: "productor@vetandina.com", name: "Vacas de cría" },
  productorOvejas: { ownerEmail: "productor@vetandina.com", name: "Ovejas" },
  ricardoNovillos: { ownerEmail: "ricardo.benitez@example.com", name: "Novillos de engorde" },
  martaCabras: { ownerEmail: "marta.quiroga@example.com", name: "Cabras lecheras" },
  hugoRodeo: { ownerEmail: "hugo.fernandez@example.com", name: "Rodeo general" },
};

// Mascota que se le agrega a Cliente Demo, que no tiene animales.
const CLIENT_DEMO_PET = { species: "Canino", breed: "Caniche" };

// Etiquetas de Frontend/src/data/motivosTurno.ts: motivo_categoria guarda el id.
const REASONS: Record<string, string> = {
  CONSULTA_GENERAL: "Consulta Clínica General / Chequeo",
  VACUNACION: "Vacunación y Desparasitación",
  ESTUDIOS: "Estudios Clínicos (Ecografía, Análisis, RX)",
  SANIDAD_LOTE: "Sanidad de Lote / Vacunación Masiva",
  CONTROL_REPRODUCTIVO: "Control Reproductivo / Tacto / Ecografía",
  REVISION_CAMPO: "Revisión Clínica de Lote",
};

// "workday" es el n.º de día hábil (lunes a viernes) dentro de los próximos 7
// días (0 a 4); "saturday" es el sábado de ese período. Los horarios urbanos
// respetan la agenda pública (L-V 08:30-12:30 y 16:00-20:00, sáb. 09:00-13:00)
// y los rurales van de lunes a viernes, como las franjas publicadas.
type Day = { workday: number } | "saturday";

interface DemoTurno {
  day: Day;
  time: string;
  vet: VetKey;
  animal: AnimalKey;
  modality: "URBANO" | "RURAL";
  durationMinutes: number;
  status: "PENDIENTE" | "CONFIRMADO";
  reason: keyof typeof REASONS;
}

interface DemoHoja {
  day: Day;
  start: string;
  end: string;
  vet: VetKey;
  detail: string;
}

const urban = (
  day: Day,
  time: string,
  vet: VetKey,
  animal: AnimalKey,
  reason: string,
  status: DemoTurno["status"] = "CONFIRMADO",
): DemoTurno => ({ day, time, vet, animal, modality: "URBANO", durationMinutes: 30, status, reason });

const rural = (
  day: Day,
  time: string,
  durationMinutes: number,
  vet: VetKey,
  animal: AnimalKey,
  reason: string,
  status: DemoTurno["status"] = "CONFIRMADO",
): DemoTurno => ({ day, time, vet, animal, modality: "RURAL", durationMinutes, status, reason });

const TURNOS: DemoTurno[] = [
  urban({ workday: 0 }, "09:00", "martin", "milo", "VACUNACION"),
  urban({ workday: 0 }, "10:30", "martin", "rogelio", "CONSULTA_GENERAL", "PENDIENTE"),
  rural({ workday: 0 }, "09:00", 120, "vetDemo", "lauraVacas", "SANIDAD_LOTE"),
  urban({ workday: 0 }, "16:30", "julian", "rocky", "CONSULTA_GENERAL"),

  rural({ workday: 1 }, "09:00", 120, "martin", "ricardoNovillos", "SANIDAD_LOTE"),
  urban({ workday: 1 }, "08:30", "vetDemo", "rogelio", "VACUNACION"),
  urban({ workday: 1 }, "17:00", "superAdmin", "milo", "ESTUDIOS", "PENDIENTE"),

  rural({ workday: 2 }, "10:00", 90, "julian", "martaCabras", "CONTROL_REPRODUCTIVO"),
  urban({ workday: 2 }, "16:00", "martin", "rocky", "VACUNACION"),
  urban({ workday: 2 }, "11:00", "vetDemo", "milo", "CONSULTA_GENERAL"),

  rural({ workday: 3 }, "09:00", 120, "vetDemo", "hugoRodeo", "REVISION_CAMPO", "PENDIENTE"),
  rural({ workday: 3 }, "10:00", 60, "superAdmin", "productorVacas", "CONTROL_REPRODUCTIVO"),
  urban({ workday: 3 }, "18:00", "martin", "rogelio", "ESTUDIOS"),

  rural({ workday: 4 }, "09:00", 90, "martin", "productorOvejas", "SANIDAD_LOTE"),
  urban({ workday: 4 }, "09:30", "julian", "milo", "VACUNACION"),
  urban({ workday: 4 }, "19:00", "vetDemo", "rocky", "CONSULTA_GENERAL", "PENDIENTE"),

  urban("saturday", "10:00", "vetDemo", "rogelio", "CONSULTA_GENERAL"),
  urban("saturday", "11:00", "martin", "milo", "VACUNACION", "PENDIENTE"),
];

const HOJAS: DemoHoja[] = [
  { day: { workday: 0 }, start: "13:00", end: "15:30", vet: "vetDemo", detail: "Recorrida Cipolletti - Allen (demo)" },
  { day: { workday: 1 }, start: "12:00", end: "14:30", vet: "martin", detail: "Visitas zona General Roca (demo)" },
  { day: { workday: 2 }, start: "13:00", end: "15:30", vet: "julian", detail: "Recorrida Fernández Oro - Cinco Saltos (demo)" },
  { day: { workday: 3 }, start: "13:00", end: "15:00", vet: "superAdmin", detail: "Visita establecimiento El Productor (demo)" },
  { day: { workday: 4 }, start: "12:00", end: "14:00", vet: "martin", detail: "Control sanitario de lotes en Allen (demo)" },
];

// Fechas (YYYY-MM-DD, hora argentina) de los próximos 7 días, sin contar hoy.
function upcomingDays(): { workdays: string[]; saturday: string } {
  const todayAr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  const base = new Date(`${todayAr}T00:00:00Z`);
  const workdays: string[] = [];
  let saturday = "";

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const iso = day.toISOString().slice(0, 10);
    const weekday = day.getUTCDay();
    if (weekday >= 1 && weekday <= 5) workdays.push(iso);
    if (weekday === 6) saturday = iso;
  }

  return { workdays, saturday };
}

function resolveDate(day: Day, days: ReturnType<typeof upcomingDays>): string {
  const date = day === "saturday" ? days.saturday : days.workdays[day.workday];
  if (!date) throw new Error("No se pudo calcular la fecha del ítem de demostración.");
  return date;
}

function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${TIME_ZONE_OFFSET}`);
}

async function findVetIds(client: PoolClient): Promise<Record<VetKey, string>> {
  const result = await client.query<{ id_usuario: string; email: string }>(
    `SELECT id_usuario, email FROM usuario
     WHERE email = ANY($1) AND rol IN ('VETERINARIO', 'SUPERADMIN')
       AND matricula_profesional IS NOT NULL`,
    [Object.values(VETS)],
  );
  const byEmail = new Map(result.rows.map((row) => [row.email, row.id_usuario]));
  const ids = {} as Record<VetKey, string>;

  for (const [key, email] of Object.entries(VETS) as [VetKey, string][]) {
    const id = byEmail.get(email);
    if (!id) throw new Error(`Falta el profesional ${email} (correr npm run seed:test-users).`);
    ids[key] = id;
  }
  return ids;
}

// Agrega la mascota de Cliente Demo con su ficha médica, como el alta desde la API.
async function ensureClientDemoPet(client: PoolClient): Promise<void> {
  const { ownerEmail, name } = ANIMALS.milo;
  const owner = await client.query<{ id_duenio: string }>(
    `SELECT d.id_duenio FROM duenio d JOIN usuario u ON u.id_usuario = d.id_usuario
     WHERE u.email = $1`,
    [ownerEmail],
  );
  const ownerId = owner.rows[0]?.id_duenio;
  if (!ownerId) throw new Error(`Falta el perfil de ${ownerEmail} (correr npm run seed:test-users).`);

  const existing = await client.query(
    `SELECT 1 FROM animal WHERE id_duenio = $1 AND nombre_identificacion = $2`,
    [ownerId, name],
  );
  if (existing.rowCount) return;

  const animal = await client.query<{ id_animal: string }>(
    `INSERT INTO animal (id_duenio, id_finca, tipo_atencion, nombre_identificacion, especie, raza,
                         cantidad_en_lote, fecha_nacimiento)
     VALUES ($1, NULL, 'URBANO', $2, $3, $4, 1, NULL)
     RETURNING id_animal`,
    [ownerId, name, CLIENT_DEMO_PET.species, CLIENT_DEMO_PET.breed],
  );
  await client.query(`INSERT INTO ficha_medica (id_animal) VALUES ($1)`, [animal.rows[0]!.id_animal]);
  console.log(`Mascota creada: ${name} para ${ownerEmail}`);
}

async function findAnimals(
  client: PoolClient,
): Promise<Record<AnimalKey, { animalId: string; ownerId: string; name: string }>> {
  const found = {} as Record<AnimalKey, { animalId: string; ownerId: string; name: string }>;

  for (const [key, { ownerEmail, name }] of Object.entries(ANIMALS) as [
    AnimalKey,
    { ownerEmail: string; name: string },
  ][]) {
    const result = await client.query<{ id_animal: string; id_duenio: string }>(
      `SELECT a.id_animal, a.id_duenio
       FROM animal a
       JOIN duenio d ON d.id_duenio = a.id_duenio
       JOIN usuario u ON u.id_usuario = d.id_usuario
       WHERE u.email = $1 AND a.nombre_identificacion = $2
       ORDER BY a.created_at
       LIMIT 1`,
      [ownerEmail, name],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Falta el animal "${name}" de ${ownerEmail}.`);
    found[key] = { animalId: row.id_animal, ownerId: row.id_duenio, name };
  }
  return found;
}

// true si el profesional ya tiene un turno activo o una hoja de ruta en ese intervalo.
async function vetIsBusy(client: PoolClient, vetId: string, start: Date, end: Date): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM turno
     WHERE id_veterinario = $1 AND estado NOT IN ('CANCELADA', 'AUSENTE')
       AND fecha_hora < $3 AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
     UNION ALL
     SELECT 1 FROM hoja_de_ruta
     WHERE id_veterinario = $1 AND fecha_hora_inicio < $3 AND fecha_hora_fin > $2
     LIMIT 1`,
    [vetId, start, end],
  );
  return result.rowCount === 1;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este script carga datos ficticios y no se ejecuta con NODE_ENV=production.");
  }

  const days = upcomingDays();
  const client = await db.connect();
  let createdTurnos = 0;
  let createdHojas = 0;

  try {
    await client.query("BEGIN");
    const vets = await findVetIds(client);
    await ensureClientDemoPet(client);
    const animals = await findAnimals(client);

    for (const turno of TURNOS) {
      const start = at(resolveDate(turno.day, days), turno.time);
      const end = new Date(start.getTime() + turno.durationMinutes * 60_000);
      const vetId = vets[turno.vet];
      const animal = animals[turno.animal];
      const label = `${start.toISOString()} ${turno.vet} · ${animal.name}`;

      const duplicate = await client.query(
        `SELECT 1 FROM turno WHERE id_veterinario = $1 AND id_animal = $2 AND fecha_hora = $3`,
        [vetId, animal.animalId, start],
      );
      if (duplicate.rowCount) {
        console.log(`Turno ya cargado, se omite: ${label}`);
        continue;
      }
      if (await vetIsBusy(client, vetId, start, end)) {
        console.warn(`El profesional tiene ese horario ocupado, se omite: ${label}`);
        continue;
      }

      const reasonLabel = REASONS[turno.reason]!;
      await client.query(
        `INSERT INTO turno
           (id_duenio, id_animal, id_veterinario, fecha_hora, modalidad, estado,
            motivo, motivo_categoria, motivo_detalle, duracion_minutos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          animal.ownerId,
          animal.animalId,
          vetId,
          start,
          turno.modality,
          turno.status,
          `${reasonLabel} - ${DEMO_DETAIL}`,
          turno.reason,
          DEMO_DETAIL,
          turno.durationMinutes,
        ],
      );
      createdTurnos += 1;
    }

    for (const hoja of HOJAS) {
      const date = resolveDate(hoja.day, days);
      const start = at(date, hoja.start);
      const end = at(date, hoja.end);
      const vetId = vets[hoja.vet];
      const label = `${start.toISOString()} ${hoja.vet} · ${hoja.detail}`;

      const duplicate = await client.query(
        `SELECT 1 FROM hoja_de_ruta WHERE id_veterinario = $1 AND fecha_hora_inicio = $2`,
        [vetId, start],
      );
      if (duplicate.rowCount) {
        console.log(`Hoja de ruta ya cargada, se omite: ${label}`);
        continue;
      }
      if (await vetIsBusy(client, vetId, start, end)) {
        console.warn(`El profesional tiene ese horario ocupado, se omite: ${label}`);
        continue;
      }

      await client.query(
        `INSERT INTO hoja_de_ruta (id_veterinario, fecha_hora_inicio, fecha_hora_fin, detalle)
         VALUES ($1, $2, $3, $4)`,
        [vetId, start, end, hoja.detail],
      );
      createdHojas += 1;
    }

    await client.query("COMMIT");
    console.log(
      `Agenda demo: ${createdTurnos} turnos y ${createdHojas} hojas de ruta creados ` +
        `(${days.workdays[0]} a ${days.saturday > days.workdays[4]! ? days.saturday : days.workdays[4]}).`,
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudo cargar la agenda de demostración:", error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
