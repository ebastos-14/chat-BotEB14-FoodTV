import {
RAPTOR_PATH,
RAPTOR_SHEETS,
RAPTOR_PROFILES,
isRaptorSheetAllowed,
getRaptorProfile
} from "../js/config/raptors.js";

const MAP_URL = "/assets/restaurant/map.json";

const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const spritePreview = document.querySelector("#sprite-preview");
const spritePreviewCtx = spritePreview.getContext("2d");

const elementSelect = document.querySelector("#element-select");
const elementList = document.querySelector("#element-list");

const raptorSheet = document.querySelector("#raptor-sheet");
const raptorProfile = document.querySelector("#raptor-profile");

const elementX = document.querySelector("#element-x");
const elementY = document.querySelector("#element-y");
const elementScale = document.querySelector("#element-scale");
const elementMirror = document.querySelector("#element-mirror");
const elementLayer = document.querySelector("#element-layer");

const elementInfo = document.querySelector("#element-info");
const editorMessage = document.querySelector("#editor-message");
const editorStatus = document.querySelector("#editor-status");

const jsonData = document.querySelector("#json-data");

const applyElementButton = document.querySelector("#apply-element");
const addElementButton = document.querySelector("#add-element");
const deleteElementButton = document.querySelector("#delete-element");
const resetMapButton = document.querySelector("#reset-map");
const exportJsonButton = document.querySelector("#export-json");
const copyJsonButton = document.querySelector("#copy-json");
const importJsonButton = document.querySelector("#import-json");

let mapDefinition = null;
let selectedElementId = null;

const raptorImages = new Map();

let pointerState = {
active: false,
moved: false,
offsetX: 0,
offsetY: 0
};

const DEFAULT_MAP = {
version: 2,
mapId: "restaurant-main",
name: "Restaurante principal",
background: {
asset: "/assets/restaurant/map-background.png",
width: 1536,
height: 1536
},
entities: [],
zones: [],
spawns: [],
interactions: []
};

const FALLBACK_SHEETS = [...RAPTOR_SHEETS];

const backgroundImage = new Image();

backgroundImage.onload = () => {
draw();
};

backgroundImage.onerror = () => {
showMessage("No se pudo cargar el fondo del mapa.");
};

function setStatus(text) {
editorStatus.textContent = text;
}

function showMessage(text, isError = false) {
editorMessage.textContent = text;
editorMessage.style.color = isError
? "#f88"
: "#aaa";
}

function cloneMap(map) {
return JSON.parse(JSON.stringify(map));
}

async function loadMap() {
try {
const response = await fetch(MAP_URL, {
cache: "no-store"
});

if (!response.ok) {
  throw new Error(
    `HTTP ${response.status}`
  );
}

const data = await response.json();

validateMap(data);

mapDefinition = normalizeMap(data);

backgroundImage.src =
  mapDefinition.background.asset;

populateSheetSelect();
refreshElementList();

setStatus("Mapa cargado");
showMessage(
  `${mapDefinition.entities.length} elementos cargados.`
);

draw();

} catch (error) {
console.error(error);

mapDefinition = cloneMap(DEFAULT_MAP);

backgroundImage.src =
  mapDefinition.background.asset;

populateSheetSelect();
refreshElementList();

setStatus("Error de carga");
showMessage(
  `No se pudo cargar map.json: ${error.message}`,
  true
);

draw();

}
}

function validateMap(map) {
if (!map || typeof map !== "object") {
throw new Error("El mapa no es un objeto válido.");
}

if (!map.background || typeof map.background !== "object") {
throw new Error(
"El mapa no contiene background."
);
}

if (!Array.isArray(map.entities)) {
throw new Error(
"El mapa no contiene entities válidas."
);
}

const ids = new Set();

for (const entity of map.entities) {
if (!entity || typeof entity !== "object") {
throw new Error(
"Existe una entidad inválida."
);
}

if (!entity.id || typeof entity.id !== "string") {
  throw new Error(
    "Existe una entidad sin ID válido."
  );
}

if (ids.has(entity.id)) {
  throw new Error(
    `ID duplicado: ${entity.id}`
  );
}

ids.add(entity.id);

if (entity.type === "raptor") {
  validateRaptorEntity(entity);
}

}
}

function validateRaptorEntity(entity) {
if (!RAPTOR_PROFILES[entity.profile]) {
throw new Error(
"Perfil Raptor inválido en "${entity.id}": ${entity.profile}"
);
}

if (
!entity.position ||
!Number.isFinite(entity.position.x) ||
!Number.isFinite(entity.position.y)
) {
throw new Error(
"Posición inválida en "${entity.id}"."
);
}

if (!Number.isFinite(entity.scale)) {
throw new Error(
"Escala inválida en "${entity.id}"."
);
}

if (!Number.isFinite(entity.layer)) {
throw new Error(
"Layer inválido en "${entity.id}"."
);

}

if (typeof entity.mirror !== "boolean") {
throw new Error(
"Mirror inválido en "${entity.id}"."
);
}
}

function normalizeMap(map) {
const normalized = cloneMap(map);

normalized.version = Number.isFinite(normalized.version)
? normalized.version
: 2;

normalized.mapId =
normalized.mapId || "restaurant-main";

normalized.name =
normalized.name || "Restaurante principal";

normalized.zones =
Array.isArray(normalized.zones)
? normalized.zones
: [];

normalized.spawns =
Array.isArray(normalized.spawns)
? normalized.spawns
: [];

normalized.interactions =
Array.isArray(normalized.interactions)
? normalized.interactions
: [];

normalized.entities =
normalized.entities.map((entity) => ({
...entity,
type: entity.type || "raptor",
profile: entity.profile || "lateral",
position: {
x: Number(entity.position?.x ?? 0),
y: Number(entity.position?.y ?? 0)
},
scale: Number(entity.scale ?? 1),
mirror: Boolean(entity.mirror),
layer: Number(entity.layer ?? 0)
}));

return normalized;
}

function populateSheetSelect() {
raptorSheet.innerHTML = "";

for (const sheetName of FALLBACK_SHEETS) {
const option =
document.createElement("option");

option.value = sheetName;
option.textContent = sheetName;

raptorSheet.appendChild(option);

}
}

function getSelectedEntity() {
if (!mapDefinition || !selectedElementId) {
return null;
}

return (
mapDefinition.entities.find(
(entity) =>
entity.id === selectedElementId
) ?? null
);
}

function refreshElementList() {
elementList.innerHTML = "";
elementSelect.innerHTML =
'<option value="">Seleccionar...</option>';

if (!mapDefinition) {
return;
}

const entities = mapDefinition.entities
.filter(
(entity) =>
entity.type === "raptor"
)
.sort((a, b) =>
a.id.localeCompare(b.id)
);

for (const entity of entities) {
const option =
document.createElement("option");

option.value = entity.id;
option.textContent = entity.id;

elementSelect.appendChild(option);

const item =
  document.createElement("div");

item.className = "element-item";

if (entity.id === selectedElementId) {
  item.classList.add("selected");
}

item.dataset.id = entity.id;

item.innerHTML = `
  <strong>${escapeHtml(entity.id)}</strong>
  <span>
    ${escapeHtml(entity.profile)}
    · layer ${entity.layer}
    · ${entity.position.x}, ${entity.position.y}
  </span>
`;

item.addEventListener(
  "click",
  () => {
    selectElement(entity.id);
  }
);

elementList.appendChild(item);

}

elementSelect.value =
selectedElementId ?? "";
}

function selectElement(id) {
const entity =
mapDefinition.entities.find(
(item) => item.id === id
);

if (!entity) {
selectedElementId = null;
clearForm();
refreshElementList();
draw();
return;
}

selectedElementId = id;

loadEntityIntoForm(entity);

refreshElementList();
draw();

showMessage(
"Seleccionado: ${entity.id}"
);
}

function loadEntityIntoForm(entity) {
elementSelect.value = entity.id;

raptorProfile.value =
entity.profile;

elementX.value =
entity.position.x;

elementY.value =
entity.position.y;

elementScale.value =
entity.scale;

elementMirror.checked =
entity.mirror;

elementLayer.value =
entity.layer;

updateSheetOptions();

const currentSheet =
getAssignment(entity);

if (currentSheet) {
raptorSheet.value =
currentSheet;
}

elementInfo.textContent =
"${entity.id} · ${entity.profile}";

updateSpritePreview();
}

function clearForm() {
elementSelect.value = "";

elementX.value = "";
elementY.value = "";
elementScale.value = "";
elementLayer.value = "";

elementMirror.checked = false;

elementInfo.textContent =
"Ningún elemento seleccionado.";

updateSheetOptions();
clearSpritePreview();
}

function updateSheetOptions() {
const profile =
raptorProfile.value;

const allowed =
RAPTOR_PROFILES[profile]?.allowedSheets
?? [];

const current =
raptorSheet.value;

raptorSheet.innerHTML = "";

for (const sheetName of allowed) {
const option =
document.createElement("option");

option.value = sheetName;
option.textContent = sheetName;

raptorSheet.appendChild(option);

}

if (allowed.includes(current)) {
raptorSheet.value = current;
} else if (allowed.length > 0) {
raptorSheet.value = allowed[0];
}

updateSpritePreview();
}

function getAssignment(entity) {
if (!entity) {
return null;
}

const sheet =
entity._runtimeSheet;

if (
typeof sheet === "string" &&
isRaptorSheetAllowed(
entity.profile,
sheet
)
) {
return sheet;
}

return getDefaultSheet(entity.profile);
}

function getDefaultSheet(profile) {
const allowed =
RAPTOR_PROFILES[profile]?.allowedSheets
?? [];

return allowed[0] ?? null;
}

function applyChanges() {
const entity =
getSelectedEntity();

if (!entity) {
showMessage(
"Seleccione primero una ubicación.",
true
);

return;

}

const profile =
raptorProfile.value;

const x =
Number(elementX.value);

const y =
Number(elementY.value);

const scale =
Number(elementScale.value);

const layer =
Number(elementLayer.value);

const mirror =
elementMirror.checked;

if (!RAPTOR_PROFILES[profile]) {
showMessage(
"El perfil seleccionado no es válido.",
true
);

return;

}

if (!Number.isFinite(x) ||
!Number.isFinite(y)) {
showMessage(
"X e Y deben ser números válidos.",
true
);

return;

}

if (!Number.isFinite(scale) ||
scale <= 0) {
showMessage(
"La escala debe ser mayor que cero.",
true
);

return;

}

if (!Number.isFinite(layer)) {
showMessage(
"El layer debe ser un número válido.",
true
);

return;

}

const sheet =
raptorSheet.value;

if (
!sheet ||
!isRaptorSheetAllowed(
profile,
sheet
)
) {
showMessage(
"El Raptor "${sheet}" no está permitido para el perfil "${profile}".",
true
);

return;

}

entity.profile = profile;

entity.position = {
x,
y
};

entity.scale = scale;
entity.mirror = mirror;
entity.layer = layer;

/*

* La asignación del spritesheet es información
* de runtime del editor.
* 
* NO se exporta a map.json.
  */
  entity._runtimeSheet = sheet;

loadEntityIntoForm(entity);

refreshElementList();
draw();

showMessage(
"Cambios aplicados a "${entity.id}"."
);
}

function addElement() {
if (!mapDefinition) {
return;
}

const existingIds =
new Set(
mapDefinition.entities.map(
(entity) => entity.id
)
);

let index = 1;
let id = "Raptor_${index}";

while (existingIds.has(id)) {
index += 1;
id = "Raptor_${index}";
}

const entity = {
id,
type: "raptor",
profile: "lateral",
position: {
x: 100,
y: 100
},
scale: 0.488,
mirror: false,
layer: 3,

_runtimeSheet:
  getDefaultSheet("lateral")

};

mapDefinition.entities.push(entity);

selectedElementId = id;

refreshElementList();
loadEntityIntoForm(entity);
draw();

showMessage(
"Nueva ubicación creada: ${id}"
);
}

function deleteSelectedElement() {
if (!mapDefinition || !selectedElementId) {
showMessage(
"Seleccione una ubicación para eliminar.",
true
);

return;

}

const index =
mapDefinition.entities.findIndex(
(entity) =>
entity.id === selectedElementId
);

if (index === -1) {
return;
}

const deletedId =
mapDefinition.entities[index].id;

mapDefinition.entities.splice(
index,
1
);

selectedElementId = null;

clearForm();
refreshElementList();
draw();

showMessage(
"Ubicación eliminada: ${deletedId}"
);
}

function resetMap() {
const confirmed =
window.confirm(
"¿Restaurar el mapa cargado originalmente? Se perderán los cambios actuales del editor."
);

if (!confirmed) {
return;
}

loadMap();
}

function getExportMap() {
const exported =
cloneMap(mapDefinition);

exported.entities =
exported.entities.map(
(entity) => {
const cleanEntity = {
id: entity.id,
type: entity.type
};

    if (entity.type === "raptor") {
      cleanEntity.profile =
        entity.profile;

      cleanEntity.position = {
        x: entity.position.x,
        y: entity.position.y
      };

      cleanEntity.scale =
        entity.scale;

      cleanEntity.mirror =
        entity.mirror;

      cleanEntity.layer =
        entity.layer;
    } else {
      Object.assign(
        cleanEntity,
        entity
      );
    }

    return cleanEntity;
  }
);

return exported;
}

function exportJson() {
if (!mapDefinition) {
showMessage(
"No hay mapa cargado.",
true
);

return;

}

const exported =
getExportMap();

const json =
JSON.stringify(
exported,
null,
2
);

jsonData.value = json;

showMessage(
"JSON generado correctamente."
);
}

async function copyJson() {
if (!mapDefinition) {
showMessage(
"No hay mapa cargado.",
true
);

return;

}

const exported =
getExportMap();

const json =
JSON.stringify(
exported,
null,
2
);

jsonData.value = json;

try {
await navigator.clipboard.writeText(
json
);

showMessage(
  "JSON copiado al portapapeles."
);

} catch (error) {
console.error(error);

showMessage(
  "No se pudo copiar automáticamente. Puede copiar el texto manualmente.",
  true
);

}
}

function importJson() {
const text =
jsonData.value.trim();

if (!text) {
showMessage(
"Pegue primero un JSON.",
true
);

return;

}

try {
const imported =
JSON.parse(text);

validateMap(imported);

mapDefinition =
  normalizeMap(imported);

selectedElementId = null;

backgroundImage.src =
  mapDefinition.background.asset;

refreshElementList();
clearForm();
draw();

showMessage(
  "JSON importado correctamente."
);

setStatus(
  "JSON importado"
);

} catch (error) {
console.error(error);

showMessage(
  `JSON inválido: ${error.message}`,
  true
);

}
}

function draw() {
if (!ctx || !mapDefinition) {
return;
}

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

ctx.fillStyle = "#111";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

ctx.imageSmoothingEnabled = false;

if (backgroundImage.complete &&
backgroundImage.naturalWidth > 0) {
ctx.drawImage(
backgroundImage,
0,
0,
mapDefinition.background.width,
mapDefinition.background.height
);
}

const entities =
[...mapDefinition.entities]
.sort(
(a, b) =>
Number(a.layer ?? 0) -
Number(b.layer ?? 0)
);

for (const entity of entities) {
drawEntity(entity);
}
}

function drawEntity(entity) {
if (entity.type !== "raptor") {
return;
}

const sheet =
getAssignment(entity);

if (!sheet) {
return;
}

const image =
raptorImages.get(sheet);

if (!image ||
!image.complete ||
image.naturalWidth <= 0) {
loadRaptorImage(sheet);
return;
}

let profile;

try {
profile =
getRaptorProfile(
entity.profile
);
} catch (error) {
console.error(error);
return;
}

const source =
profile.source;

const scale =
Number(entity.scale);

const width =
source.width * scale;

const height =
source.height * scale;

const x =
Number(entity.position.x);

const y =
Number(entity.position.y);

ctx.save();

if (entity.mirror) {
ctx.translate(
x + width,
y
);

ctx.scale(
  -1,
  1
);

ctx.drawImage(
  image,
  source.x,
  source.y,
  source.width,
  source.height,
  0,
  0,
  width,
  height
);

} else {
ctx.drawImage(
image,
source.x,
source.y,
source.width,
source.height,
x,
y,
width,
height
);
}

ctx.restore();

if (entity.id === selectedElementId) {
drawSelectionBox(
entity,
width,
height
);
}
}

function drawSelectionBox(
entity,
width,
height
) {
const x =
Number(entity.position.x);

const y =
Number(entity.position.y);

ctx.save();

ctx.strokeStyle = "#fff";
ctx.lineWidth = 2;
ctx.setLineDash([6, 4]);

ctx.strokeRect(
x,
y,
width,
height
);

ctx.restore();
}

function loadRaptorImage(sheetName) {
if (raptorImages.has(sheetName)) {
return;
}

const image =
new Image();

image.onload = () => {
raptorImages.set(
sheetName,
image
);

draw();
updateSpritePreview();

};

image.onerror = () => {
showMessage(
"No se pudo cargar ${sheetName}.",
true
);
};

image.src =
"${RAPTOR_PATH}${sheetName}";

raptorImages.set(
sheetName,
image
);
}

function updateSpritePreview() {
spritePreviewCtx.clearRect(
0,
0,
spritePreview.width,
spritePreview.height
);

const profile =
raptorProfile.value;

const sheet =
raptorSheet.value;

if (!profile || !sheet) {
return;
}

const image =
raptorImages.get(sheet);

if (!image ||
!image.complete ||
image.naturalWidth <= 0) {
loadRaptorImage(sheet);
return;
}

const definition =
getRaptorProfile(profile);

const source =
definition.source;

const padding = 10;

const availableWidth =
spritePreview.width -
padding * 2;

const availableHeight =
spritePreview.height -
padding * 2;

const previewScale =
Math.min(
availableWidth / source.width,
availableHeight / source.height
);

const width =
source.width * previewScale;

const height =
source.height * previewScale;

const x =
(spritePreview.width - width) / 2;

const y =
(spritePreview.height - height) / 2;

spritePreviewCtx.imageSmoothingEnabled =
false;

spritePreviewCtx.drawImage(
image,
source.x,
source.y,
source.width,
source.height,
x,
y,
width,
height
);
}

function getCanvasPosition(event) {
const rect =
canvas.getBoundingClientRect();

const scaleX =
canvas.width / rect.width;

const scaleY =
canvas.height / rect.height;

return {
x:
(event.clientX - rect.left) *
scaleX,

y:
  (event.clientY - rect.top) *
  scaleY

};
}

function findEntityAtPosition(x, y) {
if (!mapDefinition) {
return null;
}

const entities =
[...mapDefinition.entities]
.filter(
(entity) =>
entity.type === "raptor"
)
.sort(
(a, b) =>
Number(b.layer ?? 0) -
Number(a.layer ?? 0)
);

for (const entity of entities) {
const sheet =
getAssignment(entity);

if (!sheet) {
  continue;
}

const profile =
  getRaptorProfile(
    entity.profile
  );

const width =
  profile.source.width *
  entity.scale;

const height =
  profile.source.height *
  entity.scale;

const ex =
  Number(entity.position.x);

const ey =
  Number(entity.position.y);

if (
  x >= ex &&
  x <= ex + width &&
  y >= ey &&
  y <= ey + height
) {
  return entity;
}

}

return null;
}

canvas.addEventListener(
"pointerdown",
(event) => {
const position =
getCanvasPosition(event);

const entity =
  findEntityAtPosition(
    position.x,
    position.y
  );

if (!entity) {
  return;
}

selectElement(entity.id);

pointerState.active = true;
pointerState.moved = false;

pointerState.offsetX =
  position.x -
  entity.position.x;

pointerState.offsetY =
  position.y -
  entity.position.y;

canvas.setPointerCapture(
  event.pointerId
);

}
);

canvas.addEventListener(
"pointermove",
(event) => {
if (!pointerState.active) {
return;
}

const entity =
  getSelectedEntity();

if (!entity) {
  return;
}

const position =
  getCanvasPosition(event);

entity.position.x =
  Math.round(
    position.x -
    pointerState.offsetX
  );

entity.position.y =
  Math.round(
    position.y -
    pointerState.offsetY
  );

elementX.value =
  entity.position.x;

elementY.value =
  entity.position.y;

pointerState.moved = true;

draw();
refreshElementList();

}
);

canvas.addEventListener(
"pointerup",
(event) => {
pointerState.active = false;

try {
  canvas.releasePointerCapture(
    event.pointerId
  );
} catch {
  // No hacer nada.
}

if (pointerState.moved) {
  showMessage(
    "Posición actualizada."
  );
}

}
);

canvas.addEventListener(
"pointercancel",
() => {
pointerState.active = false;
}
);

elementSelect.addEventListener(
"change",
() => {
const id =
elementSelect.value;

if (id) {
  selectElement(id);
} else {
  selectedElementId = null;
  clearForm();
  refreshElementList();
  draw();
}

}
);

raptorProfile.addEventListener(
"change",
() => {
updateSheetOptions();

const entity =
  getSelectedEntity();

if (entity) {
  entity.profile =
    raptorProfile.value;
}

updateSpritePreview();
draw();

}
);

raptorSheet.addEventListener(
"change",
() => {
updateSpritePreview();
draw();
}
);

applyElementButton.addEventListener(
"click",
applyChanges
);

addElementButton.addEventListener(
"click",
addElement
);

deleteElementButton.addEventListener(
"click",
deleteSelectedElement
);

resetMapButton.addEventListener(
"click",
resetMap
);

exportJsonButton.addEventListener(
"click",
exportJson
);

copyJsonButton.addEventListener(
"click",
copyJson
);

importJsonButton.addEventListener(
"click",
importJson
);

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

loadMap();
