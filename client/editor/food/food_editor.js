const MAP_URL = "/assets/food/map-food.json";
const BACKGROUND_URL = "/assets/restaurant/map-background.png";
const FOOD_PATH = "/assets/food/";

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

const MAX_SECTIONS = 8;

const state = {
  map: null,
  originalMap: null,

  selectedId: null,
  selectedSection: 1,

  background: null,

  itemImages: new Map(),
  loadingImages: new Set(),

  renderScale: 1,
  renderOffsetX: 0,
  renderOffsetY: 0,

  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0
};

const canvas =
  document.querySelector("#editor-canvas");

if (!canvas) {
  throw new Error(
    "No se encontró #editor-canvas."
  );
}

const ctx =
  canvas.getContext("2d");

if (!ctx) {
  throw new Error(
    "No se pudo obtener el contexto 2D."
  );
}

const statusElement =
  document.querySelector("#editor-status");

const messageElement =
  document.querySelector("#editor-message");

const entitySelect =
  document.querySelector("#entity-select");

const foodType =
  document.querySelector("#food-type");

const sheetSelect =
  document.querySelector("#sheet-select");

const sectionSelect =
  document.querySelector("#section-select");

const sourceX =
  document.querySelector("#source-x");

const sourceY =
  document.querySelector("#source-y");

const sourceWidth =
  document.querySelector("#source-width");

const sourceHeight =
  document.querySelector("#source-height");

const entityX =
  document.querySelector("#entity-x");

const entityY =
  document.querySelector("#entity-y");

const entityScale =
  document.querySelector("#entity-scale");

const entityLayer =
  document.querySelector("#entity-layer");

const jsonData =
  document.querySelector("#json-data");

function setStatus(
  message,
  type = "info"
) {
  if (statusElement) {
    statusElement.textContent =
      message;

    statusElement.dataset.type =
      type;

    statusElement.dataset.error =
      type === "error"
        ? "true"
        : "false";
  }

  if (messageElement) {
    messageElement.textContent =
      message;

    messageElement.dataset.type =
      type;
  }
}

function showFatalError(error) {
  console.error(error);

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  setStatus(
    `Error: ${message}`,
    "error"
  );
}

window.addEventListener(
  "error",
  (event) => {
    console.error(
      event.error ||
      event.message
    );

    setStatus(
      `Error de JavaScript: ${event.message}`,
      "error"
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      event.reason
    );

    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);

    setStatus(
      `Error: ${message}`,
      "error"
    );
  }
);

async function loadJson(url) {
  const response =
    await fetch(url, {
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${url}. HTTP ${response.status}.`
    );
  }

  return response.json();
}

function loadImage(
  src
) {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            `No se pudo cargar la imagen: ${src}`
          )
        );
      };

      image.src = src;
    }
  );
}

function validateMap(map) {
  if (
    !map ||
    typeof map !== "object"
  ) {
    throw new Error(
      "map-food.json no contiene un objeto válido."
    );
  }

  if (
    map.module !== "food"
  ) {
    throw new Error(
      'map-food.json debe tener "module": "food".'
    );
  }

  if (
    !map.background ||
    typeof map.background !== "object"
  ) {
    throw new Error(
      "map-food.json no contiene background."
    );
  }

  if (
    !map.background.asset
  ) {
    throw new Error(
      "map-food.json no tiene background.asset."
    );
  }

  if (
    !Array.isArray(
      map.entities
    )
  ) {
    throw new Error(
      'map-food.json debe contener "entities".'
    );
  }

  const ids =
    new Set();

  for (
    const entity of
    map.entities
  ) {
    if (!entity.id) {
      throw new Error(
        "Existe una entidad sin ID."
      );
    }

    if (
      ids.has(entity.id)
    ) {
      throw new Error(
        `ID duplicado: "${entity.id}".`
      );
    }

    ids.add(
      entity.id
    );

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
      entity.type === "menu"
    ) {
      if (
        !entity.source ||
        typeof entity.source !== "object"
      ) {
        throw new Error(
          `El menú "${entity.id}" no tiene source.`
        );
      }

      validateSource(
        entity.source,
        entity.id
      );

      continue;
    }

    if (
      !entity.position ||
      typeof entity.position !== "object"
    ) {
      throw new Error(
        `La entidad "${entity.id}" no tiene position.`
      );
    }

    const x =
      Number(entity.position.x);

    const y =
      Number(entity.position.y);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      throw new Error(
        `La posición de "${entity.id}" no es válida.`
      );
    }

    const section =
      Number(entity.section ?? 1);

    if (
      !Number.isInteger(section) ||
      section < 1 ||
      section > MAX_SECTIONS
    ) {
      throw new Error(
        `La sección de "${entity.id}" debe estar entre 1 y ${MAX_SECTIONS}.`
      );
    }

    if (
      entity.type === "food" &&
      !FOOD_SHEETS[entity.item]
    ) {
      throw new Error(
        `Food "${entity.id}" tiene un item desconocido: "${entity.item}".`
      );
    }
  }

  return true;
}

function validateSource(
  source,
  entityId
) {
  const values = [
    source.x,
    source.y,
    source.width,
    source.height
  ];

  if (
    values.some(
      (value) =>
        !Number.isFinite(
          Number(value)
        )
    )
  ) {
    throw new Error(
      `El source de "${entityId}" contiene coordenadas inválidas.`
    );
  }

  if (
    Number(source.width) <= 0 ||
    Number(source.height) <= 0
  ) {
    throw new Error(
      `El source de "${entityId}" tiene dimensiones inválidas.`
    );
  }
}

function getEntity(id) {
  if (!state.map) {
    return null;
  }

  return (
    state.map.entities.find(
      (entity) =>
        entity.id === id
    ) ?? null
  );
}

function getEditableEntities() {
  if (!state.map) {
    return [];
  }

  return state.map.entities.filter(
    (entity) =>
      entity.type !== "menu"
  );
}

function getMenuEntity(
  sectionNumber
) {
  if (!state.map) {
    return null;
  }

  return (
    state.map.entities.find(
      (entity) =>
        entity.type === "menu" &&
        entity.id ===
          `Menu_${sectionNumber}`
    ) ?? null
  );
}

function getSourceForEntity(
  entity
) {
  const section =
    Number(
      entity.section ?? 1
    );

  const menu =
    getMenuEntity(
      section
    );

  return (
    menu?.source ??
    null
  );
}

function getImageForEntity(
  entity
) {
  if (
    entity.type === "food"
  ) {
    const sheet =
      FOOD_SHEETS[
        entity.item
      ];

    if (!sheet) {
      return null;
    }

    return (
      state.itemImages.get(
        sheet
      ) ?? null
    );
  }

  if (
    entity.type === "drink"
  ) {
    return (
      state.itemImages.get(
        DRINK_SHEET
      ) ?? null
    );
  }

  if (
    entity.type === "bag"
  ) {
    return (
      state.itemImages.get(
        BAG_SHEET
      ) ?? null
    );
  }

  return null;
}

async function preloadItemImages() {
  if (!state.map) {
    return;
  }

  const requiredSheets =
    new Set();

  for (
    const entity of
    getEditableEntities()
  ) {
    if (
      entity.type === "food"
    ) {
      const sheet =
        FOOD_SHEETS[
          entity.item
        ];

      if (sheet) {
        requiredSheets.add(
          sheet
        );
      }
    }

    if (
      entity.type === "drink"
    ) {
      requiredSheets.add(
        DRINK_SHEET
      );
    }

    if (
      entity.type === "bag"
    ) {
      requiredSheets.add(
        BAG_SHEET
      );
    }
  }

  for (
    const sheet of
    requiredSheets
  ) {
    if (
      state.itemImages.has(
        sheet
      )
    ) {
      continue;
    }

    if (
      state.loadingImages.has(
        sheet
      )
    ) {
      continue;
    }

    state.loadingImages.add(
      sheet
    );

    try {
      const image =
        await loadImage(
          `${FOOD_PATH}${sheet}`
        );

      state.itemImages.set(
        sheet,
        image
      );
    } finally {
      state.loadingImages.delete(
        sheet
      );
    }
  }
}

async function ensureItemImage(
  sheet
) {
  if (!sheet) {
    return null;
  }

  const existing =
    state.itemImages.get(
      sheet
    );

  if (existing) {
    return existing;
  }

  if (
    state.loadingImages.has(
      sheet
    )
  ) {
    return null;
  }

  state.loadingImages.add(
    sheet
  );

  try {
    const image =
      await loadImage(
        `${FOOD_PATH}${sheet}`
      );

    state.itemImages.set(
      sheet,
      image
    );

    render();

    return image;
  } catch (error) {
    console.error(error);

    setStatus(
      error.message,
      "error"
    );

    return null;
  } finally {
    state.loadingImages.delete(
      sheet
    );
  }
}

function buildEntitySelect() {
  if (!entitySelect) {
    return;
  }

  entitySelect.innerHTML =
    "";

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value =
    "";

  placeholder.textContent =
    "Seleccione una ubicación";

  entitySelect.appendChild(
    placeholder
  );

  for (
    const entity of
    getEditableEntities()
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      entity.id;

    option.textContent =
      `${entity.id} — ${entity.type}`;

    entitySelect.appendChild(
      option
    );
  }
}

function updateSheetOptions() {
  if (!sheetSelect) {
    return;
  }

  const currentType =
    foodType?.value ??
    "food";

  const currentValue =
    sheetSelect.value;

  sheetSelect.innerHTML =
    "";

  if (
    currentType === "food"
  ) {
    for (
      const [
        item,
        sheet
      ] of Object.entries(
        FOOD_SHEETS
      )
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        sheet;

      option.textContent =
        `${item} — ${sheet}`;

      sheetSelect.appendChild(
        option
      );
    }
  }

  if (
    currentType === "drink"
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      DRINK_SHEET;

    option.textContent =
      DRINK_SHEET;

    sheetSelect.appendChild(
      option
    );
  }

  if (
    currentType === "bag"
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      BAG_SHEET;

    option.textContent =
      BAG_SHEET;

    sheetSelect.appendChild(
      option
    );
  }

  if (
    Array.from(
      sheetSelect.options
    ).some(
      (option) =>
        option.value ===
        currentValue
    )
  ) {
    sheetSelect.value =
      currentValue;
  }
}

function loadEntityControls(
  entity
) {
  if (!entity) {
    return;
  }

  if (entityX) {
    entityX.value =
      Number(
        entity.position?.x
      ) || 0;
  }

  if (entityY) {
    entityY.value =
      Number(
        entity.position?.y
      ) || 0;
  }

  if (entityScale) {
    entityScale.value =
      Number(
        entity.scale
      ) || 1;
  }

  if (entityLayer) {
    entityLayer.value =
      Number(
        entity.layer
      ) || 0;
  }

  if (foodType) {
    foodType.value =
      entity.type;
  }

  updateSheetOptions();

  if (sheetSelect) {
    if (
      entity.type === "food"
    ) {
      sheetSelect.value =
        FOOD_SHEETS[
          entity.item
        ] ??
        "Menu_Taco.png";
    }

    if (
      entity.type === "drink"
    ) {
      sheetSelect.value =
        DRINK_SHEET;
    }

    if (
      entity.type === "bag"
    ) {
      sheetSelect.value =
        BAG_SHEET;
    }
  }

  state.selectedSection =
    Number(
      entity.section ?? 1
    );

  if (sectionSelect) {
    sectionSelect.value =
      String(
        state.selectedSection
      );
  }

  loadMenuSection(
    state.selectedSection
  );
}

function selectEntity(
  id
) {
  const entity =
    getEntity(id);

  if (!entity) {
    return;
  }

  if (
    entity.type === "menu"
  ) {
    return;
  }

  state.selectedId =
    id;

  if (entitySelect) {
    entitySelect.value =
      id;
  }

  loadEntityControls(
    entity
  );

  render();

  setStatus(
    `Seleccionado: ${entity.id}`,
    "info"
  );
}

function loadMenuSection(
  sectionNumber
) {
  const menu =
    getMenuEntity(
      sectionNumber
    );

  if (!menu) {
    if (sourceX) {
      sourceX.value =
        "";
    }

    if (sourceY) {
      sourceY.value =
        "";
    }

    if (sourceWidth) {
      sourceWidth.value =
        "";
    }

    if (sourceHeight) {
      sourceHeight.value =
        "";
    }

    return;
  }

  if (sourceX) {
    sourceX.value =
      menu.source.x;
  }

  if (sourceY) {
    sourceY.value =
      menu.source.y;
  }

  if (sourceWidth) {
    sourceWidth.value =
      menu.source.width;
  }

  if (sourceHeight) {
    sourceHeight.value =
      menu.source.height;
  }
}

function applySection() {
  const sectionNumber =
    Number(
      sectionSelect?.value
    );

  if (
    !Number.isInteger(
      sectionNumber
    ) ||
    sectionNumber < 1 ||
    sectionNumber > MAX_SECTIONS
  ) {
    setStatus(
      `La sección debe estar entre 1 y ${MAX_SECTIONS}.`,
      "error"
    );

    return;
  }

  const menu =
    getMenuEntity(
      sectionNumber
    );

  if (!menu) {
    setStatus(
      `No existe Menu_${sectionNumber}.`,
      "error"
    );

    return;
  }

  const x =
    Number(sourceX?.value);

  const y =
    Number(sourceY?.value);

  const width =
    Number(sourceWidth?.value);

  const height =
    Number(sourceHeight?.value);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    setStatus(
      "Las coordenadas del source deben ser números.",
      "error"
    );

    return;
  }

  if (
    width <= 0 ||
    height <= 0
  ) {
    setStatus(
      "El ancho y alto deben ser mayores que 0.",
      "error"
    );

    return;
  }

  menu.source = {
    x,
    y,
    width,
    height
  };

  state.selectedSection =
    sectionNumber;

  updateJson();
  render();

  setStatus(
    `Menu_${sectionNumber} actualizado.`,
    "success"
  );
}

async function applyEntity() {
  const entity =
    getEntity(
      state.selectedId
    );

  if (!entity) {
    setStatus(
      "Seleccione una ubicación primero.",
      "error"
    );

    return;
  }

  const x =
    Number(entityX?.value);

  const y =
    Number(entityY?.value);

  const scale =
    Number(entityScale?.value);

  const layer =
    Number(entityLayer?.value);

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
      "Layer debe ser un número.",
      "error"
    );

    return;
  }

  const selectedType =
    foodType?.value;

  if (
    ![
      "food",
      "drink",
      "bag"
    ].includes(
      selectedType
    )
  ) {
    setStatus(
      "Tipo de elemento no válido.",
      "error"
    );

    return;
  }

  entity.position = {
    x,
    y
  };

  entity.scale =
    scale;

  entity.layer =
    layer;

  entity.type =
    selectedType;

  if (
    selectedType === "food"
  ) {
    const selectedSheet =
      sheetSelect?.value;

    const item =
      Object.entries(
        FOOD_SHEETS
      ).find(
        ([, sheet]) =>
          sheet ===
          selectedSheet
      )?.[0];

    entity.item =
      item ?? "taco";

    await ensureItemImage(
      selectedSheet ??
        FOOD_SHEETS.taco
    );
  }

  if (
    selectedType === "drink"
  ) {
    entity.item =
      entity.item ??
      "jugo_fresa";

    await ensureItemImage(
      DRINK_SHEET
    );
  }

  if (
    selectedType === "bag"
  ) {
    entity.item =
      entity.item ??
      "burrito";

    await ensureItemImage(
      BAG_SHEET
    );
  }

  const section =
    Number(
      sectionSelect?.value
    );

  if (
    Number.isInteger(
      section
    ) &&
    section >= 1 &&
    section <= MAX_SECTIONS
  ) {
    entity.section =
      section;

    state.selectedSection =
      section;
  }

  buildEntitySelect();

  if (entitySelect) {
    entitySelect.value =
      entity.id;
  }

  updateJson();
  render();

  setStatus(
    `Entidad "${entity.id}" actualizada.`,
    "success"
  );
}

function addEntity() {
  const type =
    foodType?.value ??
    "food";

  const prefix =
    type === "food"
      ? "Food"
      : type === "drink"
      ? "Drink"
      : "Bag";

  const existingIds =
    new Set(
      state.map.entities.map(
        (entity) =>
          entity.id
      )
    );

  let index = 1;

  let id =
    `${prefix}_${index}`;

  while (
    existingIds.has(id)
  ) {
    index += 1;

    id =
      `${prefix}_${index}`;
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

  state.map.entities.push(
    entity
  );

  buildEntitySelect();
  selectEntity(id);

  updateJson();
  render();

  setStatus(
    `${id} agregado.`,
    "success"
  );
}

function deleteEntity() {
  if (
    !state.selectedId
  ) {
    setStatus(
      "Seleccione una ubicación.",
      "error"
    );

    return;
  }

  const index =
    state.map.entities.findIndex(
      (entity) =>
        entity.id ===
        state.selectedId
    );

  if (
    index === -1
  ) {
    return;
  }

  const deletedId =
    state.selectedId;

  state.map.entities.splice(
    index,
    1
  );

  state.selectedId =
    null;

  buildEntitySelect();

  if (entityX) {
    entityX.value =
      "";
  }

  if (entityY) {
    entityY.value =
      "";
  }

  if (entityScale) {
    entityScale.value =
      "";
  }

  if (entityLayer) {
    entityLayer.value =
      "";
  }

  updateJson();
  render();

  setStatus(
    `${deletedId} eliminado.`,
    "success"
  );
}

function resetEntity() {
  if (
    !state.selectedId
  ) {
    return;
  }

  const entity =
    getEntity(
      state.selectedId
    );

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

  state.selectedSection =
    1;

  loadEntityControls(
    entity
  );

  updateJson();
  render();

  setStatus(
    `${entity.id} restablecido.`,
    "success"
  );
}

function generateSections() {
  if (!state.map) {
    return;
  }

  const existingMenus =
    state.map.entities.filter(
      (entity) =>
        entity.type === "menu"
    );

  if (
    existingMenus.length >=
    MAX_SECTIONS
  ) {
    setStatus(
      "Las 8 secciones ya existen.",
      "info"
    );

    return;
  }

  for (
    let index = 1;
    index <= MAX_SECTIONS;
    index++
  ) {
    const id =
      `Menu_${index}`;

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
    "Se generaron las secciones que faltaban.",
    "success"
  );
}

function updateJson() {
  if (
    !state.map ||
    !jsonData
  ) {
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
    if (!state.map) {
      return;
    }

    await navigator.clipboard.writeText(
      JSON.stringify(
        state.map,
        null,
        2
      )
    );

    setStatus(
      "JSON copiado al portapapeles.",
      "success"
    );
  } catch (error) {
    console.error(error);

    setStatus(
      "No se pudo copiar el JSON.",
      "error"
    );
  }
}

function exportJson() {
  if (!state.map) {
    return;
  }

  updateJson();

  const blob =
    new Blob(
      [
        jsonData.value
      ],
      {
        type:
          "application/json;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    "map-food.json";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );

  setStatus(
    "map-food.json exportado.",
    "success"
  );
}

async function importJson() {
  if (!jsonData) {
    return;
  }

  try {
    const imported =
      JSON.parse(
        jsonData.value
      );

    validateMap(
      imported
    );

    state.map =
      imported;

    state.selectedId =
      null;

    state.selectedSection =
      1;

    state.itemImages.clear();

    await preloadItemImages();

    buildEntitySelect();

    updateJson();

    render();

    setStatus(
      "JSON importado correctamente.",
      "success"
    );
  } catch (error) {
    console.error(error);

    setStatus(
      `JSON inválido: ${error.message}`,
      "error"
    );
  }
}

function calculateMapTransform() {
  const mapWidth =
    Number(
      state.map?.background?.width
    ) ||
    state.background?.naturalWidth ||
    1536;

  const mapHeight =
    Number(
      state.map?.background?.height
    ) ||
    state.background?.naturalHeight ||
    1536;

  const scaleX =
    canvas.width /
    mapWidth;

  const scaleY =
    canvas.height /
    mapHeight;

  state.renderScale =
    Math.min(
      scaleX,
      scaleY
    );

  state.renderOffsetX =
    (
      canvas.width -
      mapWidth *
        state.renderScale
    ) / 2;

  state.renderOffsetY =
    (
      canvas.height -
      mapHeight *
        state.renderScale
    ) / 2;
}

function renderBackground() {
  if (
    !state.background ||
    !state.background.complete
  ) {
    return;
  }

  const mapWidth =
    Number(
      state.map?.background?.width
    ) ||
    state.background.naturalWidth;

  const mapHeight =
    Number(
      state.map?.background?.height
    ) ||
    state.background.naturalHeight;

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

function renderEntity(
  entity
) {
  const image =
    getImageForEntity(
      entity
    );

  const source =
    getSourceForEntity(
      entity
    );

  if (!image) {
    const sheet =
      entity.type === "food"
        ? FOOD_SHEETS[
            entity.item
          ]
        : entity.type === "drink"
        ? DRINK_SHEET
        : entity.type === "bag"
        ? BAG_SHEET
        : null;

    if (sheet) {
      ensureItemImage(
        sheet
      );
    }

    return;
  }

  if (!source) {
    return;
  }

  const scale =
    Number(entity.scale);

  if (
    !Number.isFinite(
      scale
    ) ||
    scale <= 0
  ) {
    return;
  }

  const sourceX =
    Number(source.x);

  const sourceY =
    Number(source.y);

  const sourceWidth =
    Number(source.width);

  const sourceHeight =
    Number(source.height);

  if (
    !Number.isFinite(sourceX) ||
    !Number.isFinite(sourceY) ||
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return;
  }

  const width =
    sourceWidth *
    scale *
    state.renderScale;

  const height =
    sourceHeight *
    scale *
    state.renderScale;

  const mapX =
    Number(
      entity.position?.x
    ) || 0;

  const mapY =
    Number(
      entity.position?.y
    ) || 0;

  const x =
    state.renderOffsetX +
    mapX *
      state.renderScale;

  const y =
    state.renderOffsetY +
    mapY *
      state.renderScale;

  ctx.save();

  ctx.imageSmoothingEnabled =
    false;

  /*
   * Aquí está el render real:
   *
   * 1. image = Menu_Taco.png,
   *    Menu_Bebida.png o
   *    Menu_Bolsa.png
   *
   * 2. source = Menu_1 ... Menu_8
   *
   * 3. Se recorta esa sección
   *    de la spritesheet.
   *
   * 4. Se coloca en la posición
   *    de la entidad.
   */
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
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
      "#00ff88";

    ctx.lineWidth =
      2;

    ctx.strokeRect(
      x,
      y,
      width,
      height
    );
  }

  ctx.restore();
}

function renderEntities() {
  if (!state.map) {
    return;
  }

  const entities =
    [
      ...state.map.entities
    ]
      .filter(
        (entity) =>
          entity.type !==
          "menu"
      )
      .sort(
        (a, b) =>
          (
            Number(a.layer) ||
            0
          ) -
          (
            Number(b.layer) ||
            0
          )
      );

  for (
    const entity of
    entities
  ) {
    renderEntity(
      entity
    );
  }
}

function renderMenuPreview() {
  if (!state.map) {
    return;
  }

  const menus =
    state.map.entities.filter(
      (entity) =>
        entity.type === "menu"
    );

  for (
    const menu of
    menus
  ) {
    const source =
      menu.source;

    if (!source) {
      continue;
    }

    const sectionNumber =
      Number(
        menu.id.replace(
          "Menu_",
          ""
        )
      );

    const x =
      state.renderOffsetX +
      10;

    const y =
      state.renderOffsetY +
      10 +
      sectionNumber *
        16;

    ctx.fillStyle =
      "rgba(0,0,0,0.65)";

    ctx.fillRect(
      x,
      y,
      140,
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

  ctx.fillStyle =
    "#111";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  renderBackground();
  renderEntities();

  /*
   * Los textos de Menu_1...Menu_8
   * se mantienen como ayuda visual
   * del editor.
   */
  renderMenuPreview();
}

function getCanvasMapPosition(
  event
) {
  const rect =
    canvas.getBoundingClientRect();

  const canvasX =
    (
      event.clientX -
      rect.left
    ) *
    (
      canvas.width /
      rect.width
    );

  const canvasY =
    (
      event.clientY -
      rect.top
    ) *
    (
      canvas.height /
      rect.height
    );

  return {
    x:
      (
        canvasX -
        state.renderOffsetX
      ) /
      state.renderScale,

    y:
      (
        canvasY -
        state.renderOffsetY
      ) /
      state.renderScale
  };
}

function getEntityBounds(
  entity
) {
  const source =
    getSourceForEntity(
      entity
    );

  if (!source) {
    return null;
  }

  const scale =
    Number(entity.scale) || 1;

  return {
    x:
      Number(
        entity.position?.x
      ) || 0,

    y:
      Number(
        entity.position?.y
      ) || 0,

    width:
      source.width *
      scale,

    height:
      source.height *
      scale
  };
}

function findEntityAt(
  mapX,
  mapY
) {
  if (!state.map) {
    return null;
  }

  const entities =
    [
      ...getEditableEntities()
    ].sort(
      (a, b) =>
        (
          Number(b.layer) ||
          0
        ) -
        (
          Number(a.layer) ||
          0
        )
    );

  for (
    const entity of
    entities
  ) {
    const bounds =
      getEntityBounds(
        entity
      );

    if (!bounds) {
      continue;
    }

    if (
      mapX >= bounds.x &&
      mapX <=
        bounds.x +
        bounds.width &&
      mapY >= bounds.y &&
      mapY <=
        bounds.y +
        bounds.height
    ) {
      return entity;
    }
  }

  return null;
}

function startDrag(
  event
) {
  if (!state.map) {
    return;
  }

  const point =
    getCanvasMapPosition(
      event
    );

  const clickedEntity =
    findEntityAt(
      point.x,
      point.y
    );

  if (clickedEntity) {
    selectEntity(
      clickedEntity.id
    );

    state.dragging =
      true;

    state.dragOffsetX =
      point.x -
      (
        Number(
          clickedEntity.position?.x
        ) || 0
      );

    state.dragOffsetY =
      point.y -
      (
        Number(
          clickedEntity.position?.y
        ) || 0
      );

    canvas.setPointerCapture(
      event.pointerId
    );

    return;
  }

  state.dragging =
    false;
}

function dragEntity(
  event
) {
  if (
    !state.dragging ||
    !state.selectedId
  ) {
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
    getCanvasMapPosition(
      event
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

  loadEntityControls(
    entity
  );

  updateJson();
  render();
}

function stopDrag(
  event
) {
  state.dragging =
    false;

  try {
    if (
      canvas.hasPointerCapture(
        event.pointerId
      )
    ) {
      canvas.releasePointerCapture(
        event.pointerId
      );
    }
  } catch {
    // No había captura activa.
  }
}

function bindEvents() {
  entitySelect?.addEventListener(
    "change",
    () => {
      if (
        entitySelect.value
      ) {
        selectEntity(
          entitySelect.value
        );
      }
    }
  );

  foodType?.addEventListener(
    "change",
    () => {
      updateSheetOptions();

      const type =
        foodType.value;

      if (
        type === "food" &&
        sheetSelect
      ) {
        sheetSelect.value =
          "Menu_Taco.png";
      }

      if (
        type === "drink" &&
        sheetSelect
      ) {
        sheetSelect.value =
          DRINK_SHEET;
      }

      if (
        type === "bag" &&
        sheetSelect
      ) {
        sheetSelect.value =
          BAG_SHEET;
      }
    }
  );

  sectionSelect?.addEventListener(
    "change",
    () => {
      const section =
        Number(
          sectionSelect.value
        );

      if (
        !Number.isInteger(
          section
        ) ||
        section < 1 ||
        section > MAX_SECTIONS
      ) {
        return;
      }

      state.selectedSection =
        section;

      loadMenuSection(
        section
      );

      const entity =
        getEntity(
          state.selectedId
        );

      if (entity) {
        entity.section =
          section;
      }

      updateJson();
      render();
    }
  );

  document
    .querySelector(
      "#apply-section"
    )
    ?.addEventListener(
      "click",
      applySection
    );

  document
    .querySelector(
      "#apply-entity"
    )
    ?.addEventListener(
      "click",
      applyEntity
    );

  document
    .querySelector(
      "#add-entity"
    )
    ?.addEventListener(
      "click",
      addEntity
    );

  document
    .querySelector(
      "#delete-entity"
    )
    ?.addEventListener(
      "click",
      deleteEntity
    );

  document
    .querySelector(
      "#reset-entity"
    )
    ?.addEventListener(
      "click",
      resetEntity
    );

  document
    .querySelector(
      "#generate-sections"
    )
    ?.addEventListener(
      "click",
      generateSections
    );

  document
    .querySelector(
      "#export-json"
    )
    ?.addEventListener(
      "click",
      exportJson
    );

  document
    .querySelector(
      "#copy-json"
    )
    ?.addEventListener(
      "click",
      copyJson
    );

  document
    .querySelector(
      "#import-json"
    )
    ?.addEventListener(
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
}

async function loadMap() {
  setStatus(
    "Cargando mapa...",
    "info"
  );

  const map =
    await loadJson(
      MAP_URL
    );

  validateMap(
    map
  );

  state.map =
    map;

  state.originalMap =
    JSON.parse(
      JSON.stringify(
        map
      )
    );

  const backgroundUrl =
    state.map.background?.asset ||
    BACKGROUND_URL;

  state.background =
    await loadImage(
      backgroundUrl
    );

  await preloadItemImages();

  buildEntitySelect();

  bindEvents();

  const firstEditable =
    getEditableEntities()[0];

  if (firstEditable) {
    selectEntity(
      firstEditable.id
    );
  }

  updateJson();

  render();

  setStatus(
    "Editor Food cargado correctamente.",
    "success"
  );
}

loadMap().catch(
  showFatalError
);
