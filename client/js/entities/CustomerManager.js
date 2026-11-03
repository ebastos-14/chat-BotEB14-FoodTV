const CUSTOMER_IDS = [
  "Client_1",
  "Client_2",
  "Client_3",
  "Client_4"
];

const DEFAULT_SPRITE = "Raptor_Base.png";

const CUSTOMER_STATES = {
  WAITING: "waiting",
  ORDERING: "ordering",
  PREPARING: "preparing",
  READY: "ready",
  DELIVERING: "delivering",
  COMPLETED: "completed"
};

const SPECIAL_SPRITES = {
  ebastos14: "Raptor_EBastos14.png",
  jaciitv: "Raptor_JaciiTV_2.png"
};

const PRIVILEGE_SPRITES = {
  mod: "Raptor_Mod.png",
  sub: "Raptor_Sub.png",
  vip: "Raptor_Vip.png"
};

const PRIVILEGE_PRIORITY = [
  "mod",
  "sub",
  "vip"
];

export class CustomerManager {
  constructor(positionRegistry) {
    if (!positionRegistry) {
      throw new Error(
        "CustomerManager necesita PositionRegistry."
      );
    }

    this.positions =
      positionRegistry;

    this.customers =
      new Map();

    this.initializeCustomers();
  }

  /*
   * =========================
   * INICIALIZACIÓN
   * =========================
   *
   * Los cuatro clientes existen
   * como slots permanentes.
   *
   * No significa que estén visibles
   * o asignados a un usuario.
   */

  initializeCustomers() {
    for (const customerId of CUSTOMER_IDS) {
      if (
        !this.positions.has(customerId)
      ) {
        throw new Error(
          `CustomerManager: posición inexistente: ${customerId}`
        );
      }

      this.customers.set(
        customerId,
        {
          id: customerId,

          /*
           * Client_1..Client_4
           * son posiciones fijas.
           */
          positionId: customerId,

          /*
           * Usuario de Twitch.
           */
          username: null,

          /*
           * Rol/privilegio recibido
           * al crear el cliente.
           */
          role: null,

          /*
           * Sprite resuelto.
           */
          sprite: DEFAULT_SPRITE,

          /*
           * Estado lógico.
           */
          state: CUSTOMER_STATES.WAITING,

          /*
           * Pedido asociado.
           */
          currentOrderId: null,

          /*
           * Datos visuales opcionales.
           *
           * El cliente utiliza el profile
           * back definido por PositionRegistry.
           */
          scale: null
        }
      );
    }
  }

  /*
   * =========================
   * CONSULTAS
   * =========================
   */

  getCustomer(customerId) {
    return (
      this.customers.get(
        customerId
      ) ?? null
    );
  }

  getAll() {
    return Array.from(
      this.customers.values()
    );
  }

  getAvailableCustomer() {
    for (const customer of this.customers.values()) {
      if (
        this.isAvailable(
          customer.id
        )
      ) {
        return customer;
      }
    }

    return null;
  }

  isAvailable(customerId) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    return (
      customer.username === null &&
      customer.currentOrderId === null
    );
  }

  getCustomerByUser(username) {
    if (!username) {
      return null;
    }

    const normalized =
      this.normalizeUsername(
        username
      );

    for (const customer of this.customers.values()) {
      if (
        customer.username &&
        this.normalizeUsername(
          customer.username
        ) === normalized
      ) {
        return customer;
      }
    }

    return null;
  }

  getCustomerByOrder(orderId) {
    if (!orderId) {
      return null;
    }

    for (const customer of this.customers.values()) {
      if (
        customer.currentOrderId === orderId
      ) {
        return customer;
      }
    }

    return null;
  }

  /*
   * =========================
   * NORMALIZACIÓN
   * =========================
   */

  normalizeUsername(username) {
    return String(username ?? "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
  }

  normalizeRole(role) {
    return String(role ?? "")
      .trim()
      .toLowerCase();
  }

  /*
   * =========================
   * !MENU
   * =========================
   */

  createCustomer({
    username,
    role,
    orderId
  }) {
    if (!username) {
      return null;
    }

    /*
     * Un usuario no puede tener
     * dos clientes activos.
     */
    if (
      this.getCustomerByUser(
        username
      )
    ) {
      return null;
    }

    const customer =
      this.getAvailableCustomer();

    if (!customer) {
      return null;
    }

    customer.username =
      username;

    customer.role =
      this.normalizeRole(role);

    customer.sprite =
      this.resolveSprite(
        username,
        role
      );

    customer.state =
      CUSTOMER_STATES.ORDERING;

    customer.currentOrderId =
      orderId ?? null;

    customer.scale = null;

    return customer;
  }

  /*
   * =========================
   * SPRITE
   * =========================
   *
   * Prioridad:
   *
   * 1. EBastos14
   * 2. JaciiTV
   * 3. Mod
   * 4. Sub
   * 5. VIP
   * 6. Base
   */

  resolveSprite(
    username,
    role
  ) {
    const normalizedUsername =
      this.normalizeUsername(
        username
      );

    /*
     * Identidades especiales
     * tienen prioridad absoluta.
     */

    if (
      normalizedUsername ===
      "ebastos14"
    ) {
      return SPECIAL_SPRITES.ebastos14;
    }

    if (
      normalizedUsername ===
      "jaciitv"
    ) {
      return SPECIAL_SPRITES.jaciitv;
    }

    /*
     * Después se evalúa el
     * privilegio.
     */

    const normalizedRole =
      this.normalizeRole(role);

    if (
      PRIVILEGE_PRIORITY.includes(
        normalizedRole
      )
    ) {
      return (
        PRIVILEGE_SPRITES[
          normalizedRole
        ]
      );
    }

    /*
     * Sin privilegio.
     */

    return DEFAULT_SPRITE;
  }

  /*
   * =========================
   * ESTADO
   * =========================
   */

  setState(
    customerId,
    state
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    if (
      !Object.values(
        CUSTOMER_STATES
      ).includes(state)
    ) {
      return false;
    }

    customer.state =
      state;

    return true;
  }

  /*
   * =========================
   * PEDIDO
   * =========================
   */

  setOrder(
    customerId,
    orderId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.currentOrderId =
      orderId ?? null;

    return true;
  }

  /*
   * =========================
   * DATOS DEL PEDIDO
   * =========================
   *
   * Estos valores permiten mantener
   * la relación visual/lógica del
   * cliente con su pedido.
   */

  setFood(
    customerId,
    foodId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.foodId =
      foodId ?? null;

    return true;
  }

  setDrink(
    customerId,
    drinkId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.drinkId =
      drinkId ?? null;

    return true;
  }

  setBag(
    customerId,
    bagId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.bagId =
      bagId ?? null;

    return true;
  }

  /*
   * =========================
   * COMPLETAR
   * =========================
   */

  completeCustomer(
    customerId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.state =
      CUSTOMER_STATES.COMPLETED;

    return true;
  }

  /*
   * =========================
   * LIBERAR CLIENTE
   * =========================
   *
   * Esto ocurre después de
   * !reclamar.
   */

  freeCustomer(
    customerId
  ) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    customer.username = null;
    customer.role = null;

    customer.sprite =
      DEFAULT_SPRITE;

    customer.state =
      CUSTOMER_STATES.WAITING;

    customer.currentOrderId =
      null;

    customer.foodId = null;
    customer.drinkId = null;
    customer.bagId = null;

    customer.scale = null;

    return true;
  }

  /*
   * =========================
   * CLAIM
   * =========================
   *
   * Devuelve si el cliente
   * puede ser reclamado.
   */

  canClaim(customerId) {
    const customer =
      this.getCustomer(
        customerId
      );

    if (!customer) {
      return false;
    }

    return (
      customer.username !== null &&
      customer.currentOrderId !== null
    );
  }

  /*
   * =========================
   * SNAPSHOT
   * =========================
   */

  snapshot() {
    return {
      version: 1,

      customers:
        this.getAll().map(
          (customer) => ({
            id: customer.id,
            positionId:
              customer.positionId,
            username:
              customer.username,
            role:
              customer.role,
            sprite:
              customer.sprite,
            state:
              customer.state,
            currentOrderId:
              customer.currentOrderId,
            foodId:
              customer.foodId ?? null,
            drinkId:
              customer.drinkId ?? null,
            bagId:
              customer.bagId ?? null,
            scale:
              customer.scale ?? null
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
        "CustomerManager.loadSnapshot: snapshot inválido."
      );
    }

    if (
      snapshot.version !== 1
    ) {
      throw new Error(
        `CustomerManager.loadSnapshot: versión no soportada: ${snapshot.version}`
      );
    }

    if (
      !Array.isArray(
        snapshot.customers
      )
    ) {
      throw new Error(
        "CustomerManager.loadSnapshot: customers debe ser un array."
      );
    }

    for (
      const savedCustomer
      of snapshot.customers
    ) {
      if (
        !savedCustomer ||
        !this.customers.has(
          savedCustomer.id
        )
      ) {
        continue;
      }

      const customer =
        this.customers.get(
          savedCustomer.id
        );

      /*
       * positionId es fijo:
       * Client_1..Client_4.
       *
       * No permitimos que un snapshot
       * remapee un cliente a otra posición.
       */

      customer.positionId =
        customer.id;

      customer.username =
        savedCustomer.username ??
        null;

      customer.role =
        savedCustomer.role ??
        null;

      customer.sprite =
        savedCustomer.sprite ??
        DEFAULT_SPRITE;

      customer.state =
        savedCustomer.state ??
        CUSTOMER_STATES.WAITING;

      customer.currentOrderId =
        savedCustomer.currentOrderId ??
        null;

      customer.foodId =
        savedCustomer.foodId ??
        null;

      customer.drinkId =
        savedCustomer.drinkId ??
        null;

      customer.bagId =
        savedCustomer.bagId ??
        null;

      customer.scale =
        savedCustomer.scale ??
        null;
    }
  }
}

export {
  CUSTOMER_IDS,
  CUSTOMER_STATES,
  DEFAULT_SPRITE
};
