/**

* Punto central de recepción de comandos de Twitch.
* 
* Este módulo todavía NO ejecuta comandos del juego.
* Su función actual es recibir los comandos válidos
* desde TwitchCommandReader y mostrar la información
* recibida para poder verificar el flujo completo.
  */

export function handleTwitchCommand(commandData) {
if (!commandData) {
return;
}

const {
command,
args,
argsText,
raw,
user
} = commandData;

console.log("");
console.log("========== TWITCH COMMAND ==========");

console.log("Comando:", command);
console.log("Argumentos:", args);
console.log("Texto argumentos:", argsText);
console.log("Mensaje original:", raw);

console.log("Usuario:", user.username);
console.log("Nombre:", user.displayName);

console.log("Streamer:", user.isBroadcaster);
console.log("Moderador:", user.isMod);
console.log("VIP:", user.isVip);
console.log("Suscriptor:", user.isSubscriber);

console.log("====================================");
console.log("");
}
