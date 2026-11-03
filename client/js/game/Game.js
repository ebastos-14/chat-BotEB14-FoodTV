import { MapRenderer } from "./MapRenderer.js";
import { GameState } from "./GameState.js";

export class Game {
  constructor(canvas) {
    if (!canvas) {
      throw new Error(
        "Game necesita un elemento canvas."
      );
    }

    this.canvas = canvas;

    this.state =
      new GameState();

    this.renderer =
      new MapRenderer(
        canvas
      );

    this.running = false;
    this.lastFrameTime = 0;

    /*
     * Cuando cambia el estado,
     * el renderer vuelve a dibujar.
     */
    this.unsubscribe =
      this.state.subscribe(
        () => {
          this.syncRenderer();
        }
      );
  }

  async initialize() {
    /*
     * Carga:
     * - mapa de Raptors
     * - mapa de Food
     * - fondo
     *
     * NO carga:
     * - raptorAssignments.json
     * - un Raptor activo
     * - una comida activa
     */
    await this.renderer.load();

    /*
     * Inicialmente el juego
     * no tiene entidades activas.
     */
    this.syncRenderer();

    return this;
  }

  syncRenderer() {
    /*
     * Primero limpiamos el estado
     * visual anterior.
     */

    this.renderer.runtime.raptors.clear();
    this.renderer.runtime.food.clear();

    /*
     * =========================
     * RAPTORS
     * =========================
     */

    for (
      const [
        locationId,
        data
      ] of this.state.raptors
    ) {
      this.renderer.setRuntimeRaptor(
        locationId,
        data
      );
    }

    /*
     * =========================
     * FOOD
     * =========================
     */

    for (
      const [
        locationId,
        data
      ] of this.state.food
    ) {
      this.renderer.setRuntimeFood(
        locationId,
        data
      );
    }

    this.renderer.render();
  }

  /*
   * =========================
   * API TEMPORAL
   * =========================
   *
   * Estas funciones nos permiten
   * comprobar el sistema antes de
   * conectar Twitch.
   *
   * Después serán reemplazadas/
   * utilizadas por el sistema de
   * comandos y WebSocket.
   */

  setRaptor(
    locationId,
    data
  ) {
    return this.state.setRaptor(
      locationId,
      data
    );
  }

  removeRaptor(
    locationId
  ) {
    return this.state.removeRaptor(
      locationId
    );
  }

  setFood(
    locationId,
    data
  ) {
    return this.state.setFood(
      locationId,
      data
    );
  }

  removeFood(
    locationId
  ) {
    return this.state.removeFood(
      locationId
    );
  }

  /*
   * =========================
   * RESIZE
   * =========================
   */

  resize() {
    this.renderer.resize();
    this.renderer.render();
  }

  /*
   * =========================
   * START
   * =========================
   */

  start() {
    if (this.running) {
      return;
    }

    this.running = true;

    this.lastFrameTime =
      performance.now();

    requestAnimationFrame(
      (time) =>
        this.loop(time)
    );
  }

  loop(time) {
    if (!this.running) {
      return;
    }

    const deltaTime =
      time -
      this.lastFrameTime;

    this.lastFrameTime =
      time;

    this.update(
      deltaTime
    );

    this.renderer.render();

    requestAnimationFrame(
      (nextTime) =>
        this.loop(nextTime)
    );
  }

  update(deltaTime) {
    /*
     * Aquí entrarán posteriormente:
     *
     * - movimiento
     * - animaciones
     * - interacciones
     * - cooldowns
     * - timers
     * - etc.
     *
     * Por ahora el estado es estático.
     */

    void deltaTime;
  }

  stop() {
    this.running = false;
  }

  destroy() {
    this.stop();

    if (
      this.unsubscribe
    ) {
      this.unsubscribe();
      this.unsubscribe =
        null;
    }
  }
}
