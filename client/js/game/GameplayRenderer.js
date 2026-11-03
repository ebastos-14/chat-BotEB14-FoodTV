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

  sync() {
    this.clearVisualEntities();

    this.syncWorkers();
    this.syncCustomers();
  }

  clearVisualEntities() {
    this.state.clear();
  }

  syncWorkers() {
    const workers =
      this.systems.workers.getAll();

    for (const worker of workers) {
      if (!worker.username) {
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
          mirror: position.mirror
        }
      );
    }
  }

  syncCustomers() {
    const customers =
      this.systems.customers.getAll();

    for (const customer of customers) {
      if (!customer.username) {
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
          mirror: position.mirror
        }
      );
    }
  }

  refresh() {
    this.sync();
  }
}
