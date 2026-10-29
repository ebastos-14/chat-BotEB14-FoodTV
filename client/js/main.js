import { Game } from "./game/Game.js";

const canvas = document.querySelector("#game-canvas");

if (!canvas) {
  throw new Error("No se encontró #game-canvas");
}

const game = new Game(canvas);

game.start();
