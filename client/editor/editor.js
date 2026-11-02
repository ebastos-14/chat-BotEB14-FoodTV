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
  originalMap: null,
  map: null,
  assignments: {},
  selectedId: null,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  backgroundImage: null,
  raptorImages: new Map(),
  raptorLoading: new Set()
};

const canvas = document.querySelector("#editor-canvas");

if (!canvas) {
  throw new Error("No se encontró #editor-canvas.");
}

const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error(
    "No se pudo obtener el contexto 2D del editor."
  );
}

const statusElement =
  document.querySelector("#editor-status");

const messageElement =
  document.querySelector("#editor-message");

function setStatus(message, type = "info") {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.dataset.type = type;
  }

  if (messageElement) {
    messageElement.textContent = message;
    messageElement.dataset.type = type;
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

window.addEventListener("error", (event) => {
  console.error(event.error || event.message);

  setStatus(
    `Error de JavaScript: ${event.message}`,
    "error"
  );
});

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(event.reason);

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
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${url}. HTTP ${response.status}.`
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

  if (!entity) {
    return null;
  }

  return (
    state.assignments[entity.id] ??
    null
  );
}

function ensureRaptorImage(sheetName) {
  if (!sheetName) {
    return null;
  }

  if (
    state.raptorImages.has(sheetName)
  ) {
    return state.raptorImages.get(
      sheetName
    );
  }

  if (
    state.raptorLoading.has(sheetName)
  ) {
    return null;
  }

  state.raptorLoading.add(sheetName);

  const image = new Image();

  image.onload = () => {
    state.raptorLoading.delete(
      sheetName
    );

    state.raptorImages.set(
      sheetName,
      image
    );

    render();
  };

  image.onerror = () => {
    state.raptorLoading.delete(
      sheetName
    );

    console.error(
      `No se pudo cargar el Raptor: ${sheetName}`
    );

    setStatus(
      `No se pudo cargar ${sheetName}.`,
      "error"
    );
  };

  image.src =
    `${RAPTOR_PATH}${sheetName}`;

  return null;
}

function loadBackground() {
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

  if (!profile) {
    return;
  }

  const sheetName =
    state.assignments[
      entity.id
    ];

  if (!sheetName) {
    return;
  }

  const image =
    state.raptorImages.get(
      sheetName
    );

  if (!image) {
    ensureRaptorImage(
      sheetName
    );
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
    Number(entity.position?.x) || 0;

  const mapY =
    Number(entity.position?.y) || 0;

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

  if (!state.map) {
    return;
  }

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

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const profile =
    getSelectedProfile();

  if (!profile) {
    return;
  }

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

    option.selected =
      sheetName ===
      selectedSheet;

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

function updateControls() {
  const entity =
    getSelectedEntity();

  const select =
    document.querySelector(
      "#element-select"
    );

  const info =
    document.querySelector(
      "#element-info"
    );

  const profileInput =
    document.querySelector(
      "#raptor-profile"
    );

  const xInput =
    document.querySelector(
      "#element-x"
    );

  const yInput =
    document.querySelector(
      "#element-y"
    );

  const scaleInput =
    document.querySelector(
      "#element-scale"
    );

  const mirrorInput =
    document.querySelector(
      "#element-mirror"
    );

  const layerInput =
    document.querySelector(
      "#element-layer"
    );

  if (!entity) {
    if (info) {
      info.textContent =
        "Ningún elemento seleccionado.";
    }

    return;
  }

  if (select) {
    select.value =
      entity.id;
  }

  if (info) {
    info.textContent =
      `${entity.id} — ${entity.type}`;
  }

  if (profileInput) {
    profileInput.value =
      entity.profile || "lateral";
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

function selectEntity(id) {
  state.selectedId =
    id || null;

  updateControls();
  render();

  const entity =
    getSelectedEntity();

  if (entity) {
    setStatus(
      `Seleccionado: ${entity.id}`,
      "info"
    );
  }
}

function populateEntityList() {
  const select =
    document.querySelector(
      "#element-select"
    );

  if (!select) {
    return;
  }

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
    selectEntity(
      state.map.entities[0].id
    );
  }
}

function applyElementChanges() {
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
      "#element-x"
    );

  const yInput =
    document.querySelector(
      "#element-y"
    );

  const scaleInput =
    document.querySelector(
      "#element-scale"
    );

  const mirrorInput =
    document.querySelector(
      "#element-mirror"
    );

  const layerInput =
    document.querySelector(
      "#element-layer"
    );

  if (
    entity.type ===
    "raptor"
  ) {
    const profile =
      profileInput?.value;

    const definition =
      RAPTOR_PROFILES[
        profile
      ];

    if (!definition) {
      setStatus(
        "Perfil de Raptor no válido.",
        "error"
      );

      return;
    }

    const sheetName =
      sheetInput?.value;

    if (
      !definition.allowedSheets.includes(
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
      "Layer debe ser un número.",
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
    `Entidad "${entity.id}" actualizada.`,
    "success"
  );
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

  for (
    const entity of entities
  ) {
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

    if (!profile) {
      continue;
    }

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
  if (!state.map) {
    return;
  }

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
    state.selectedId =
      null;

    updateControls();
    render();

    return;
  }

  selectEntity(
    entity.id
  );

  state.dragging =
    true;

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

  if (!entity) {
    return;
  }

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

  updateControls();
  render();
}

function handlePointerUp(
  event
) {
  state.dragging =
    false;

  try {
    canvas.releasePointerCapture(
      event.pointerId
    );
  } catch {
    // No había captura activa.
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
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );
}

function exportJson() {
  try {
    validateAssignments(
      state.assignments
    );

    const payload = {
      map: buildCleanMap(),
      raptorAssignments:
        buildAssignments()
    };

    const json =
      JSON.stringify(
        payload,
        null,
        2
      );

    downloadTextFile(
      "restaurant-editor.json",
      json
    );

    setStatus(
      "restaurant-editor.json exportado.",
      "success"
    );
  } catch (error) {
    setStatus(
      error.message,
      "error"
    );
  }
}

async function copyJson() {
  try {
    validateAssignments(
      state.assignments
    );

    const payload = {
      map: buildCleanMap(),
      raptorAssignments:
        buildAssignments()
    };

    await navigator.clipboard.writeText(
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    setStatus(
      "JSON copiado.",
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

function resetMap() {
  if (!state.originalMap) {
    return;
  }

  state.map =
    JSON.parse(
      JSON.stringify(
        state.originalMap
      )
    );

  state.selectedId =
    null;

  populateEntityList();
  render();

  setStatus(
    "Mapa restaurado.",
    "success"
  );
}

function addRaptor() {
  const existingIds =
    new Set(
      state.map.entities.map(
        (entity) =>
          entity.id
      )
    );

  let index = 1;
  let id = `Raptor_${index}`;

  while (
    existingIds.has(id)
  ) {
    index += 1;
    id = `Raptor_${index}`;
  }

  const entity = {
    id,
    type: "raptor",
    profile: "back",
    position: {
      x: 100,
      y: 100
    },
    scale: 0.488,
    mirror: false,
    layer: 3
  };

  state.map.entities.push(
    entity
  );

  state.assignments[id] =
    "Raptor_Mod.png";

  populateEntityList();
  selectEntity(id);
  render();

  setStatus(
    `${id} añadido.`,
    "success"
  );
}

function deleteSelected() {
  const entity =
    getSelectedEntity();

  if (!entity) {
    setStatus(
      "Selecciona primero una entidad.",
      "error"
    );

    return;
  }

  state.map.entities =
    state.map.entities.filter(
      (item) =>
        item.id !==
        entity.id
    );

  delete state.assignments[
    entity.id
  ];

  state.selectedId =
    null;

  populateEntityList();
  render();

  setStatus(
    `${entity.id} eliminado.`,
    "success"
  );
}

function importJson() {
  const textarea =
    document.querySelector(
      "#json-data"
    );

  if (!textarea) {
    return;
  }

  const text =
    textarea.value.trim();

  if (!text) {
    setStatus(
      "Pega primero un JSON.",
      "error"
    );

    return;
  }

  try {
    const parsed =
      JSON.parse(text);

    if (
      parsed.map &&
      parsed.raptorAssignments
    ) {
      validateMap(
        parsed.map
      );

      state.map =
        parsed.map;

      state.assignments =
        {
          ...parsed
            .raptorAssignments
            .assignments
        };
    } else {
      validateMap(parsed);

      state.map =
        parsed;

      state.assignments =
        {
          ...state.assignments
        };
    }

    validateAssignments(
      state.assignments
    );

    state.backgroundImage =
      null;

    loadBackground()
      .then(() => {
        populateEntityList();
        render();

        setStatus(
          "JSON importado correctamente.",
          "success"
        );
      })
      .catch(showFatalError);
  } catch (error) {
    setStatus(
      `JSON inválido: ${error.message}`,
      "error"
    );
  }
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
      "#apply-element"
    )
    ?.addEventListener(
      "click",
      applyElementChanges
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

  document
    .querySelector(
      "#add-element"
    )
    ?.addEventListener(
      "click",
      addRaptor
    );

  document
    .querySelector(
      "#delete-element"
    )
    ?.addEventListener(
      "click",
      deleteSelected
    );

  document
    .querySelector(
      "#reset-map"
    )
    ?.addEventListener(
      "click",
      resetMap
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

        if (!entity) {
          return;
        }

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

        if (!entity) {
          return;
        }

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
    !assignmentDefinition ||
    typeof assignmentDefinition !==
      "object"
  ) {
    throw new Error(
      "raptorAssignments.json no contiene un objeto válido."
    );
  }

  if (
    assignmentDefinition.mapId !==
    map.mapId
  ) {
    throw new Error(
      "raptorAssignments.json pertenece a otro mapa."
    );
  }

  state.originalMap =
    JSON.parse(
      JSON.stringify(map)
    );

  state.map = map;

  state.assignments = {
    ...assignmentDefinition.assignments
  };

  validateAssignments(
    state.assignments
  );

  await loadBackground();

  populateEntityList();

  bindEvents();

  render();

  setStatus(
    "Editor cargado correctamente.",
    "success"
  );
}

initialize().catch(
  showFatalError
);
