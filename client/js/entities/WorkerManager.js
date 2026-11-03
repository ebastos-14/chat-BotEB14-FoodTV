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

const DEFAULT_SPRITE = "Raptor_Mod.png";

const SPECIAL_SPRITES = {
  ebastos14: "Raptor_EBastos14.png",
  jaciitv: "Raptor_JaciiTV_1.png"
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

    this.positions = positionRegistry;

    this.workers = new Map();

    this.initializeWorkers();
  }

  /*
   * =========================
   * INICIALIZACIÓN
   * =========================
   */

  initializeWorkers() {
    for (const workerId of WORKER_IDS) {
      const homePosition =
        WORKER_HOME_POSITIONS[workerId];

      if (!this.positions.has(homePosition)) {
        throw new Error(
          `WorkerManager: posición inexistente: ${homePosition}`
        );
      }

      this.workers.set(
        workerId,
        {
          id: workerId,

          /*
           * El slot es permanente.
           */
          homePositionId: homePosition,

          /*
           * Posición lógica actual.
           *
           * Al comenzar, todos están
           * en su posición Left correspondiente.
           */
          positionId: homePosition,

          /*
           * Usuario de Twitch que ocupa
           * actualmente el trabajador.
           */
          username: null,

          /*
           * Sprite actual.
           */
          sprite: DEFAULT_SPRITE,

          /*
           * Estado lógico.
           */
          state: WORKER_STATES.AVAILABLE,

          /*
           * Pedido asociado.
           */
          currentOrderId: null,

          /*
           * Acción actual.
           */
          currentAction: null,

          /*
           * Estación actual.
           */
          currentStationId: null,

          /*
           * Indica si está esperando
           * una estación.
           */
          waitingForStation: false
        }
      );
    }
  }

  /*
   * =========================
   * CONSULTAS
   * =========================
   */

  getWorker(workerId) {
    return this.workers.get(workerId) ?? null;
  }

  getAll() {
    return Array.from(
      this.workers.values()
    );
  }

  getAvailableWorker() {
    for (const worker of this.workers.values()) {
      if (this.isAvailable(worker.id)) {
        return worker;
      }
    }

    return null;
  }

  isAvailable(workerId) {
    const worker =
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    return (
      worker.state === WORKER_STATES.AVAILABLE &&
      worker.username === null &&
      worker.currentOrderId === null
    );
  }

  getWorkerByUser(username) {
    if (!username) {
      return null;
    }

    const normalized =
      String(username).toLowerCase();

    for (const worker of this.workers.values()) {
      if (
        worker.username &&
        worker.username.toLowerCase() === normalized
      ) {
        return worker;
      }
    }

    return null;
  }

  getWorkerAtPosition(positionId) {
    if (!positionId) {
      return null;
    }

    for (const worker of this.workers.values()) {
      if (
        worker.positionId === positionId
      ) {
        return worker;
      }
    }

    return null;
  }

  getWorkerForHomePosition(positionId) {
    if (!positionId) {
      return null;
    }

    for (const worker of this.workers.values()) {
      if (
        worker.homePositionId === positionId
      ) {
        return worker;
      }
    }

    return null;
  }

  /*
   * =========================
   * !WORK
   * =========================
   */

  canUseWorkCommand({
    role,
    username
  }) {
    if (!username) {
      return false;
    }

    const normalizedRole =
      String(role ?? "").toLowerCase();

    return (
      normalizedRole === "mod" ||
      normalizedRole === "streamer"
    );
  }

  assignWorker({
    username,
    role
  }) {
    if (
      !this.canUseWorkCommand({
        username,
        role
      })
    ) {
      return null;
    }

    /*
     * Un usuario no puede ocupar
     * dos trabajadores.
     */
    if (
      this.getWorkerByUser(username)
    ) {
      return null;
    }

    /*
     * !work siempre utiliza el
     * primer slot libre.
     */
    const worker =
      this.getAvailableWorker();

    if (!worker) {
      return null;
    }

    worker.username = username;

    worker.sprite =
      this.resolveSprite(username);

    worker.state =
      WORKER_STATES.AVAILABLE;

    worker.positionId =
      worker.homePositionId;

    worker.currentOrderId = null;
    worker.currentAction = null;
    worker.currentStationId = null;
    worker.waitingForStation = false;

    return worker;
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
      normalized === "ebastos14"
    ) {
      return SPECIAL_SPRITES.ebastos14;
    }

    if (
      normalized === "jaciitv"
    ) {
      return SPECIAL_SPRITES.jaciitv;
    }

    return DEFAULT_SPRITE;
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
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    if (
      !this.positions.has(positionId)
    ) {
      return false;
    }

    worker.positionId =
      positionId;

    return true;
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
      this.getWorker(workerId);

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
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    worker.currentOrderId =
      orderId ?? null;

    return true;
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
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    worker.currentAction =
      action ?? null;

    return true;
  }

  /*
   * =========================
   * ESTACIÓN
   * =========================
   */

  setWaiting(
    workerId,
    stationId
  ) {
    const worker =
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    worker.state =
      WORKER_STATES.WAITING_STATION;

    worker.currentStationId =
      stationId ?? null;

    worker.waitingForStation =
      true;

    /*
     * El trabajador permanece
     * en su posición de origen.
     */
    worker.positionId =
      worker.homePositionId;

    return true;
  }

  setStation(
    workerId,
    stationId
  ) {
    const worker =
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    worker.currentStationId =
      stationId ?? null;

    return true;
  }

  /*
   * =========================
   * LIBERAR TRABAJADOR
   * =========================
   */

  releaseWorker(workerId) {
    const worker =
      this.getWorker(workerId);

    if (!worker) {
      return false;
    }

    worker.username = null;

    worker.sprite =
      DEFAULT_SPRITE;

    worker.positionId =
      worker.homePositionId;

    worker.state =
      WORKER_STATES.AVAILABLE;

    worker.currentOrderId = null;
    worker.currentAction = null;
    worker.currentStationId = null;
    worker.waitingForStation = false;

    return true;
  }

  /*
   * =========================
   * SNAPSHOT
   * =========================
   */

  snapshot() {
    return {
      version: 1,
      workers: this.getAll().map(
        (worker) => ({
          id: worker.id,
          homePositionId:
            worker.homePositionId,
          positionId:
            worker.positionId,
          username:
            worker.username,
          sprite:
            worker.sprite,
          state:
            worker.state,
          currentOrderId:
            worker.currentOrderId,
          currentAction:
            worker.currentAction,
          currentStationId:
            worker.currentStationId,
          waitingForStation:
            worker.waitingForStation
        })
      )
    };
  }

  /*
   * =========================
   * LOAD SNAPSHOT
   * =========================
   */

  loadSnapshot(snapshot) {
    if (
      !snapshot ||
      typeof snapshot !== "object"
    ) {
      throw new Error(
        "WorkerManager.loadSnapshot: snapshot inválido."
      );
    }

    if (snapshot.version !== 1) {
      throw new Error(
        `WorkerManager.loadSnapshot: versión no soportada: ${snapshot.version}`
      );
    }

    if (!Array.isArray(snapshot.workers)) {
      throw new Error(
        "WorkerManager.loadSnapshot: workers debe ser un array."
      );
    }

    for (const savedWorker of snapshot.workers) {
      if (
        !savedWorker ||
        !this.workers.has(savedWorker.id)
      ) {
        continue;
      }

      const worker =
        this.workers.get(
          savedWorker.id
        );

      /*
       * homePositionId es permanente
       * y no se acepta desde el snapshot.
       */
      worker.positionId =
        savedWorker.positionId ??
        worker.homePositionId;

      worker.username =
        savedWorker.username ?? null;

      worker.sprite =
        savedWorker.sprite ??
        DEFAULT_SPRITE;

      worker.state =
        savedWorker.state ??
        WORKER_STATES.AVAILABLE;

      worker.currentOrderId =
        savedWorker.currentOrderId ??
        null;

      worker.currentAction =
        savedWorker.currentAction ??
        null;

      worker.currentStationId =
        savedWorker.currentStationId ??
        null;

      worker.waitingForStation =
        Boolean(
          savedWorker.waitingForStation
        );
    }
  }
}

export {
  WORKER_IDS,
  WORKER_HOME_POSITIONS,
  WORKER_STATES
};
