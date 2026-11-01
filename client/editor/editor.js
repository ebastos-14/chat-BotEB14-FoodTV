import {
RAPTOR_PATH,
RAPTOR_PROFILES,
RAPTOR_SHEETS,
isRaptorSheetAllowed
} from "../js/config/raptors.js";

const MAP_URL = "/assets/restaurant/map.json";

const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const spritePreview = document.querySelector("#sprite-preview");
const spritePreviewCtx = spritePreview.getContext("2d");

const statusElement = document.querySelector("#editor-status");
const messageElement = document.querySelector("#editor-message");
const elementList = document.querySelector("#element-list");

const elementId = document.querySelector("#element-id");
const elementType = document.querySelector("#element-type");
const elementProfile = document.querySelector("#element-profile");
const elementSheet = document.querySelector("#element-sheet");
const elementX = document.querySelector("#element-x");
const elementY = document.querySelector("#element-y");
const elementScale = document.querySelector("#element-scale");
const elementLayer = document.querySelector("#element-layer");
const elementMirror = document.querySelector("#element-mirror");

const applyButton = document.querySelector("#apply-element");
const deleteButton = document.querySelector("#delete-element");
const resetButton = document.querySelector("#reset-element");

const reloadButton = document.querySelector("#reload-map");
const exportButton = document.querySelector("#export-json");
const copyButton = document.querySelector("#copy-json");

const jsonOutput = document.querySelector("#json-output");

let mapDefinition = null;
let selectedEntityId = null;

const raptorImages = new Map();

const imageCache = new Map();

function setStatus(text) {
statusElement.textContent = text;
}

function setMessage(text, isError = false) {
messageElement.textContent = text;
messageElement.classList.toggle("error", isError);
}

function deepClone(value) {
return JSON.parse(JSON.stringify(value));
}

async function loadMap() {
try {
setStatus("Cargando mapa...");
setMessage("");

const response = await fetch(
  `${MAP_URL}?t=${Date.now()}`
);

if (!response.ok) {
  throw new Error(
    `No se pudo cargar map.json (${response.status}).`
  );
}

const data = await response.json();

validateMap(data);

mapDefinition = data;

canvas.width = mapDefinition.background.width;
canvas.height = mapDefinition.background.height;

await preloadRaptorImages();

render();
renderElementList();

if (mapDefinition.entities.length > 0) {
  selectEntity(mapDefinition.entities[0].id);
} else {
  clearSelection();
}

setStatus(
  `${mapDefinition.entities.length} elementos`
);

setMessage("Mapa cargado correctamente.");

} catch (error) {
console.error(error);

setStatus("Error");

setMessage(
  error.message || "No se pudo cargar el mapa.",
  true
);

}
}

function validateMap(data) {
if (!data || typeof data !== "object") {
throw new Error("El mapa no es un objeto JSON válido.");
}

if (!data.background) {
throw new Error(
"El mapa no contiene background."
);
}

if (
!Number.isFinite(data.background.width) ||
!Number.isFinite(data.background.height)
) {
throw new Error(
"El tamaño del background no es válido."
);
}

if (!Array.isArray(data.entities)) {
throw new Error(
"El mapa no contiene un array entities."
);
}

const ids = new Set();

for (const entity of data.entities) {
validateEntity(entity);

if (ids.has(entity.id)) {
  throw new Error(
    `ID duplicado: "${entity.id}".`
  );
}

ids.add(entity.id);

}
}

function validateEntity(entity) {
if (!entity || typeof entity !== "object") {
throw new Error(
"Existe una entidad inválida."
);
}

if (!entity.id || typeof entity.id !== "string") {
throw new Error(
"Una entidad no tiene un ID válido."
);
}

if (entity.type !== "raptor") {
throw new Error(
"Tipo no soportado en el editor: "${entity.type}"."
);
}

if (!RAPTOR_PROFILES[entity.profile]) {
throw new Error(
"Perfil inválido en "${entity.id}": "${entity.profile}"."
);
}

if (!RAPTOR_SHEETS.includes(entity.sheet)) {
throw new Error(
"Spritesheet inválido en "${entity.id}": "${entity.sheet}"."
);
}

if (
!isRaptorSheetAllowed(
entity.profile,
entity.sheet
)
) {
throw new Error(
"El spritesheet "${entity.sheet}" no está permitido para el perfil "${entity.profile}" en "${entity.id}"."
);
}

if (
!entity.position ||
!Number.isFinite(entity.position.x) ||
!Number.isFinite(entity.position.y)
) {
throw new Error(
"La posición de "${entity.id}" no es válida."
);
}

if (
!Number.isFinite(entity.scale) ||
entity.scale <= 0
) {
throw new Error(
"La escala de "${entity.id}" no es válida."
);
}

if (!Number.isFinite(entity.layer)) {
throw new Error(
"El layer de "${entity.id}" no es válido."
);
}

if (typeof entity.mirror !== "boolean") {
throw new Error(
"Mirror de "${entity.id}" debe ser true o false."
);
}
}

async function preloadRaptorImages() {
const sheets = new Set();

for (const entity of mapDefinition.entities) {
if (entity.type === "raptor") {
sheets.add(entity.sheet);
}
}

for (const sheetName of sheets) {
await loadRaptorImage(sheetName);
}
}

function loadRaptorImage(sheetName) {
if (raptorImages.has(sheetName)) {
return Promise.resolve(
raptorImages.get(sheetName)
);
}

if (imageCache.has(sheetName)) {
return imageCache.get(sheetName);
}

const promise = new Promise((resolve, reject) => {
const image = new Image();

image.onload = () => {
  raptorImages.set(sheetName, image);
  resolve(image);
};

image.onerror = () => {
  reject(
    new Error(
      `No se pudo cargar ${sheetName}.`
    )
  );
};

image.src = `${RAPTOR_PATH}${sheetName}`;

});

imageCache.set(sheetName, promise);

return promise;
}

function render() {
if (!mapDefinition) {
return;
}

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

drawBackground();
drawEntities();
}

function drawBackground() {
const image = getBackgroundImage();

if (!image) {
return;
}

ctx.imageSmoothingEnabled = false;

ctx.drawImage(
image,
0,
0,
canvas.width,
canvas.height
);
}

function getBackgroundImage() {
const key = "map-background";

if (imageCache.has(key)) {
const cached = imageCache.get(key);

if (cached instanceof HTMLImageElement) {
  return cached;
}

}

const image = new Image();

image.onload = () => {
imageCache.set(key, image);
render();
};

image.onerror = () => {
setMessage(
"No se pudo cargar el fondo del mapa.",
true
);
};

image.src = mapDefinition.background.asset;

imageCache.set(key, image);

return null;
}

function drawEntities() {
const entities = [...mapDefinition.entities];

entities.sort(
(a, b) => a.layer - b.layer
);

for (const entity of entities) {
drawEntity(entity);
}
}

function drawEntity(entity) {
if (entity.type !== "raptor") {
return;
}

const image = raptorImages.get(
entity.sheet
);

if (!image) {
return;
}

const profile =
RAPTOR_PROFILES[entity.profile];

if (!profile) {
return;
}

const source = profile.source;

const width =
source.width * entity.scale;

const height =
source.height * entity.scale;

const x = entity.position.x;
const y = entity.position.y;

ctx.save();

ctx.imageSmoothingEnabled = false;

if (entity.mirror) {
ctx.translate(
x + width,
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

if (entity.id === selectedEntityId) {
drawSelectionBox(
x,
y,
width,
height
);
}

ctx.restore();
}

function drawSelectionBox(
x,
y,
width,
height
) {
ctx.save();

ctx.strokeStyle = "#ffffff";
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

function renderElementList() {
elementList.innerHTML = "";

if (!mapDefinition) {
return;
}

const entities = [...mapDefinition.entities];

entities.sort(
(a, b) => a.layer - b.layer
);

for (const entity of entities) {
const item = document.createElement("div");

item.className = "element-item";

if (entity.id === selectedEntityId) {
  item.classList.add("selected");
}

item.innerHTML = `
  <strong>${escapeHtml(entity.id)}</strong>
  <span>
    ${escapeHtml(entity.profile)}
    · ${escapeHtml(entity.sheet)}
    · layer ${entity.layer}
  </span>
`;

item.addEventListener(
  "click",
  () => {
    selectEntity(entity.id);
  }
);

elementList.appendChild(item);

}
}

function selectEntity(id) {
if (!mapDefinition) {
return;
}

const entity =
mapDefinition.entities.find(
(item) => item.id === id
);

if (!entity) {
return;
}

selectedEntityId = entity.id;

elementId.value = entity.id;
elementType.value = entity.type;
elementProfile.value = entity.profile;
elementSheet.value = entity.sheet;

elementX.value =
entity.position.x;

elementY.value =
entity.position.y;

elementScale.value =
entity.scale;

elementLayer.value =
entity.layer;

elementMirror.checked =
entity.mirror;

updateSheetOptions();
updateSpritePreview();

renderElementList();
render();
}

function clearSelection() {
selectedEntityId = null;

elementId.value = "";
elementX.value = "";
elementY.value = "";
elementScale.value = "";
elementLayer.value = "";
elementMirror.checked = false;

renderElementList();
render();
}

function updateSheetOptions() {
const profileName =
elementProfile.value;

const profile =
RAPTOR_PROFILES[profileName];

if (!profile) {
return;
}

const currentSheet =
elementSheet.value;

elementSheet.innerHTML = "";

for (const sheetName of profile.allowedSheets) {
const option =
document.createElement("option");

option.value = sheetName;
option.textContent = sheetName;

elementSheet.appendChild(option);

}

if (
profile.allowedSheets.includes(
currentSheet
)
) {
elementSheet.value = currentSheet;
} else {
elementSheet.value =
profile.allowedSheets[0];
}

updateSpritePreview();
}

function updateSpritePreview() {
const sheetName =
elementSheet.value;

const profileName =
elementProfile.value;

const profile =
RAPTOR_PROFILES[profileName];

spritePreviewCtx.clearRect(
0,
0,
spritePreview.width,
spritePreview.height
);

if (!profile || !sheetName) {
return;
}

const image =
raptorImages.get(sheetName);

if (!image) {
loadRaptorImage(sheetName)
.then(() => {
updateSpritePreview();
})
.catch((error) => {
console.error(error);
});

return;

}

const source = profile.source;

const scale = Math.min(
(spritePreview.width - 20) /
source.width,

(spritePreview.height - 20) /
  source.height

);

const width =
source.width * scale;

const height =
source.height * scale;

const x =
(spritePreview.width - width) / 2;

const y =
(spritePreview.height - height) / 2;

spritePreviewCtx.imageSmoothingEnabled = false;

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

function applyChanges() {
if (!mapDefinition || !selectedEntityId) {
setMessage(
"Seleccione una ubicación primero.",
true
);

return;

}

const entity =
mapDefinition.entities.find(
(item) => item.id === selectedEntityId
);

if (!entity) {
setMessage(
"No se encontró la ubicación seleccionada.",
true
);

return;

}

const newId =
elementId.value.trim();

const profile =
elementProfile.value;

const sheet =
elementSheet.value;

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

if (!newId) {
setMessage(
"El ID no puede estar vacío.",
true
);

return;

}

if (
mapDefinition.entities.some(
(item) =>
item.id === newId &&
item !== entity
)
) {
setMessage(
"El ID "${newId}" ya existe.",
true
);

return;

}

if (!RAPTOR_PROFILES[profile]) {
setMessage(
"El perfil seleccionado no es válido.",
true
);

return;

}

if (!isRaptorSheetAllowed(profile, sheet)) {
setMessage(
""${sheet}" no está permitido para el perfil "${profile}".",
true
);

return;

}

if (!Number.isFinite(x) || !Number.isFinite(y)) {
setMessage(
"La posición X/Y no es válida.",
true
);

return;

}

if (!Number.isFinite(scale) || scale <= 0) {
setMessage(
"La escala debe ser mayor que cero.",
true
);

return;

}

if (!Number.isFinite(layer)) {
setMessage(
"El layer no es válido.",
true
);

return;

}

entity.id = newId;
entity.profile = profile;
entity.sheet = sheet;

entity.position = {
x,
y
};

entity.scale = scale;
entity.layer = layer;
entity.mirror = mirror;

selectedEntityId = newId;

loadRaptorImage(sheet)
.then(() => {
render();
updateSpritePreview();
})
.catch((error) => {
console.error(error);
});

renderElementList();
render();

setMessage(
"Se actualizó "${newId}"."
);
}

function deleteSelectedEntity() {
if (!mapDefinition || !selectedEntityId) {
setMessage(
"Seleccione una ubicación primero.",
true
);

return;

}

const index =
mapDefinition.entities.findIndex(
(entity) =>
entity.id === selectedEntityId
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

selectedEntityId = null;

clearSelection();

setStatus(
"${mapDefinition.entities.length} elementos"
);

setMessage(
"Se eliminó "${deletedId}"."
);
}

function resetSelectedEntity() {
if (!mapDefinition || !selectedEntityId) {
return;
}

selectEntity(selectedEntityId);

setMessage(
"Se restauraron los valores del elemento."
);
}

function exportJson() {
if (!mapDefinition) {
return;
}

const output =
JSON.stringify(
mapDefinition,
null,
2
);

jsonOutput.value = output;

setMessage(
"JSON generado correctamente."
);
}

async function copyJson() {
if (!mapDefinition) {
return;
}

const output =
JSON.stringify(
mapDefinition,
null,
2
);

jsonOutput.value = output;

try {
await navigator.clipboard.writeText(
output
);

setMessage(
  "JSON copiado al portapapeles."
);

} catch (error) {
console.error(error);

setMessage(
  "No se pudo copiar automáticamente. Puede copiarlo desde el cuadro de texto.",
  true
);

}
}

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

elementProfile.addEventListener(
"change",
() => {
updateSheetOptions();
}
);

elementSheet.addEventListener(
"change",
() => {
updateSpritePreview();
}
);

applyButton.addEventListener(
"click",
applyChanges
);

deleteButton.addEventListener(
"click",
deleteSelectedEntity
);

resetButton.addEventListener(
"click",
resetSelectedEntity
);

reloadButton.addEventListener(
"click",
loadMap
);

exportButton.addEventListener(
"click",
exportJson
);

copyButton.addEventListener(
"click",
copyJson
);

canvas.addEventListener(
"pointerdown",
(event) => {
if (!mapDefinition) {
return;
}

const rect =
  canvas.getBoundingClientRect();

const scaleX =
  canvas.width / rect.width;

const scaleY =
  canvas.height / rect.height;

const x =
  (event.clientX - rect.left) *
  scaleX;

const y =
  (event.clientY - rect.top) *
  scaleY;

const entities =
  [...mapDefinition.entities]
    .sort(
      (a, b) =>
        b.layer - a.layer
    );

for (const entity of entities) {
  if (entity.type !== "raptor") {
    continue;
  }

  const profile =
    RAPTOR_PROFILES[
      entity.profile
    ];

  if (!profile) {
    continue;
  }

  const width =
    profile.source.width *
    entity.scale;

  const height =
    profile.source.height *
    entity.scale;

  const inside =
    x >= entity.position.x &&
    x <= entity.position.x + width &&
    y >= entity.position.y &&
    y <= entity.position.y + height;

  if (inside) {
    selectEntity(entity.id);
    return;
  }
}

}
);

loadMap();
