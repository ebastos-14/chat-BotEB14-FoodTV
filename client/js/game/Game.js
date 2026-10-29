import { GAME_CONFIG } from "../config.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.running = false;
    this.lastTime = 0;

    this.resize();
  }

  resize() {
    this.canvas.width = GAME_CONFIG.canvas.width;
    this.canvas.height = GAME_CONFIG.canvas.height;
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTime = performance.now();

    requestAnimationFrame((time) => this.loop(time));
  }

  loop(time) {
    if (!this.running) {
      return;
    }

    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(deltaTime) {
    // Próximamente:
    // - entidades
    // - movimiento
    // - colisiones
    // - interacción
    // - estado sincronizado
    void deltaTime;
  }

  render() {
    const { width, height } = this.canvas;

    this.ctx.clearRect(0, 0, width, height);

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "24px monospace";
    this.ctx.textAlign = "center";

    this.ctx.fillText(
      "chat-BotEB14-FoodTV",
      width / 2,
      height / 2 - 20
    );

    this.ctx.font = "16px monospace";

    this.ctx.fillText(
      "Motor del juego inicializado",
      width / 2,
      height / 2 + 20
    );
  }

  stop() {
    this.running = false;
  }
}
