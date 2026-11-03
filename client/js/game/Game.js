import { MapRenderer } from "./MapRenderer.js";
import { GameState } from "./GameState.js";
import { GameSystems } from "./GameSystems.js";
import { GameplayRenderer } from "./GameplayRenderer.js";

export class Game {
  constructor(canvas) {
    if (!canvas) {
      throw new Error(
        "Game necesita un elemento canvas."
      );
    }

    this.canvas = canvas;

    /*
     * =========================
     * ESTADO VISUAL
     * =========================
     */

    this.state =
      new GameState();

    /*
     * =========================
     * SISTEMAS DE GAMEPLAY
     * =========================
     */

    this.systems =
      new GameSystems();

    /*
     * =========================
     * RENDERER
     * =========================
     */

    this.renderer =
      new MapRenderer(
        canvas
      );

    /*
     * =========================
     * ADAPTADOR GAMEPLAY
     * =========================
     *
     * Convierte el estado lógico
     * de GameSystems en entidades
     * visuales dentro de GameState.
     */

    this.gameplayRenderer =
      new GameplayRenderer({
        systems: this.systems,
        state: this.state
      });

    this.running = false;
    this.lastFrameTime = 0;

    /*
     * Cuando cambia el estado
     * visual, el renderer vuelve
     * a sincronizarse.
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
     * - capas fijas
     */

    await this.renderer.load();

    /*
     * Sincronizamos primero
     * el gameplay con el estado
     * visual.
     */

    this.gameplayRenderer.sync();

    /*
     * Después dibujamos.
     */

    this.syncRenderer();

    return this;
  }

  /*
   * =========================
   * GAMEPLAY → VISUAL
   * =========================
   */

  syncGameplay() {
    this.gameplayRenderer.sync();
  }

  /*
   * =========================
   * VISUAL → MAP RENDERER
   * =========================
   */

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
   * ACCESO A SISTEMAS
   * =========================
   */

  getSystems() {
    return this.systems;
  }

  /*
   * =========================
   * API TEMPORAL
   * =========================
   *
   * Estas funciones continúan
   * existiendo para las pruebas
   * visuales actuales.
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
     * - movimiento lógico
     * - animaciones
     * - zoom_in
     * - zoom_out
     * - interacciones
     * - cooldowns
     * - timers
     */

    void deltaTime;
  }

  /*
   * =========================
   * STOP
   * =========================
   */

  stop() {
    this.running = false;
  }

  /*
   * =========================
   * DESTROY
   * =========================
   */

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
