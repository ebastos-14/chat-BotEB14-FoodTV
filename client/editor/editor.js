const MAP_URL = "/assets/restaurant/map.json";

const RAPTOR_PATH = "/assets/raptors/";

const RAPTORS = {
  "Raptor_Base.png": {
    name: "Raptor Base",
    profiles: {
      lateral: {
        x: 35,
        y: 166,
        width: 380,
        height: 550
      },
      front: {
        x: 435,
        y: 166,
        width: 525,
        height: 550
      },
      back: {
        x: 848,
        y: 166,
        width: 380,
        height: 550
      }
    }
  },

  "Raptor_Vip.png": {
    name: "Raptor VIP",
    profiles: {}
  },

  "Raptor_Sub.png": {
    name: "Raptor Sub",
    profiles: {}
  },

  "Raptor_Mod.png": {
    name: "Raptor Mod",
    profiles: {}
  },

  "Raptor_EBastos14.png": {
    name: "Raptor EBastos14",
    profiles: {}
  },

  "Raptor_JaciiTV_1.png": {
    name: "Raptor JaciiTV 1",
    profiles: {}
  },

  "Raptor_JaciiTV_2.png": {
    name: "Raptor JaciiTV 2",
    profiles: {}
  }
};


const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const statusElement = document.querySelector("#editor-status");
const messageElement = document.querySelector("#editor-message");

const raptorSpriteSelect = document.querySelector("#raptor-sprite");

const profileButtons = document.querySelectorAll(
  "[data-profile]"
);

const spritePreview = document.querySelector("#sprite-preview");

const spriteXInput = document.querySelector("#sprite-x");
const spriteYInput = document.querySelector("#sprite-y");
const spriteWidthInput = document.querySelector("#sprite-width");
const spriteHeightInput = document.querySelector("#sprite-height");

const spriteStartElement = document.querySelector("#sprite-start");
const spriteSizeElement = document.querySelector("#sprite-size");

const applySpriteSelectionButton = document.querySelector(
  "#apply-sprite-selection"
);

const elementXInput = document.querySelector("#element-x");
const elementYInput = document.querySelector("#element-y");

const coordXElement = document.querySelector("#coord-x");
const coordYElement = document.querySelector("#coord-y");

const placeButton = document.querySelector("#place-button");

const elementTypeSelect = document.querySelector(
  "#element-type"
);

const elementIdInput = document.querySelector(
  "#element-id"
);

const deleteButton = document.querySelector(
  "#delete-button"
);

const clearButton = document.querySelector(
  "#clear-button"
);

const elementList = document.querySelector(
  "#element-list"
);

const exportButton = document.querySelector(
  "#export-button"
);

const copyButton = document.querySelector(
  "#copy-button"
);

const importButton = document.querySelector(
  "#import-button"
);

const importFile = document.querySelector(
  "#import-file"
);

const mapCoordinates = document.querySelector(
  "#map-coordinates"
);


let mapDefinition = null;
let mapImage = null;

const raptorImages = new Map();

let selectedRaptor = "Raptor_Base.png";
let selectedProfile = "front";

let selectedElement = null;

let elements = [];

let currentSpriteSelection = {
  x: 435,
  y: 166,
  width: 525,
  height: 550
};

let placing = false;


/* =========================================================
   UTILIDADES
   ========================================================= */

function showMessage(message, type = "info") {
  messageElement.textContent = message;

  if (type === "error") {
    messageElement.style.color = "#f66";
  } else if (type === "success") {
    messageElement.style.color = "#8f8";
  } else {
    messageElement.style.color = "#aaa";
  }
}


function updateStatus(message) {
  statusElement.textContent = message;
}


function getNumber(input) {
  const value = Number(input.value);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


/* =========================================================
   CARGA DEL MAPA
   ========================================================= */

async function loadMap() {
  const response = await fetch(MAP_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${MAP_URL}`
    );
  }

  const map = await response.json();

  if (!map.background?.asset) {
    throw new Error(
      "El mapa no contiene background.asset."
    );
  }

  return map;
}


async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(
        new Error(`No se pudo cargar la imagen: ${src}`)
      );
    };

    image.src = src;
  });
}


/* =========================================================
   CARGA DE RAPTORS
   ========================================================= */

async function loadRaptorImages() {
  const entries = Object.keys(RAPTORS);

  for (const filename of entries) {
    const src = `${RAPTOR_PATH}${filename}`;

    try {
      const image = await loadImage(src);

      raptorImages.set(filename, image);

      console.log(
        `Raptor cargado: ${filename}`,
        image.naturalWidth,
        image.naturalHeight
      );

    } catch (error) {
      console.error(error);

      showMessage(
        `No se pudo cargar ${filename}`,
        "error"
      );
    }
  }

  if (raptorImages.size === 0) {
    throw new Error(
      "No se pudo cargar ningún sprite de Raptor."
    );
  }
}


/* =========================================================
   PERFIL
   ========================================================= */

function selectProfile(profile) {
  selectedProfile = profile;

  profileButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.profile === profile
    );
  });

  const raptor = RAPTORS[selectedRaptor];

  const definition = raptor?.profiles?.[profile];

  if (definition) {
    setSpriteSelection(
      definition.x,
      definition.y,
      definition.width,
      definition.height
    );
  }

  renderSpritePreview();

  renderEditor();
}


/* =========================================================
   SPRITE SELECTION
   ========================================================= */

function setSpriteSelection(
  x,
  y,
  width,
  height
) {
  spriteXInput.value = Math.round(x);
  spriteYInput.value = Math.round(y);
  spriteWidthInput.value = Math.round(width);
  spriteHeightInput.value = Math.round(height);

  currentSpriteSelection = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };

  updateSpriteInfo();
}


function readSpriteSelection() {
  const image = raptorImages.get(selectedRaptor);

  if (!image) {
    throw new Error(
      "El spritesheet seleccionado no está cargado."
    );
  }

  const x = getNumber(spriteXInput);
  const y = getNumber(spriteYInput);

  const width = getNumber(
    spriteWidthInput
  );

  const height = getNumber(
    spriteHeightInput
  );

  if (x < 0 || y < 0) {
    throw new Error(
      "X e Y no pueden ser negativos."
    );
  }

  if (width <= 0 || height <= 0) {
    throw new Error(
      "El ancho y el alto deben ser mayores que cero."
    );
  }

  if (x + width > image.naturalWidth) {
    throw new Error(
      `El recorte supera el ancho del spritesheet. ` +
      `Imagen: ${image.naturalWidth}px.`
    );
  }

  if (y + height > image.naturalHeight) {
    throw new Error(
      `El recorte supera el alto del spritesheet. ` +
      `Imagen: ${image.naturalHeight}px.`
    );
  }

  return {
    x,
    y,
    width,
    height
  };
}


function updateSpriteInfo() {
  const x = getNumber(spriteXInput);
  const y = getNumber(spriteYInput);
  const width = getNumber(spriteWidthInput);
  const height = getNumber(spriteHeightInput);

  spriteStartElement.textContent =
    `${x}, ${y}`;

  spriteSizeElement.textContent =
    `${width} × ${height}`;
}


/* =========================================================
   PREVIEW DEL SPRITE
   ========================================================= */

function renderSpritePreview() {
  const image = raptorImages.get(
    selectedRaptor
  );

  if (!image) {
    spritePreview.innerHTML =
      "<span>Sprite no cargado</span>";

    return;
  }

  const selection = currentSpriteSelection;

  const previewCanvas =
    document.createElement("canvas");

  const maxSize = 180;

  const scale = Math.min(
    maxSize / selection.width,
    maxSize / selection.height
  );

  previewCanvas.width =
    Math.max(
      1,
      Math.round(selection.width * scale)
    );

  previewCanvas.height =
    Math.max(
      1,
      Math.round(selection.height * scale)
    );

  const previewContext =
    previewCanvas.getContext("2d");

  previewContext.imageSmoothingEnabled = false;

  previewContext.drawImage(
    image,

    selection.x,
    selection.y,
    selection.width,
    selection.height,

    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );

  spritePreview.innerHTML = "";

  spritePreview.appendChild(
    previewCanvas
  );
}


/* =========================================================
   CAMBIO DE RAPTOR
   ========================================================= */

function changeRaptor() {
  selectedRaptor =
    raptorSpriteSelect.value;

  const image =
    raptorImages.get(selectedRaptor);

  if (!image) {
    showMessage(
      "El sprite seleccionado todavía no está disponible.",
      "error"
    );

    return;
  }

  const profile =
    RAPTORS[selectedRaptor]?.profiles?.[
      selectedProfile
    ];

  if (profile) {
    setSpriteSelection(
      profile.x,
      profile.y,
      profile.width,
      profile.height
    );
  } else {
    setSpriteSelection(
      0,
      0,
      Math.min(100, image.naturalWidth),
      Math.min(100, image.naturalHeight)
    );
  }

  renderSpritePreview();
  renderEditor();

  showMessage(
    `${selectedRaptor} cargado.`,
    "success"
  );
}


/* =========================================================
   ELEMENTOS DEL MAPA
   ========================================================= */

function createRaptorElement() {
  const selection =
    readSpriteSelection();

  const x =
    getNumber(elementXInput);

  const y =
    getNumber(elementYInput);

  const id =
    elementIdInput.value.trim();

  if (!id) {
    throw new Error(
      "Debes indicar un ID para el Raptor."
    );
  }

  if (
    elements.some(
      (element) => element.id === id
    )
  ) {
    throw new Error(
      `El ID "${id}" ya existe.`
    );
  }

  return {
    id,

    type: "raptor",

    sprite: {
      sheet: selectedRaptor,

      profile: selectedProfile,

      source: {
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height
      }
    },

    position: {
      x,
      y
    },

    scale: 1
  };
}


function addElement() {
  try {
    const element =
      createRaptorElement();

    elements.push(element);

    selectedElement = element;

    renderElementList();
    renderEditor();

    showMessage(
      `Raptor "${element.id}" colocado.`,
      "success"
    );

  } catch (error) {
    showMessage(
      error.message,
      "error"
    );
  }
}


function selectElement(element) {
  selectedElement = element;

  elementXInput.value =
    element.position.x;

  elementYInput.value =
    element.position.y;

  elementIdInput.value =
    element.id;

  if (element.sprite) {
    selectedRaptor =
      element.sprite.sheet;

    selectedProfile =
      element.sprite.profile;

    raptorSpriteSelect.value =
      selectedRaptor;

    setSpriteSelection(
      element.sprite.source.x,
      element.sprite.source.y,
      element.sprite.source.width,
      element.sprite.source.height
    );

    renderSpritePreview();
  }

  renderElementList();
  renderEditor();
}


function deleteSelected() {
  if (!selectedElement) {
    showMessage(
      "No hay ningún elemento seleccionado."
    );

    return;
  }

  elements =
    elements.filter(
      (element) =>
        element !== selectedElement
    );

  selectedElement = null;

  renderElementList();
  renderEditor();

  showMessage(
    "Elemento eliminado.",
    "success"
  );
}


function clearSelection() {
  selectedElement = null;

  renderElementList();
  renderEditor();

  showMessage(
    "Selección eliminada."
  );
}


/* =========================================================
   LISTA DE ELEMENTOS
   ========================================================= */

function renderElementList() {
  elementList.innerHTML = "";

  if (elements.length === 0) {
    elementList.innerHTML =
      "<div class=\"element-item\">" +
      "<span>No hay elementos.</span>" +
      "</div>";

    return;
  }

  elements.forEach((element) => {
    const item =
      document.createElement("div");

    item.className =
      "element-item";

    if (element === selectedElement) {
      item.classList.add("selected");
    }

    const title =
      document.createElement("strong");

    title.textContent =
      element.id;

    const details =
      document.createElement("span");

    if (element.sprite) {
      details.textContent =
        `${element.sprite.sheet} · ` +
        `${element.sprite.profile} · ` +
        `${element.position.x}, ` +
        `${element.position.y}`;
    } else {
      details.textContent =
        element.type;
    }

    item.appendChild(title);
    item.appendChild(details);

    item.addEventListener(
      "click",
      () => selectElement(element)
    );

    elementList.appendChild(item);
  });
}


/* =========================================================
   MAPA
   ========================================================= */

function renderMap() {
  if (!mapImage) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    mapImage,
    0,
    0,
    canvas.width,
    canvas.height
  );
}


/* =========================================================
   RAPTORS SOBRE EL MAPA
   ========================================================= */

function renderRaptor(element) {
  const image =
    raptorImages.get(
      element.sprite.sheet
    );

  if (!image) {
    return;
  }

  const source =
    element.sprite.source;

  const scale =
    element.scale ?? 1;

  const width =
    source.width * scale;

  const height =
    source.height * scale;

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    image,

    source.x,
    source.y,
    source.width,
    source.height,

    element.position.x,
    element.position.y,
    width,
    height
  );

  if (element === selectedElement) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    ctx.strokeRect(
      element.position.x,
      element.position.y,
      width,
      height
    );
  }
}


/* =========================================================
   RENDER COMPLETO
   ========================================================= */

function renderEditor() {
  if (!mapImage) {
    return;
  }

  renderMap();

  elements.forEach(
    (element) => {
      if (
        element.type === "raptor" &&
        element.sprite
      ) {
        renderRaptor(element);
      }
    }
  );
}


/* =========================================================
   COORDENADAS DEL MAPA
   ========================================================= */

function getCanvasCoordinates(event) {
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


function updateMapCoordinates(event) {
  const position =
    getCanvasCoordinates(event);

  mapCoordinates.textContent =
    `X: ${Math.round(position.x)} | ` +
    `Y: ${Math.round(position.y)}`;

  coordXElement.textContent =
    Math.round(position.x);

  coordYElement.textContent =
    Math.round(position.y);
}


/* =========================================================
   COLOCACIÓN CON EL MAPA
   ========================================================= */

function handleCanvasPointerDown(event) {
  const position =
    getCanvasCoordinates(event);

  if (placing) {
    elementXInput.value =
      Math.round(position.x);

    elementYInput.value =
      Math.round(position.y);

    addElement();

    placing = false;

    placeButton.textContent =
      "Colocar Raptor";

    return;
  }

  const clickedElement =
    findElementAt(
      position.x,
      position.y
    );

  if (clickedElement) {
    selectElement(clickedElement);
  }
}


function findElementAt(x, y) {
  for (
    let index = elements.length - 1;
    index >= 0;
    index--
  ) {
    const element =
      elements[index];

    if (
      element.type !== "raptor" ||
      !element.sprite
    ) {
      continue;
    }

    const source =
      element.sprite.source;

    const width =
      source.width *
      (element.scale ?? 1);

    const height =
      source.height *
      (element.scale ?? 1);

    if (
      x >= element.position.x &&
      x <= element.position.x + width &&
      y >= element.position.y &&
      y <= element.position.y + height
    ) {
      return element;
    }
  }

  return null;
}


/* =========================================================
   EXPORTAR JSON
   ========================================================= */

function createMapExport() {
  return {
    ...mapDefinition,

    entities: elements,

    editor: {
      version: 2
    }
  };
}


function exportJSON() {
  const data =
    createMapExport();

  const json =
    JSON.stringify(
      data,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = "map.json";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showMessage(
    "JSON exportado.",
    "success"
  );
}


/* =========================================================
   COPIAR JSON
   ========================================================= */

async function copyJSON() {
  const json =
    JSON.stringify(
      createMapExport(),
      null,
      2
    );

  try {
    await navigator.clipboard.writeText(
      json
    );

    showMessage(
      "JSON copiado al portapapeles.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showMessage(
      "No se pudo copiar el JSON.",
      "error"
    );
  }
}


/* =========================================================
   IMPORTAR JSON
   ========================================================= */

function validateImportedMap(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "El JSON no es válido."
    );
  }

  if (
    !data.background ||
    !data.background.asset
  ) {
    throw new Error(
      "El JSON no contiene background.asset."
    );
  }

  if (
    !Array.isArray(data.entities)
  ) {
    throw new Error(
      "El JSON no contiene entities."
    );
  }

  for (const element of data.entities) {
    if (!element.id) {
      throw new Error(
        "Existe un elemento sin ID."
      );
    }

    if (
      element.type === "raptor"
    ) {
      if (
        !element.sprite ||
        !element.sprite.sheet ||
        !element.sprite.source
      ) {
        throw new Error(
          `El Raptor "${element.id}" ` +
          "no tiene una definición de sprite válida."
        );
      }

      const source =
        element.sprite.source;

      if (
        !Number.isFinite(source.x) ||
        !Number.isFinite(source.y) ||
        !Number.isFinite(source.width) ||
        !Number.isFinite(source.height)
      ) {
        throw new Error(
          `El Raptor "${element.id}" ` +
          "tiene coordenadas de sprite inválidas."
        );
      }
    }
  }

  return true;
}


async function importJSONFile(file) {
  try {
    const text =
      await file.text();

    const data =
      JSON.parse(text);

    validateImportedMap(data);

    mapDefinition = data;

    elements =
      [...data.entities];

    selectedElement = null;

    if (mapDefinition.background?.asset) {
      mapImage =
        await loadImage(
          mapDefinition.background.asset
        );

      canvas.width =
        mapImage.naturalWidth;

      canvas.height =
        mapImage.naturalHeight;
    }

    renderElementList();
    renderEditor();

    showMessage(
      "Mapa importado correctamente.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showMessage(
      `Error al importar: ${error.message}`,
      "error"
    );
  }
}


/* =========================================================
   EVENTOS
   ========================================================= */

raptorSpriteSelect.addEventListener(
  "change",
  changeRaptor
);


profileButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        selectProfile(
          button.dataset.profile
        );
      }
    );
  }
);


[
  spriteXInput,
  spriteYInput,
  spriteWidthInput,
  spriteHeightInput
].forEach(
  (input) => {
    input.addEventListener(
      "input",
      () => {
        updateSpriteInfo();

        try {
          currentSpriteSelection =
            readSpriteSelection();

          renderSpritePreview();

        } catch (error) {
          // Mientras se escribe no mostramos
          // un error permanente.
        }
      }
    );
  }
);


applySpriteSelectionButton.addEventListener(
  "click",
  () => {
    try {
      currentSpriteSelection =
        readSpriteSelection();

      renderSpritePreview();
      renderEditor();

      showMessage(
        "Recorte aplicado correctamente.",
        "success"
      );

    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  }
);


placeButton.addEventListener(
  "click",
  () => {
    placing = !placing;

    if (placing) {
      placeButton.textContent =
        "Toca el mapa para colocar";

      showMessage(
        "Toca el lugar exacto del mapa donde quieres colocar el Raptor."
      );

    } else {
      placeButton.textContent =
        "Colocar Raptor";
    }
  }
);


deleteButton.addEventListener(
  "click",
  deleteSelected
);


clearButton.addEventListener(
  "click",
  clearSelection
);


exportButton.addEventListener(
  "click",
  exportJSON
);


copyButton.addEventListener(
  "click",
  copyJSON
);


importButton.addEventListener(
  "click",
  () => {
    importFile.click();
  }
);


importFile.addEventListener(
  "change",
  () => {
    const file =
      importFile.files?.[0];

    if (!file) {
      return;
    }

    importJSONFile(file);

    importFile.value = "";
  }
);


canvas.addEventListener(
  "pointermove",
  updateMapCoordinates
);


canvas.addEventListener(
  "pointerdown",
  handleCanvasPointerDown
);


/* =========================================================
   INICIO
   ========================================================= */

async function init() {
  try {
    updateStatus(
      "Cargando mapa..."
    );

    mapDefinition =
      await loadMap();

    mapImage =
      await loadImage(
        mapDefinition.background.asset
      );

    canvas.width =
      mapImage.naturalWidth;

    canvas.height =
      mapImage.naturalHeight;

    updateStatus(
      "Cargando Raptors..."
    );

    await loadRaptorImages();

    if (
      Array.isArray(
        mapDefinition.entities
      )
    ) {
      elements =
        [...mapDefinition.entities];
    }

    setSpriteSelection(
      435,
      166,
      525,
      550
    );

    renderSpritePreview();
    renderElementList();
    renderEditor();

    updateStatus(
      "Editor listo"
    );

    showMessage(
      `${raptorImages.size} sprites de Raptor cargados.`,
      "success"
    );

  } catch (error) {
    console.error(error);

    updateStatus(
      "Error"
    );

    showMessage(
      error.message,
      "error"
    );
  }
}


init();
