import { PositionRegistry } from "../entities/PositionRegistry.js";
import { WorkerManager } from "../entities/WorkerManager.js";
import { CustomerManager } from "../entities/CustomerManager.js";
import { OrderManager } from "../entities/OrderManager.js";
import { ActionSystem } from "../entities/ActionSystem.js";

export class GameSystems {
  constructor() {
    /*
     * PositionRegistry
     * ----------------
     * Define las posiciones lógicas del restaurante:
     *
     * Left_1..Left_4
     * Right_1..Right_4
     * Cashier
     * Client_1..Client_4
     *
     * No contiene coordenadas del mapa.
     */
    this.positions = new PositionRegistry();

    /*
     * WorkerManager
     * -------------
     * Gestiona los cuatro trabajadores:
     *
     * mod_1 -> Left_1
     * mod_2 -> Left_2
     * mod_3 -> Left_3
     * mod_4 -> Left_4
     */
    this.workers = new WorkerManager(this.positions);

    /*
     * CustomerManager
     * ----------------
     * Gestiona:
     *
     * Client_1..Client_4
     *
     * También resuelve el sprite correspondiente
     * según identidad y privilegios.
     */
    this.customers = new CustomerManager(this.positions);

    /*
     * OrderManager
     * ------------
     * Gestiona Order_1, Order_2, Order_3...
     *
     * CustomerManager se inyecta para que cada pedido
     * pueda asociarse con un cliente.
     */
    this.orders = new OrderManager(this.customers);

    /*
     * ActionSystem
     * ------------
     * Coordina acciones entre trabajadores, pedidos,
     * estaciones, caja y clientes.
     */
    this.actions = new ActionSystem({
      workerManager: this.workers,
      customerManager: this.customers,
      orderManager: this.orders,
      positionRegistry: this.positions
    });
  }

  /**
   * Devuelve el estado completo de los sistemas de gameplay.
   *
   * Este snapshot NO contiene todavía el renderer ni el mapa.
   * Solo contiene el estado lógico de trabajadores,
   * clientes, pedidos y acciones.
   */
  snapshot() {
    return {
      version: 1,

      workers: this.workers.snapshot(),
      customers: this.customers.snapshot(),
      orders: this.orders.snapshot(),
      actions: this.actions.snapshot()
    };
  }

  /**
   * Carga un snapshot previamente generado.
   *
   * El orden es importante:
   *
   * 1. trabajadores
   * 2. clientes
   * 3. pedidos
   * 4. acciones
   *
   * Las referencias entre sistemas deben existir antes
   * de reconstruir las colas y estados de acciones.
   */
  loadSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("GameSystems.loadSnapshot: snapshot inválido.");
    }

    if (snapshot.version !== 1) {
      throw new Error(
        `GameSystems.loadSnapshot: versión no soportada: ${snapshot.version}`
      );
    }

    if (snapshot.workers) {
      this.workers.loadSnapshot(snapshot.workers);
    }

    if (snapshot.customers) {
      this.customers.loadSnapshot(snapshot.customers);
    }

    if (snapshot.orders) {
      this.orders.loadSnapshot(snapshot.orders);
    }

    if (snapshot.actions) {
      this.actions.loadSnapshot(snapshot.actions);
    }
  }

  /**
   * Accesos rápidos.
   */
  getWorker(workerId) {
    return this.workers.getWorker(workerId);
  }

  getCustomer(clientId) {
    return this.customers.getCustomer(clientId);
  }

  getOrder(orderId) {
    return this.orders.getOrder(orderId);
  }

  getPosition(positionId) {
    return this.positions.get(positionId);
  }

  /**
   * Estado lógico completo.
   */
  getState() {
    return {
      workers: this.workers.getAll(),
      customers: this.customers.getAll(),
      orders: this.orders.getAll(),
      stations: this.actions.getStationQueues(),
      cashierQueue: this.actions.getCashierQueue()
    };
  }
}
