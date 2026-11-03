import { Game } from "./game/Game.js";

const canvas =
  document.querySelector(
    "#game-canvas"
  );

const status =
  document.querySelector(
    "#game-status"
  );

function setStatus(
  message,
  type = "info"
) {
  if (!status) {
    return;
  }

  status.textContent =
    message;

  status.dataset.type =
    type;
}

async function initialize() {
  if (!canvas) {
    throw new Error(
      "No se encontró #game-canvas."
    );
  }

  setStatus(
    "Cargando restaurante...",
    "info"
  );

  const game =
    new Game(canvas);

  await game.initialize();

  /*
   * Exponemos temporalmente Game
   * para poder inspeccionarlo desde
   * el navegador durante desarrollo.
   *
   * Esto NO será la API definitiva.
   */
  window.chatBotFoodGame =
    game;

  /*
   * Ajuste inicial.
   */
  game.resize();

  /*
   * Responsive.
   */
  window.addEventListener(
    "resize",
    () => {
      game.resize();
    }
  );

  /*
   * Arrancamos el loop.
   */
  game.start();

  setStatus(
    "Restaurante cargado.",
    "success"
  );
}

window.addEventListener(
  "error",
  (event) => {
    console.error(
      event.error ||
      event.message
    );

    setStatus(
      `Error: ${event.message}`,
      "error"
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      event.reason
    );

    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);

    setStatus(
      `Error: ${message}`,
      "error"
    );
  }
);

initialize().catch(
  (error) => {
    console.error(
      error
    );

    setStatus(
      `Error al iniciar: ${error.message}`,
      "error"
    );
  }
);
