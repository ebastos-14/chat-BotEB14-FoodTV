import { Game } from "./Game.js";

const status =
  document.getElementById(
    "game-status"
  );

function showStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

async function runTest() {
  try {
    showStatus(
      "Prueba: buscando canvas..."
    );

    const canvas =
      document.getElementById(
        "game-canvas"
      );

    if (!canvas) {
      throw new Error(
        "No se encontró #game-canvas."
      );
    }

    showStatus(
      "Prueba: creando Game..."
    );

    const game =
      new Game(canvas);

    showStatus(
      "Prueba: cargando mapa..."
    );

    await game.initialize();

    showStatus(
      "Prueba: asignando trabajadores..."
    );

    const systems =
      game.getSystems();

    const workers =
      systems.workers;

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

    showStatus(
      "Prueba: sincronizando..."
    );

    game.syncGameplay();

    showStatus(
      "Prueba completada."
    );

    game.start();
  } catch (error) {
    showStatus(
      "ERROR: " +
        (
          error?.message ||
          String(error)
        )
    );
  }
}

runTest();
