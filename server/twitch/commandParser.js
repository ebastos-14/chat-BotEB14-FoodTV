/**

* Comandos permitidos por el juego.
* 
* Cualquier otro comando de Twitch se ignora.
  */
  const ALLOWED_COMMANDS = Object.freeze([
  "work",
  "menu",
  "atender",
  "cortar",
  "cocinar",
  "freir",
  "entregar",
  "reclamar"
  ]);

const ALLOWED_COMMAND_SET = new Set(
ALLOWED_COMMANDS
);

/**

* Comprueba si un comando pertenece
* a los comandos reconocidos por el juego.
  */
  export function isAllowedCommand(command) {
  const normalizedCommand = String(command || "")
  .trim()
  .toLowerCase();

return ALLOWED_COMMAND_SET.has(
normalizedCommand
);
}

/**

* Convierte un mensaje de Twitch
* en un comando estructurado.
* 
* Los comandos que no pertenecen al juego
* devuelven null y son ignorados.
* 
* Este módulo NO ejecuta comandos.
  */
  export function parseCommand(message) {
  const raw = String(message || "").trim();

if (!raw.startsWith("!")) {
return null;
}

const parts = raw.split(/\s+/);

const command = parts[0]
.slice(1)
.toLowerCase();

if (!isAllowedCommand(command)) {
return null;
}

const args = parts
.slice(1)
.map((arg) => arg.trim())
.filter(Boolean);

return Object.freeze({
command,
args,
argsText: args.join(" "),
raw
});
}

/**

* Devuelve la lista de comandos reconocidos.
* 
* Se devuelve una copia para evitar que
* otro módulo pueda modificar la lista original.
  */
  export function getAllowedCommands() {
  return [...ALLOWED_COMMANDS];
  }
