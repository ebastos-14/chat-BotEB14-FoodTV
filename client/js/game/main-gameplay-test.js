import { Game } from "./Game.js";

console.log(
  "[GAMEPLAY TEST] Iniciando..."
);

try {
  const canvas =
    document.getElementById(
      "game-canvas"
    );

  if (!canvas) {
    throw new Error(
      "No se encontró #game-canvas."
    );
  }

  console.log(
    "[GAMEPLAY TEST] Canvas encontrado."
  );

  const game =
    new Game(canvas);

  console.log(
    "[GAMEPLAY TEST] Game creado."
  );

  await game.initialize();

  console.log(
    "[GAMEPLAY TEST] Game inicializado."
  );

  const systems =
    game.getSystems();

  console.log(
    "[GAMEPLAY TEST] GameSystems obtenido."
  );

  const workers =
    systems.workers;

  console.log(
    "[GAMEPLAY TEST] WorkerManager obtenido."
  );

  const worker1 =
    workers.assignWorker({
      username: "ebastos14",
      role: "mod"
    });

  console.log(
    "[GAMEPLAY TEST] Worker 1:",
    worker1
  );

  const worker2 =
    workers.assignWorker({
      username: "jaciitv",
      role: "mod"
    });

  console.log(
    "[GAMEPLAY TEST] Worker 2:",
    worker2
  );

  const worker3 =
    workers.assignWorker({
      username: "otro_mod",
      role: "mod"
    });

  console.log(
    "[GAMEPLAY TEST] Worker 3:",
    worker3
  );

  game.syncGameplay();

  console.log(
    "[GAMEPLAY TEST] Gameplay sincronizado."
  );

  console.log(
    "[GAMEPLAY TEST] Workers finales:",
    workers.getAll()
  );

  game.start();

  console.log(
    "[GAMEPLAY TEST] Juego iniciado."
  );
} catch (error) {
  console.error(
    "[GAMEPLAY TEST] ERROR:",
    error
  );
}
