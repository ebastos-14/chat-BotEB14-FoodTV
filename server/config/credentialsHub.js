const TWITCH_ENV_KEYS = Object.freeze({
username: "TWITCH_BOT_USERNAME",
oauthToken: "TWITCH_OAUTH_TOKEN",
channel: "TWITCH_CHANNEL"
});

function normalizeChannel(channel) {
return String(channel || "")
.trim()
.replace(/^#/, "")
.toLowerCase();
}

/**

* Obtiene las credenciales de Twitch
* desde las variables de entorno del servidor.
* 
* Este archivo es el único punto que debe
* conocer los nombres de las variables de Render.
  */
  export function getTwitchCredentials() {
  const username =
  String(
  process.env[TWITCH_ENV_KEYS.username] || ""
  ).trim();

const oauthToken =
String(
process.env[TWITCH_ENV_KEYS.oauthToken] || ""
).trim();

const channel =
normalizeChannel(
process.env[TWITCH_ENV_KEYS.channel]
);

return Object.freeze({
username,
oauthToken,
channel
});
}

/**

* Comprueba si están disponibles
* todas las credenciales necesarias.
* 
* No devuelve ningún secreto.
  */
  export function validateTwitchCredentials() {
  const credentials =
  getTwitchCredentials();

const missing = [];

if (!credentials.username) {
missing.push(
TWITCH_ENV_KEYS.username
);
}

if (!credentials.oauthToken) {
missing.push(
TWITCH_ENV_KEYS.oauthToken
);
}

if (!credentials.channel) {
missing.push(
TWITCH_ENV_KEYS.channel
);
}

return {
valid: missing.length === 0,
missing
};
}

/**

* Configuración segura para diagnóstico.
* 
* Nunca devuelve el OAuth token.
  */
  export function getSafeTwitchConfig() {
  const credentials =
  getTwitchCredentials();

return Object.freeze({
username: credentials.username,
channel: credentials.channel,
hasOAuthToken:
Boolean(credentials.oauthToken)
});
}
