require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mysql = require("mysql2");

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendOrigins = (
    process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
).split(",").map((origin) => origin.trim());
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vet-andina",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(express.json());
app.use(cors({
    origin: frontendOrigins
}));

function validarIdAnimal(id) {
    return /^\d+$/.test(id);
}

function consultar(sql, parametros = []) {
    return db.promise().query(sql, parametros).then(([filas]) => filas);
}

app.get("/health", async (_req, res) => {
    try {
        await consultar("SELECT 1");
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        console.error("Error verificando la base de datos:", error);
        res.status(503).json({ status: "error", message: "Base de datos no disponible" });
    }
});

app.get("/animales", async (_req, res, next) => {
    try {
        res.json(await consultar("SELECT * FROM animales"));
    } catch (error) {
        next(error);
    }
});

app.post("/animales", async (req, res, next) => {
    const { nombre, especie } = req.body;

    if (typeof nombre !== "string" || !nombre.trim() ||
        typeof especie !== "string" || !especie.trim()) {
        return res.status(400).json({ error: "nombre y especie son obligatorios" });
    }

    try {
        const resultado = await consultar(
            "INSERT INTO animales (nombre, especie) VALUES (?, ?)",
            [nombre.trim(), especie.trim()]
        );
        res.status(201).json({ mensaje: "Animal guardado", id: resultado.insertId });
    } catch (error) {
        next(error);
    }
});

app.get("/animales/:id/historial", async (req, res, next) => {
    const { id } = req.params;

    if (!validarIdAnimal(id)) {
        return res.status(400).json({ error: "El id del animal no es válido" });
    }

    try {
        const filas = await consultar(
            `SELECT *
             FROM historial_clinico
             WHERE id_animal = ?
             ORDER BY fecha DESC`,
            [id]
        );
        res.json(filas);
    } catch (error) {
        next(error);
    }
});

app.post("/historial-clinico", async (req, res, next) => {
    const { id_animal, fecha, comentario, tipo = "clinico" } = req.body;

    if (!Number.isInteger(Number(id_animal)) || Number(id_animal) <= 0 ||
        typeof fecha !== "string" || !fecha ||
        typeof comentario !== "string" || !comentario.trim() ||
        !["clinico", "observacion"].includes(tipo)) {
        return res.status(400).json({
            error: "id_animal, fecha, comentario y un tipo válido son obligatorios"
        });
    }

    try {
        const resultado = await consultar(
            `INSERT INTO historial_clinico
             (id_animal, fecha, tipo, comentario)
             VALUES (?, ?, ?, ?)`,
            [Number(id_animal), fecha, tipo, comentario.trim()]
        );
        res.status(201).json({ mensaje: "Registro guardado", id: resultado.insertId });
    } catch (error) {
        next(error);
    }
});

app.get("/animales/:id/turnos", async (req, res, next) => {
    const { id } = req.params;

    if (!validarIdAnimal(id)) {
        return res.status(400).json({ error: "El id del animal no es válido" });
    }

    try {
        const filas = await consultar(
            `SELECT *
             FROM turnos
             WHERE id_animal = ?
             ORDER BY fecha_hora DESC`,
            [id]
        );
        res.json(filas);
    } catch (error) {
        next(error);
    }
});

app.get("/turnos", async (_req, res, next) => {
    try {
        const filas = await consultar(
            `SELECT turnos.*, animales.nombre AS animal_nombre, animales.especie
             FROM turnos
             INNER JOIN animales ON turnos.id_animal = animales.id
             ORDER BY fecha_hora ASC`
        );
        res.json(filas);
    } catch (error) {
        next(error);
    }
});

app.get("/animales/:id/ficha", async (req, res, next) => {
    const { id } = req.params;

    if (!validarIdAnimal(id)) {
        return res.status(400).json({ error: "El id del animal no es válido" });
    }

    try {
        const [animales, historial, observaciones, turnos] = await Promise.all([
            consultar("SELECT * FROM animales WHERE id = ?", [id]),
            consultar(
                `SELECT * FROM historial_clinico
                 WHERE id_animal = ? AND tipo = 'clinico'
                 ORDER BY fecha DESC`,
                [id]
            ),
            consultar(
                `SELECT * FROM historial_clinico
                 WHERE id_animal = ? AND tipo = 'observacion'
                 ORDER BY fecha DESC`,
                [id]
            ),
            consultar(
                `SELECT * FROM turnos
                 WHERE id_animal = ?
                 ORDER BY fecha_hora DESC`,
                [id]
            )
        ]);

        if (animales.length === 0) {
            return res.status(404).json({ error: "Animal no encontrado" });
        }

        res.json({ animal: animales[0], historial, observaciones, turnos });
    } catch (error) {
        next(error);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
    console.error("Error en la API:", error);
    res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(port, () => {
    console.log(`Backend funcionando en http://localhost:${port}`);
});