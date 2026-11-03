const CLIENT_IDS = [
  "Client_1",
  "Client_2",
  "Client_3",
  "Client_4"
];

const DEFAULT_SPRITE = "Raptor_Base.png";

const SPECIAL_CUSTOMER_SPRITES = {
  "@ebastos14": "Raptor_EBastos14.png",
  "@jaciitv": "Raptor_JaciiTV_2.png"
};

export class CustomerManager {
  constructor(positionRegistry) {
    if (!positionRegistry) {
      throw new Error("CustomerManager requiere un PositionRegistry.");
    }

    this.positionRegistry = positionRegistry;
    this.customers = new Map();

    for (const clientId of CLIENT_IDS) {
      this.customers.set(clientId, {
        id: clientId,

        userId: null,
        username: null,

        role: null,

        sprite: DEFAULT_SPRITE,

        position: clientId,

        state: "free",

        orderId: null,

        foodId: null,
        drinkId: null,
        bagId: null
      });
    }
  }

  getCustomer(clientId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return null;
    }

    return {
      ...customer
    };
  }

  getAll() {
    return Array.from(this.customers.values()).map((customer) => ({
      ...customer
    }));
  }

  getFreeClient() {
    for (const customer of this.customers.values()) {
      if (customer.state === "free") {
        return {
          ...customer
        };
      }
    }

    return null;
  }

  hasFreeClient() {
    return this.getFreeClient() !== null;
  }

  resolveSprite(username, role) {
    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    /*
     * Personajes especiales.
     * Tienen prioridad sobre los rangos normales.
     */
    if (SPECIAL_CUSTOMER_SPRITES[normalizedUsername]) {
      return SPECIAL_CUSTOMER_SPRITES[normalizedUsername];
    }

    /*
     * Prioridad de privilegios:
     *
     * Mod > Sub > VIP > Base
     */
    if (role === "mod") {
      return "Raptor_Mod.png";
    }

    if (role === "sub") {
      return "Raptor_Sub.png";
    }

    if (role === "vip") {
      return "Raptor_Vip.png";
    }

    return DEFAULT_SPRITE;
  }

  createCustomer(username, role, orderId) {
    const freeClient = this.getFreeClient();

    if (!freeClient) {
      return null;
    }

    const customer = this.customers.get(freeClient.id);

    customer.userId = String(username);
    customer.username = String(username);

    customer.role = role || null;

    customer.sprite = this.resolveSprite(username, role);

    customer.position = customer.id;

    customer.state = "waiting";

    customer.orderId = orderId;

    customer.foodId = null;
    customer.drinkId = null;
    customer.bagId = null;

    return {
      ...customer
    };
  }

  setState(clientId, state) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.state = state;

    return true;
  }

  setOrder(clientId, orderId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.orderId = orderId;

    return true;
  }

  setFood(clientId, foodId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.foodId = foodId;

    return true;
  }

  setDrink(clientId, drinkId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.drinkId = drinkId;

    return true;
  }

  setBag(clientId, bagId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.bagId = bagId;

    return true;
  }

  getCustomerByUser(username) {
    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    for (const customer of this.customers.values()) {
      if (
        customer.username &&
        customer.username.toLowerCase() === normalizedUsername
      ) {
        return {
          ...customer
        };
      }
    }

    return null;
  }

  getCustomerByOrder(orderId) {
    for (const customer of this.customers.values()) {
      if (customer.orderId === orderId) {
        return {
          ...customer
        };
      }
    }

    return null;
  }

  completeCustomer(clientId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.state = "completed";

    return true;
  }

  freeCustomer(clientId) {
    const customer = this.customers.get(clientId);

    if (!customer) {
      return false;
    }

    customer.userId = null;
    customer.username = null;
    customer.role = null;

    customer.sprite = DEFAULT_SPRITE;

    customer.position = clientId;

    customer.state = "free";

    customer.orderId = null;

    customer.foodId = null;
    customer.drinkId = null;
    customer.bagId = null;

    return true;
  }

  snapshot() {
    return this.getAll();
  }

  loadSnapshot(snapshot) {
    if (!Array.isArray(snapshot)) {
      throw new Error("Snapshot de clientes inválido.");
    }

    for (const data of snapshot) {
      if (!data || !CLIENT_IDS.includes(data.id)) {
        continue;
      }

      const customer = this.customers.get(data.id);

      customer.userId = data.userId ?? null;
      customer.username = data.username ?? null;
      customer.role = data.role ?? null;

      customer.sprite = data.sprite || DEFAULT_SPRITE;

      customer.position = data.position || data.id;

      customer.state = data.state || "free";

      customer.orderId = data.orderId ?? null;

      customer.foodId = data.foodId ?? null;
      customer.drinkId = data.drinkId ?? null;
      customer.bagId = data.bagId ?? null;
    }
  }
}
