import mapDefinition from "../../assets/raptors/map-raptors.json" with { type: "json" };
import assignmentDefinition from "../../assets/restaurant/raptorAssignments.json" with { type: "json" };

import {
DEFAULT_RAPTOR_SHEET,
validateRaptorAssignment
} from "./raptors.js";

function getMapEntity(locationId) {
const entity = mapDefinition.entities?.find(
(item) => item.id === locationId
);

if (!entity) {
throw new Error(
"No existe la ubicación "${locationId}" en map-raptors.json."
);
}

if (entity.type !== "raptor") {
throw new Error(
"La ubicación "${locationId}" no es una ubicación de Raptor."
);
}

return entity;
}

function validateAssignment(locationId, sheetName) {
const entity = getMapEntity(locationId);

validateRaptorAssignment(
entity.profile,
sheetName
);

return true;
}

function validateAssignmentDefinition() {
if (!assignmentDefinition || typeof assignmentDefinition !== "object") {
throw new Error(
"raptorAssignments.json no contiene un objeto válido."
);
}

if (!Number.isInteger(assignmentDefinition.version)) {
throw new Error(
"raptorAssignments.json debe tener una versión numérica."
);
}

if (assignmentDefinition.mapId !== mapDefinition.mapId) {
throw new Error(
"raptorAssignments.json pertenece a un mapa diferente."
);
}

if (
!assignmentDefinition.assignments ||
typeof assignmentDefinition.assignments !== "object"
) {
throw new Error(
"raptorAssignments.json no contiene assignments."
);
}

for (const [locationId, sheetName] of Object.entries(
assignmentDefinition.assignments
)) {
validateAssignment(
locationId,
sheetName
);
}

return true;
}

validateAssignmentDefinition();

const INITIAL_ASSIGNMENTS = Object.freeze(
assignmentDefinition.assignments
);

export class RaptorAssignments {
constructor(initialAssignments = INITIAL_ASSIGNMENTS) {
this.assignments = new Map();

for (const [locationId, sheetName] of Object.entries(
  initialAssignments
)) {
  this.set(
    locationId,
    sheetName
  );
}

}

set(locationId, sheetName) {
if (
!locationId ||
typeof locationId !== "string"
) {
throw new Error(
"El ID de ubicación del Raptor no es válido."
);
}

if (
  !sheetName ||
  typeof sheetName !== "string"
) {
  throw new Error(
    `El spritesheet de "${locationId}" no es válido.`
  );
}

validateAssignment(
  locationId,
  sheetName
);

this.assignments.set(
  locationId,
  sheetName
);

}

get(locationId) {
return (
this.assignments.get(locationId) ??
null
);
}

has(locationId) {
return this.assignments.has(
locationId
);
}

remove(locationId) {
this.assignments.delete(locationId);
}

clear() {
this.assignments.clear();
}

getAll() {
return Object.fromEntries(
this.assignments
);
}

toJSON() {
return {
version: assignmentDefinition.version,
mapId: mapDefinition.mapId,
assignments: this.getAll()
};
}

validateComplete() {
const raptorLocations =
mapDefinition.entities.filter(
(entity) =>
entity.type === "raptor"
);

const missing = [];

for (const entity of raptorLocations) {
  if (!this.has(entity.id)) {
    missing.push(entity.id);
  }
}

if (missing.length > 0) {
  throw new Error(
    `Faltan asignaciones de Raptor: ${missing.join(", ")}`
  );
}

return true;

}
}

export const raptorAssignments =
new RaptorAssignments();

raptorAssignments.validateComplete();

export function getDefaultRaptorSheet() {
return DEFAULT_RAPTOR_SHEET;
}
