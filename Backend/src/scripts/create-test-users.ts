import "../config/env";
import bcrypt from "bcrypt";
import { db } from "../config/database";

// Crea una cuenta de prueba por rol para que el equipo pueda probar cada panel.
// Las credenciales están publicadas en el README: son cuentas de desarrollo y no
// deben existir en una base con datos reales. Las cuentas que ya existen no se modifican.

type Rol = "SUPERADMIN" | "ADMINISTRATIVO" | "VETERINARIO" | "CLIENTE";

interface TestUser {
  fullName: string;
  email: string;
  password: string;
  role: Rol;
  professionalLicense?: string;
  // Solo para CLIENTE: perfil en duenio, como lo crea el registro.
  owner?: { phone: string; locality: string };
}

const testUsers: TestUser[] = [
  {
    fullName: "Julián Paredes",
    email: "julian.paredes@vetandina.com.ar",
    password: "VetAndina-Julian2026",
    role: "SUPERADMIN",
    professionalLicense: "DEMO-0001",
  },
  {
    fullName: "Carla Méndez",
    email: "carla.mendez@vetandina.com.ar",
    password: "VetAndina-Admin2026",
    role: "ADMINISTRATIVO",
  },
  {
    fullName: "Martín Sosa",
    email: "martin.sosa@vetandina.com.ar",
    password: "VetAndina-Vet2026",
    role: "VETERINARIO",
    professionalLicense: "DEMO-0002",
  },
  {
    fullName: "Laura Giménez",
    email: "laura.gimenez@example.com",
    password: "VetAndina-Cliente2026",
    role: "CLIENTE",
    owner: { phone: "+54 9 299 000 0001", locality: "Cipolletti" },
  },
];

async function createUser(user: TestUser): Promise<void> {
  const passwordHash = await bcrypt.hash(user.password, 12);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id_usuario: string }>(
      `INSERT INTO usuario (nombre_completo, rol, matricula_profesional, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id_usuario`,
      [
        user.fullName,
        user.role,
        user.professionalLicense ?? null,
        user.email,
        passwordHash,
      ],
    );
    const userId = inserted.rows[0]?.id_usuario;

    if (!userId) {
      await client.query("ROLLBACK");
      console.log(`${user.role}: ya existe ${user.email}; no se modificó.`);
      return;
    }

    if (user.owner) {
      await client.query(
        `INSERT INTO duenio (id_usuario, nombre_completo, telefono, email, localidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, user.fullName, user.owner.phone, user.email, user.owner.locality],
      );
    }

    await client.query("COMMIT");
    console.log(`${user.role}: creado ${user.email}`);
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

  for (const user of testUsers) {
    await createUser(user);
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudieron crear los usuarios de prueba:", error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
