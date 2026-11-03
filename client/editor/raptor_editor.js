const MAP_URL = "/assets/raptors/map-raptors.json";
const ASSIGNMENTS_URL = "/assets/restaurant/raptorAssignments.json";

const RAPTOR_PATH = "/assets/raptors/";

const RAPTOR_SHEETS = [
"Raptor_Base.png",
"Raptor_Vip.png",
"Raptor_Sub.png",
"Raptor_Mod.png",
"Raptor_EBastos14.png",
"Raptor_JaciiTV_1.png",
"Raptor_JaciiTV_2.png"
];

const RAPTOR_PROFILES = {
lateral: {
source: {
x: 35,
y: 165,
width: 380,
height: 550
},
allowedSheets: [
"Raptor_Mod.png",
"Raptor_EBastos14.png",
"Raptor_JaciiTV_1.png",
"Raptor_JaciiTV_2.png"
]
},

front: {
source: {
x: 453,
y: 165,
width: 360,
height: 550
},
allowedSheets: [
"Raptor_Mod.png",
"Raptor_EBastos14.png",
"Raptor_JaciiTV_1.png",
"Raptor_JaciiTV_2.png"
]
},

back: {
source: {
x: 850,
y: 165,
width: 380,
height: 550
},
allowedSheets: [
"Raptor_Base.png",
"Raptor_Vip.png",
"Raptor_Sub.png",
"Raptor_Mod.png",
"Raptor_EBastos14.png",
"Raptor_JaciiTV_1.png",
"Raptor_JaciiTV_2.png"
]
}
};

const DEFAULT_RAPTOR_SHEET = "Raptor_Mod.png";

const state = {
map: null,
selectedEntityId: null,
selectedSheet: DEFAULT_RAPTOR_SHEET,
history: [],
historyIndex: -1,
dragging: false,
dragOffsetX: 0,
dragOffsetY: 0,
backgroundImage: null,
raptorImages: new Map(),
renderScale: 1,
renderOffsetX: 0,
renderOffsetY: 0
};

const elements = {
canvas: document.querySelector("#editor-canvas"),
entitySelect: document.querySelector("#entity-select"),
entityX: document.querySelector("#entity-x"),
entityY: document.querySelector("#entity-y"),
entityScale: document.querySelector("#entity-scale"),
entityMirror: document.querySelector("#entity-mirror"),
entityLayer: document.querySelector("#entity-layer"),
entityProfile: document.querySelector("#entity-profile"),
sheetSelect: document.querySelector("#sheet-select"),
applyEntity: document.querySelector("#apply-entity"),
deleteEntity: document.querySelector("#delete-entity"),
addEntity: document.querySelector("#add-entity"),
resetEntity: document.querySelector("#reset-entity"),
exportJson: document.querySelector("#export-json"),
copyJson: document.querySelector("#copy-json"),
importJson: document.querySelector("#import-json"),
jsonData: document.querySelector("#json-data"),
status: document.querySelector("#editor-status")
};

function showStatus(message, type = "info") {
if (!elements.status) return;

elements.status.textContent = message;
elements.status.dataset.type = type;
}

function deepClone(value) {
return JSON.parse(JSON.stringify(value));
}

function getEntityById(id) {
if (!state.map?.entities) return null;

return (
state.map.entities.find(
(entity) => entity.id === id
) ?? null
);
}

function getRaptorEntities() {
if (!state.map?.entities) return [];

return state.map.entities.filter(
(entity) => entity.type === "raptor"
);
}

function validateMapDefinition(map) {
if (!map || typeof map !== "object") {
throw new Error(
"El JSON del mapa no contiene un objeto válido."
);
}

if (!Number.isInteger(map.version)) {
throw new Error(
"El mapa debe tener una versión numérica."
);
}

if (!map.mapId || typeof map.mapId !== "string") {
throw new Error(
"El mapa debe tener un mapId válido."
);
}

if (map.module !== "raptors") {
throw new Error(
'Este editor solamente acepta mapas con module: "raptors".'
);
}

if (!Array.isArray(map.entities)) {
throw new Error(
"El mapa debe contener un arreglo entities."
);
}

const ids = new Set();

for (const entity of map.entities) {
if (!entity || typeof entity !== "object") {
throw new Error(
"El mapa contiene una entidad inválida."
);
}

if (!entity.id || typeof entity.id !== "string") {
  throw new Error(
    "Todas las entidades deben tener un ID."
  );
}

if (ids.has(entity.id)) {
  throw new Error(
    `ID duplicado: "${entity.id}".`
  );
}

ids.add(entity.id);

if (entity.type !== "raptor") {
  throw new Error(
    `La entidad "${entity.id}" no es un Raptor.`
  );
}

if (!RAPTOR_PROFILES[entity.profile]) {
  throw new Error(
    `Perfil de Raptor desconocido en "${entity.id}": "${entity.profile}".`
  );
}

if (!entity.position) {
  throw new Error(
    `La entidad "${entity.id}" no tiene position.`
  );
}

if (
  !Number.isFinite(entity.position.x) ||
  !Number.isFinite(entity.position.y)
) {
  throw new Error(
    `La posición de "${entity.id}" no es válida.`
  );
}

if (
  entity.scale !== undefined &&
  !Number.isFinite(entity.scale)
) {
  throw new Error(
    `La escala de "${entity.id}" no es válida.`
  );
}

if (
  entity.mirror !== undefined &&
  typeof entity.mirror !== "boolean"
) {
  throw new Error(
    `mirror de "${entity.id}" debe ser booleano.`
  );
}

if (
  entity.layer !== undefined &&
  !Number.isFinite(entity.layer)
) {
  throw new Error(
    `layer de "${entity.id}" no es válido.`
  );
}

}

return true;
}

function validateRaptorSheet(profileName, sheetName) {
if (!RAPTOR_SHEETS.includes(sheetName)) {
throw new Error(
"Spritesheet de Raptor desconocido: "${sheetName}"."
);
}

const profile = RAPTOR_PROFILES[profileName];

if (!profile) {
throw new Error(
"Perfil de Raptor desconocido: "${profileName}"."
);
}

if (!profile.allowedSheets.includes(sheetName)) {
throw new Error(
"El spritesheet "${sheetName}" no está permitido para el perfil "${profileName}"."
);
}

return true;
}

function pushHistory() {
const snapshot = deepClone(state.map);

if (
state.historyIndex >= 0 &&
JSON.stringify(
state.history[state.historyIndex]
) === JSON.stringify(snapshot)
) {
return;
}

state.history =
state.history.slice(
0,
state.historyIndex + 1
);

state.history.push(snapshot);

state.historyIndex =
state.history.length - 1;
}

function undo() {
if (state.historyIndex <= 0) {
showStatus(
"No hay cambios para deshacer.",
"warning"
);
return;
}

state.historyIndex -= 1;

state.map = deepClone(
state.history[state.historyIndex]
);

refreshEntityList();
refreshControls();
render();

showStatus(
"Cambio deshecho.",
"success"
);
}

function redo() {
if (
state.historyIndex >=
state.history.length - 1
) {
showStatus(
"No hay cambios para rehacer.",
"warning"
);
return;
}

state.historyIndex += 1;

state.map = deepClone(
state.history[state.historyIndex]
);

refreshEntityList();
refreshControls();
render();

showStatus(
"Cambio restaurado.",
"success"
);
}

function getCanvasPoint(event) {
const rect =
elements.canvas.getBoundingClientRect();

const scaleX =
elements.canvas.width / rect.width;

const scaleY =
elements.canvas.height / rect.height;

return {
x:
(event.clientX - rect.left) *
scaleX,

y:
  (event.clientY - rect.top) *
  scaleY

};
}

function mapPointFromCanvas(point) {
return {
x:
(point.x - state.renderOffsetX) /
state.renderScale,

y:
  (point.y - state.renderOffsetY) /
  state.renderScale

};
}

function getEntityDimensions(entity, sheetName) {
const profile =
RAPTOR_PROFILES[entity.profile];

if (!profile) {
return {
width: 0,
height: 0
};
}

const scale =
Number.isFinite(entity.scale)
? entity.scale
: 1;

return {
width:
profile.source.width *
scale,

height:
  profile.source.height *
  scale

};
}

function getEntityBounds(entity) {
const sheetName =
getEntitySheet(entity);

const dimensions =
getEntityDimensions(
entity,
sheetName
);

return {
left: entity.position.x,
top: entity.position.y,
right:
entity.position.x +
dimensions.width,
bottom:
entity.position.y +
dimensions.height
};
}

function pointInsideEntity(
mapPoint,
entity
) {
const bounds =
getEntityBounds(entity);

return (
mapPoint.x >= bounds.left &&
mapPoint.x <= bounds.right &&
mapPoint.y >= bounds.top &&
mapPoint.y <= bounds.bottom
);
}

function getEntitySheet(entity) {
if (
entity.raptorSheet &&
typeof entity.raptorSheet === "string"
) {
return entity.raptorSheet;
}

if (
entity.sheet &&
typeof entity.sheet === "string"
) {
return entity.sheet;
}

return DEFAULT_RAPTOR_SHEET;
}

function setEntitySheet(
entity,
sheetName
) {
validateRaptorSheet(
entity.profile,
sheetName
);

entity.raptorSheet = sheetName;

delete entity.sheet;
}

function refreshEntityList() {
if (!elements.entitySelect) return;

elements.entitySelect.innerHTML = "";

const entities =
getRaptorEntities();

for (const entity of entities) {
const option =
document.createElement("option");

option.value = entity.id;
option.textContent =
  `${entity.id} — ${entity.profile}`;

elements.entitySelect.appendChild(
  option
);

}

if (state.selectedEntityId) {
elements.entitySelect.value =
state.selectedEntityId;
}

if (
!state.selectedEntityId &&
entities.length > 0
) {
state.selectedEntityId =
entities[0].id;

elements.entitySelect.value =
  state.selectedEntityId;

}
}

function refreshProfileSelect(entity) {
if (!elements.entityProfile) return;

elements.entityProfile.innerHTML = "";

for (const profileName of Object.keys(
RAPTOR_PROFILES
)) {
const option =
document.createElement("option");

option.value = profileName;
option.textContent = profileName;

elements.entityProfile.appendChild(
  option
);

}

if (entity) {
elements.entityProfile.value =
entity.profile;
}
}

function refreshSheetSelect(entity) {
if (!elements.sheetSelect) return;

elements.sheetSelect.innerHTML = "";

const profileName =
entity?.profile ?? "lateral";

const profile =
RAPTOR_PROFILES[profileName];

if (!profile) return;

for (const sheetName of profile.allowedSheets) {
const option =
document.createElement("option");

option.value = sheetName;
option.textContent = sheetName;

elements.sheetSelect.appendChild(
  option
);

}

if (entity) {
const sheetName =
getEntitySheet(entity);

if (
  profile.allowedSheets.includes(
    sheetName
  )
) {
  elements.sheetSelect.value =
    sheetName;
} else {
  elements.sheetSelect.value =
    DEFAULT_RAPTOR_SHEET;
}

}
}

function refreshControls() {
const entity =
getEntityById(
state.selectedEntityId
);

if (!entity) return;

if (elements.entityX) {
elements.entityX.value =
entity.position.x;
}

if (elements.entityY) {
elements.entityY.value =
entity.position.y;
}

if (elements.entityScale) {
elements.entityScale.value =
Number.isFinite(entity.scale)
? entity.scale
: 1;
}

if (elements.entityMirror) {
elements.entityMirror.checked =
entity.mirror === true;
}

if (elements.entityLayer) {
elements.entityLayer.value =
Number.isFinite(entity.layer)
? entity.layer
: 0;
}

refreshProfileSelect(entity);
refreshSheetSelect(entity);
}

function selectEntity(id) {
const entity =
getEntityById(id);

if (!entity) {
state.selectedEntityId = null;
return;
}

state.selectedEntityId = id;

if (elements.entitySelect) {
elements.entitySelect.value = id;
}

refreshControls();
render();
}

function applyEntityChanges() {
const entity =
getEntityById(
state.selectedEntityId
);

if (!entity) {
showStatus(
"No hay ningún Raptor seleccionado.",
"error"
);
return;
}

const oldState =
deepClone(entity);

try {
const profileName =
elements.entityProfile?.value;

if (
  !profileName ||
  !RAPTOR_PROFILES[profileName]
) {
  throw new Error(
    "Perfil de Raptor no válido."
  );
}

const x =
  Number(elements.entityX?.value);

const y =
  Number(elements.entityY?.value);

const scale =
  Number(elements.entityScale?.value);

const layer =
  Number(elements.entityLayer?.value);

if (!Number.isFinite(x)) {
  throw new Error(
    "La coordenada X no es válida."
  );
}

if (!Number.isFinite(y)) {
  throw new Error(
    "La coordenada Y no es válida."
  );
}

if (!Number.isFinite(scale) || scale <= 0) {
  throw new Error(
    "La escala debe ser mayor que 0."
  );
}

if (!Number.isFinite(layer)) {
  throw new Error(
    "La capa no es válida."
  );
}

const sheetName =
  elements.sheetSelect?.value;

validateRaptorSheet(
  profileName,
  sheetName
);

entity.profile =
  profileName;

entity.position.x = x;
entity.position.y = y;
entity.scale = scale;
entity.layer = layer;

entity.mirror =
  elements.entityMirror?.checked === true;

setEntitySheet(
  entity,
  sheetName
);

pushHistory();

refreshSheetSelect(entity);
render();

showStatus(
  `Raptor "${entity.id}" actualizado.`,
  "success"
);

} catch (error) {
Object.assign(
entity,
oldState
);

showStatus(
  error.message,
  "error"
);

}
}

function addRaptor() {
if (!state.map) return;

const existingIds =
new Set(
state.map.entities.map(
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
raptorSheet: DEFAULT_RAPTOR_SHEET
};

validateRaptorSheet(
entity.profile,
entity.raptorSheet
);

state.map.entities.push(
entity
);

state.selectedEntityId =
entity.id;

pushHistory();

refreshEntityList();
refreshControls();
render();

showStatus(
"Se agregó "${entity.id}".",
"success"
);
}

function deleteSelectedEntity() {
if (!state.selectedEntityId) {
showStatus(
"No hay ningún Raptor seleccionado.",
"warning"
);
return;
}

const index =
state.map.entities.findIndex(
(entity) =>
entity.id ===
state.selectedEntityId
);

if (index === -1) return;

const removed =
state.map.entities[index];

state.map.entities.splice(
index,
1
);

const remaining =
getRaptorEntities();

state.selectedEntityId =
remaining.length > 0
? remaining[0].id
: null;

pushHistory();

refreshEntityList();
refreshControls();
render();

showStatus(
"Se eliminó "${removed.id}".",
"success"
);
}

function resetSelectedEntity() {
const entity =
getEntityById(
state.selectedEntityId
);

if (!entity) {
showStatus(
"No hay ningún Raptor seleccionado.",
"warning"
);
return;
}

entity.position = {
x: 100,
y: 100
};

entity.scale = 0.488;
entity.mirror = false;
entity.layer = 3;
entity.profile = "lateral";

setEntitySheet(
entity,
DEFAULT_RAPTOR_SHEET
);

pushHistory();

refreshControls();
render();

showStatus(
"Se restableció "${entity.id}".",
"success"
);
}

function renderBackground() {
const canvas =
elements.canvas;

const ctx =
canvas.getContext("2d");

const image =
state.backgroundImage;

if (!image) return;

const mapWidth =
Number(
state.map.background?.width
) ||
image.naturalWidth;

const mapHeight =
Number(
state.map.background?.height
) ||
image.naturalHeight;

const scale =
Math.min(
canvas.width / mapWidth,
canvas.height / mapHeight
);

const drawWidth =
mapWidth * scale;

const drawHeight =
mapHeight * scale;

const offsetX =
(canvas.width - drawWidth) / 2;

const offsetY =
(canvas.height - drawHeight) / 2;

state.renderScale = scale;
state.renderOffsetX = offsetX;
state.renderOffsetY = offsetY;

ctx.fillStyle = "#111";
ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

ctx.imageSmoothingEnabled = false;

ctx.drawImage(
image,
offsetX,
offsetY,
drawWidth,
drawHeight
);
}

function loadRaptorImage(sheetName) {
if (
state.raptorImages.has(sheetName)
) {
return Promise.resolve(
state.raptorImages.get(sheetName)
);
}

return new Promise(
(resolve, reject) => {
const image =
new Image();

  image.onload = () => {
    state.raptorImages.set(
      sheetName,
      image
    );

    resolve(image);
  };

  image.onerror = () => {
    reject(
      new Error(
        `No se pudo cargar "${sheetName}".`
      )
    );
  };

  image.src =
    `${RAPTOR_PATH}${sheetName}`;
}

);
}

function renderRaptor(
entity,
isSelected
) {
const ctx =
elements.canvas.getContext("2d");

const sheetName =
getEntitySheet(entity);

const profile =
RAPTOR_PROFILES[
entity.profile
];

if (!profile) return;

const image =
state.raptorImages.get(
sheetName
);

if (!image) return;

const source =
profile.source;

const scale =
Number.isFinite(entity.scale)
? entity.scale
: 1;

const width =
source.width * scale;

const height =
source.height * scale;

const x =
state.renderOffsetX +
entity.position.x *
state.renderScale;

const y =
state.renderOffsetY +
entity.position.y *
state.renderScale;

const drawWidth =
width *
state.renderScale;

const drawHeight =
height *
state.renderScale;

ctx.save();

ctx.imageSmoothingEnabled =
false;

if (entity.mirror) {
ctx.translate(
x + drawWidth,
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
  drawWidth,
  drawHeight
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
drawWidth,
drawHeight
);
}

ctx.restore();

if (isSelected) {
ctx.save();

ctx.strokeStyle = "#00ff88";
ctx.lineWidth = 2;

ctx.strokeRect(
  x,
  y,
  drawWidth,
  drawHeight
);

ctx.fillStyle = "#00ff88";
ctx.font = "12px monospace";

ctx.fillText(
  entity.id,
  x,
  Math.max(
    12,
    y - 5
  )
);

ctx.restore();

}
}

function renderEntities() {
const entities =
[...getRaptorEntities()];

entities.sort(
(a, b) => {
const layerA =
Number.isFinite(a.layer)
? a.layer
: 0;

  const layerB =
    Number.isFinite(b.layer)
      ? b.layer
      : 0;

  return layerA - layerB;
}

);

for (const entity of entities) {
renderRaptor(
entity,
entity.id ===
state.selectedEntityId
);
}
}

function render() {
if (!elements.canvas) return;

renderBackground();

if (!state.backgroundImage) {
const ctx =
elements.canvas.getContext(
"2d"
);

ctx.fillStyle = "#111";
ctx.fillRect(
  0,
  0,
  elements.canvas.width,
  elements.canvas.height
);

ctx.fillStyle = "#fff";
ctx.font = "18px monospace";
ctx.textAlign = "center";

ctx.fillText(
  "Cargando mapa...",
  elements.canvas.width / 2,
  elements.canvas.height / 2
);

ctx.textAlign = "left";

return;

}

renderEntities();
}

async function loadBackground() {
if (
!state.map?.background?.asset
) {
throw new Error(
"map-raptors.json no contiene background.asset."
);
}

return new Promise(
(resolve, reject) => {
const image =
new Image();

  image.onload = () => {
    state.backgroundImage =
      image;

    resolve(image);
  };

  image.onerror = () => {
    reject(
      new Error(
        `No se pudo cargar el fondo "${state.map.background.asset}".`
      )
    );
  };

  image.src =
    state.map.background.asset;
}

);
}

async function preloadRaptorImages() {
const sheets =
new Set();

for (const entity of getRaptorEntities()) {
const sheetName =
getEntitySheet(entity);

validateRaptorSheet(
  entity.profile,
  sheetName
);

sheets.add(
  sheetName
);

}

await Promise.all(
[...sheets].map(
(sheetName) =>
loadRaptorImage(
sheetName
)
)
);
}

function exportMap() {
if (!state.map) return;

const json =
JSON.stringify(
state.map,
null,
2
);

if (elements.jsonData) {
elements.jsonData.value =
json;
}

const blob =
new Blob(
[json],
{
type: "application/json"
}
);

const url =
URL.createObjectURL(
blob
);

const link =
document.createElement("a");

link.href = url;
link.download =
"map-raptors.json";

document.body.appendChild(
link
);

link.click();

link.remove();

URL.revokeObjectURL(
url
);

showStatus(
"map-raptors.json generado.",
"success"
);
}

async function copyMap() {
if (!state.map) return;

const json =
JSON.stringify(
state.map,
null,
2
);

if (elements.jsonData) {
elements.jsonData.value =
json;
}

try {
await navigator.clipboard.writeText(
json
);

showStatus(
  "JSON copiado al portapapeles.",
  "success"
);

} catch (error) {
showStatus(
"No se pudo copiar automáticamente. Puedes copiarlo desde el área JSON.",
"warning"
);
}
}

function importMap() {
if (!elements.jsonData) {
showStatus(
"No existe el área para importar JSON.",
"error"
);
return;
}

const raw =
elements.jsonData.value.trim();

if (!raw) {
showStatus(
"El área JSON está vacía.",
"warning"
);
return;
}

try {
const imported =
JSON.parse(raw);

validateMapDefinition(
  imported
);

state.map =
  imported;

state.selectedEntityId =
  getRaptorEntities()
    .at(0)?.id ?? null;

state.history = [];
state.historyIndex = -1;

pushHistory();

refreshEntityList();
refreshControls();

state.raptorImages.clear();

awaitPreloadAndRender();

showStatus(
  "Mapa de Raptors importado correctamente.",
  "success"
);

} catch (error) {
showStatus(
"Error al importar: ${error.message}",
"error"
);
}
}

async function awaitPreloadAndRender() {
try {
await preloadRaptorImages();
} catch (error) {
console.error(error);

showStatus(
  error.message,
  "error"
);

}

render();
}

function selectEntityAtCanvasPoint(
point
) {
const mapPoint =
mapPointFromCanvas(
point
);

const entities =
[...getRaptorEntities()];

entities.sort(
(a, b) => {
const layerA =
Number.isFinite(a.layer)
? a.layer
: 0;

  const layerB =
    Number.isFinite(b.layer)
      ? b.layer
      : 0;

  return layerB - layerA;
}

);

for (const entity of entities) {
if (
pointInsideEntity(
mapPoint,
entity
)
) {
selectEntity(
entity.id
);

  return entity;
}

}

return null;
}

function startDrag(event) {
const point =
getCanvasPoint(event);

const entity =
selectEntityAtCanvasPoint(
point
);

if (!entity) return;

const mapPoint =
mapPointFromCanvas(
point
);

state.dragging = true;

state.dragOffsetX =
mapPoint.x -
entity.position.x;

state.dragOffsetY =
mapPoint.y -
entity.position.y;

elements.canvas.setPointerCapture?.(
event.pointerId
);
}

function moveDrag(event) {
if (
!state.dragging ||
!state.selectedEntityId
) {
return;
}

const entity =
getEntityById(
state.selectedEntityId
);

if (!entity) return;

const point =
getCanvasPoint(event);

const mapPoint =
mapPointFromCanvas(
point
);

entity.position.x =
Math.round(
mapPoint.x -
state.dragOffsetX
);

entity.position.y =
Math.round(
mapPoint.y -
state.dragOffsetY
);

refreshControls();
render();
}

function endDrag(event) {
if (!state.dragging) return;

state.dragging = false;

elements.canvas.releasePointerCapture?.(
event.pointerId
);

pushHistory();

showStatus(
"Posición de "${state.selectedEntityId}" actualizada.",
"success"
);
}

function setupEvents() {
elements.entitySelect?.addEventListener(
"change",
(event) => {
selectEntity(
event.target.value
);
}
);

elements.applyEntity?.addEventListener(
"click",
applyEntityChanges
);

elements.addEntity?.addEventListener(
"click",
addRaptor
);

elements.deleteEntity?.addEventListener(
"click",
deleteSelectedEntity
);

elements.resetEntity?.addEventListener(
"click",
resetSelectedEntity
);

elements.exportJson?.addEventListener(
"click",
exportMap
);

elements.copyJson?.addEventListener(
"click",
copyMap
);

elements.importJson?.addEventListener(
"click",
importMap
);

elements.entityProfile?.addEventListener(
"change",
() => {
const entity =
getEntityById(
state.selectedEntityId
);

  if (!entity) return;

  refreshSheetSelect(
    entity
  );
}

);

elements.canvas?.addEventListener(
"pointerdown",
startDrag
);

elements.canvas?.addEventListener(
"pointermove",
moveDrag
);

elements.canvas?.addEventListener(
"pointerup",
endDrag
);

elements.canvas?.addEventListener(
"pointercancel",
endDrag
);

document.addEventListener(
"keydown",
(event) => {
const target =
event.target;

  const isTyping =
    target instanceof
      HTMLInputElement ||
    target instanceof
      HTMLTextAreaElement ||
    target instanceof
      HTMLSelectElement;

  if (isTyping) return;

  if (
    event.ctrlKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z"
  ) {
    event.preventDefault();
    undo();
  }

  if (
    event.ctrlKey &&
    event.shiftKey &&
    event.key.toLowerCase() === "z"
  ) {
    event.preventDefault();
    redo();
  }
}

);
}

async function loadMap() {
showStatus(
"Cargando mapa de Raptors..."
);

const response =
await fetch(
MAP_URL,
{
cache: "no-store"
}
);

if (!response.ok) {
throw new Error(
"No se pudo cargar ${MAP_URL} (HTTP ${response.status})."
);
}

const map =
await response.json();

validateMapDefinition(
map
);

state.map =
map;

state.selectedEntityId =
getRaptorEntities()
.at(0)?.id ?? null;

state.history = [];
state.historyIndex = -1;

pushHistory();

refreshEntityList();
refreshControls();

await loadBackground();
await preloadRaptorImages();

render();

showStatus(
"Editor de Raptors listo.",
"success"
);
}

async function initialize() {
if (!elements.canvas) {
throw new Error(
"No se encontró #editor-canvas."
);
}

elements.canvas.width = 1280;
elements.canvas.height = 720;

setupEvents();

try {
await loadMap();
} catch (error) {
console.error(error);

showStatus(
  `Error: ${error.message}`,
  "error"
);

const ctx =
  elements.canvas.getContext(
    "2d"
  );

ctx.fillStyle = "#111";
ctx.fillRect(
  0,
  0,
  elements.canvas.width,
  elements.canvas.height
);

ctx.fillStyle = "#f44";
ctx.font = "18px monospace";
ctx.textAlign = "center";

ctx.fillText(
  error.message,
  elements.canvas.width / 2,
  elements.canvas.height / 2
);

ctx.textAlign = "left";

}
}

initialize();
