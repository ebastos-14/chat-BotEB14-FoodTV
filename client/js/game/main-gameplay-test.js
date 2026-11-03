import { Game } from "./Game.js";

const canvas =
  document.getElementById(
    "game-canvas"
  );

if (!canvas) {
  throw new Error(
    "No se encontró #game-canvas."
  );
}

const game =
  new Game(canvas);

await game.initialize();

const systems =
  game.getSystems();

const workers =
  systems.workers;

/*
 * =========================
 * PRUEBA !WORK
 * =========================
 *
 * Simulamos tres usuarios
 * que ya pasaron la validación
 * de !work.
 */

workers.assignWorker({
  username: "ebastos14",
  role: "mod"
});

workers.assignWorker({
  username: "jaciitv",
  role: "mod"
});

workers.assignWorker({
  username: "otro_mod",
  role: "mod"
});

/*
 * Convertimos el estado
 * lógico en estado visual.
 */

game.syncGameplay();

console.log(
  "Workers de prueba:",
  workers.getAll()
);

game.start();
