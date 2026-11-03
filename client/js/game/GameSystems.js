const status =
document.getElementById(
"game-status"
);

function showStatus(message) {
if (status) {
status.textContent = message;
}
}

async function testImport(path, name) {
showStatus(
"Probando " + name + "..."
);

await import(path);

showStatus(
name + " OK"
);
}

async function testGameSystems() {
try {
await testImport(
"../entities/PositionRegistry.js",
"PositionRegistry"
);

await testImport(
  "../entities/WorkerManager.js",
  "WorkerManager"
);

await testImport(
  "../entities/CustomerManager.js",
  "CustomerManager"
);

await testImport(
  "../entities/OrderManager.js",
  "OrderManager"
);

await testImport(
  "../entities/ActionSystem.js",
  "ActionSystem"
);

showStatus(
  "TODOS LOS IMPORTS DE GAMESYSTEMS FUNCIONAN"
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

testGameSystems();
