const WORKER_STATES = {
  AVAILABLE: "available",
  WAITING_STATION: "waiting_station",
  WORKING_STATION: "working_station",
  WAITING_CASHIER: "waiting_cashier",
  DELIVERING: "delivering",
  RETURNING: "returning"
};

const ORDER_STATES = {
  AVAILABLE: "available",
  PREPARING: "preparing",
  READY: "ready",
  WAITING_CASHIER: "waiting_cashier",
  DELIVERING: "delivering",
  DELIVERED: "delivered",
  COMPLETED: "completed"
};

const STATION_POSITIONS = {
  "!bebida": "Right_1",
  "!cortar": "Right_2",
  "!cocinar": "Right_3",
  "!freir": "Right_4"
};

const ACTION_TIMINGS = {
  zoomIn: 500,
  zoomOut: 500
};

export class ActionSystem {
  constructor({
    workerManager,
    customerManager,
    orderManager,
    positionRegistry
  }) {
    if (!workerManager) {
      throw new Error("ActionSystem requiere WorkerManager.");
    }

    if (!customerManager) {
      throw new Error("ActionSystem requiere CustomerManager.");
    }

    if (!orderManager) {
      throw new Error("ActionSystem requiere OrderManager.");
    }

    if (!positionRegistry) {
      throw new Error("ActionSystem requiere PositionRegistry.");
    }

    this.workerManager = workerManager;
    this.customerManager = customerManager;
    this.orderManager = orderManager;
    this.positionRegistry = positionRegistry;

    this.stationQueues = new Map();

    for (const positionId of Object.values(STATION_POSITIONS)) {
      this.stationQueues.set(positionId, {
        currentWorkerId: null,
        queue: []
      });
    }

    this.cashier = {
      currentWorkerId: null,
      queue: []
    };
  }

  getActionTiming(name) {
    return ACTION_TIMINGS[name] ?? 0;
  }

  getStationPosition(command) {
    return STATION_POSITIONS[command] || null;
  }

  getStation(command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return null;
    }

    return this.positionRegistry.get(positionId);
  }

  isWorkerAtHome(workerId) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return false;
    }

    return worker.currentPosition === worker.homePosition;
  }

  canWorkerStartOrder(workerId) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return false;
    }

    return (
      worker.userId !== null &&
      worker.state === WORKER_STATES.AVAILABLE &&
      worker.currentPosition === worker.homePosition &&
      worker.currentOrderId === null
    );
  }

  /*
   * !atender
   *
   * Selecciona la orden disponible con el número
   * más bajo y la asigna al trabajador.
   */
  attendNextOrder(workerId) {
    if (!this.canWorkerStartOrder(workerId)) {
      return null;
    }

    const order = this.orderManager.getLowestAvailableOrder();

    if (!order) {
      return null;
    }

    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return null;
    }

    const assigned = this.orderManager.assignWorker(
      order.id,
      workerId
    );

    if (!assigned) {
      return null;
    }

    this.workerManager.setOrder(
      workerId,
      order.id
    );

    this.workerManager.setAction(
      workerId,
      null
    );

    this.workerManager.setState(
      workerId,
      WORKER_STATES.WORKING_STATION
    );

    return {
      worker: this.workerManager.getWorker(workerId),
      order: this.orderManager.getOrder(order.id)
    };
  }

  /*
   * Comprueba si el trabajador puede ejecutar
   * una acción de receta.
   */
  canExecuteRecipeAction(workerId, command) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return false;
    }

    if (!STATION_POSITIONS[command]) {
      return false;
    }

    if (
      worker.state !== WORKER_STATES.WORKING_STATION &&
      worker.state !== WORKER_STATES.WAITING_STATION
    ) {
      return false;
    }

    if (!worker.currentOrderId) {
      return false;
    }

    return true;
  }

  /*
   * Comprueba si una estación está libre.
   */
  isStationFree(command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return false;
    }

    const station = this.stationQueues.get(positionId);

    if (!station) {
      return false;
    }

    return station.currentWorkerId === null;
  }

  /*
   * Añade un trabajador a la cola FIFO de una estación.
   */
  enqueueStation(workerId, command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return false;
    }

    const station = this.stationQueues.get(positionId);

    if (!station) {
      return false;
    }

    if (
      station.currentWorkerId === workerId ||
      station.queue.includes(workerId)
    ) {
      return false;
    }

    station.queue.push(workerId);

    this.workerManager.setState(
      workerId,
      WORKER_STATES.WAITING_STATION
    );

    this.workerManager.setWaiting(
      workerId,
      true
    );

    return true;
  }

  /*
   * Si la estación está libre, el primer trabajador
   * de la cola pasa a trabajar.
   */
  startNextStationWorker(command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return null;
    }

    const station = this.stationQueues.get(positionId);

    if (!station || station.currentWorkerId !== null) {
      return null;
    }

    const workerId = station.queue.shift();

    if (!workerId) {
      return null;
    }

    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return null;
    }

    station.currentWorkerId = workerId;

    this.workerManager.setWaiting(
      workerId,
      false
    );

    this.workerManager.setState(
      workerId,
      WORKER_STATES.WORKING_STATION
    );

    this.workerManager.setPosition(
      workerId,
      positionId
    );

    return this.workerManager.getWorker(workerId);
  }

  /*
   * Libera una estación después de terminar
   * la acción actual.
   */
  releaseStation(workerId, command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return false;
    }

    const station = this.stationQueues.get(positionId);

    if (!station) {
      return false;
    }

    if (station.currentWorkerId !== workerId) {
      return false;
    }

    station.currentWorkerId = null;

    return true;
  }

  /*
   * El trabajador vuelve a su Left_#.
   *
   * No existe movimiento físico:
   * el cambio de posición es lógico.
   */
  returnWorkerHome(workerId) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return false;
    }

    this.workerManager.setState(
      workerId,
      WORKER_STATES.RETURNING
    );

    this.workerManager.setPosition(
      workerId,
      worker.homePosition
    );

    this.workerManager.setWaiting(
      workerId,
      false
    );

    this.workerManager.setAction(
      workerId,
      null
    );

    return true;
  }

  /*
   * Finaliza una acción de receta.
   *
   * La validación de que el comando corresponde
   * al paso correcto de la receta se hará cuando
   * integremos RecipeManager.
   */
  finishRecipeAction(workerId, command) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker || !worker.currentOrderId) {
      return false;
    }

    if (!this.canExecuteRecipeAction(workerId, command)) {
      return false;
    }

    const order = this.orderManager.getOrder(
      worker.currentOrderId
    );

    if (!order) {
      return false;
    }

    this.releaseStation(workerId, command);

    this.orderManager.advanceRecipeStep(
      order.id
    );

    this.returnWorkerHome(workerId);

    return true;
  }

  /*
   * Marca una orden como lista.
   *
   * La condición real de receta completa será
   * validada posteriormente por RecipeManager.
   */
  markOrderReady(orderId) {
    const order = this.orderManager.getOrder(orderId);

    if (!order) {
      return false;
    }

    if (order.state !== ORDER_STATES.PREPARING) {
      return false;
    }

    this.orderManager.markReady(orderId);

    return true;
  }

  /*
   * !entregar
   *
   * El trabajador solo puede entregar una orden
   * que ya esté lista.
   */
  requestDelivery(workerId, orderId) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return null;
    }

    if (worker.currentOrderId !== orderId) {
      return null;
    }

    if (!this.isWorkerAtHome(workerId)) {
      return null;
    }

    if (worker.state !== WORKER_STATES.AVAILABLE) {
      return null;
    }

    const order = this.orderManager.getOrder(orderId);

    if (!order || order.state !== ORDER_STATES.READY) {
      return null;
    }

    this.orderManager.sendToCashier(orderId);

    this.workerManager.setState(
      workerId,
      WORKER_STATES.WAITING_CASHIER
    );

    this.enqueueCashier(workerId);

    return {
      worker: this.workerManager.getWorker(workerId),
      order: this.orderManager.getOrder(orderId)
    };
  }

  enqueueCashier(workerId) {
    if (
      this.cashier.currentWorkerId === workerId ||
      this.cashier.queue.includes(workerId)
    ) {
      return false;
    }

    this.cashier.queue.push(workerId);

    this.workerManager.setState(
      workerId,
      WORKER_STATES.WAITING_CASHIER
    );

    this.workerManager.setWaiting(
      workerId,
      true
    );

    this.startNextCashierWorker();

    return true;
  }

  startNextCashierWorker() {
    if (this.cashier.currentWorkerId !== null) {
      return null;
    }

    const workerId = this.cashier.queue.shift();

    if (!workerId) {
      return null;
    }

    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return null;
    }

    this.cashier.currentWorkerId = workerId;

    this.workerManager.setWaiting(
      workerId,
      false
    );

    this.workerManager.setState(
      workerId,
      WORKER_STATES.DELIVERING
    );

    this.workerManager.setPosition(
      workerId,
      "Cashier"
    );

    const order = worker.currentOrderId
      ? this.orderManager.getOrder(worker.currentOrderId)
      : null;

    if (order) {
      this.orderManager.startDelivery(order.id);
    }

    return this.workerManager.getWorker(workerId);
  }

  /*
   * Completa la entrega en Cashier.
   */
  finishDelivery(workerId) {
    if (this.cashier.currentWorkerId !== workerId) {
      return null;
    }

    const worker = this.workerManager.getWorker(workerId);

    if (!worker || !worker.currentOrderId) {
      return null;
    }

    const order = this.orderManager.getOrder(
      worker.currentOrderId
    );

    if (!order || order.state !== ORDER_STATES.DELIVERING) {
      return null;
    }

    this.orderManager.markDelivered(order.id);

    this.cashier.currentWorkerId = null;

    this.returnWorkerHome(workerId);

    this.workerManager.setState(
      workerId,
      WORKER_STATES.RETURNING
    );

    return {
      worker: this.workerManager.getWorker(workerId),
      order: this.orderManager.getOrder(order.id)
    };
  }

  /*
   * Una vez que el trabajador terminó de volver
   * a su Left_#, queda disponible para otro pedido.
   */
  completeReturn(workerId) {
    const worker = this.workerManager.getWorker(workerId);

    if (!worker) {
      return false;
    }

    if (
      worker.currentPosition !== worker.homePosition
    ) {
      return false;
    }

    if (!worker.currentOrderId) {
      return false;
    }

    this.workerManager.setState(
      workerId,
      WORKER_STATES.AVAILABLE
    );

    return true;
  }

  /*
   * !reclamar
   */
  claimOrder(orderId) {
    const order = this.orderManager.getOrder(orderId);

    if (!order) {
      return false;
    }

    if (!this.orderManager.canClaim(orderId)) {
      return false;
    }

    const customer = this.customerManager.getCustomer(
      order.customerId
    );

    if (!customer) {
      return false;
    }

    this.customerManager.completeCustomer(
      customer.id
    );

    this.orderManager.claimOrder(orderId);

    /*
     * La liberación física de Client_# y Bag_#
     * se realizará en la transición visual de
     * zoom_in.
     */
    return true;
  }

  /*
   * Libera finalmente al cliente después de
   * terminar la animación de desaparición.
   */
  releaseClaimedCustomer(orderId) {
    const order = this.orderManager.getOrder(orderId);

    if (!order) {
      return false;
    }

    const customer = this.customerManager.getCustomer(
      order.customerId
    );

    if (!customer) {
      return false;
    }

    return this.customerManager.freeCustomer(
      customer.id
    );
  }

  getStationQueue(command) {
    const positionId = this.getStationPosition(command);

    if (!positionId) {
      return null;
    }

    const station = this.stationQueues.get(positionId);

    if (!station) {
      return null;
    }

    return {
      currentWorkerId: station.currentWorkerId,
      queue: [...station.queue]
    };
  }

  getCashierQueue() {
    return {
      currentWorkerId: this.cashier.currentWorkerId,
      queue: [...this.cashier.queue]
    };
  }

  snapshot() {
    const stations = {};

    for (const [positionId, station] of this.stationQueues) {
      stations[positionId] = {
        currentWorkerId: station.currentWorkerId,
        queue: [...station.queue]
      };
    }

    return {
      stations,
      cashier: {
        currentWorkerId: this.cashier.currentWorkerId,
        queue: [...this.cashier.queue]
      }
    };
  }

  loadSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Snapshot de ActionSystem inválido.");
    }

    this.stationQueues.clear();

    for (const positionId of Object.values(STATION_POSITIONS)) {
      const data = snapshot.stations?.[positionId];

      this.stationQueues.set(positionId, {
        currentWorkerId: data?.currentWorkerId ?? null,
        queue: Array.isArray(data?.queue)
          ? [...data.queue]
          : []
      });
    }

    this.cashier = {
      currentWorkerId:
        snapshot.cashier?.currentWorkerId ?? null,

      queue: Array.isArray(snapshot.cashier?.queue)
        ? [...snapshot.cashier.queue]
        : []
    };
  }
}
