const MAP_URL = "/assets/restaurant/map.json";
const ASSIGNMENTS_URL =
"/assets/restaurant/raptorAssignments.json";

const RAPTOR_PATH = "/assets/raptors/";

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
assignments: {},
selectedId: null,
dragging: false,
dragOffsetX: 0,
dragOffsetY: 0,
backgroundImage: null,
raptorImages: new Map()
};

const canvas =
document.querySelector("#editor-canvas");

if (!canvas) {
throw new Error(
"No se encontró #editor-canvas."
);
}

const ctx = canvas.getContext("2d");

if (!ctx) {
throw new Error(
"No se pudo obtener el contexto 2D del editor."
);
}

const statusElement =
document.querySelector("#editor-status");

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

setStatus(
"Error: ${message}",
"error"
);

const loading =
document.querySelector("#editor-loading");

if (loading) {
loading.textContent =
"Error al cargar el editor.";
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
throw new Error(
"El mapa no contiene un objeto JSON válido."
);
}

if (
!map.background ||
typeof map.background !== "object"
) {
throw new Error(
"El mapa no contiene background."
);
}

if (!map.background.asset) {
throw new Error(
"El mapa no tiene background.asset."
);
}

if (!Array.isArray(map.entities)) {
throw new Error(
"El mapa no contiene entities."
);
}

const ids = new Set();

for (const entity of map.entities) {
if (!entity.id) {
throw new Error(
"Existe una entidad sin id."
);
}

if (ids.has(entity.id)) {
  throw new Error(
    `ID duplicado: ${entity.id}`
  );
}

ids.add(entity.id);

if (!entity.position) {
  throw new Error(
    `La entidad "${entity.id}" no tiene position.`
  );
}

if (
  entity.type === "raptor" &&
  !RAPTOR_PROFILES[entity.profile]
) {
  throw new Error(
    `Perfil de Raptor desconocido: ${entity.profile}`
  );
}

}

return true;
}

function validateAssignments(assignments) {
if (
!assignments ||
typeof assignments !== "object"
) {
throw new Error(
"Las asignaciones no contienen un objeto válido."
);
}

for (const entity of state.map.entities) {
if (entity.type !== "raptor") {
continue;
}

const sheetName =
  assignments[entity.id];

if (!sheetName) {
  throw new Error(
    `Falta la asignación de "${entity.id}".`
  );
}

const profile =
  RAPTOR_PROFILES[entity.profile];

if (!profile) {
  throw new Error(
    `Perfil desconocido para "${entity.id}".`
  );
}

if (
  !profile.allowedSheets.includes(
    sheetName
  )
) {
  throw new Error(
    `"${sheetName}" no está permitido para "${entity.id}" (${entity.profile}).`
  );
}

}

return true;
}

function getSelectedEntity() {
if (
!state.map ||
!state.selectedId
) {
return null;
}

return (
state.map.entities.find(
(entity) =>
entity.id === state.selectedId
) ?? null
);
}

function getSelectedProfile() {
const entity =
getSelectedEntity();

if (
!entity ||
entity.type !== "raptor"
) {
return null;
}

return (
RAPTOR_PROFILES[entity.profile] ??
null
);
}

function getSelectedSheet() {
const entity =
getSelectedEntity();

if (!entity) return null;

return (
state.assignments[entity.id] ??
null
);
}

function ensureRaptorImage(sheetName) {
if (!sheetName) return null;

if (
state.raptorImages.has(sheetName)
) {
return state.raptorImages.get(
sheetName
);
}

const image = new Image();

image.onload = () => {
state.raptorImages.set(
sheetName,
image
);

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

image.src =
"${RAPTOR_PATH}${sheetName}";

return image;
}

function loadBackground() {
return new Promise(
(resolve, reject) => {
const image = new Image();

  image.onload = () => {
    state.backgroundImage =
      image;

    resolve(image);
  };

  image.onerror = () => {
    reject(
      new Error(
        `No se pudo cargar el fondo: ${state.map.background.asset}`
      )
    );
  };

  image.src =
    state.map.background.asset;
}

);
}

function getMapScale() {
if (
!state.map ||
!state.backgroundImage
) {
return 1;
}

const mapWidth =
Number(
state.map.background.width
) ||
state.backgroundImage.naturalWidth;

const mapHeight =
Number(
state.map.background.height
) ||
state.backgroundImage.naturalHeight;

return Math.min(
canvas.width / mapWidth,
canvas.height / mapHeight
);
}

function getMapOffset() {
if (
!state.map ||
!state.backgroundImage
) {
return {
x: 0,
y: 0
};
}

const mapWidth =
Number(
state.map.background.width
) ||
state.backgroundImage.naturalWidth;

const mapHeight =
Number(
state.map.background.height
) ||
state.backgroundImage.naturalHeight;

const scale =
getMapScale();

return {
x:
(canvas.width -
mapWidth * scale) /
2,

y:
  (canvas.height -
    mapHeight * scale) /
  2

};
}

function screenToMap(
clientX,
clientY
) {
const rect =
canvas.getBoundingClientRect();

const screenX =
(clientX - rect.left) *
(canvas.width / rect.width);

const screenY =
(clientY - rect.top) *
(canvas.height / rect.height);

const scale =
getMapScale();

const offset =
getMapOffset();

return {
x:
(screenX - offset.x) /
scale,

y:
  (screenY - offset.y) /
  scale

};
}

function renderBackground() {
if (!state.backgroundImage) {
return;
}

const image =
state.backgroundImage;

const mapWidth =
Number(
state.map.background.width
) ||
image.naturalWidth;

const mapHeight =
Number(
state.map.background.height
) ||
image.naturalHeight;

const scale =
getMapScale();

const offset =
getMapOffset();

ctx.fillStyle = "#111";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

ctx.imageSmoothingEnabled =
false;

ctx.drawImage(
image,
offset.x,
offset.y,
mapWidth * scale,
mapHeight * scale
);
}

function renderRaptor(entity) {
const profile =
RAPTOR_PROFILES[
entity.profile
];

if (!profile) return;

const sheetName =
state.assignments[
entity.id
];

if (!sheetName) {
return;
}

const image =
ensureRaptorImage(
sheetName
);

if (
!image ||
!image.complete
) {
return;
}

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

const mapX =
Number(entity.position?.x) ||
0;

const mapY =
Number(entity.position?.y) ||
0;

const mapScale =
getMapScale();

const offset =
getMapOffset();

const x =
offset.x +
mapX * mapScale;

const y =
offset.y +
mapY * mapScale;

const drawWidth =
width * mapScale;

const drawHeight =
height * mapScale;

ctx.save();

ctx.imageSmoothingEnabled =
false;

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

if (
state.selectedId ===
entity.id
) {
ctx.strokeStyle =
"#00ff88";

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
if (
entity.type === "raptor"
) {
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

function updateRaptorSheetOptions(
selectedSheet
) {
const select =
document.querySelector(
"#raptor-sheet"
);

if (!select) return;

select.innerHTML = "";

const profile =
getSelectedProfile();

if (!profile) return;

for (
const sheetName of
profile.allowedSheets
) {
const option =
document.createElement(
"option"
);

option.value =
  sheetName;

option.textContent =
  sheetName;

if (
  sheetName ===
  selectedSheet
) {
  option.selected = true;
}

select.appendChild(
  option
);

}

if (
!selectedSheet &&
profile.allowedSheets.length
) {
select.value =
profile.allowedSheets[0];
}
}

function updateEntityControls() {
const entity =
getSelectedEntity();

if (!entity) return;

const idInput =
document.querySelector(
"#entity-id"
);

const typeInput =
document.querySelector(
"#entity-type"
);

const profileInput =
document.querySelector(
"#raptor-profile"
);

const xInput =
document.querySelector(
"#entity-x"
);

const yInput =
document.querySelector(
"#entity-y"
);

const scaleInput =
document.querySelector(
"#entity-scale"
);

const mirrorInput =
document.querySelector(
"#entity-mirror"
);

const layerInput =
document.querySelector(
"#entity-layer"
);

if (idInput) {
idInput.value =
entity.id;
}

if (typeInput) {
typeInput.value =
entity.type;
}

if (profileInput) {
profileInput.value =
entity.profile || "";
}

if (xInput) {
xInput.value =
Number(
entity.position?.x
) || 0;
}

if (yInput) {
yInput.value =
Number(
entity.position?.y
) || 0;
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
getSelectedSheet()
);
}

function applyControls() {
const entity =
getSelectedEntity();

if (!entity) {
setStatus(
"Selecciona primero una entidad.",
"error"
);

return;

}

const profileInput =
document.querySelector(
"#raptor-profile"
);

const sheetInput =
document.querySelector(
"#raptor-sheet"
);

const xInput =
document.querySelector(
"#entity-x"
);

const yInput =
document.querySelector(
"#entity-y"
);

const scaleInput =
document.querySelector(
"#entity-scale"
);

const mirrorInput =
document.querySelector(
"#entity-mirror"
);

const layerInput =
document.querySelector(
"#entity-layer"
);

if (
entity.type ===
"raptor"
) {
const profile =
profileInput?.value;

const profileDefinition =
  RAPTOR_PROFILES[
    profile
  ];

if (!profileDefinition) {
  setStatus(
    "Perfil de Raptor no válido.",
    "error"
  );

  return;
}

const sheetName =
  sheetInput?.value;

if (
  !profileDefinition.allowedSheets.includes(
    sheetName
  )
) {
  setStatus(
    `"${sheetName}" no está permitido para el perfil "${profile}".`,
    "error"
  );

  return;
}

entity.profile =
  profile;

state.assignments[
  entity.id
] = sheetName;

}

const x =
Number(xInput?.value);

const y =
Number(yInput?.value);

const scale =
Number(scaleInput?.value);

const layer =
Number(layerInput?.value);

if (
!Number.isFinite(x) ||
!Number.isFinite(y)
) {
setStatus(
"X e Y deben ser números.",
"error"
);

return;

}

if (
!Number.isFinite(scale) ||
scale <= 0
) {
setStatus(
"La escala debe ser mayor que 0.",
"error"
);

return;

}

if (
!Number.isFinite(layer)
) {
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
Boolean(
mirrorInput?.checked
);

render();

setStatus(
"Entidad "${entity.id}" actualizada.",
"success"
);
}

function selectEntity(id) {
state.selectedId = id;

const entity =
getSelectedEntity();

if (entity) {
updateEntityControls();

setStatus(
  `Seleccionado: ${entity.id}`,
  "info"
);

}

render();
}

function findEntityAt(
mapX,
mapY
) {
const entities = [
...(state.map.entities ?? [])
];

entities.sort(
(a, b) =>
(Number(b.layer) || 0) -
(Number(a.layer) || 0)
);

for (const entity of entities) {
if (
entity.type !==
"raptor"
) {
continue;
}

const profile =
  RAPTOR_PROFILES[
    entity.profile
  ];

if (!profile) continue;

const scale =
  Number(entity.scale) || 1;

const width =
  profile.source.width *
  scale;

const height =
  profile.source.height *
  scale;

const x =
  Number(
    entity.position?.x
  ) || 0;

const y =
  Number(
    entity.position?.y
  ) || 0;

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

function handlePointerDown(
event
) {
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

selectEntity(
entity.id
);

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

function handlePointerMove(
event
) {
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

function handlePointerUp(
event
) {
state.dragging = false;

try {
canvas.releasePointerCapture(
event.pointerId
);
} catch {
// Sin captura activa.
}
}

function buildCleanMap() {
return {
...state.map,
entities:
state.map.entities.map(
(entity) => {
const clean =
JSON.parse(
JSON.stringify(
entity
)
);

      delete clean._runtimeSheet;
      delete clean.source;
      delete clean.sheet;

      return clean;
    }
  )

};
}

function buildAssignments() {
return {
version: 1,
mapId: state.map.mapId,
assignments: {
...state.assignments
}
};
}

function downloadTextFile(
filename,
content
) {
const blob =
new Blob(
[content],
{
type:
"application/json;charset=utf-8"
}
);

const url =
URL.createObjectURL(blob);

const link =
document.createElement("a");

link.href = url;
link.download = filename;

document.body.appendChild(
link
);

link.click();

link.remove();

URL.revokeObjectURL(url);
}

function exportMap() {
const json =
JSON.stringify(
buildCleanMap(),
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

function exportAssignments() {
try {
validateAssignments(
state.assignments
);

const json =
  JSON.stringify(
    buildAssignments(),
    null,
    2
  );

downloadTextFile(
  "raptorAssignments.json",
  json
);

setStatus(
  "raptorAssignments.json exportado.",
  "success"
);

} catch (error) {
setStatus(
error.message,
"error"
);
}
}

async function copyText(
text,
successMessage
) {
try {
await navigator.clipboard.writeText(
text
);

setStatus(
  successMessage,
  "success"
);

} catch (error) {
console.error(error);

setStatus(
  "No se pudo copiar automáticamente.",
  "error"
);

}
}

function copyMap() {
copyText(
JSON.stringify(
buildCleanMap(),
null,
2
),
"map.json copiado."
);
}

function copyAssignments() {
try {
validateAssignments(
state.assignments
);

copyText(
  JSON.stringify(
    buildAssignments(),
    null,
    2
  ),
  "raptorAssignments.json copiado."
);

} catch (error) {
setStatus(
error.message,
"error"
);
}
}

function populateEntityList() {
const select =
document.querySelector(
"#entity-select"
);

if (!select) return;

select.innerHTML = "";

for (
const entity of
state.map.entities
) {
const option =
document.createElement(
"option"
);

option.value =
  entity.id;

option.textContent =
  `${entity.id} — ${entity.type}`;

select.appendChild(
  option
);

}

select.addEventListener(
"change",
() => {
selectEntity(
select.value
);
}
);

if (
state.map.entities.length
) {
select.value =
state.map.entities[0].id;

selectEntity(
  state.map.entities[0].id
);

}
}

function createAssignmentControls() {
const existing =
document.querySelector(
"#assignment-controls"
);

if (existing) return;

const container =
document.createElement(
"section"
);

container.id =
"assignment-controls";

container.innerHTML = `
<h3>Asignaciones de Raptor</h3>

<p>
  Las ubicaciones permanecen en
  <strong>map.json</strong>.
  El Raptor elegido se guarda en
  <strong>raptorAssignments.json</strong>.
</p>

<div class="editor-actions">
  <button id="export-assignments" type="button">
    Exportar raptorAssignments.json
  </button>

  <button id="copy-assignments" type="button">
    Copiar asignaciones
  </button>
</div>

`;

const anchor =
document.querySelector(
"#json-controls"
) ||
document.querySelector(
".editor-controls"
) ||
document.body;

anchor.appendChild(
container
);

document
.querySelector(
"#export-assignments"
)
?.addEventListener(
"click",
exportAssignments
);

document
.querySelector(
"#copy-assignments"
)
?.addEventListener(
"click",
copyAssignments
);
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
.querySelector(
"#apply-entity"
)
?.addEventListener(
"click",
applyControls
);

document
.querySelector(
"#export-map"
)
?.addEventListener(
"click",
exportMap
);

document
.querySelector(
"#copy-map"
)
?.addEventListener(
"click",
copyMap
);

document
.querySelector(
"#raptor-profile"
)
?.addEventListener(
"change",
() => {
const entity =
getSelectedEntity();

    if (!entity) return;

    const profile =
      document.querySelector(
        "#raptor-profile"
      ).value;

    const definition =
      RAPTOR_PROFILES[
        profile
      ];

    if (!definition) {
      return;
    }

    entity.profile =
      profile;

    const currentSheet =
      state.assignments[
        entity.id
      ];

    const sheet =
      definition.allowedSheets.includes(
        currentSheet
      )
        ? currentSheet
        : definition.allowedSheets[0];

    state.assignments[
      entity.id
    ] = sheet;

    updateRaptorSheetOptions(
      sheet
    );

    render();
  }
);

document
.querySelector(
"#raptor-sheet"
)
?.addEventListener(
"change",
() => {
const entity =
getSelectedEntity();

    if (!entity) return;

    const sheet =
      document.querySelector(
        "#raptor-sheet"
      ).value;

    const profile =
      RAPTOR_PROFILES[
        entity.profile
      ];

    if (
      !profile ||
      !profile.allowedSheets.includes(
        sheet
      )
    ) {
      setStatus(
        "Raptor no permitido para este perfil.",
        "error"
      );

      return;
    }

    state.assignments[
      entity.id
    ] = sheet;

    render();

    setStatus(
      `${entity.id}: ${sheet}`,
      "success"
    );
  }
);

}

async function initialize() {
setStatus(
"Cargando mapa y asignaciones...",
"info"
);

const [
map,
assignmentDefinition
] = await Promise.all([
loadJson(MAP_URL),
loadJson(ASSIGNMENTS_URL)
]);

validateMap(map);

if (
assignmentDefinition.mapId !==
map.mapId
) {
throw new Error(
"raptorAssignments.json pertenece a otro mapa."
);
}

state.map = map;

state.assignments = {
...assignmentDefinition.assignments
};

validateAssignments(
state.assignments
);

await loadBackground();

populateEntityList();

createAssignmentControls();

bindEvents();

render();

const loading =
document.querySelector(
"#editor-loading"
);

if (loading) {
loading.style.display =
"none";
}

setStatus(
"Editor cargado correctamente.",
"success"
);
}

initialize().catch(
showFatalError
);
