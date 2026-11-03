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
  food: `${FOOD_PATH}Menu_Taco.png`,
  drink: `${FOOD_PATH}Menu_Bebida.png`,
  bag: `${FOOD_PATH}Menu_Bolsa.png`
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

function loadImageForTest(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(
        new Error(
          `No se pudo cargar: ${source}`
        )
      );
    };

    image.src = source;
  });
}

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

async function startTest() {
  try {
    setStatus("Cargando mapas de prueba...");

    await renderer.load();

    const raptorMap = await loadJson(
      "/assets/raptors/map-raptors.json"
    );

    const foodMap = await loadJson(
      "/assets/food/map-food.json"
    );

    /*
     * =====================================================
     * 1. COMPROBAR ARCHIVOS DE RAPTOR
     * =====================================================
     */

    setStatus("Comprobando sprites de Raptors...");

    const raptorFiles = [
      ...new Set(
        Object.values(
          RAPTOR_TEST_ASSIGNMENTS
        )
      )
    ];

    for (const file of raptorFiles) {
      const path = `${RAPTOR_PATH}${file}`;

      const image =
        await loadImageForTest(path);

      console.log(
        `Raptor OK: ${file}`,
        `${image.naturalWidth}x${image.naturalHeight}`
      );
    }

    /*
     * =====================================================
     * 2. COMPROBAR ARCHIVOS FOOD
     * =====================================================
     */

    const foodFiles = [
      ...new Set(
        Object.values(
          FOOD_TEST_SPRITES
        )
      )
    ];

    for (const path of foodFiles) {
      const image =
        await loadImageForTest(path);

      console.log(
        `Food OK: ${path}`,
        `${image.naturalWidth}x${image.naturalHeight}`
      );
    }

    /*
     * =====================================================
     * 3. COLOCAR RAPTORS
     * =====================================================
     */

    let raptorCount = 0;

    for (const entity of raptorMap.entities ?? []) {
      if (entity.type !== "raptor") {
        continue;
      }

      const spriteName =
        RAPTOR_TEST_ASSIGNMENTS[
          entity.id
        ];

      if (!spriteName) {
        console.warn(
          `Sin sprite de prueba para ${entity.id}`
        );

        continue;
      }

      renderer.setRuntimeRaptor(
        entity.id,
        {
          sprite:
            `${RAPTOR_PATH}${spriteName}`,

          source:
            getRaptorSource(entity),

          mirror:
            Boolean(entity.mirror)
        }
      );

      raptorCount++;

      console.log(
        "Raptor colocado:",
        entity.id,
        spriteName,
        entity.profile,
        entity.position
      );
    }

    /*
     * =====================================================
     * 4. COLOCAR FOOD
     * =====================================================
     */

    let foodCount = 0;

    for (const entity of foodMap.entities ?? []) {
      if (
        entity.type !== "food" &&
        entity.type !== "drink" &&
        entity.type !== "bag"
      ) {
        continue;
      }

      const sprite =
        FOOD_TEST_SPRITES[
          entity.type
        ];

      if (!sprite) {
        continue;
      }

      renderer.setRuntimeFood(
        entity.id,
        {
          sprite,
          source: FOOD_SOURCE
        }
      );

      foodCount++;
    }

    /*
     * =====================================================
     * 5. RENDER FINAL
     * =====================================================
     */

    renderer.render();

    setStatus(
      `MODO TEST — ${raptorCount} Raptors + ${foodCount} objetos`
    );

    console.log(
      "======================================"
    );

    console.log(
      "chat-BotEB14-FoodTV — SPRITE TEST"
    );

    console.log(
      "======================================"
    );

    console.log(
      "Raptors renderizados:",
      raptorCount
    );

    console.log(
      "Objetos renderizados:",
      foodCount
    );

    console.log(
      "Runtime Raptors:",
      renderer.runtime.raptors
    );

    console.log(
      "Runtime Food:",
      renderer.runtime.food
    );
  } catch (error) {
    console.error(
      "ERROR EN TEST:",
      error
    );

    setStatus(
      `ERROR EN TEST: ${error.message}`,
      true
    );
  }
}

function resizeCanvas() {
  renderer.resize();
  renderer.render();
}

window.addEventListener(
  "resize",
  resizeCanvas
);

startTest();
