export class GameplayRenderer {
  constructor({
    systems,
    state
  }) {
    if (!systems) {
      throw new Error(
        "GameplayRenderer necesita GameSystems."
      );
    }

    if (!state) {
      throw new Error(
        "GameplayRenderer necesita GameState."
      );
    }

    this.systems = systems;
    this.state = state;
  }

  /*
   * =========================
   * SYNC COMPLETO
   * =========================
   *
   * Reconstruye las entidades
   * visuales a partir del estado
   * lógico.
   *
   * Todavía no modifica el mapa
   * ni las coordenadas originales.
   */

  sync() {
    this.clearVisualEntities();

    this.syncWorkers();
    this.syncCustomers();
  }

  /*
   * =========================
   * LIMPIAR
   * =========================
   */

  clearVisualEntities() {
    this.state.raptors.clear();
    this.state.food.clear();
  }

  /*
   * =========================
   * WORKERS
   * =========================
   *
   * Cada worker tiene una posición
   * lógica determinada por WorkerManager.
   *
   * mod_1 -> Left_1
   * mod_2 -> Left_2
   * mod_3 -> Left_3
   * mod_4 -> Left_4
   *
   * El renderer todavía utiliza
   * la información del registro
   * de posiciones para obtener
   * profile y mirror.
   */

  syncWorkers() {
    const workers =
      this.systems.workers.getAll();

    for (const worker of workers) {
      if (!worker) {
        continue;
      }

      if (!worker.positionId) {
        continue;
      }

      const position =
        this.systems.positions.get(
          worker.positionId
        );

      if (!position) {
        continue;
      }

      this.state.setRaptor(
        worker.positionId,
        {
          sprite: worker.sprite,
          profile: position.profile,
          mirror: position.mirror,
          scale: worker.scale ?? position.scale,
          layer: position.layer
        }
      );
    }
  }

  /*
   * =========================
   * CUSTOMERS
   * =========================
   *
   * Los clientes utilizan:
   *
   * Client_1..Client_4
   *
   * y siempre utilizan el profile
   * back definido por PositionRegistry.
   */

  syncCustomers() {
    const customers =
      this.systems.customers.getAll();

    for (const customer of customers) {
      if (!customer) {
        continue;
      }

      if (!customer.positionId) {
        continue;
      }

      const position =
        this.systems.positions.get(
          customer.positionId
        );

      if (!position) {
        continue;
      }

      this.state.setRaptor(
        customer.positionId,
        {
          sprite: customer.sprite,
          profile: position.profile,
          mirror: position.mirror,
          scale: customer.scale ?? position.scale,
          layer: position.layer
        }
      );
    }
  }

  /*
   * =========================
   * REFRESH
   * =========================
   *
   * Alias explícito para cuando
   * una acción cambie el estado.
   */

  refresh() {
    this.sync();
  }
}
