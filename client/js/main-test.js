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

const FOOD_SOURCE = {
  x: 15,
  y: 25,
  width: 276,
  height: 390
};

const FOOD_TEST_SPRITES = {
  food: {
    sprite: `${FOOD_PATH}Menu_Taco.png`
  },

  drink: {
    sprite: `${FOOD_PATH}Menu_Bebida.png`
  },

  bag: {
    sprite: `${FOOD_PATH}Menu_Bolsa.png`
  }
};

function setStatus(message, isError = false) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}

function getRaptorSource(entity) {
  return (
    RAPTOR_SOURCE[entity.profile] ??
    RAPTOR_SOURCE.lateral
  );
}

async function loadJson(url) {
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}`);
  }

  return response.json();
}

async function startTest() {
  try {
    setStatus("Cargando mapas de prueba...");

    /*
     * El MapRenderer actual ya carga los mapas mediante load().
     * No usamos initialize(), porque esa función no existe
     * en la versión actual.
     */
    await renderer.load();

    const raptorMap = await loadJson(
      "/assets/raptors/map-raptors.json"
    );

    const foodMap = await loadJson(
      "/assets/food/map-food.json"
    );

    setStatus("Colocando sprites de prueba...");

    /*
     * Raptors
     */
    for (const entity of raptorMap.entities ?? []) {
      if (entity.type !== "raptor") {
        continue;
      }

      const spriteName =
        RAPTOR_TEST_ASSIGNMENTS[entity.id];

      if (!spriteName) {
        continue;
      }

      renderer.setRuntimeRaptor(entity.id, {
        sprite: `${RAPTOR_PATH}${spriteName}`,
        source: getRaptorSource(entity),
        mirror: Boolean(entity.mirror)
      });
    }

    /*
     * Food / drinks / bags
     */
    for (const entity of foodMap.entities ?? []) {
      if (
        entity.type !== "food" &&
        entity.type !== "drink" &&
        entity.type !== "bag"
      ) {
        continue;
      }

      const config =
        FOOD_TEST_SPRITES[entity.type];

      if (!config) {
        continue;
      }

      renderer.setRuntimeFood(entity.id, {
        sprite: config.sprite,
        source: FOOD_SOURCE
      });
    }

    renderer.render();

    const raptorCount =
      raptorMap.entities?.filter(
        (entity) => entity.type === "raptor"
      ).length ?? 0;

    const foodCount =
      foodMap.entities?.filter(
        (entity) =>
          entity.type === "food" ||
          entity.type === "drink" ||
          entity.type === "bag"
      ).length ?? 0;

    setStatus(
      `MODO TEST — ${raptorCount} Raptors + ${foodCount} objetos`
    );

    console.log(
      "=== chat-BotEB14-FoodTV — SPRITE TEST ==="
    );

    console.log("Raptors:", raptorMap);
    console.log("Food:", foodMap);
  } catch (error) {
    console.error(
      "Error en el test de sprites:",
      error
    );

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

window.addEventListener(
  "resize",
  resizeCanvas
);

startTest();
