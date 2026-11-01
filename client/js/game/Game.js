import { GAME_CONFIG } from "../config.js";
import { assetRegistry } from "../assets/index.js";
import { raptorAssignments } from "../config/raptorAssignments.js";
import mapDefinition from "../../assets/restaurant/map.json" with { type: "json" };
import { MapRenderer } from "./MapRenderer.js";

export class Game {
constructor(canvas) {
this.canvas = canvas;
this.ctx = canvas.getContext("2d");

if (!this.ctx) {
  throw new Error(
    "No se pudo obtener el contexto 2D del canvas."
  );
}

this.running = false;
this.lastTime = 0;

this.map = mapDefinition;

this.raptorAssignments = raptorAssignments;

this.mapRenderer = new MapRenderer(
  this.ctx,
  this.map,
  this.raptorAssignments
);

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

requestAnimationFrame((time) => {
  this.loop(time);
});

}

loop(time) {
if (!this.running) {
return;
}

const deltaTime = (
  time - this.lastTime
) / 1000;

this.lastTime = time;

this.update(deltaTime);
this.render();

requestAnimationFrame((nextTime) => {
  this.loop(nextTime);
});

}

update(deltaTime) {
void deltaTime;
}

render() {
this.mapRenderer.render();
}

getAsset(id) {
return assetRegistry.get(id);
}

getRaptorAssignment(locationId) {
return this.raptorAssignments.get(locationId);
}

setRaptorAssignment(
locationId,
sheetName,
profileName
) {
this.raptorAssignments.set(
locationId,
sheetName,
profileName
);
}

stop() {
this.running = false;
}
}
