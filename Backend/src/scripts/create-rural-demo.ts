import "../config/env";
import bcrypt from "bcrypt";
import type { PoolClient } from "pg";
import { db } from "../config/database";

// Carga establecimientos y lotes ganaderos ficticios para probar la vista
// /panel/establecimientos y comprobar que cada tutor ve solo los suyos:
// - Laura Giménez y Productor Demo (clientes creados con `npm run seed:test-users`)
//   reciben sus campos.
// - Se crean tres productores de prueba con cuenta CLIENTE y perfil completo.
// Las credenciales están publicadas en el README: son cuentas de desarrollo y no
// deben existir en una base con datos reales. Los nombres de los campos llevan
// "(demo)". Las cuentas, campos y lotes que ya existen no se modifican ni duplican.

interface DemoLot {
  name: string;
  species: string;
  breed: string;
  animalCount: number;
}

interface DemoEstablishment {
  name: string;
  locality: string;
  lots: DemoLot[];
}

interface DemoProducer {
  email: string;
  // Solo para las cuentas que crea este script. Sin `account`, la cuenta tiene
  // que existir de antemano.
  account?: {
    fullName: string;
    password: string;
    phone: string;
    locality: string;
    dniCuit: string;
  };
  establishments: DemoEstablishment[];
}

const demoProducers: DemoProducer[] = [
  {
    email: "laura.gimenez@example.com",
    establishments: [
      {
        name: "La Esperanza (demo)",
        locality: "Cipolletti",
        lots: [
          { name: "Vacas de cría", species: "Bovino", breed: "Aberdeen Angus", animalCount: 120 },
          { name: "Terneros 2026", species: "Bovino", breed: "Hereford", animalCount: 45 },
        ],
      },
      {
        name: "Los Álamos (demo)",
        locality: "Allen",
        lots: [
          { name: "Majada norte", species: "Ovino", breed: "Merino", animalCount: 80 },
          { name: "Tropilla", species: "Equino", breed: "Criollo", animalCount: 6 },
        ],
      },
    ],
  },
  // Cliente productor de las cuentas simples; también lo crea seed:test-users.
  // Con esta finca su perfil de EMPRESA_PRODUCTOR queda completo.
  {
    email: "productor@vetandina.com",
    establishments: [
      {
        name: "El Productor (demo)",
        locality: "Allen",
        lots: [
          { name: "Vacas de cría", species: "Bovino", breed: "Hereford", animalCount: 60 },
          { name: "Ovejas", species: "Ovino", breed: "Merino", animalCount: 40 },
        ],
      },
    ],
  },
  {
    email: "ricardo.benitez@example.com",
    account: {
      fullName: "Ricardo Benítez",
      password: "VetAndina-Productor1-2026",
      phone: "+54 9 299 000 0002",
      locality: "General Roca",
      dniCuit: "20-00000002-0",
    },
    establishments: [
      {
        name: "El Mirador (demo)",
        locality: "General Roca",
        lots: [
          { name: "Novillos de engorde", species: "Bovino", breed: "Braford", animalCount: 210 },
          { name: "Vaquillonas", species: "Bovino", breed: "Aberdeen Angus", animalCount: 64 },
          { name: "Caballos de trabajo", species: "Equino", breed: "Criollo", animalCount: 4 },
        ],
      },
    ],
  },
  {
    email: "marta.quiroga@example.com",
    account: {
      fullName: "Marta Quiroga",
      password: "VetAndina-Productor2-2026",
      phone: "+54 9 299 000 0003",
      locality: "Fernández Oro",
      dniCuit: "27-00000003-0",
    },
    establishments: [
      {
        name: "San Javier (demo)",
        locality: "Fernández Oro",
        lots: [
          { name: "Cabras lecheras", species: "Caprino", breed: "Saanen", animalCount: 52 },
          { name: "Corderos 2026", species: "Ovino", breed: "Corriedale", animalCount: 38 },
        ],
      },
      {
        name: "Puesto Chacra 14 (demo)",
        locality: "Cinco Saltos",
        lots: [{ name: "Cerdas madres", species: "Porcino", breed: "Landrace", animalCount: 18 }],
      },
    ],
  },
  {
    email: "hugo.fernandez@example.com",
    account: {
      fullName: "Hugo Fernández",
      password: "VetAndina-Productor3-2026",
      phone: "+54 9 299 000 0004",
      locality: "Allen",
      dniCuit: "20-00000004-0",
    },
    establishments: [
      {
        name: "La Querencia (demo)",
        locality: "Allen",
        lots: [{ name: "Rodeo general", species: "Bovino", breed: "Hereford", animalCount: 95 }],
      },
      // Sin lotes, para ver el estado vacío de un establecimiento.
      { name: "Campo nuevo (demo)", locality: "Allen", lots: [] },
    ],
  },
];

// Devuelve el id_duenio del productor. Si la cuenta no existe y el script la
// define, la crea con perfil completo de productor (EMPRESA_PRODUCTOR).
async function findOrCreateProducer(client: PoolClient, producer: DemoProducer): Promise<string> {
  const existing = await client.query<{ id_duenio: string }>(
    `SELECT d.id_duenio
     FROM duenio d
     JOIN usuario u ON u.id_usuario = d.id_usuario
     WHERE u.email = $1 AND u.rol = 'CLIENTE'
     LIMIT 1`,
    [producer.email],
  );
  const existingId = existing.rows[0]?.id_duenio;
  if (existingId) {
    console.log(`Productor ya existente: ${producer.email}; su cuenta no se modificó.`);
    return existingId;
  }

  const account = producer.account;
  if (!account) {
    throw new Error(
      `No existe el cliente de prueba ${producer.email}. Ejecutá antes npm run seed:test-users.`,
    );
  }

  const passwordHash = await bcrypt.hash(account.password, 12);
  const user = await client.query<{ id_usuario: string }>(
    `INSERT INTO usuario (nombre_completo, rol, email, password_hash)
     VALUES ($1, 'CLIENTE', $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id_usuario`,
    [account.fullName, producer.email, passwordHash],
  );
  const userId = user.rows[0]?.id_usuario;
  if (!userId) {
    throw new Error(`El email ${producer.email} ya está en uso por una cuenta que no es CLIENTE.`);
  }

  const owner = await client.query<{ id_duenio: string }>(
    `INSERT INTO duenio (id_usuario, nombre_completo, telefono, email, localidad, dni_cuit, tipo_persona)
     VALUES ($1, $2, $3, $4, $5, $6, 'EMPRESA_PRODUCTOR')
     RETURNING id_duenio`,
    [userId, account.fullName, account.phone, producer.email, account.locality, account.dniCuit],
  );
  const ownerId = owner.rows[0]?.id_duenio;
  if (!ownerId) throw new Error(`No se pudo crear el perfil de ${producer.email}.`);

  console.log(`Productor creado: ${producer.email}`);
  return ownerId;
}

async function findOrCreateEstablishment(
  client: PoolClient,
  ownerId: string,
  establishment: DemoEstablishment,
): Promise<string> {
  const existing = await client.query<{ id_finca: string }>(
    `SELECT id_finca FROM finca
     WHERE id_duenio = $1 AND lower(btrim(nombre_finca)) = lower(btrim($2))
     LIMIT 1`,
    [ownerId, establishment.name],
  );
  const existingId = existing.rows[0]?.id_finca;
  if (existingId) {
    console.log(`  Establecimiento ya existente: ${establishment.name}`);
    return existingId;
  }

  const inserted = await client.query<{ id_finca: string }>(
    `INSERT INTO finca (id_duenio, nombre_finca, localidad)
     VALUES ($1, $2, $3)
     RETURNING id_finca`,
    [ownerId, establishment.name, establishment.locality],
  );
  const id = inserted.rows[0]?.id_finca;
  if (!id) throw new Error(`No se pudo crear ${establishment.name}.`);
  console.log(`  Establecimiento creado: ${establishment.name}`);
  return id;
}

// Igual que el alta desde la API, cada lote se crea con su ficha médica.
async function createLotIfMissing(
  client: PoolClient,
  ownerId: string,
  farmId: string,
  lot: DemoLot,
): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM animal
     WHERE id_duenio = $1 AND id_finca = $2
       AND lower(btrim(nombre_identificacion)) = lower(btrim($3))`,
    [ownerId, farmId, lot.name],
  );
  if (existing.rowCount) {
    console.log(`    Lote ya existente: ${lot.name}`);
    return;
  }

  const animal = await client.query<{ id_animal: string }>(
    `INSERT INTO animal (id_duenio, id_finca, tipo_atencion, nombre_identificacion, especie, raza,
                         cantidad_en_lote, fecha_nacimiento)
     VALUES ($1, $2, 'RURAL', $3, $4, $5, $6, NULL)
     RETURNING id_animal`,
    [ownerId, farmId, lot.name, lot.species, lot.breed, lot.animalCount],
  );
  const animalId = animal.rows[0]?.id_animal;
  if (!animalId) throw new Error(`No se pudo crear el lote ${lot.name}.`);

  await client.query(`INSERT INTO ficha_medica (id_animal) VALUES ($1)`, [animalId]);
  console.log(`    Lote creado: ${lot.name} (${lot.animalCount} ${lot.species})`);
}

// Cada productor va en su propia transacción: si uno falla, no queda a medias.
async function seedProducer(producer: DemoProducer): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const ownerId = await findOrCreateProducer(client, producer);
    for (const establishment of producer.establishments) {
      const farmId = await findOrCreateEstablishment(client, ownerId, establishment);
      for (const lot of establishment.lots) {
        await createLotIfMissing(client, ownerId, farmId, lot);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Este script crea cuentas con contraseñas públicas y no se ejecuta con NODE_ENV=production.",
    );
  }

  for (const producer of demoProducers) {
    await seedProducer(producer);
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudieron cargar los datos rurales de prueba:", error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
