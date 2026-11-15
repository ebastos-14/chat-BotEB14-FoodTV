import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import healthRouter from "./routes/health.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

/*
 * Middleware básico
 */
app.use(express.json());

/*
 * Endpoint de salud.
 *
 * Debe permanecer disponible aunque Twitch
 * u otros subsistemas todavía no estén conectados.
 */
app.use("/health", healthRouter);

/*
 * Archivos públicos del cliente.
 */
const clientPath = path.join(__dirname, "..", "client");

app.use(express.static(clientPath));

/*
 * Ruta principal.
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

/*
 * Middleware básico para errores no controlados
 * dentro de las rutas HTTP.
 */
app.use((err, req, res, next) => {
  console.error("HTTP error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
});

/*
 * Inicio del servidor.
 */
app.listen(PORT, HOST, () => {
  console.log(`chat-BotEB14-FoodTV server listening on ${HOST}:${PORT}`);
});
