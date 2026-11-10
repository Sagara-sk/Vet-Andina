import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Valores ficticios: los tests mockean los modelos y nunca abren conexión
    // con la base. El pool de pg solo se conecta al ejecutar una consulta.
    env: {
      PORT: "3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/vet_andina_test",
      JWT_SECRET: "secreto-de-pruebas-con-al-menos-32-bytes",
    },
  },
});
