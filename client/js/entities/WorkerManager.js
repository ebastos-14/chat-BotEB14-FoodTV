const WORKER_IDS = [
  "mod_1",
  "mod_2",
  "mod_3",
  "mod_4"
];

const WORKER_HOME_POSITIONS = {
  mod_1: "Left_1",
  mod_2: "Left_2",
  mod_3: "Left_3",
  mod_4: "Left_4"
};

const WORKER_STATES = {
  AVAILABLE: "available",
  WAITING_STATION: "waiting_station",
  WORKING_STATION: "working_station",
  WAITING_CASHIER: "waiting_cashier",
  DELIVERING: "delivering",
  RETURNING: "returning"
};

export class WorkerManager {
  constructor(positionRegistry) {
    if (!positionRegistry) {
      throw new Error(
        "WorkerManager necesita PositionRegistry."
      );
    }

    this.positionRegistry =
      positionRegistry;

    this.workers = new Map();

    for (const workerId of WORKER_IDS) {
      this.workers.set(
        workerId,
        this.createEmptyWorker(workerId)
      );
    }
  }

  createEmptyWorker(workerId) {
    return {
      id: workerId,
      username: null,
      role: null,

      positionId:
        WORKER_HOME_POSITIONS[
          workerId
        ],

      sprite: null,

      state:
        WORKER_STATES.AVAILABLE,

      currentOrderId: null,
      currentAction: null,
      currentStation: null
    };
  }

  /*
   * =========================
   * CONSULTAS
   * =========================
   */

  getAll() {
    return Array.from(
      this.workers.values()
    );
  }

  get(workerId) {
    return (
      this.workers.get(workerId) ??
      null
    );
  }

  getByUsername(username) {
    if (!username) {
      return null;
    }

    return (
      this.getAll().find(
        (worker) =>
          worker.username === username
      ) ?? null
    );
  }

  getAvailableWorker() {
    return (
      this.getAll().find(
        (worker) =>
          worker.username &&
          worker.state ===
            WORKER_STATES.AVAILABLE &&
          !worker.currentOrderId &&
          !worker.currentAction
      ) ?? null
    );
  }

  getFreeSlot() {
    return (
      this.getAll().find(
        (worker) =>
          worker.username === null
      ) ?? null
    );
  }

  /*
   * =========================
   * ESTADO DEL SLOT
   * =========================
   */

  isSlotFree(workerId) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    return worker.username === null;
  }

  isAvailable(workerId) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    return (
      worker.username !== null &&
      worker.state ===
        WORKER_STATES.AVAILABLE &&
      !worker.currentOrderId &&
      !worker.currentAction
    );
  }

  /*
   * =========================
   * SPRITES
   * =========================
   */

  resolveSprite(username) {
    const normalized =
      String(username ?? "")
        .replace(/^@/, "")
        .toLowerCase();

    if (
      normalized ===
      "ebastos14"
    ) {
      return "Raptor_EBastos14.png";
    }

    if (
      normalized ===
      "jaciitv"
    ) {
      return "Raptor_JaciiTV_1.png";
    }

    return "Raptor_Mod.png";
  }

  /*
   * =========================
   * ASIGNACIÓN
   * =========================
   */

  assignWorker({
    username,
    role
  }) {
    if (!username) {
      return null;
    }

    const existing =
      this.getByUsername(
        username
      );

    if (existing) {
      return existing;
    }

    const worker =
      this.getFreeSlot();

    if (!worker) {
      return null;
    }

    worker.username =
      username;

    worker.role =
      role ?? "mod";

    worker.sprite =
      this.resolveSprite(
        username
      );

    worker.positionId =
      WORKER_HOME_POSITIONS[
        worker.id
      ];

    worker.state =
      WORKER_STATES.AVAILABLE;

    worker.currentOrderId =
      null;

    worker.currentAction =
      null;

    worker.currentStation =
      null;

    return worker;
  }

  releaseWorker(workerId) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    const empty =
      this.createEmptyWorker(
        workerId
      );

    this.workers.set(
      workerId,
      empty
    );

    return true;
  }

  /*
   * =========================
   * POSICIÓN
   * =========================
   */

  setPosition(
    workerId,
    positionId
  ) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    if (
      !this.positionRegistry.has(
        positionId
      )
    ) {
      return false;
    }

    worker.positionId =
      positionId;

    return true;
  }

  returnHome(workerId) {
    return this.setPosition(
      workerId,
      WORKER_HOME_POSITIONS[
        workerId
      ]
    );
  }

  /*
   * =========================
   * ESTADO
   * =========================
   */

  setState(
    workerId,
    state
  ) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    if (
      !Object.values(
        WORKER_STATES
      ).includes(state)
    ) {
      return false;
    }

    worker.state = state;

    return true;
  }

  /*
   * =========================
   * PEDIDO
   * =========================
   */

  setOrder(
    workerId,
    orderId
  ) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    worker.currentOrderId =
      orderId ?? null;

    return true;
  }

  clearOrder(workerId) {
    return this.setOrder(
      workerId,
      null
    );
  }

  /*
   * =========================
   * ACCIÓN
   * =========================
   */

  setAction(
    workerId,
    action
  ) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    worker.currentAction =
      action ?? null;

    return true;
  }

  clearAction(workerId) {
    return this.setAction(
      workerId,
      null
    );
  }

  /*
   * =========================
   * ESTACIÓN
   * =========================
   */

  setStation(
    workerId,
    stationId
  ) {
    const worker =
      this.get(workerId);

    if (!worker) {
      return false;
    }

    worker.currentStation =
      stationId ?? null;

    return true;
  }

  clearStation(workerId) {
    return this.setStation(
      workerId,
      null
    );
  }

  /*
   * =========================
   * SNAPSHOT
   * =========================
   */

  snapshot() {
    return this.getAll().map(
      (worker) => ({
        ...worker
      })
    );
  }

  loadSnapshot(snapshot) {
    if (
      !Array.isArray(snapshot)
    ) {
      throw new Error(
        "Snapshot de trabajadores inválido."
      );
    }

    for (
      const savedWorker of snapshot
    ) {
      if (
        !savedWorker ||
        !WORKER_IDS.includes(
          savedWorker.id
        )
      ) {
        continue;
      }

      const worker =
        this.get(
          savedWorker.id
        );

      worker.username =
        savedWorker.username ??
        null;

      worker.role =
        savedWorker.role ??
        null;

      worker.positionId =
        WORKER_HOME_POSITIONS[
          savedWorker.id
        ];

      worker.sprite =
        savedWorker.sprite ??
        null;

      worker.state =
        savedWorker.state ??
        WORKER_STATES.AVAILABLE;

      worker.currentOrderId =
        savedWorker.currentOrderId ??
        null;

      worker.currentAction =
        savedWorker.currentAction ??
        null;

      worker.currentStation =
        savedWorker.currentStation ??
        null;
    }
  }
}

export {
  WORKER_IDS,
  WORKER_HOME_POSITIONS,
  WORKER_STATES
};
