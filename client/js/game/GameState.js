export class GameState {
  constructor() {
    /*
     * Estado central del juego.
     *
     * IMPORTANTE:
     * Las posiciones NO viven aquí.
     *
     * Las posiciones vienen de:
     * - map-raptors.json
     * - map-food.json
     *
     * Aquí solamente vive el estado
     * dinámico de cada ubicación.
     */

    this.raptors = new Map();
    this.food = new Map();

    this.listeners = new Set();
  }

  /*
   * =========================
   * SUSCRIPCIONES
   * =========================
   */

  subscribe(listener) {
    if (
      typeof listener !== "function"
    ) {
      throw new Error(
        "El listener debe ser una función."
      );
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(
        listener
      );
    };
  }

  notify(change) {
    for (
      const listener of this.listeners
    ) {
      try {
        listener(
          change,
          this
        );
      } catch (error) {
        console.error(
          "Error en listener de GameState:",
          error
        );
      }
    }
  }

  /*
   * =========================
   * RAPTORS
   * =========================
   */

  setRaptor(
    locationId,
    data
  ) {
    if (!locationId) {
      throw new Error(
        "locationId de Raptor requerido."
      );
    }

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Los datos del Raptor deben ser un objeto."
      );
    }

    const previous =
      this.raptors.get(
        locationId
      );

    const next = {
      ...previous,
      ...data
    };

    this.raptors.set(
      locationId,
      next
    );

    this.notify({
      type: "raptor:update",
      locationId,
      previous,
      current: next
    });

    return next;
  }

  getRaptor(
    locationId
  ) {
    return (
      this.raptors.get(
        locationId
      ) || null
    );
  }

  removeRaptor(
    locationId
  ) {
    const previous =
      this.raptors.get(
        locationId
      );

    if (!previous) {
      return false;
    }

    this.raptors.delete(
      locationId
    );

    this.notify({
      type: "raptor:remove",
      locationId,
      previous
    });

    return true;
  }

  /*
   * =========================
   * FOOD
   * =========================
   */

  setFood(
    locationId,
    data
  ) {
    if (!locationId) {
      throw new Error(
        "locationId de Food requerido."
      );
    }

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Los datos de Food deben ser un objeto."
      );
    }

    const previous =
      this.food.get(
        locationId
      );

    const next = {
      ...previous,
      ...data
    };

    this.food.set(
      locationId,
      next
    );

    this.notify({
      type: "food:update",
      locationId,
      previous,
      current: next
    });

    return next;
  }

  getFood(
    locationId
  ) {
    return (
      this.food.get(
        locationId
      ) || null
    );
  }

  removeFood(
    locationId
  ) {
    const previous =
      this.food.get(
        locationId
      );

    if (!previous) {
      return false;
    }

    this.food.delete(
      locationId
    );

    this.notify({
      type: "food:remove",
      locationId,
      previous
    });

    return true;
  }

  /*
   * =========================
   * LIMPIEZA
   * =========================
   */

  clear() {
    this.raptors.clear();
    this.food.clear();

    this.notify({
      type: "state:clear"
    });
  }

  /*
   * =========================
   * SNAPSHOT
   * =========================
   *
   * Útil posteriormente para:
   * - WebSocket
   * - reconexiones
   * - sincronización
   * - depuración
   */

  getSnapshot() {
    return {
      raptors:
        Object.fromEntries(
          this.raptors
        ),

      food:
        Object.fromEntries(
          this.food
        )
    };
  }

  loadSnapshot(snapshot) {
    if (
      !snapshot ||
      typeof snapshot !== "object"
    ) {
      throw new Error(
        "Snapshot inválido."
      );
    }

    this.raptors.clear();
    this.food.clear();

    if (
      snapshot.raptors &&
      typeof snapshot.raptors ===
        "object"
    ) {
      for (
        const [
          locationId,
          data
        ] of Object.entries(
          snapshot.raptors
        )
      ) {
        this.raptors.set(
          locationId,
          {
            ...data
          }
        );
      }
    }

    if (
      snapshot.food &&
      typeof snapshot.food ===
        "object"
    ) {
      for (
        const [
          locationId,
          data
        ] of Object.entries(
          snapshot.food
        )
      ) {
        this.food.set(
          locationId,
          {
            ...data
          }
        );
      }
    }

    this.notify({
      type: "state:load"
    });
  }
}
