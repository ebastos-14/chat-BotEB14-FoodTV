const status =
  document.getElementById(
    "game-status"
  );

function showStatus(message) {
  if (status) {
    status.textContent =
      message;
  }
}

async function testGameImport() {
  try {
    showStatus(
      "Probando importación de Game.js..."
    );

    const module =
      await import("./Game.js");

    if (
      !module ||
      !module.Game
    ) {
      throw new Error(
        "Game.js no exporta Game."
      );
    }

    showStatus(
      "Game.js cargó correctamente."
    );
  } catch (error) {
    showStatus(
      "ERROR AL CARGAR GAME.JS: " +
        (
          error?.message ||
          String(error)
        )
    );
  }
}

testGameImport();
