import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});