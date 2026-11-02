const MAP_URL = "/assets/restaurant/map.json";
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

const state = {
map: null,
selectedId: null,
selectedSheet: null,
dragging: false,
dragOffsetX: 0,
dragOffsetY: 0,
backgroundImage: null,
raptorImages: new Map()
};

const canvas = document.querySelector("#editor-canvas");
const statusElement = document.querySelector("#editor-status");

if (!canvas) {
throw new Error("No se encontró #editor-canvas.");
}

const ctx = canvas.getContext("2d");

if (!ctx) {
throw new Error("No se pudo obtener el contexto 2D del editor.");
}

function setStatus(message, type = "info") {
if (!statusElement) return;

statusElement.textContent = message;
statusElement.dataset.type = type;
}

function showFatalError(error) {
console.error(error);

const message =
error instanceof Error
? error.message
: String(error);

setStatus("Error: ${message}", "error");

const loading = document.querySelector("#editor-loading");
if (loading) {
loading.textContent = "Error al cargar el editor.";
loading.classList.add("error");
}
}

async function loadJson(url) {
const response = await fetch(url, {
cache: "no-store"
});

if (!response.ok) {
throw new Error(
"No se pudo cargar ${url}. HTTP ${response.status}."
);
}

return response.json();
}

function validateMap(map) {
if (!map || typeof map !== "object") {
throw new Error("El mapa no contiene un objeto JSON válido.");
}

if (!map.background || typeof map.background !== "object") {
throw new Error("El mapa no contiene background.");
}

if (!map.background.asset) {
throw new Error("El mapa no tiene background.asset.");
}

if (!Array.isArray(map.entities)) {
throw new Error("El mapa no contiene entities.");
}

const ids = new Set();

for (const entity of map.entities) {
if (!entity.id) {
throw new Error("Existe una entidad sin id.");
}

if (ids.has(entity.id)) {
  throw new Error(`ID duplicado: ${entity.id}`);
}

ids.add(entity.id);

if (!entity.position) {
  throw new Error(
    `La entidad "${entity.id}" no tiene position.`
  );
}

if (entity.type === "raptor") {
  if (!RAPTOR_PROFILES[entity.profile]) {
    throw new Error(
      `Perfil de Raptor desconocido: ${entity.profile}`
    );
  }
}

}

return true;
}

function getSelectedEntity() {
if (!state.map || !state.selectedId) {
return null;
}

return (
state.map.entities.find(
(entity) => entity.id === state.selectedId
) ?? null
);
}

function getSelectedProfile() {
const entity = getSelectedEntity();

if (!entity || entity.type !== "raptor") {
return null;
}

return RAPTOR_PROFILES[entity.profile] ?? null;
}

function ensureRaptorImage(sheetName) {
if (!sheetName) return null;

if (state.raptorImages.has(sheetName)) {
return state.raptorImages.get(sheetName);
}

const image = new Image();

image.onload = () => {
state.raptorImages.set(sheetName, image);
render();
};

image.onerror = () => {
console.error(
"No se pudo cargar el Raptor: ${sheetName}"
);

setStatus(
  `No se pudo cargar ${sheetName}.`,
  "error"
);

};

image.src = "${RAPTOR_PATH}${sheetName}";

return image;
}

function loadBackground() {
return new Promise((resolve, reject) => {
const image = new Image();

image.onload = () => {
  state.backgroundImage = image;
  resolve(image);
};

image.onerror = () => {
  reject(
    new Error(
      `No se pudo cargar el fondo: ${state.map.background.asset}`
    )
  );
};

image.src = state.map.background.asset;

});
}

function getMapScale() {
if (!state.map || !state.backgroundImage) {
return 1;
}

const mapWidth =
Number(state.map.background.width) ||
state.backgroundImage.naturalWidth;

const mapHeight =
Number(state.map.background.height) ||
state.backgroundImage.naturalHeight;

const scaleX = canvas.width / mapWidth;
const scaleY = canvas.height / mapHeight;

return Math.min(scaleX, scaleY);
}

function getMapOffset() {
if (!state.map || !state.backgroundImage) {
return {
x: 0,
y: 0
};
}

const mapWidth =
Number(state.map.background.width) ||
state.backgroundImage.naturalWidth;

const mapHeight =
Number(state.map.background.height) ||
state.backgroundImage.naturalHeight;

const scale = getMapScale();

return {
x: (canvas.width - mapWidth * scale) / 2,
y: (canvas.height - mapHeight * scale) / 2
};
}

function screenToMap(clientX, clientY) {
const rect = canvas.getBoundingClientRect();

const screenX =
(clientX - rect.left) *
(canvas.width / rect.width);

const screenY =
(clientY - rect.top) *
(canvas.height / rect.height);

const scale = getMapScale();
const offset = getMapOffset();

return {
x: (screenX - offset.x) / scale,
y: (screenY - offset.y) / scale
};
}

function renderBackground() {
if (!state.backgroundImage) return;

const image = state.backgroundImage;

const mapWidth =
Number(state.map.background.width) ||
image.naturalWidth;

const mapHeight =
Number(state.map.background.height) ||
image.naturalHeight;

const scale = getMapScale();
const offset = getMapOffset();

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
offset.x,
offset.y,
mapWidth * scale,
mapHeight * scale
);
}

function renderRaptor(entity) {
const profile = RAPTOR_PROFILES[entity.profile];

if (!profile) return;

const sheetName =
entity._runtimeSheet ||
profile.allowedSheets[0];

if (!sheetName) return;

const image = ensureRaptorImage(sheetName);

if (!image || !image.complete) {
return;
}

const source = profile.source;

const scale =
Number.isFinite(entity.scale)
? entity.scale
: 1;

const width = source.width * scale;
const height = source.height * scale;

const mapX =
Number(entity.position?.x) || 0;

const mapY =
Number(entity.position?.y) || 0;

const mapScale = getMapScale();
const offset = getMapOffset();

const x = offset.x + mapX * mapScale;
const y = offset.y + mapY * mapScale;

const drawWidth = width * mapScale;
const drawHeight = height * mapScale;

ctx.save();

ctx.imageSmoothingEnabled = false;

if (entity.mirror) {
ctx.translate(
x + drawWidth,
y
);

ctx.scale(-1, 1);

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

if (state.selectedId === entity.id) {
ctx.strokeStyle = "#00ff88";
ctx.lineWidth = 2;

ctx.strokeRect(
  x,
  y,
  drawWidth,
  drawHeight
);

}

ctx.restore();
}

function renderEntities() {
const entities = [
...(state.map.entities ?? [])
];

entities.sort(
(a, b) =>
(Number(a.layer) || 0) -
(Number(b.layer) || 0)
);

for (const entity of entities) {
if (entity.type === "raptor") {
renderRaptor(entity);
}
}
}

function render() {
ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

if (!state.map) return;

renderBackground();
renderEntities();
}

function updateEntityControls() {
const entity = getSelectedEntity();

const idInput =
document.querySelector("#entity-id");

const typeInput =
document.querySelector("#entity-type");

const profileInput =
document.querySelector("#raptor-profile");

const sheetInput =
document.querySelector("#raptor-sheet");

const xInput =
document.querySelector("#entity-x");

const yInput =
document.querySelector("#entity-y");

const scaleInput =
document.querySelector("#entity-scale");

const mirrorInput =
document.querySelector("#entity-mirror");

const layerInput =
document.querySelector("#entity-layer");

if (!entity) {
return;
}

if (idInput) idInput.value = entity.id;
if (typeInput) typeInput.value = entity.type;
if (profileInput) {
profileInput.value =
entity.profile || "";
}

if (xInput) {
xInput.value =
Number(entity.position?.x) || 0;
}

if (yInput) {
yInput.value =
Number(entity.position?.y) || 0;
}

if (scaleInput) {
scaleInput.value =
Number(entity.scale) || 1;
}

if (mirrorInput) {
mirrorInput.checked =
Boolean(entity.mirror);
}

if (layerInput) {
layerInput.value =
Number(entity.layer) || 0;
}

updateRaptorSheetOptions(
entity._runtimeSheet
);
}

function updateRaptorSheetOptions(selectedSheet) {
const select =
document.querySelector("#raptor-sheet");

if (!select) return;

select.innerHTML = "";

const profile = getSelectedProfile();

if (!profile) return;

for (const sheetName of profile.allowedSheets) {
const option =
document.createElement("option");

option.value = sheetName;
option.textContent = sheetName;

if (
  sheetName === selectedSheet ||
  (
    !selectedSheet &&
    sheetName === profile.allowedSheets[0]
  )
) {
  option.selected = true;
}

select.appendChild(option);

}
}

function applyControls() {
const entity = getSelectedEntity();

if (!entity) {
setStatus(
"Selecciona primero una entidad.",
"error"
);
return;
}

const profileInput =
document.querySelector("#raptor-profile");

const sheetInput =
document.querySelector("#raptor-sheet");

const xInput =
document.querySelector("#entity-x");

const yInput =
document.querySelector("#entity-y");

const scaleInput =
document.querySelector("#entity-scale");

const mirrorInput =
document.querySelector("#entity-mirror");

const layerInput =
document.querySelector("#entity-layer");

if (entity.type === "raptor") {
const profile =
profileInput?.value;

if (!RAPTOR_PROFILES[profile]) {
  setStatus(
    "Perfil de Raptor no válido.",
    "error"
  );
  return;
}

entity.profile = profile;

const allowed =
  RAPTOR_PROFILES[profile].allowedSheets;

const selectedSheet =
  sheetInput?.value;

if (!allowed.includes(selectedSheet)) {
  entity._runtimeSheet =
    allowed[0];
} else {
  entity._runtimeSheet =
    selectedSheet;
}

}

const x = Number(xInput?.value);
const y = Number(yInput?.value);
const scale = Number(scaleInput?.value);
const layer = Number(layerInput?.value);

if (!Number.isFinite(x) || !Number.isFinite(y)) {
setStatus(
"X e Y deben ser números.",
"error"
);
return;
}

if (!Number.isFinite(scale) || scale <= 0) {
setStatus(
"La escala debe ser mayor que 0.",
"error"
);
return;
}

if (!Number.isFinite(layer)) {
setStatus(
"La capa debe ser un número.",
"error"
);
return;
}

entity.position.x = x;
entity.position.y = y;
entity.scale = scale;
entity.layer = layer;
entity.mirror =
Boolean(mirrorInput?.checked);

render();

setStatus(
"Entidad "${entity.id}" actualizada.",
"success"
);
}

function selectEntity(id) {
state.selectedId = id;

const entity = getSelectedEntity();

if (entity) {
updateEntityControls();
setStatus(
"Seleccionado: ${entity.id}",
"info"
);
}

render();
}

function findEntityAt(mapX, mapY) {
const entities = [
...(state.map.entities ?? [])
];

entities.sort(
(a, b) =>
(Number(b.layer) || 0) -
(Number(a.layer) || 0)
);

for (const entity of entities) {
if (entity.type !== "raptor") continue;

const profile =
  RAPTOR_PROFILES[entity.profile];

if (!profile) continue;

const scale =
  Number(entity.scale) || 1;

const width =
  profile.source.width * scale;

const height =
  profile.source.height * scale;

const x =
  Number(entity.position?.x) || 0;

const y =
  Number(entity.position?.y) || 0;

if (
  mapX >= x &&
  mapX <= x + width &&
  mapY >= y &&
  mapY <= y + height
) {
  return entity;
}

}

return null;
}

function handlePointerDown(event) {
if (!state.map) return;

const point =
screenToMap(
event.clientX,
event.clientY
);

const entity =
findEntityAt(
point.x,
point.y
);

if (!entity) {
state.selectedId = null;
render();
return;
}

selectEntity(entity.id);

state.dragging = true;

state.dragOffsetX =
point.x -
entity.position.x;

state.dragOffsetY =
point.y -
entity.position.y;

canvas.setPointerCapture(
event.pointerId
);
}

function handlePointerMove(event) {
if (
!state.dragging ||
!state.selectedId
) {
return;
}

const entity =
getSelectedEntity();

if (!entity) return;

const point =
screenToMap(
event.clientX,
event.clientY
);

entity.position.x =
Math.round(
point.x -
state.dragOffsetX
);

entity.position.y =
Math.round(
point.y -
state.dragOffsetY
);

updateEntityControls();
render();
}

function handlePointerUp(event) {
state.dragging = false;

try {
canvas.releasePointerCapture(
event.pointerId
);
} catch {
// No hay captura activa.
}
}

function exportMap() {
if (!state.map) return;

const cleanMap =
JSON.parse(
JSON.stringify(state.map)
);

for (const entity of cleanMap.entities ?? []) {
delete entity._runtimeSheet;
delete entity.source;
delete entity.sheet;
}

const json =
JSON.stringify(
cleanMap,
null,
2
);

downloadTextFile(
"map.json",
json
);

setStatus(
"map.json exportado.",
"success"
);
}

async function copyMapJson() {
if (!state.map) return;

const cleanMap =
JSON.parse(
JSON.stringify(state.map)
);

for (const entity of cleanMap.entities ?? []) {
delete entity._runtimeSheet;
delete entity.source;
delete entity.sheet;
}

const json =
JSON.stringify(
cleanMap,
null,
2
);

try {
await navigator.clipboard.writeText(
json
);

setStatus(
  "map.json copiado al portapapeles.",
  "success"
);

} catch (error) {
console.error(error);

setStatus(
  "No se pudo copiar automáticamente. Usa Exportar mapa.",
  "error"
);

}
}

function downloadTextFile(filename, content) {
const blob =
new Blob(
[content],
{
type: "application/json;charset=utf-8"
}
);

const url =
URL.createObjectURL(blob);

const link =
document.createElement("a");

link.href = url;
link.download = filename;
link.click();

URL.revokeObjectURL(url);
}

function bindEvents() {
canvas.addEventListener(
"pointerdown",
handlePointerDown
);

canvas.addEventListener(
"pointermove",
handlePointerMove
);

canvas.addEventListener(
"pointerup",
handlePointerUp
);

canvas.addEventListener(
"pointercancel",
handlePointerUp
);

document
.querySelector("#apply-entity")
?.addEventListener(
"click",
applyControls
);

document
.querySelector("#export-map")
?.addEventListener(
"click",
exportMap
);

document
.querySelector("#copy-map")
?.addEventListener(
"click",
copyMapJson
);

document
.querySelector("#raptor-profile")
?.addEventListener(
"change",
() => {
const entity =
getSelectedEntity();

    if (!entity) return;

    updateRaptorSheetOptions();

    const sheetSelect =
      document.querySelector(
        "#raptor-sheet"
      );

    if (sheetSelect) {
      entity.profile =
        document.querySelector(
          "#raptor-profile"
        ).value;

      entity._runtimeSheet =
        sheetSelect.value;
    }

    render();
  }
);

document
.querySelector("#raptor-sheet")
?.addEventListener(
"change",
() => {
const entity =
getSelectedEntity();

    if (!entity) return;

    entity._runtimeSheet =
      document.querySelector(
        "#raptor-sheet"
      ).value;

    render();
  }
);

}

function populateEntityList() {
const select =
document.querySelector(
"#entity-select"
);

if (!select) return;

select.innerHTML = "";

for (const entity of state.map.entities ?? []) {
const option =
document.createElement("option");

option.value = entity.id;
option.textContent =
  `${entity.id} — ${entity.type}`;

select.appendChild(option);

}

select.addEventListener(
"change",
() => {
selectEntity(select.value);
}
);

if (state.map.entities.length > 0) {
select.value =
state.map.entities[0].id;

selectEntity(
  state.map.entities[0].id
);

}
}

async function initialize() {
setStatus(
"Cargando mapa...",
"info"
);

state.map =
await loadJson(MAP_URL);

validateMap(state.map);

await loadBackground();

for (const entity of state.map.entities ?? []) {
if (
entity.type === "raptor" &&
!entity._runtimeSheet
) {
const profile =
RAPTOR_PROFILES[entity.profile];

  if (profile) {
    entity._runtimeSheet =
      profile.allowedSheets[0];
  }
}

}

populateEntityList();
bindEvents();
render();

const loading =
document.querySelector(
"#editor-loading"
);

if (loading) {
loading.style.display = "none";
}

setStatus(
"Editor cargado correctamente.",
"success"
);
}

initialize().catch(showFatalError);
