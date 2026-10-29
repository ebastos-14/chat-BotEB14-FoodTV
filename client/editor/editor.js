const canvas = document.querySelector("#editor-canvas");
const ctx = canvas.getContext("2d");

const statusElement = document.querySelector("#editor-status");
const messageElement = document.querySelector("#editor-message");

const typeElement = document.querySelector("#element-type");
const idElement = document.querySelector("#element-id");

const placeButton = document.querySelector("#place-button");
const clearButton = document.querySelector("#clear-button");

const coordXElement = document.querySelector("#coord-x");
const coordYElement = document.querySelector("#coord-y");

const normalizedXElement = document.querySelector("#normalized-x");
const normalizedYElement = document.querySelector("#normalized-y");

let mapDefinition = null;
let mapImage = null;

let placing = false;
let selectedPoint = null;

async function loadMap() {
  try {
    const response = await fetch("/assets/restaurant/map.json");

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
    };

    mapImage.onerror = () => {
      throw new Error("No se pudo cargar map-background.png.");
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
    throw new Error("El mapa no tiene ruta de fondo.");
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

  if (selectedPoint) {
    drawSelectedPoint();
  }
}

function drawSelectedPoint() {
  const point = selectedPoint;

  ctx.save();

  ctx.beginPath();
  ctx.arc(
    point.x,
    point.y,
    12,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle = "#ff0000";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(point.x - 18, point.y);
  ctx.lineTo(point.x + 18, point.y);

  ctx.moveTo(point.x, point.y - 18);
  ctx.lineTo(point.x, point.y + 18);

  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.textAlign = "left";

  ctx.fillText(
    point.id || "sin-id",
    point.x + 20,
    point.y - 20
  );

  ctx.restore();
}

function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function selectPosition(event) {
  if (!placing) {
    return;
  }

  const position = getCanvasPosition(event);

  const normalizedX = position.x / canvas.width;
  const normalizedY = position.y / canvas.height;

  selectedPoint = {
    id: idElement.value.trim() || "unnamed",
    type: typeElement.value,
    x: Math.round(position.x),
    y: Math.round(position.y),
    normalizedX: Number(normalizedX.toFixed(6)),
    normalizedY: Number(normalizedY.toFixed(6))
  };

  coordXElement.textContent = selectedPoint.x;
  coordYElement.textContent = selectedPoint.y;

  normalizedXElement.textContent =
    selectedPoint.normalizedX;

  normalizedYElement.textContent =
    selectedPoint.normalizedY;

  messageElement.textContent =
    "Punto seleccionado. Todavía no se ha guardado.";

  render();
}

placeButton.addEventListener("click", () => {
  placing = !placing;

  placeButton.textContent = placing
    ? "Colocación activa"
    : "Activar colocación";

  messageElement.textContent = placing
    ? "Toca una posición sobre el mapa."
    : "Colocación desactivada.";
});

clearButton.addEventListener("click", () => {
  selectedPoint = null;

  coordXElement.textContent = "—";
  coordYElement.textContent = "—";

  normalizedXElement.textContent = "—";
  normalizedYElement.textContent = "—";

  messageElement.textContent = "";

  render();
});

canvas.addEventListener("pointerdown", selectPosition);

loadMap();
