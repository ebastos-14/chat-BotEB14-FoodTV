const POSITIONS = [
  {
    id: "Left_1",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },
  {
    id: "Left_2",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },
  {
    id: "Left_3",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },
  {
    id: "Left_4",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },

  {
    id: "Right_1",
    type: "station",
    station: "bebida",
    profile: "lateral",
    mirror: false
  },
  {
    id: "Right_2",
    type: "station",
    station: "cortar",
    profile: "lateral",
    mirror: false
  },
  {
    id: "Right_3",
    type: "station",
    station: "cocinar",
    profile: "lateral",
    mirror: false
  },
  {
    id: "Right_4",
    type: "station",
    station: "freir",
    profile: "lateral",
    mirror: false
  },

  {
    id: "Cashier",
    type: "cashier",
    profile: "front",
    mirror: false
  },

  {
    id: "Client_1",
    type: "client",
    profile: "back",
    mirror: false
  },
  {
    id: "Client_2",
    type: "client",
    profile: "back",
    mirror: false
  },
  {
    id: "Client_3",
    type: "client",
    profile: "back",
    mirror: false
  },
  {
    id: "Client_4",
    type: "client",
    profile: "back",
    mirror: false
  }
];

export class PositionRegistry {
  constructor() {
    this.positions = new Map();

    for (const position of POSITIONS) {
      this.positions.set(
        position.id,
        Object.freeze({ ...position })
      );
    }
  }

  has(positionId) {
    return this.positions.has(positionId);
  }

  get(positionId) {
    return this.positions.get(positionId) ?? null;
  }

  getAll() {
    return Array.from(this.positions.values());
  }

  getWorkerHomes() {
    return this.getAll().filter(
      (position) =>
        position.type === "worker_home"
    );
  }

  getStations() {
    return this.getAll().filter(
      (position) =>
        position.type === "station"
    );
  }

  getClients() {
    return this.getAll().filter(
      (position) =>
        position.type === "client"
    );
  }

  getCashier() {
    return this.getAll().find(
      (position) =>
        position.type === "cashier"
    ) ?? null;
  }

  getStationByCommand(command) {
    const commandToStation = {
      "!bebida": "bebida",
      "!cortar": "cortar",
      "!cocinar": "cocinar",
      "!freir": "freir"
    };

    const stationName =
      commandToStation[command];

    if (!stationName) {
      return null;
    }

    return (
      this.getStations().find(
        (position) =>
          position.station === stationName
      ) ?? null
    );
  }
}
