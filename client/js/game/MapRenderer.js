const RAPTOR_MAP_URL =
  "/assets/raptors/map-raptors.json";

const FOOD_MAP_URL =
  "/assets/food/map-food.json";

export class MapRenderer {
  constructor(canvas) {
    if (!canvas) {
      throw new Error(
        "MapRenderer necesita un elemento canvas."
      );
    }

    this.canvas = canvas;

    this.ctx = canvas.getContext("2d");

    if (!this.ctx) {
      throw new Error(
        "No se pudo obtener el contexto 2D."
      );
    }

    this.backgroundImage = null;

    this.raptorMap = null;
    this.foodMap = null;

    /*
     * Layout fijo.
     *
     * Aquí solamente guardamos las posiciones
     * definidas por los editores.
     */
    this.layout = {
      raptors: new Map(),
      food: new Map()
    };

    /*
     * Estado visual/runtime.
     *
     * Esto será modificado posteriormente
     * por GameState y por los comandos de chat.
     *
     * Ejemplo:
     *
     * raptors:
     * {
     *   Lateral_L_1: {
     *     sprite: "Raptor_Mod.png"
     *   }
     * }
     */
    this.runtime = {
      raptors: new Map(),
      food: new Map()
    };

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.imageCache = new Map();
    this.loadingImages = new Set();
  }

  async load() {
    const [
      raptorMap,
      foodMap
    ] = await Promise.all([
      this.loadJson(RAPTOR_MAP_URL),
      this.loadJson(FOOD_MAP_URL)
    ]);

    this.validateMap(
      raptorMap,
      "raptors"
    );

    this.validateMap(
      foodMap,
      "food"
    );

    this.raptorMap = raptorMap;
    this.foodMap = foodMap;

    /*
     * El fondo pertenece al mapa principal.
     * Ambos JSON deberían apuntar al mismo fondo.
     */
    const backgroundAsset =
      raptorMap.background?.asset ||
      foodMap.background?.asset;

    if (!backgroundAsset) {
      throw new Error(
        "No se encontró background.asset."
      );
    }

    await this.loadBackground(
      backgroundAsset
    );

    this.buildLayout();

    this.resize();

    this.render();

    return this;
  }

  async loadJson(url) {
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

  validateMap(map, moduleName) {
    if (
      !map ||
      typeof map !== "object"
    ) {
      throw new Error(
        `El mapa ${moduleName} no contiene un objeto válido.`
      );
    }

    if (
      !Array.isArray(map.entities)
    ) {
      throw new Error(
        `El mapa ${moduleName} no contiene entities.`
      );
    }

    const ids =
      new Set();

    for (const entity of map.entities) {
      if (!entity.id) {
        throw new Error(
          `Existe una entidad sin ID en el mapa ${moduleName}.`
        );
      }

      if (ids.has(entity.id)) {
        throw new Error(
          `ID duplicado en ${moduleName}: ${entity.id}`
        );
      }

      ids.add(entity.id);
    }
  }

  async loadBackground(
    source
  ) {
    return new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          this.backgroundImage =
            image;

          resolve(image);
        };

        image.onerror = () => {
          reject(
            new Error(
              `No se pudo cargar el fondo: ${source}`
            )
          );
        };

        image.src =
          source;
      }
    );
  }

  buildLayout() {
    this.layout.raptors.clear();
    this.layout.food.clear();

    /*
     * =========================
     * RAPTORS
     * =========================
     *
     * Importamos:
     * - id
     * - type
     * - profile
     * - position
     * - scale
     * - mirror
     * - layer
     *
     * NO importamos:
     * - sprite activo
     * - assignment
     * - imagen
     */

    for (
      const entity of
      this.raptorMap.entities
    ) {
      if (
        entity.type !==
        "raptor"
      ) {
        continue;
      }

      this.layout.raptors.set(
        entity.id,
        {
          id: entity.id,
          type: "raptor",

          profile:
            entity.profile ||
            "lateral",

          position: {
            x:
              Number(
                entity.position?.x
              ) || 0,

            y:
              Number(
                entity.position?.y
              ) || 0
          },

          scale:
            Number(entity.scale) ||
            1,

          mirror:
            Boolean(entity.mirror),

          layer:
            Number(entity.layer) ||
            0
        }
      );
    }

    /*
     * =========================
     * FOOD
     * =========================
     *
     * Las entidades "menu" son
     * ignoradas por el RenderMap.
     *
     * Esas coordenadas sirven al
     * editor para saber de dónde
     * cortar sprites.
     *
     * El juego principal NO las
     * necesita aquí.
     */

    for (
      const entity of
      this.foodMap.entities
    ) {
      if (
        entity.type ===
        "menu"
      ) {
        continue;
      }

      if (
        ![
          "food",
          "drink",
          "bag"
        ].includes(entity.type)
      ) {
        continue;
      }

      this.layout.food.set(
        entity.id,
        {
          id: entity.id,

          type:
            entity.type,

          position: {
            x:
              Number(
                entity.position?.x
              ) || 0,

            y:
              Number(
                entity.position?.y
              ) || 0
          },

          scale:
            Number(entity.scale) ||
            1,

          layer:
            Number(entity.layer) ||
            0,

          /*
           * La sección es una
           * propiedad lógica de la
           * ubicación.
           *
           * NO es todavía un sprite.
           */
          section:
            Number(entity.section) ||
            1
        }
      );
    }
  }

  /*
   * Permite que GameState entregue
   * el estado visual actual.
   *
   * Ejemplo:
   *
   * renderer.setRuntimeRaptor(
   *   "Lateral_L_1",
   *   {
   *     sprite: "Raptor_Mod.png"
   *   }
   * );
   */
  setRuntimeRaptor(
    locationId,
    data
  ) {
    if (
      !this.layout.raptors.has(
        locationId
      )
    ) {
      throw new Error(
        `Ubicación de Raptor desconocida: ${locationId}`
      );
    }

    this.runtime.raptors.set(
      locationId,
      {
        ...data
      }
    );

    this.render();
  }

  removeRuntimeRaptor(
    locationId
  ) {
    this.runtime.raptors.delete(
      locationId
    );

    this.render();
  }

  setRuntimeFood(
    locationId,
    data
  ) {
    if (
      !this.layout.food.has(
        locationId
      )
    ) {
      throw new Error(
        `Ubicación de comida desconocida: ${locationId}`
      );
    }

    this.runtime.food.set(
      locationId,
      {
        ...data
      }
    );

    this.render();
  }

  removeRuntimeFood(
    locationId
  ) {
    this.runtime.food.delete(
      locationId
    );

    this.render();
  }

  getRaptorLocation(
    locationId
  ) {
    return (
      this.layout.raptors.get(
        locationId
      ) || null
    );
  }

  getFoodLocation(
    locationId
  ) {
    return (
      this.layout.food.get(
        locationId
      ) || null
    );
  }

  getMapSize() {
    const width =
      Number(
        this.raptorMap?.background?.width
      ) ||
      Number(
        this.foodMap?.background?.width
      ) ||
      this.backgroundImage
        ?.naturalWidth ||
      1536;

    const height =
      Number(
        this.raptorMap?.background?.height
      ) ||
      Number(
        this.foodMap?.background?.height
      ) ||
      this.backgroundImage
        ?.naturalHeight ||
      1536;

    return {
      width,
      height
    };
  }

  resize() {
    const {
      width,
      height
    } = this.getMapSize();

    this.scale =
      Math.min(
        this.canvas.width /
          width,

        this.canvas.height /
          height
      );

    this.offsetX =
      (
        this.canvas.width -
        width * this.scale
      ) / 2;

    this.offsetY =
      (
        this.canvas.height -
        height * this.scale
      ) / 2;
  }

  mapToScreen(
    x,
    y
  ) {
    return {
      x:
        this.offsetX +
        x * this.scale,

      y:
        this.offsetY +
        y * this.scale
    };
  }

  loadImage(
    source
  ) {
    if (!source) {
      return null;
    }

    if (
      this.imageCache.has(
        source
      )
    ) {
      return this.imageCache.get(
        source
      );
    }

    if (
      this.loadingImages.has(
        source
      )
    ) {
      return null;
    }

    this.loadingImages.add(
      source
    );

    const image =
      new Image();

    image.onload = () => {
      this.loadingImages.delete(
        source
      );

      this.imageCache.set(
        source,
        image
      );

      this.render();
    };

    image.onerror = () => {
      this.loadingImages.delete(
        source
      );

      console.error(
        `No se pudo cargar sprite: ${source}`
      );
    };

    image.src =
      source;

    return null;
  }

  render() {
    if (
      !this.backgroundImage
    ) {
      return;
    }

    this.ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    this.ctx.imageSmoothingEnabled =
      false;

    this.renderBackground();

    /*
     * Los objetos se mezclan en una
     * sola lista para respetar layer.
     */
    const renderList = [];

    for (
      const [
        id,
        layout
      ] of this.layout.raptors
    ) {
      const runtime =
        this.runtime.raptors.get(
          id
        );

      /*
       * Si no existe estado runtime,
       * no dibujamos sprite.
       *
       * La ubicación sí existe,
       * pero está vacía.
       */
      if (!runtime) {
        continue;
      }

      renderList.push({
        kind: "raptor",
        layout,
        runtime
      });
    }

    for (
      const [
        id,
        layout
      ] of this.layout.food
    ) {
      const runtime =
        this.runtime.food.get(
          id
        );

      if (!runtime) {
        continue;
      }

      renderList.push({
        kind: "food",
        layout,
        runtime
      });
    }

    renderList.sort(
      (a, b) =>
        (a.layout.layer || 0) -
        (b.layout.layer || 0)
    );

    for (
      const item of
      renderList
    ) {
      if (
        item.kind ===
        "raptor"
      ) {
        this.renderRaptor(
          item.layout,
          item.runtime
        );
      }

      if (
        item.kind ===
        "food"
      ) {
        this.renderFood(
          item.layout,
          item.runtime
        );
      }
    }
  }

  renderBackground() {
    const {
      width,
      height
    } = this.getMapSize();

    this.ctx.fillStyle =
      "#111";

    this.ctx.fillRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    this.ctx.drawImage(
      this.backgroundImage,
      this.offsetX,
      this.offsetY,
      width * this.scale,
      height * this.scale
    );
  }

  renderRaptor(
    layout,
    runtime
  ) {
    /*
     * El sprite viene del runtime.
     *
     * El mapa NO decide cuál Raptor
     * está ocupando la ubicación.
     */
    if (!runtime.sprite) {
      return;
    }

    const source =
      runtime.source;

    if (!source) {
      /*
       * Por ahora dejamos esta parte
       * preparada para el sistema de
       * sprites de Raptor.
       */
      return;
    }

    const image =
      this.loadImage(
        runtime.sprite
      );

    if (!image) {
      return;
    }

    const scale =
      layout.scale *
      this.scale;

    const width =
      source.width *
      scale;

    const height =
      source.height *
      scale;

    const position =
      this.mapToScreen(
        layout.position.x,
        layout.position.y
      );

    this.ctx.save();

    this.ctx.imageSmoothingEnabled =
      false;

    if (layout.mirror) {
      this.ctx.translate(
        position.x + width,
        position.y
      );

      this.ctx.scale(
        -1,
        1
      );

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

        position.x,
        position.y,
        width,
        height
      );
    }

    this.ctx.restore();
  }

  renderFood(
    layout,
    runtime
  ) {
    /*
     * Igual que los Raptors:
     *
     * layout = posición
     * runtime = sprite/estado
     */

    if (!runtime.sprite) {
      return;
    }

    const source =
      runtime.source;

    if (!source) {
      return;
    }

    const image =
      this.loadImage(
        runtime.sprite
      );

    if (!image) {
      return;
    }

    const scale =
      layout.scale *
      this.scale;

    const width =
      source.width *
      scale;

    const height =
      source.height *
      scale;

    const position =
      this.mapToScreen(
        layout.position.x,
        layout.position.y
      );

    this.ctx.save();

    this.ctx.imageSmoothingEnabled =
      false;

    this.ctx.drawImage(
      image,

      source.x,
      source.y,
      source.width,
      source.height,

      position.x,
      position.y,
      width,
      height
    );

    this.ctx.restore();
  }
}
