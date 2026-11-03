const MAP_URL = "/assets/food/map-food.json";
const BACKGROUND_URL = "/assets/restaurant/map-background.png";
const MENU_SHEET_URL = "/assets/food/Menu_Bolsa.png";

const FOOD_SHEETS = {
taco: "Menu_Taco.png",
hamburguesa: "Menu_Hamburguesa.png",
burrito: "Menu_Burrito.png",
hotdog: "Menu_Hotdog.png",
sushi: "Menu_Sushi.png",
pizza: "Menu_Pizza.png",
sandwich: "Menu_Sandwich.png"
};

const DRINK_SHEET = "Menu_Bebida.png";
const BAG_SHEET = "Menu_Bolsa.png";

const state = {
map: null,
selectedId: null,
selectedSection: 1,

background: new Image(),
menuSheet: new Image(),

itemImages: new Map(),

renderScale: 1,
renderOffsetX: 0,
renderOffsetY: 0,

dragging: false,
dragOffsetX: 0,
dragOffsetY: 0
};

const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const statusElement = document.querySelector("#editor-status");

const entitySelect = document.querySelector("#entity-select");
const foodType = document.querySelector("#food-type");
const sheetSelect = document.querySelector("#sheet-select");
const sectionSelect = document.querySelector("#section-select");

const sourceX = document.querySelector("#source-x");
const sourceY = document.querySelector("#source-y");
const sourceWidth = document.querySelector("#source-width");
const sourceHeight = document.querySelector("#source-height");

const entityX = document.querySelector("#entity-x");
const entityY = document.querySelector("#entity-y");
const entityScale = document.querySelector("#entity-scale");
const entityLayer = document.querySelector("#entity-layer");

const jsonData = document.querySelector("#json-data");

function setStatus(message, isError = false) {
if (!statusElement) return;

statusElement.textContent = message;

statusElement.dataset.error = isError
? "true"
: "false";
}

async function loadMap() {
setStatus("Cargando mapa...");

const response = await fetch(MAP_URL, {
cache: "no-store"
});

if (!response.ok) {
throw new Error(
"No se pudo cargar ${MAP_URL}. HTTP ${response.status}."
);
}

const map = await response.json();

validateMap(map);

state.map = map;

await Promise.all([
loadImage(
state.background,
BACKGROUND_URL
),
loadImage(
state.menuSheet,
MENU_SHEET_URL
)
]);

await preloadItemImages();

buildEntitySelect();

if (state.map.entities.length > 0) {
const firstEditableEntity =
state.map.entities.find(
(entity) =>
entity.type === "food" ||
entity.type === "drink" ||
entity.type === "bag"
);

if (firstEditableEntity) {
  selectEntity(firstEditableEntity.id);
}

}

updateJson();

setStatus("Editor Food listo.");

render();
}

function validateMap(map) {
if (!map || typeof map !== "object") {
throw new Error(
"map-food.json no contiene un objeto válido."
);
}

if (map.module !== "food") {
throw new Error(
'map-food.json debe tener "module": "food".'
);
}

if (!Array.isArray(map.entities)) {
throw new Error(
'map-food.json debe contener "entities".'
);
}

const ids = new Set();

for (const entity of map.entities) {
if (!entity.id) {
throw new Error(
"Existe una entidad sin ID."
);
}

if (ids.has(entity.id)) {
  throw new Error(
    `ID duplicado: "${entity.id}".`
  );
}

ids.add(entity.id);

if (
  ![
    "menu",
    "food",
    "drink",
    "bag"
  ].includes(entity.type)
) {
  throw new Error(
    `Tipo desconocido en "${entity.id}": ${entity.type}.`
  );
}

if (
  entity.type === "menu" &&
  !entity.source
) {
  throw new Error(
    `El menú "${entity.id}" no tiene source.`
  );
}

if (
  entity.type !== "menu" &&
  !entity.position
) {
  throw new Error(
    `La entidad "${entity.id}" no tiene position.`
  );
}

}
}

function loadImage(image, src) {
return new Promise((resolve, reject) => {
image.onload = () => resolve(image);

image.onerror = () => {
  reject(
    new Error(
      `No se pudo cargar la imagen: ${src}`
    )
  );
};

image.src = src;

});
}

async function preloadItemImages() {
const requiredSheets = new Set();

for (const entity of state.map.entities) {
if (entity.type === "food") {
const sheet =
FOOD_SHEETS[entity.item];

  if (sheet) {
    requiredSheets.add(sheet);
  }
}

if (entity.type === "drink") {
  requiredSheets.add(DRINK_SHEET);
}

if (entity.type === "bag") {
  requiredSheets.add(BAG_SHEET);
}

}

for (const sheet of requiredSheets) {
if (state.itemImages.has(sheet)) {
continue;
}

const image = new Image();

await loadImage(
  image,
  `/assets/food/${sheet}`
);

state.itemImages.set(
  sheet,
  image
);

}
}

function buildEntitySelect() {
entitySelect.innerHTML = "";

const placeholder =
document.createElement("option");

placeholder.value = "";
placeholder.textContent =
"Seleccione una ubicación";

entitySelect.appendChild(
placeholder
);

for (const entity of state.map.entities) {
if (entity.type === "menu") {
continue;
}

const option =
  document.createElement("option");

option.value = entity.id;

option.textContent =
  `${entity.id} — ${entity.type}`;

entitySelect.appendChild(option);

}
}

function getEntity(id) {
return state.map.entities.find(
(entity) => entity.id === id
);
}

function selectEntity(id) {
const entity = getEntity(id);

if (!entity) {
return;
}

state.selectedId = id;

entitySelect.value = id;

if (entity.type === "food") {
foodType.value = "food";
sheetSelect.value =
FOOD_SHEETS[entity.item] ??
"Menu_Taco.png";
}

if (entity.type === "drink") {
foodType.value = "drink";
sheetSelect.value =
DRINK_SHEET;
}

if (entity.type === "bag") {
foodType.value = "bag";
sheetSelect.value =
BAG_SHEET;
}

state.selectedSection =
Number.isInteger(entity.section)
? entity.section
: 1;

sectionSelect.value =
String(state.selectedSection);

loadEntityControls(entity);

render();
}

function loadEntityControls(entity) {
entityX.value =
entity.position?.x ?? 0;

entityY.value =
entity.position?.y ?? 0;

entityScale.value =
entity.scale ?? 1;

entityLayer.value =
entity.layer ?? 0;
}

function loadMenuSection(sectionNumber) {
const menu = state.map.entities.find(
(entity) =>
entity.type === "menu" &&
entity.id ===
"Menu_${sectionNumber}"
);

if (!menu) {
sourceX.value = "";
sourceY.value = "";
sourceWidth.value = "";
sourceHeight.value = "";
return;
}

sourceX.value =
menu.source.x;

sourceY.value =
menu.source.y;

sourceWidth.value =
menu.source.width;

sourceHeight.value =
menu.source.height;
}

function applySection() {
const sectionNumber =
Number(sectionSelect.value);

if (
!Number.isInteger(sectionNumber) ||
sectionNumber < 1 ||
sectionNumber > 8
) {
setStatus(
"La sección debe estar entre 1 y 8.",
true
);

return;

}

const menu = state.map.entities.find(
(entity) =>
entity.type === "menu" &&
entity.id ===
"Menu_${sectionNumber}"
);

if (!menu) {
setStatus(
"No existe Menu_${sectionNumber}.",
true
);

return;

}

menu.source = {
x: Number(sourceX.value),
y: Number(sourceY.value),
width: Number(sourceWidth.value),
height: Number(sourceHeight.value)
};

state.selectedSection =
sectionNumber;

updateJson();
render();

setStatus(
"Menu_${sectionNumber} actualizado."
);
}

function applyEntity() {
const entity =
getEntity(state.selectedId);

if (!entity) {
setStatus(
"Seleccione una ubicación primero.",
true
);

return;

}

entity.position = {
x: Number(entityX.value),
y: Number(entityY.value)
};

entity.scale =
Number(entityScale.value);

entity.layer =
Number(entityLayer.value);

const selectedType =
foodType.value;

entity.type = selectedType;

if (selectedType === "food") {
const selectedSheet =
sheetSelect.value;

const item =
  Object.entries(FOOD_SHEETS)
    .find(
      ([, sheet]) =>
        sheet === selectedSheet
    )?.[0];

entity.item =
  item ?? "taco";

}

if (selectedType === "drink") {
entity.item =
entity.item ?? "jugo_fresa";
}

if (selectedType === "bag") {
entity.item =
entity.item ?? "burrito";
}

entity.section =
Number(sectionSelect.value);

updateJson();
render();

setStatus(
"${entity.id} actualizado."
);
}

function addEntity() {
const type =
foodType.value;

const prefix =
type === "food"
? "Food"
: type === "drink"
? "Drink"
: "Bag";

const existing =
state.map.entities.filter(
(entity) =>
entity.type === type
);

let index =
existing.length + 1;

let id =
"${prefix}_${index}";

while (
state.map.entities.some(
(entity) =>
entity.id === id
)
) {
index += 1;
id = "${prefix}_${index}";
}

const entity = {
id,
type,
item:
type === "food"
? "taco"
: type === "drink"
? "jugo_fresa"
: "burrito",
section: 1,
scale:
type === "food"
? 0.19
: type === "drink"
? 0.10
: 0.25,
position: {
x: 0,
y: 0
},
layer: 3
};

state.map.entities.push(entity);

buildEntitySelect();
selectEntity(id);

updateJson();
render();

setStatus(
"${id} agregado."
);
}

function deleteEntity() {
if (!state.selectedId) {
setStatus(
"Seleccione una ubicación.",
true
);

return;

}

const index =
state.map.entities.findIndex(
(entity) =>
entity.id === state.selectedId
);

if (index === -1) {
return;
}

const deletedId =
state.selectedId;

state.map.entities.splice(
index,
1
);

state.selectedId = null;

buildEntitySelect();

entityX.value = "";
entityY.value = "";
entityScale.value = "";
entityLayer.value = "";

updateJson();
render();

setStatus(
"${deletedId} eliminado."
);
}

function resetEntity() {
if (!state.selectedId) {
return;
}

const entity =
getEntity(state.selectedId);

if (!entity) {
return;
}

entity.position = {
x: 0,
y: 0
};

entity.scale =
entity.type === "food"
? 0.19
: entity.type === "drink"
? 0.10
: 0.25;

entity.layer = 3;
entity.section = 1;

loadEntityControls(entity);

sectionSelect.value = "1";

updateJson();
render();

setStatus(
"${entity.id} restablecido."
);
}

function generateSections() {
const sectionIds =
Array.from(
{ length: 8 },
(_, index) =>
"Menu_${index + 1}"
);

const existingMenus =
state.map.entities.filter(
(entity) =>
entity.type === "menu"
);

if (existingMenus.length >= 8) {
setStatus(
"Las 8 secciones ya existen."
);

return;

}

for (const id of sectionIds) {
if (
state.map.entities.some(
(entity) =>
entity.id === id
)
) {
continue;
}

state.map.entities.push({
  id,
  type: "menu",
  source: {
    x: 0,
    y: 0,
    width: 276,
    height: 390
  }
});

}

updateJson();
render();

setStatus(
"Se generaron las 8 secciones."
);
}

function updateJson() {
if (!state.map) {
return;
}

jsonData.value =
JSON.stringify(
state.map,
null,
2
);
}

async function copyJson() {
try {
await navigator.clipboard.writeText(
JSON.stringify(
state.map,
null,
2
)
);

setStatus(
  "JSON copiado al portapapeles."
);

} catch (error) {
setStatus(
"No se pudo copiar el JSON.",
true
);
}
}

function exportJson() {
updateJson();

const blob =
new Blob(
[jsonData.value],
{
type: "application/json"
}
);

const url =
URL.createObjectURL(blob);

const link =
document.createElement("a");

link.href = url;
link.download =
"map-food.json";

link.click();

URL.revokeObjectURL(url);

setStatus(
"map-food.json exportado."
);
}

function importJson() {
try {
const imported =
JSON.parse(
jsonData.value
);

validateMap(imported);

state.map = imported;

buildEntitySelect();

state.selectedId = null;

updateJson();
render();

setStatus(
  "JSON importado correctamente."
);

} catch (error) {
console.error(error);

setStatus(
  error.message,
  true
);

}
}

function getSourceForEntity(entity) {
const section =
Number(entity.section ?? 1);

const menu =
state.map.entities.find(
(item) =>
item.type === "menu" &&
item.id ===
"Menu_${section}"
);

return menu?.source ?? null;
}

function getImageForEntity(entity) {
if (entity.type === "food") {
const sheet =
FOOD_SHEETS[entity.item];

return state.itemImages.get(
  sheet
);

}

if (entity.type === "drink") {
return state.itemImages.get(
DRINK_SHEET
);
}

if (entity.type === "bag") {
return state.itemImages.get(
BAG_SHEET
);
}

return null;
}

function calculateMapTransform() {
const mapWidth =
state.map.background?.width ??
1536;

const mapHeight =
state.map.background?.height ??
1536;

const scaleX =
canvas.width / mapWidth;

const scaleY =
canvas.height / mapHeight;

state.renderScale =
Math.min(
scaleX,
scaleY
);

state.renderOffsetX =
(canvas.width -
mapWidth *
state.renderScale) /
2;

state.renderOffsetY =
(canvas.height -
mapHeight *
state.renderScale) /
2;
}

function render() {
if (!state.map) {
return;
}

calculateMapTransform();

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

ctx.imageSmoothingEnabled =
false;

renderBackground();
renderEntities();
}

function renderBackground() {
const mapWidth =
state.map.background?.width ??
1536;

const mapHeight =
state.map.background?.height ??
1536;

ctx.drawImage(
state.background,
state.renderOffsetX,
state.renderOffsetY,
mapWidth *
state.renderScale,
mapHeight *
state.renderScale
);
}

function renderEntities() {
const entities =
[...state.map.entities]
.filter(
(entity) =>
entity.type !== "menu"
)
.sort(
(a, b) =>
(a.layer ?? 0) -
(b.layer ?? 0)
);

for (const entity of entities) {
renderEntity(entity);
}

renderMenuPreview();
}

function renderEntity(entity) {
const image =
getImageForEntity(entity);

const source =
getSourceForEntity(entity);

if (!image || !source) {
return;
}

const scale =
Number(entity.scale ?? 1);

const width =
source.width *
scale *
state.renderScale;

const height =
source.height *
scale *
state.renderScale;

const x =
state.renderOffsetX +
entity.position.x *
state.renderScale;

const y =
state.renderOffsetY +
entity.position.y *
state.renderScale;

ctx.save();

ctx.imageSmoothingEnabled =
false;

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

if (
entity.id ===
state.selectedId
) {
ctx.strokeStyle =
"#ffffff";

ctx.lineWidth = 2;

ctx.strokeRect(
  x,
  y,
  width,
  height
);

}

ctx.restore();
}

function renderMenuPreview() {
const menus =
state.map.entities.filter(
(entity) =>
entity.type === "menu"
);

for (const menu of menus) {
const source =
menu.source;

if (!source) {
  continue;
}

const x =
  state.renderOffsetX +
  10;

const y =
  state.renderOffsetY +
  10 +
  Number(
    menu.id.replace(
      "Menu_",
      ""
    )
  ) *
  16;

ctx.fillStyle =
  "rgba(0,0,0,0.65)";

ctx.fillRect(
  x,
  y,
  110,
  14
);

ctx.fillStyle =
  "#ffffff";

ctx.font =
  "10px monospace";

ctx.fillText(
  `${menu.id}  ${source.x},${source.y}`,
  x + 4,
  y + 10
);

}
}

function getCanvasMapPosition(event) {
const rect =
canvas.getBoundingClientRect();

const canvasX =
(event.clientX -
rect.left) *
(canvas.width /
rect.width);

const canvasY =
(event.clientY -
rect.top) *
(canvas.height /
rect.height);

return {
x:
(canvasX -
state.renderOffsetX) /
state.renderScale,

y:
  (canvasY -
    state.renderOffsetY) /
  state.renderScale

};
}

function startDrag(event) {
if (!state.selectedId) {
return;
}

const entity =
getEntity(
state.selectedId
);

if (!entity) {
return;
}

const point =
getCanvasMapPosition(event);

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

function dragEntity(event) {
if (!state.dragging) {
return;
}

const entity =
getEntity(
state.selectedId
);

if (!entity) {
return;
}

const point =
getCanvasMapPosition(event);

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

loadEntityControls(
entity
);

updateJson();
render();
}

function stopDrag(event) {
state.dragging = false;

if (
canvas.hasPointerCapture(
event.pointerId
)
) {
canvas.releasePointerCapture(
event.pointerId
);
}
}

entitySelect.addEventListener(
"change",
() => {
if (entitySelect.value) {
selectEntity(
entitySelect.value
);
}
}
);

sectionSelect.addEventListener(
"change",
() => {
state.selectedSection =
Number(
sectionSelect.value
);

loadMenuSection(
  state.selectedSection
);

const entity =
  getEntity(
    state.selectedId
  );

if (entity) {
  entity.section =
    state.selectedSection;
}

updateJson();
render();

}
);

document
.querySelector("#apply-section")
.addEventListener(
"click",
applySection
);

document
.querySelector("#apply-entity")
.addEventListener(
"click",
applyEntity
);

document
.querySelector("#add-entity")
.addEventListener(
"click",
addEntity
);

document
.querySelector("#delete-entity")
.addEventListener(
"click",
deleteEntity
);

document
.querySelector("#reset-entity")
.addEventListener(
"click",
resetEntity
);

document
.querySelector("#generate-sections")
.addEventListener(
"click",
generateSections
);

document
.querySelector("#export-json")
.addEventListener(
"click",
exportJson
);

document
.querySelector("#copy-json")
.addEventListener(
"click",
copyJson
);

document
.querySelector("#import-json")
.addEventListener(
"click",
importJson
);

canvas.addEventListener(
"pointerdown",
startDrag
);

canvas.addEventListener(
"pointermove",
dragEntity
);

canvas.addEventListener(
"pointerup",
stopDrag
);

canvas.addEventListener(
"pointercancel",
stopDrag
);

loadMap().catch(
(error) => {
console.error(error);

setStatus(
  error.message,
  true
);

}
);
