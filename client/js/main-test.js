import { MapRenderer } from "./game/MapRenderer.js";

const canvas = document.getElementById("game-canvas");
const status = document.getElementById("game-status");

const renderer = new MapRenderer(canvas);

const RAPTOR_PATH = "/assets/raptors/";
const FOOD_PATH = "/assets/food/";

const RAPTOR_SPRITES = {
  lateral: "Raptor_Mod.png",
  front: "Raptor_Mod.png",
  back: "Raptor_Base.png"
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
  status.dataset.error = isError
    ? "true"
    : "false";
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

function loadImageForTest(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(
        new Error(
          `No se pudo cargar sprite: ${source}`
        )
      );
    };

    image.src = source;
  });
}

function getRaptorProfile(entity) {
  if (
    entity.profile === "lateral" ||
    entity.profile === "front" ||
    entity.profile === "back"
  ) {
    return entity.profile;
  }

  console.warn(
    "Profile Raptor desconocido:",
    entity.profile,
    entity
  );

  return "lateral";
}

async function startTest() {
  try {
    setStatus(
      "Cargando mapas de prueba..."
    );

    await renderer.load();

    const raptorMap =
      await loadJson(
        "/assets/raptors/map-raptors.json"
      );

    const foodMap =
      await loadJson(
        "/assets/food/map-food.json"
      );

    /*
     * =====================================================
     * RAPTORS
     * =====================================================
     */

    const raptorEntities =
      (raptorMap.entities ?? [])
        .filter(
          (entity) =>
            entity.type === "raptor"
        );

    console.log(
      "Ubicaciones Raptor encontradas:",
      raptorEntities
    );

    setStatus(
      `Encontradas ${raptorEntities.length} ubicaciones Raptor...`
    );

    /*
     * Cargar únicamente los tres sprites
     * necesarios para esta prueba.
     */

    const raptorSpriteFiles = [
      ...new Set(
        raptorEntities.map(
          (entity) => {
            const profile =
              getRaptorProfile(entity);

            return RAPTOR_SPRITES[
              profile
            ];
          }
        )
      )
    ];

    for (
      const file of
      raptorSpriteFiles
    ) {
      const path =
        `${RAPTOR_PATH}${file}`;

      const image =
        await loadImageForTest(path);

      console.log(
        "Raptor sprite OK:",
        file,
        `${image.naturalWidth}x${image.naturalHeight}`
      );
    }

    /*
     * Colocar automáticamente un Raptor
     * en CADA ubicación del mapa.
     */

    let raptorCount = 0;

    for (
      const entity of
      raptorEntities
    ) {
      const profile =
        getRaptorProfile(entity);

      const spriteName =
        RAPTOR_SPRITES[profile];

      const source =
        RAPTOR_SOURCE[profile];

      renderer.setRuntimeRaptor(
        entity.id,
        {
          sprite:
            `${RAPTOR_PATH}${spriteName}`,

          source,

          mirror:
            Boolean(entity.mirror)
        }
      );

      raptorCount++;

      console.log(
        "Raptor colocado:",
        {
          id: entity.id,
          profile,
          sprite: spriteName,
          position: entity.position,
          scale: entity.scale,
          mirror: entity.mirror,
          layer: entity.layer
        }
      );
    }

    /*
     * =====================================================
     * FOOD
     * =====================================================
     */

    const foodEntities =
      (foodMap.entities ?? [])
        .filter(
          (entity) =>
            entity.type === "food" ||
            entity.type === "drink" ||
            entity.type === "bag"
        );

    let foodCount = 0;

    for (
      const entity of
      foodEntities
    ) {
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
          source:
            FOOD_SOURCE
        }
      );

      foodCount++;
    }

    /*
     * =====================================================
     * RENDER FINAL
     * =====================================================
     */

    renderer.render();

    setStatus(
      `MODO TEST — ${raptorCount} Raptors + ${foodCount} objetos`
    );

    console.log(
      "========================================"
    );

    console.log(
      "chat-BotEB14-FoodTV — SPRITE TEST"
    );

    console.log(
      "========================================"
    );

    console.log(
      "Ubicaciones Raptor:",
      raptorEntities.length
    );

    console.log(
      "Raptors colocados:",
      raptorCount
    );

    console.log(
      "Objetos Food:",
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
