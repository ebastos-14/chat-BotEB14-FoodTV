const WORKER_IDS = ["mod_1", "mod_2", "mod_3", "mod_4"];

const HOME_POSITIONS = {
  mod_1: "Left_1",
  mod_2: "Left_2",
  mod_3: "Left_3",
  mod_4: "Left_4"
};

const DEFAULT_SPRITE = "Raptor_Mod.png";

const WORKER_SPRITES = {
  "@ebastos14": "Raptor_EBastos14.png",
  "@jaciitv": "Raptor_JaciiTV_1.png"
};

export class WorkerManager {
  constructor(positionRegistry) {
    if (!positionRegistry) {
      throw new Error("WorkerManager requiere un PositionRegistry.");
    }

    this.positionRegistry = positionRegistry;
    this.workers = new Map();

    for (const workerId of WORKER_IDS) {
      this.workers.set(workerId, {
        id: workerId,
        userId: null,
        username: null,
        role: null,
        sprite: DEFAULT_SPRITE,

        homePosition: HOME_POSITIONS[workerId],
        currentPosition: HOME_POSITIONS[workerId],

        state: "available",

        currentOrderId: null,
        currentAction: null,

        waiting: false
      });
    }
  }

  getWorker(workerId) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return null;
    }

    return {
      ...worker
    };
  }

  getAll() {
    return Array.from(this.workers.values()).map((worker) => ({
      ...worker
    }));
  }

  getAvailableWorker() {
    for (const worker of this.workers.values()) {
      if (
        worker.userId === null &&
        worker.state === "available" &&
        worker.currentPosition === worker.homePosition
      ) {
        return {
          ...worker
        };
      }
    }

    return null;
  }

  isAvailable(workerId) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    return (
      worker.userId !== null &&
      worker.state === "available" &&
      worker.currentPosition === worker.homePosition
    );
  }

  canUseWorkCommand(role) {
    return role === "mod" || role === "streamer";
  }

  resolveSprite(username) {
    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    return WORKER_SPRITES[normalizedUsername] || DEFAULT_SPRITE;
  }

  assignWorker(username, role) {
    if (!this.canUseWorkCommand(role)) {
      return null;
    }

    const availableWorker = this.getAvailableWorker();

    if (!availableWorker) {
      return null;
    }

    const worker = this.workers.get(availableWorker.id);

    worker.userId = String(username);
    worker.username = String(username);

    worker.role = role;

    worker.sprite = this.resolveSprite(username);

    worker.homePosition = HOME_POSITIONS[worker.id];
    worker.currentPosition = worker.homePosition;

    worker.state = "available";

    worker.currentOrderId = null;
    worker.currentAction = null;

    worker.waiting = false;

    return {
      ...worker
    };
  }

  releaseWorker(workerId) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    worker.userId = null;
    worker.username = null;
    worker.role = null;

    worker.sprite = DEFAULT_SPRITE;

    worker.homePosition = HOME_POSITIONS[workerId];
    worker.currentPosition = worker.homePosition;

    worker.state = "available";

    worker.currentOrderId = null;
    worker.currentAction = null;

    worker.waiting = false;

    return true;
  }

  setPosition(workerId, positionId) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    if (!this.positionRegistry.has(positionId)) {
      return false;
    }

    worker.currentPosition = positionId;

    return true;
  }

  setState(workerId, state) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    worker.state = state;

    return true;
  }

  setOrder(workerId, orderId) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    worker.currentOrderId = orderId;

    return true;
  }

  setAction(workerId, action) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    worker.currentAction = action;

    return true;
  }

  setWaiting(workerId, waiting) {
    const worker = this.workers.get(workerId);

    if (!worker) {
      return false;
    }

    worker.waiting = Boolean(waiting);

    return true;
  }

  getWorkerByUser(username) {
    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    for (const worker of this.workers.values()) {
      if (
        worker.username &&
        worker.username.toLowerCase() === normalizedUsername
      ) {
        return {
          ...worker
        };
      }
    }

    return null;
  }

  getWorkerAtPosition(positionId) {
    for (const worker of this.workers.values()) {
      if (worker.currentPosition === positionId) {
        return {
          ...worker
        };
      }
    }

    return null;
  }

  getWorkerForHomePosition(positionId) {
    for (const worker of this.workers.values()) {
      if (worker.homePosition === positionId) {
        return {
          ...worker
        };
      }
    }

    return null;
  }

  snapshot() {
    return this.getAll();
  }

  loadSnapshot(snapshot) {
    if (!Array.isArray(snapshot)) {
      throw new Error("Snapshot de trabajadores inválido.");
    }

    for (const data of snapshot) {
      if (!data || !WORKER_IDS.includes(data.id)) {
        continue;
      }

      const worker = this.workers.get(data.id);

      worker.userId = data.userId ?? null;
      worker.username = data.username ?? null;
      worker.role = data.role ?? null;

      worker.sprite = data.sprite || DEFAULT_SPRITE;

      worker.homePosition = HOME_POSITIONS[data.id];

      worker.currentPosition =
        data.currentPosition || worker.homePosition;

      worker.state = data.state || "available";

      worker.currentOrderId = data.currentOrderId ?? null;
      worker.currentAction = data.currentAction ?? null;

      worker.waiting = Boolean(data.waiting);
    }
  }
}
