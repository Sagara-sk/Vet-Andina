import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { getData } from './database';

dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173', // URL por defecto de Vite Frontend
  credentials: true // Requerido para permitir envío/recepción de Cookies HttpOnly
}));

// Ruta de comprobación de estado
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Vet Andina funcionando correctamente' });
});

app.get('/api/db/health', async (_req, res) => {
  try {
    const data = await getData();
    res.json({ status: 'ok', database: data[0] });
  } catch (error) {
    console.error('Error al comprobar la conexión con Neon:', error);
    res.status(503).json({
      status: 'error',
      message: 'No fue posible conectar con la base de datos.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});
