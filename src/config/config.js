const config = {
  port: process.env.PORT || 3000,

  twitch: {
    username: process.env.TWITCH_USERNAME || "",
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    channel: process.env.TWITCH_CHANNEL || ""
  }
};

export default config;
