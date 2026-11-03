const POSITION_DEFINITIONS = {
  Left_1: {
    id: "Left_1",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },

  Left_2: {
    id: "Left_2",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },

  Left_3: {
    id: "Left_3",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },

  Left_4: {
    id: "Left_4",
    type: "worker_home",
    profile: "lateral",
    mirror: true
  },

  Right_1: {
    id: "Right_1",
    type: "station",
    station: "bebida",
    profile: "lateral",
    mirror: false
  },

  Right_2: {
    id: "Right_2",
    type: "station",
    station: "cortar",
    profile: "lateral",
    mirror: false
  },

  Right_3: {
    id: "Right_3",
    type: "station",
    station: "cocinar",
    profile: "lateral",
    mirror: false
  },

  Right_4: {
    id: "Right_4",
    type: "station",
    station: "freir",
    profile: "lateral",
    mirror: false
  },

  Cashier: {
    id: "Cashier",
    type: "cashier",
    profile: "front",
    mirror: false
  },

  Client_1: {
    id: "Client_1",
    type: "client",
    profile: "back",
    mirror: false
  },

  Client_2: {
    id: "Client_2",
    type: "client",
    profile: "back",
    mirror: false
  },

  Client_3: {
    id: "Client_3",
    type: "client",
    profile: "back",
    mirror: false
  },

  Client_4: {
    id: "Client_4",
    type: "client",
    profile: "back",
    mirror: false
  }
};

export class PositionRegistry {
  constructor() {
    this.positions = new Map();

    for (const definition of Object.values(POSITION_DEFINITIONS)) {
      this.positions.set(definition.id, {
        ...definition
      });
    }
  }

  has(positionId) {
    return this.positions.has(positionId);
  }

  get(positionId) {
    const position = this.positions.get(positionId);

    if (!position) {
      return null;
    }

    return {
      ...position
    };
  }

  getAll() {
    return Array.from(this.positions.values()).map((position) => ({
      ...position
    }));
  }

  getWorkerHomes() {
    return this.getAll().filter(
      (position) => position.type === "worker_home"
    );
  }

  getStations() {
    return this.getAll().filter(
      (position) => position.type === "station"
    );
  }

  getClients() {
    return this.getAll().filter(
      (position) => position.type === "client"
    );
  }

  getStationByCommand(command) {
    const stationMap = {
      "!bebida": "bebida",
      "!cortar": "cortar",
      "!cocinar": "cocinar",
      "!freir": "freir"
    };

    const stationName = stationMap[command];

    if (!stationName) {
      return null;
    }

    return this.getStations().find(
      (position) => position.station === stationName
    ) || null;
  }
}
