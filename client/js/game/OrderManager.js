const ORDER_STATES = [
  "available",
  "preparing",
  "ready",
  "waiting_cashier",
  "delivering",
  "delivered",
  "completed"
];

export class OrderManager {
  constructor(customerManager) {
    if (!customerManager) {
      throw new Error("OrderManager requiere un CustomerManager.");
    }

    this.customerManager = customerManager;

    this.orders = new Map();

    /*
     * El contador nunca disminuye.
     * Los números de orden nunca se reutilizan.
     */
    this.nextOrderNumber = 1;
  }

  createOrder({
    username,
    role = null,
    menuId,
    beverageId
  }) {
    if (!username) {
      return null;
    }

    if (!Number.isInteger(menuId) || menuId < 1 || menuId > 7) {
      return null;
    }

    if (
      !Number.isInteger(beverageId) ||
      beverageId < 1 ||
      beverageId > 7
    ) {
      return null;
    }

    const orderId = `Order_${this.nextOrderNumber}`;

    const customer = this.customerManager.createCustomer(
      username,
      role,
      orderId
    );

    /*
     * Si no hay Client_# disponible,
     * la orden no se crea.
     */
    if (!customer) {
      return null;
    }

    const order = {
      id: orderId,
      number: this.nextOrderNumber,

      username: String(username),

      menuId,
      beverageId,

      customerId: customer.id,

      workerId: null,

      foodId: null,
      drinkId: null,
      bagId: null,

      state: "available",

      currentRecipeStep: 0,

      createdAt: Date.now()
    };

    this.orders.set(orderId, order);

    this.nextOrderNumber += 1;

    return {
      ...order
    };
  }

  getOrder(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return null;
    }

    return {
      ...order
    };
  }

  getOrderByNumber(number) {
    if (!Number.isInteger(number) || number < 1) {
      return null;
    }

    return this.getOrder(`Order_${number}`);
  }

  getAll() {
    return Array.from(this.orders.values()).map((order) => ({
      ...order
    }));
  }

  getAvailableOrders() {
    return this.getAll()
      .filter((order) => order.state === "available")
      .sort((a, b) => a.number - b.number);
  }

  /*
   * Regla del juego:
   *
   * !atender toma siempre la orden disponible
   * con el número más bajo.
   */
  getLowestAvailableOrder() {
    const availableOrders = this.getAvailableOrders();

    return availableOrders.length > 0
      ? availableOrders[0]
      : null;
  }

  assignWorker(orderId, workerId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    if (order.state !== "available") {
      return false;
    }

    if (!workerId) {
      return false;
    }

    order.workerId = workerId;
    order.state = "preparing";

    /*
     * El primer paso de receta todavía no se ejecuta.
     * Aquí solo se prepara la orden.
     */
    order.currentRecipeStep = 0;

    return true;
  }

  setRecipeStep(orderId, stepIndex) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      return false;
    }

    order.currentRecipeStep = stepIndex;

    return true;
  }

  advanceRecipeStep(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.currentRecipeStep += 1;

    return true;
  }

  setState(orderId, state) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    if (!ORDER_STATES.includes(state)) {
      return false;
    }

    order.state = state;

    return true;
  }

  setFood(orderId, foodId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.foodId = foodId;

    return true;
  }

  setDrink(orderId, drinkId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.drinkId = drinkId;

    return true;
  }

  setBag(orderId, bagId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.bagId = bagId;

    return true;
  }

  setPreparedItems(orderId, {
    foodId = null,
    drinkId = null,
    bagId = null
  } = {}) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.foodId = foodId;
    order.drinkId = drinkId;
    order.bagId = bagId;

    return true;
  }

  getOrderByWorker(workerId) {
    if (!workerId) {
      return null;
    }

    for (const order of this.orders.values()) {
      if (order.workerId === workerId) {
        return {
          ...order
        };
      }
    }

    return null;
  }

  getOrdersByState(state) {
    if (!ORDER_STATES.includes(state)) {
      return [];
    }

    return this.getAll()
      .filter((order) => order.state === state)
      .sort((a, b) => a.number - b.number);
  }

  markReady(orderId) {
    return this.setState(orderId, "ready");
  }

  sendToCashier(orderId) {
    return this.setState(orderId, "waiting_cashier");
  }

  startDelivery(orderId) {
    return this.setState(orderId, "delivering");
  }

  markDelivered(orderId) {
    return this.setState(orderId, "delivered");
  }

  completeOrder(orderId) {
    return this.setState(orderId, "completed");
  }

  clearWorker(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    order.workerId = null;

    return true;
  }

  getOrderForCustomer(clientId) {
    if (!clientId) {
      return null;
    }

    for (const order of this.orders.values()) {
      if (order.customerId === clientId) {
        return {
          ...order
        };
      }
    }

    return null;
  }

  getCustomerForOrder(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return null;
    }

    return this.customerManager.getCustomer(
      order.customerId
    );
  }

  canClaim(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    /*
     * El cliente solo puede reclamar cuando
     * la entrega ya terminó.
     */
    return order.state === "delivered";
  }

  claimOrder(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      return false;
    }

    if (!this.canClaim(orderId)) {
      return false;
    }

    order.state = "completed";

    return true;
  }

  removeOrder(orderId) {
    /*
     * Las órdenes completadas pueden retirarse
     * únicamente si el sistema decide hacer limpieza.
     *
     * Esta función NO se utiliza todavía para
     * mantener el historial de órdenes.
     */
    return this.orders.delete(orderId);
  }

  snapshot() {
    return {
      nextOrderNumber: this.nextOrderNumber,
      orders: this.getAll()
    };
  }

  loadSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Snapshot de órdenes inválido.");
    }

    if (!Array.isArray(snapshot.orders)) {
      throw new Error(
        "Snapshot de órdenes inválido: falta orders."
      );
    }

    this.orders.clear();

    for (const data of snapshot.orders) {
      if (
        !data ||
        typeof data.id !== "string" ||
        !Number.isInteger(data.number) ||
        data.number < 1
      ) {
        continue;
      }

      const state = ORDER_STATES.includes(data.state)
        ? data.state
        : "available";

      this.orders.set(data.id, {
        id: data.id,
        number: data.number,

        username: data.username ?? "",

        menuId: data.menuId ?? null,
        beverageId: data.beverageId ?? null,

        customerId: data.customerId ?? null,

        workerId: data.workerId ?? null,

        foodId: data.foodId ?? null,
        drinkId: data.drinkId ?? null,
        bagId: data.bagId ?? null,

        state,

        currentRecipeStep:
          Number.isInteger(data.currentRecipeStep)
            ? data.currentRecipeStep
            : 0,

        createdAt: data.createdAt ?? Date.now()
      });
    }

    const highestOrderNumber = Array.from(
      this.orders.values()
    ).reduce(
      (highest, order) =>
        Math.max(highest, order.number),
      0
    );

    this.nextOrderNumber = Math.max(
      Number.isInteger(snapshot.nextOrderNumber)
        ? snapshot.nextOrderNumber
        : 1,
      highestOrderNumber + 1
    );
  }
}
