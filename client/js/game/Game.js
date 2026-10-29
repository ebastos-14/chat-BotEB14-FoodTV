import { GAME_CONFIG } from "../config.js";
import { assetRegistry } from "../assets/index.js";
import { MapRenderer } from "./MapRenderer.js";
import mapDefinition from "../../assets/restaurant/map.json" with { type: "json" };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.running = false;
    this.lastTime = 0;

    this.map = mapDefinition;
    this.mapRenderer = new MapRenderer(this.ctx, this.map);

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
    void deltaTime;
  }

  render() {
    const viewport = {
      x: 0,
      y: 0,
      width: this.map.background.width,
      height: this.map.background.height,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    };

    this.mapRenderer.render(viewport);
  }

  getAsset(id) {
    return assetRegistry.get(id);
  }

  stop() {
    this.running = false;
  }
}
