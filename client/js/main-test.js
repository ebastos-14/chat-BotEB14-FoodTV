import { MapRenderer } from "./game/MapRenderer.js";

const canvas = document.getElementById("game-canvas");
const status = document.getElementById("game-status");

const renderer = new MapRenderer(canvas);

const RAPTOR_PATH = "/assets/raptors/";
const FOOD_PATH = "/assets/food/";

const RAPTOR_TEST_ASSIGNMENTS = {
  Lateral_L_1: "Raptor_Mod.png",
  Lateral_L_2: "Raptor_EBastos14.png",
  Lateral_L_3: "Raptor_JaciiTV_1.png",
  Lateral_L_4: "Raptor_JaciiTV_2.png",

  Lateral_R_1: "Raptor_Mod.png",
  Lateral_R_2: "Raptor_EBastos14.png",
  Lateral_R_3: "Raptor_JaciiTV_1.png",
  Lateral_R_4: "Raptor_JaciiTV_2.png",

  Front: "Raptor_Mod.png",

  Back_1: "Raptor_Base.png",
  Back_2: "Raptor_Vip.png",
  Back_3: "Raptor_Sub.png",
  Back_4: "Raptor_Mod.png"
};

const RAPTOR_SOURCE = {
  lateral: {
    x: 40,
    y: 170,
    width: 375,
    height: 545
  },

  front: {
    x: 454,
    y: 170,
    width: 355,
    height: 545
  },

  back: {
    x: 850,
    y: 165,
    width: 375,
    height: 545
  }
};

const FOOD_TEST_SPRITES = {
  food: {
    sprite: `${FOOD_PATH}Menu_Taco.png`,
    source: {
      x: 15,
      y: 25,
      width: 276,
      height: 390
    }
  },

  drink: {
    sprite: `${FOOD_PATH}Menu_Bebida.png`,
    source: {
      x: 15,
      y: 25,
      width: 276,
      height: 390
    }
  },

  bag: {
    sprite: `${FOOD_PATH}Menu_Bolsa.png`,
    source: {
      x: 15,
      y: 25,
      width: 276,
      height: 390
    }
  }
};

function setStatus(message, isError = false) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}

function getRaptorProfile(entity) {
  if (entity.profile === "lateral") {
    return "lateral";
  }

  if (entity.profile === "front") {
    return "front";
  }

  if (entity.profile === "back") {
    return "back";
  }

  return "lateral";
}

function getRaptorSource(entity) {
  return RAPTOR_SOURCE[getRaptorProfile(entity)];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`No se pudo cargar el sprite: ${src}`));
    };

    image.src = src;
  });
}

async function createTestState() {
  const raptorMapResponse = await fetch(
    "/assets/raptors/map-raptors.json",
    { cache: "no-store" }
  );

  if (!raptorMapResponse.ok) {
    throw new Error("No se pudo cargar map-raptors.json.");
  }

  const raptorMap = await raptorMapResponse.json();

  const foodMapResponse = await fetch(
    "/assets/food/map-food.json",
    { cache: "no-store" }
  );

  if (!foodMapResponse.ok) {
    throw new Error("No se pudo cargar map-food.json.");
  }

  const foodMap = await foodMapResponse.json();

  const raptors = new Map();

  for (const entity of raptorMap.entities ?? []) {
    if (entity.type !== "raptor") {
      continue;
    }

    const spriteName = RAPTOR_TEST_ASSIGNMENTS[entity.id];

    if (!spriteName) {
      continue;
    }

    raptors.set(entity.id, {
      sprite: `${RAPTOR_PATH}${spriteName}`,
      source: getRaptorSource(entity),
      mirror: Boolean(entity.mirror)
    });
  }

  const food = new Map();

  for (const entity of foodMap.entities ?? []) {
    if (!["food", "drink", "bag"].includes(entity.type)) {
      continue;
    }

    const spriteConfig = FOOD_TEST_SPRITES[entity.type];

    if (!spriteConfig) {
      continue;
    }

    food.set(entity.id, {
      sprite: spriteConfig.sprite,
      source: spriteConfig.source
    });
  }

  return {
    raptors,
    food
  };
}

async function preloadImages(state) {
  const sources = new Set();

  for (const item of state.raptors.values()) {
    sources.add(item.sprite);
  }

  for (const item of state.food.values()) {
    sources.add(item.sprite);
  }

  await Promise.all(
    [...sources].map((src) => loadImage(src))
  );
}

async function startTest() {
  try {
    setStatus("Cargando mapa de prueba...");

    await renderer.initialize();

    const state = await createTestState();

    setStatus("Cargando sprites de prueba...");

    await preloadImages(state);

    renderer.clearRuntime();

    for (const [id, raptor] of state.raptors) {
      renderer.setRuntimeRaptor(id, raptor);
    }

    for (const [id, item] of state.food) {
      renderer.setRuntimeFood(id, item);
    }

    renderer.render();

    setStatus(
      `MODO TEST — ${state.raptors.size} Raptors + ${state.food.size} objetos`
    );

    console.log("=== chat-BotEB14-FoodTV — SPRITE TEST ===");
    console.log("Raptors:", state.raptors);
    console.log("Food:", state.food);
    console.log("Mapa de Raptors:", renderer.layout.raptors);
    console.log("Mapa de Food:", renderer.layout.food);
  } catch (error) {
    console.error("Error en el test de sprites:", error);

    setStatus(
      `ERROR EN TEST: ${error.message}`,
      true
    );
  }
}

function resizeCanvas() {
  if (typeof renderer.resize === "function") {
    renderer.resize();
  }

  renderer.render();
}

window.addEventListener("resize", resizeCanvas);

startTest();
