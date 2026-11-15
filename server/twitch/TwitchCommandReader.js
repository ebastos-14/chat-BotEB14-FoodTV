import tmi from "tmi.js";

import {
getTwitchCredentials,
validateTwitchCredentials
} from "../config/credentialsHub.js";

import {
isAllowedCommand,
parseCommand
} from "./commandParser.js";

/**

* Lector de comandos de Twitch.
* 
* Responsabilidades:
* - Conectarse al chat de Twitch.
* - Recibir mensajes.
* - Ignorar mensajes normales.
* - Ignorar comandos que no pertenecen al juego.
* - Convertir comandos permitidos en objetos estructurados.
* 
* Este módulo NO ejecuta comandos del juego.
* Tampoco modifica GameState.
  */
  export class TwitchCommandReader {
  constructor() {
  this.client = null;
  this.running = false;
  this.onCommand = null;
  }

/**

* Registra la función que recibirá
* los comandos válidos.
  */
  setCommandHandler(handler) {
  if (typeof handler !== "function") {
  throw new TypeError(
  "El command handler debe ser una función."
  );
  }

this.onCommand = handler;

}

/**

* Inicia la conexión con Twitch.
  */
  async start() {
  if (this.running) {
  return;
  }

const validation =
  validateTwitchCredentials();

if (!validation.valid) {
  throw new Error(
    `Faltan credenciales de Twitch: ${validation.missing.join(", ")}`
  );
}

const credentials =
  getTwitchCredentials();

this.client = new tmi.Client({
  identity: {
    username: credentials.username,
    password: credentials.oauthToken
  },

  channels: [
    credentials.channel
  ]
});

this.client.on(
  "message",
  (
    channel,
    tags,
    message,
    self
  ) => {
    this.handleMessage(
      channel,
      tags,
      message,
      self
    );
  }
);

this.client.on(
  "connected",
  (
    address,
    port
  ) => {
    console.log(
      `Twitch conectado: ${address}:${port}`
    );

    console.log(
      `Canal: #${credentials.channel}`
    );
  }
);

this.client.on(
  "disconnected",
  (reason) => {
    this.running = false;

    console.warn(
      "Twitch desconectado:",
      reason
    );
  }
);

await this.client.connect();

this.running = true;

console.log(
  "TwitchCommandReader iniciado."
);

}

/**

* Procesa un mensaje recibido desde Twitch.
  /
  handleMessage(
  channel,
  tags,
  message,
  self
  ) {
  /
  * Ignorar mensajes enviados
  * por el propio bot.
    */
    if (self) {
    return;
    }

/*
 * Normalizar el mensaje.
 */
const rawMessage =
  String(message || "").trim();

/*
 * Ignorar mensajes normales.
 */
if (!rawMessage.startsWith("!")) {
  return;
}

/*
 * Obtener solamente el nombre
 * del comando.
 */
const parts =
  rawMessage.split(/\s+/);

const command =
  parts[0]
    .slice(1)
    .toLowerCase();

/*
 * Ignorar inmediatamente cualquier
 * comando que no pertenezca al juego.
 */
if (!isAllowedCommand(command)) {
  return;
}

/*
 * Convertir el mensaje a la estructura
 * estándar del juego.
 */
const parsedCommand =
  parseCommand(rawMessage);

if (!parsedCommand) {
  return;
}

/*
 * Información del usuario proporcionada
 * por Twitch.
 */
const user = Object.freeze({
  username:
    String(
      tags?.username || ""
    ).toLowerCase(),

  displayName:
    String(
      tags?.["display-name"] ||
      tags?.username ||
      ""
    ),

  isBroadcaster:
    tags?.badges?.broadcaster === "1",

  isMod:
    Boolean(tags?.mod),

  isVip:
    Boolean(tags?.badges?.vip),

  isSubscriber:
    Boolean(tags?.badges?.subscriber)
});

/*
 * Comando completo que pasará
 * a la siguiente capa.
 */
const commandData = Object.freeze({
  ...parsedCommand,
  user,
  channel
});

/*
 * Entregar solamente comandos válidos
 * al receptor.
 */
if (typeof this.onCommand === "function") {
  this.onCommand(commandData);
}

}

/**

* Desconecta el lector de Twitch.
  */
  async stop() {
  if (!this.client) {
  return;
  }

try {
  await this.client.disconnect();
} finally {
  this.client = null;
  this.running = false;

  console.log(
    "TwitchCommandReader detenido."
  );
}

}
}
