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

async function testModules() {
  try {
    showStatus(
      "Probando MapRenderer..."
    );

    await import(
      "./MapRenderer.js"
    );

    showStatus(
      "MapRenderer OK. Probando GameState..."
    );

    await import(
      "./GameState.js"
    );

    showStatus(
      "GameState OK. Probando GameSystems..."
    );

    await import(
      "./GameSystems.js"
    );

    showStatus(
      "GameSystems OK. Probando GameplayRenderer..."
    );

    await import(
      "./GameplayRenderer.js"
    );

    showStatus(
      "Todos los módulos principales cargaron correctamente."
    );
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

testModules();
