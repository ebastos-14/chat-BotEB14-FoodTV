const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const statusElement = document.querySelector("#editor-status");
const messageElement = document.querySelector("#editor-message");

const typeElement = document.querySelector("#element-type");
const idElement = document.querySelector("#element-id");

const placeButton = document.querySelector("#place-button");
const deleteButton = document.querySelector("#delete-button");
const clearButton = document.querySelector("#clear-button");

const coordXElement = document.querySelector("#coord-x");
const coordYElement = document.querySelector("#coord-y");

const normalizedXElement =
  document.querySelector("#normalized-x");

const normalizedYElement =
  document.querySelector("#normalized-y");

const elementList =
  document.querySelector("#element-list");

let mapDefinition = null;
let mapImage = null;

let placing = false;
let selectedElementId = null;

const elements = [];

async function loadMap() {
  try {
    const response = await fetch(
      "/assets/restaurant/map.json"
    );

    if (!response.ok) {
      throw new Error("No se pudo cargar map.json.");
    }

    mapDefinition = await response.json();

    validateMap(mapDefinition);

    mapImage = new Image();

    mapImage.onload = () => {
      canvas.width = mapImage.naturalWidth;
      canvas.height = mapImage.naturalHeight;

      statusElement.textContent = "Mapa cargado";

      render();
      renderElementList();
    };

    mapImage.onerror = () => {
      throw new Error(
        "No se pudo cargar map-background.png."
      );
    };

    mapImage.src = mapDefinition.background.asset;

  } catch (error) {
    console.error(error);

    statusElement.textContent = "Error";
    messageElement.textContent = error.message;
  }
}

function validateMap(map) {
  if (!map || typeof map !== "object") {
    throw new Error("El mapa no es un objeto válido.");
  }

  if (!map.version) {
    throw new Error("El mapa no tiene versión.");
  }

  if (!map.background) {
    throw new Error("El mapa no tiene fondo.");
  }

  if (!map.background.asset) {
    throw new Error(
      "El mapa no tiene ruta de fondo."
    );
  }
}

function render() {
  if (!mapImage) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    mapImage,
    0,
    0,
    canvas.width,
    canvas.height
  );

  for (const element of elements) {
    drawElement(element);
  }
}

function drawElement(element) {
  const selected =
    element.id === selectedElementId;

  ctx.save();

  ctx.beginPath();

  ctx.arc(
    element.x,
    element.y,
    selected ? 14 : 10,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = selected
    ? "#ffff00"
    : "#ff3333";

  ctx.fill();

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.textAlign = "left";

  ctx.fillText(
    element.id,
    element.x + 18,
    element.y - 8
  );

  ctx.restore();
}

function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();

  const scaleX =
    canvas.width / rect.width;

  const scaleY =
    canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function createElement(event) {
  const position = getCanvasPosition(event);

  const id =
    idElement.value.trim();

  if (!id) {
    messageElement.textContent =
      "Debes introducir un ID.";
    return;
  }

  if (
    elements.some(
      (element) => element.id === id
    )
  ) {
    messageElement.textContent =
      `El ID "${id}" ya existe.`;

    return;
  }

  const element = {
    id,
    type: typeElement.value,

    x: Math.round(position.x),
    y: Math.round(position.y),

    normalizedX: Number(
      (position.x / canvas.width).toFixed(6)
    ),

    normalizedY: Number(
      (position.y / canvas.height).toFixed(6)
    )
  };

  elements.push(element);

  selectedElementId = element.id;

  placing = false;

  placeButton.textContent =
    "Activar colocación";

  updateEditorData();
  render();
  renderElementList();

  messageElement.textContent =
    `Elemento "${id}" creado.`;
}

function selectElementAtPosition(event) {
  const position =
    getCanvasPosition(event);

  let closest = null;
  let closestDistance = Infinity;

  for (const element of elements) {
    const dx =
      element.x - position.x;

    const dy =
      element.y - position.y;

    const distance =
      Math.sqrt(dx * dx + dy * dy);

    if (
      distance <= 25 &&
      distance < closestDistance
    ) {
      closest = element;
      closestDistance = distance;
    }
  }

  if (!closest) {
    return;
  }

  selectedElementId = closest.id;

  updateEditorData();
  render();
  renderElementList();
}

function updateEditorData() {
  const element =
    elements.find(
      (item) => item.id === selectedElementId
    );

  if (!element) {
    coordXElement.textContent = "—";
    coordYElement.textContent = "—";

    normalizedXElement.textContent = "—";
    normalizedYElement.textContent = "—";

    return;
  }

  idElement.value = element.id;
  typeElement.value = element.type;

  coordXElement.textContent =
    element.x;

  coordYElement.textContent =
    element.y;

  normalizedXElement.textContent =
    element.normalizedX;

  normalizedYElement.textContent =
    element.normalizedY;
}

function deleteSelectedElement() {
  if (!selectedElementId) {
    messageElement.textContent =
      "No hay ningún elemento seleccionado.";

    return;
  }

  const index =
    elements.findIndex(
      (element) =>
        element.id === selectedElementId
    );

  if (index === -1) {
    return;
  }

  const deleted =
    elements.splice(index, 1)[0];

  selectedElementId = null;

  updateEditorData();
  render();
  renderElementList();

  messageElement.textContent =
    `Elemento "${deleted.id}" eliminado.`;
}

function renderElementList() {
  elementList.innerHTML = "";

  if (elements.length === 0) {
    elementList.textContent =
      "No hay elementos.";
    return;
  }

  for (const element of elements) {
    const item =
      document.createElement("div");

    item.className = "element-item";

    if (
      element.id === selectedElementId
    ) {
      item.classList.add("selected");
    }

    const title =
      document.createElement("strong");

    title.textContent = element.id;

    const details =
      document.createElement("span");

    details.textContent =
      `${element.type} · X ${element.x} · Y ${element.y}`;

    item.appendChild(title);
    item.appendChild(details);

    item.addEventListener(
      "click",
      () => {
        selectedElementId =
          element.id;

        updateEditorData();
        render();
        renderElementList();
      }
    );

    elementList.appendChild(item);
  }
}

placeButton.addEventListener(
  "click",
  () => {
    placing = !placing;

    placeButton.textContent =
      placing
        ? "Colocación activa"
        : "Activar colocación";

    messageElement.textContent =
      placing
        ? "Toca una posición del mapa."
        : "Colocación desactivada.";
  }
);

deleteButton.addEventListener(
  "click",
  deleteSelectedElement
);

clearButton.addEventListener(
  "click",
  () => {
    selectedElementId = null;

    updateEditorData();
    render();
    renderElementList();

    messageElement.textContent =
      "Selección eliminada.";
  }
);

canvas.addEventListener(
  "pointerdown",
  (event) => {
    if (placing) {
      createElement(event);
      return;
    }

    selectElementAtPosition(event);
  }
);

loadMap();
