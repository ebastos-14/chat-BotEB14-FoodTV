import {
DEFAULT_RAPTOR_SHEET,
validateRaptorAssignment
} from "./raptors.js";

const INITIAL_ASSIGNMENTS = {
Lateral_L_1: "Raptor_Mod.png",
Lateral_L_2: "Raptor_Mod.png",
Lateral_L_3: "Raptor_Mod.png",
Lateral_L_4: "Raptor_Mod.png",

Lateral_R_1: "Raptor_Mod.png",
Lateral_R_2: "Raptor_Mod.png",
Lateral_R_3: "Raptor_Mod.png",
Lateral_R_4: "Raptor_Mod.png",

Front: "Raptor_Mod.png",

Back_1: DEFAULT_RAPTOR_SHEET,
Back_2: DEFAULT_RAPTOR_SHEET,
Back_3: DEFAULT_RAPTOR_SHEET,
Back_4: DEFAULT_RAPTOR_SHEET
};

export class RaptorAssignments {
constructor(initialAssignments = INITIAL_ASSIGNMENTS) {
this.assignments = new Map();

for (const [locationId, sheetName] of Object.entries(initialAssignments)) {
  this.set(locationId, sheetName);
}

}

set(locationId, sheetName, profileName) {
if (!locationId || typeof locationId !== "string") {
throw new Error("El ID de ubicación del Raptor no es válido.");
}

if (!sheetName || typeof sheetName !== "string") {
  throw new Error(
    `El spritesheet de "${locationId}" no es válido.`
  );
}

if (profileName) {
  validateRaptorAssignment(profileName, sheetName);
}

this.assignments.set(locationId, sheetName);

}

get(locationId) {
return this.assignments.get(locationId) ?? null;
}

has(locationId) {
return this.assignments.has(locationId);
}

remove(locationId) {
this.assignments.delete(locationId);
}

clear() {
this.assignments.clear();
}

getAll() {
return Object.fromEntries(this.assignments);
}
}

export const raptorAssignments = new RaptorAssignments();
