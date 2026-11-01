import {
RAPTOR_PATH,
getRaptorProfile
} from "../config/raptors.js";

export class MapRenderer {
constructor(ctx, mapDefinition, raptorAssignments) {
this.ctx = ctx;
this.mapDefinition = mapDefinition;
this.raptorAssignments = raptorAssignments;

this.image = new Image();
this.loaded = false;
this.error = null;

this.raptorImages = new Map();
this.raptorErrors = new Map();

this.loadMap();
this.loadRaptorImages();

}

loadMap() {
this.image.onload = () => {
this.loaded = true;
};

this.image.onerror = () => {
  this.error = "No se pudo cargar el fondo del mapa.";
  console.error(this.error);
};

this.image.src = this.mapDefinition.background.asset;

}

loadRaptorImages() {
const sheets = new Set();

for (const entity of this.mapDefinition.entities ?? []) {
  if (entity.type !== "raptor") {
    continue;
  }

  const sheetName = this.raptorAssignments.get(entity.id);

  if (sheetName) {
    sheets.add(sheetName);
  }
}

for (const sheetName of sheets) {
  this.loadRaptorImage(sheetName);
}

}

loadRaptorImage(sheetName) {
if (this.raptorImages.has(sheetName)) {
return;
}

const image = new Image();

image.onload = () => {
  this.raptorImages.set(sheetName, image);
};

image.onerror = () => {
  const message = `No se pudo cargar el Raptor "${sheetName}".`;

  this.raptorErrors.set(sheetName, message);

  console.error(message);
};

image.src = `${RAPTOR_PATH}${sheetName}`;

}

ensureRaptorImage(sheetName) {
if (
this.raptorImages.has(sheetName) ||
this.raptorErrors.has(sheetName)
) {
return;
}

this.loadRaptorImage(sheetName);

}

render() {
if (this.error) {
this.renderError();
return;
}

if (!this.loaded) {
  this.renderLoading();
  return;
}

this.renderBackground();
this.renderEntities();

}

renderBackground() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

const imageWidth = this.image.naturalWidth;
const imageHeight = this.image.naturalHeight;

const scale = Math.min(
  canvasWidth / imageWidth,
  canvasHeight / imageHeight
);

const drawWidth = imageWidth * scale;
const drawHeight = imageHeight * scale;

const offsetX = (canvasWidth - drawWidth) / 2;
const offsetY = (canvasHeight - drawHeight) / 2;

this.ctx.fillStyle = "#111";
this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.imageSmoothingEnabled = false;

this.ctx.drawImage(
  this.image,
  offsetX,
  offsetY,
  drawWidth,
  drawHeight
);

}

renderEntities() {
const entities = [...(this.mapDefinition.entities ?? [])];

entities.sort((a, b) => {
  const layerA = Number.isFinite(a.layer)
    ? a.layer
    : 0;

  const layerB = Number.isFinite(b.layer)
    ? b.layer
    : 0;

  return layerA - layerB;
});

for (const entity of entities) {
  this.renderEntity(entity);
}

}

renderEntity(entity) {
if (!entity || entity.type !== "raptor") {
return;
}

this.renderRaptor(entity);

}

renderRaptor(entity) {
const sheetName = this.raptorAssignments.get(entity.id);

if (!sheetName) {
  console.warn(
    `No existe una asignación de Raptor para "${entity.id}".`
  );

  return;
}

this.ensureRaptorImage(sheetName);

const image = this.raptorImages.get(sheetName);

if (!image) {
  return;
}

let profile;

try {
  profile = getRaptorProfile(entity.profile);
} catch (error) {
  console.error(error);
  return;
}

const source = profile.source;

const scale = Number.isFinite(entity.scale)
  ? entity.scale
  : 1;

const width = source.width * scale;
const height = source.height * scale;

const x = Number.isFinite(entity.position?.x)
  ? entity.position.x
  : 0;

const y = Number.isFinite(entity.position?.y)
  ? entity.position.y
  : 0;

this.ctx.save();

this.ctx.imageSmoothingEnabled = false;

if (entity.mirror) {
  this.ctx.translate(
    x + width,
    y
  );

  this.ctx.scale(-1, 1);

  this.ctx.drawImage(
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
  this.ctx.drawImage(
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

this.ctx.restore();

}

renderLoading() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

this.ctx.fillStyle = "#111";

this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.fillStyle = "#fff";
this.ctx.font = "20px monospace";
this.ctx.textAlign = "center";

this.ctx.fillText(
  "Cargando mapa...",
  canvasWidth / 2,
  canvasHeight / 2
);

}

renderError() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

this.ctx.fillStyle = "#111";

this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.fillStyle = "#f44";
this.ctx.font = "18px monospace";
this.ctx.textAlign = "center";

this.ctx.fillText(
  this.error,
  canvasWidth / 2,
  canvasHeight / 2
);

}
}import {
RAPTOR_PATH,
getRaptorProfile
} from "../config/raptors.js";

export class MapRenderer {
constructor(ctx, mapDefinition, raptorAssignments) {
this.ctx = ctx;
this.mapDefinition = mapDefinition;
this.raptorAssignments = raptorAssignments;

this.image = new Image();
this.loaded = false;
this.error = null;

this.raptorImages = new Map();
this.raptorErrors = new Map();

this.loadMap();
this.loadRaptorImages();

}

loadMap() {
this.image.onload = () => {
this.loaded = true;
};

this.image.onerror = () => {
  this.error = "No se pudo cargar el fondo del mapa.";
  console.error(this.error);
};

this.image.src = this.mapDefinition.background.asset;

}

loadRaptorImages() {
const sheets = new Set();

for (const entity of this.mapDefinition.entities ?? []) {
  if (entity.type !== "raptor") {
    continue;
  }

  const sheetName = this.raptorAssignments.get(entity.id);

  if (sheetName) {
    sheets.add(sheetName);
  }
}

for (const sheetName of sheets) {
  this.loadRaptorImage(sheetName);
}

}

loadRaptorImage(sheetName) {
if (this.raptorImages.has(sheetName)) {
return;
}

const image = new Image();

image.onload = () => {
  this.raptorImages.set(sheetName, image);
};

image.onerror = () => {
  const message = `No se pudo cargar el Raptor "${sheetName}".`;

  this.raptorErrors.set(sheetName, message);

  console.error(message);
};

image.src = `${RAPTOR_PATH}${sheetName}`;

}

ensureRaptorImage(sheetName) {
if (
this.raptorImages.has(sheetName) ||
this.raptorErrors.has(sheetName)
) {
return;
}

this.loadRaptorImage(sheetName);

}

render() {
if (this.error) {
this.renderError();
return;
}

if (!this.loaded) {
  this.renderLoading();
  return;
}

this.renderBackground();
this.renderEntities();

}

renderBackground() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

const imageWidth = this.image.naturalWidth;
const imageHeight = this.image.naturalHeight;

const scale = Math.min(
  canvasWidth / imageWidth,
  canvasHeight / imageHeight
);

const drawWidth = imageWidth * scale;
const drawHeight = imageHeight * scale;

const offsetX = (canvasWidth - drawWidth) / 2;
const offsetY = (canvasHeight - drawHeight) / 2;

this.ctx.fillStyle = "#111";
this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.imageSmoothingEnabled = false;

this.ctx.drawImage(
  this.image,
  offsetX,
  offsetY,
  drawWidth,
  drawHeight
);

}

renderEntities() {
const entities = [...(this.mapDefinition.entities ?? [])];

entities.sort((a, b) => {
  const layerA = Number.isFinite(a.layer)
    ? a.layer
    : 0;

  const layerB = Number.isFinite(b.layer)
    ? b.layer
    : 0;

  return layerA - layerB;
});

for (const entity of entities) {
  this.renderEntity(entity);
}

}

renderEntity(entity) {
if (!entity || entity.type !== "raptor") {
return;
}

this.renderRaptor(entity);

}

renderRaptor(entity) {
const sheetName = this.raptorAssignments.get(entity.id);

if (!sheetName) {
  console.warn(
    `No existe una asignación de Raptor para "${entity.id}".`
  );

  return;
}

this.ensureRaptorImage(sheetName);

const image = this.raptorImages.get(sheetName);

if (!image) {
  return;
}

let profile;

try {
  profile = getRaptorProfile(entity.profile);
} catch (error) {
  console.error(error);
  return;
}

const source = profile.source;

const scale = Number.isFinite(entity.scale)
  ? entity.scale
  : 1;

const width = source.width * scale;
const height = source.height * scale;

const x = Number.isFinite(entity.position?.x)
  ? entity.position.x
  : 0;

const y = Number.isFinite(entity.position?.y)
  ? entity.position.y
  : 0;

this.ctx.save();

this.ctx.imageSmoothingEnabled = false;

if (entity.mirror) {
  this.ctx.translate(
    x + width,
    y
  );

  this.ctx.scale(-1, 1);

  this.ctx.drawImage(
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
  this.ctx.drawImage(
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

this.ctx.restore();

}

renderLoading() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

this.ctx.fillStyle = "#111";

this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.fillStyle = "#fff";
this.ctx.font = "20px monospace";
this.ctx.textAlign = "center";

this.ctx.fillText(
  "Cargando mapa...",
  canvasWidth / 2,
  canvasHeight / 2
);

}

renderError() {
const canvasWidth = this.ctx.canvas.width;
const canvasHeight = this.ctx.canvas.height;

this.ctx.fillStyle = "#111";

this.ctx.fillRect(
  0,
  0,
  canvasWidth,
  canvasHeight
);

this.ctx.fillStyle = "#f44";
this.ctx.font = "18px monospace";
this.ctx.textAlign = "center";

this.ctx.fillText(
  this.error,
  canvasWidth / 2,
  canvasHeight / 2
);

}
}
