const RAPTOR_MAP_URL =
  "/assets/raptors/map-raptors.json";

const FOOD_MAP_URL =
  "/assets/food/map-food.json";

const RENDER_LAYERS_URL =
  "/assets/restaurant/render-layers.json";

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
    this.renderLayersConfig = null;

    /*
     * Layout fijo.
     *
     * Contiene únicamente las posiciones
     * definidas por los mapas/editor.
     */
    this.layout = {
      raptors: new Map(),
      food: new Map()
    };

    /*
     * Capas visuales fijas.
     *
     * Ejemplo:
     *
     * layer 0 -> fondo
     * layer 3 -> Mostrador
     */
    this.renderLayers = [];

    /*
     * Estado visual/runtime.
     *
     * Posteriormente será controlado por
     * GameState y por los comandos.
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
      foodMap,
      renderLayersConfig
    ] = await Promise.all([
      this.loadJson(RAPTOR_MAP_URL),
      this.loadJson(FOOD_MAP_URL),
      this.loadJson(RENDER_LAYERS_URL)
    ]);

    this.validateMap(
      raptorMap,
      "raptors"
    );

    this.validateMap(
      foodMap,
      "food"
    );

    this.validateRenderLayers(
      renderLayersConfig
    );

    this.raptorMap = raptorMap;
    this.foodMap = foodMap;
    this.renderLayersConfig =
      renderLayersConfig;

    /*
     * El fondo principal sigue siendo
     * la imagen completa del restaurante.
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

    /*
     * Preparamos las capas visuales
     * adicionales definidas en JSON.
     */
    await this.loadRenderLayers();

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

  validateMap(
    map,
    moduleName
  ) {
    if (
      !map ||
      typeof map !== "object"
    ) {
      throw new Error(
        `El mapa ${moduleName} no contiene un objeto válido.`
      );
    }

    if (
      !Array.isArray(
        map.entities
      )
    ) {
      throw new Error(
        `El mapa ${moduleName} no contiene entities.`
      );
    }

    const ids =
      new Set();

    for (
      const entity of map.entities
    ) {
      if (!entity.id) {
        throw new Error(
          `Existe una entidad sin ID en el mapa ${moduleName}.`
        );
      }

      if (
        ids.has(entity.id)
      ) {
        throw new Error(
          `ID duplicado en ${moduleName}: ${entity.id}`
        );
      }

      ids.add(entity.id);
    }
  }

  validateRenderLayers(
    config
  ) {
    if (
      !config ||
      typeof config !== "object"
    ) {
      throw new Error(
        "render-layers.json no contiene un objeto válido."
      );
    }

    if (
      !Array.isArray(
        config.layers
      )
    ) {
      throw new Error(
        "render-layers.json no contiene layers."
      );
    }

    const ids =
      new Set();

    for (
      const layer of config.layers
    ) {
      if (!layer.id) {
        throw new Error(
          "Existe una capa visual sin ID."
        );
      }

      if (
        ids.has(layer.id)
      ) {
        throw new Error(
          `ID duplicado en render-layers.json: ${layer.id}`
        );
      }

      ids.add(layer.id);

      if (!layer.asset) {
        throw new Error(
          `La capa ${layer.id} no tiene asset.`
        );
      }

      if (
        typeof layer.layer !== "number"
      ) {
        throw new Error(
          `La capa ${layer.id} necesita un layer numérico.`
        );
      }
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

  async loadRenderLayers() {
    this.renderLayers = [];

    for (
      const layerConfig of
      this.renderLayersConfig.layers
    ) {
      /*
       * El fondo principal se dibuja
       * mediante renderBackground().
       *
       * No lo duplicamos aquí.
       */
      if (
        layerConfig.asset ===
        this.raptorMap.background?.asset
      ) {
        continue;
      }

      const image =
        await this.loadImageAsync(
          layerConfig.asset
        );

      this.renderLayers.push({
        id:
          layerConfig.id,

        type:
          layerConfig.type ||
          "image",

        asset:
          layerConfig.asset,

        layer:
          Number(
            layerConfig.layer
          ),

        priority:
          Number(
            layerConfig.priority
          ) || 0,

        image
      });
    }

    /*
     * Orden principal por layer.
     *
     * priority permite resolver dos elementos
     * que estén exactamente en la misma capa.
     */
    this.renderLayers.sort(
      (a, b) => {
        if (
          a.layer !==
          b.layer
        ) {
          return (
            a.layer -
            b.layer
          );
        }

        return (
          a.priority -
          b.priority
        );
      }
    );
  }

  loadImageAsync(
    source
  ) {
    const cached =
      this.imageCache.get(
        source
      );

    if (cached) {
      return Promise.resolve(
        cached
      );
    }

    return new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          this.imageCache.set(
            source,
            image
          );

          resolve(image);
        };

        image.onerror = () => {
          reject(
            new Error(
              `No se pudo cargar imagen de capa: ${source}`
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
     * RAPTORS
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
          id:
            entity.id,

          type:
            "raptor",

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
            Number(
              entity.scale
            ) || 1,

          mirror:
            Boolean(
              entity.mirror
            ),

          layer:
            Number(
              entity.layer
            ) || 0
        }
      );
    }

    /*
     * FOOD / DRINK / BAG
     */
    for (
      const entity of
      this.foodMap.entities
    ) {
      /*
       * Las 8 entidades Menu_1...Menu_8
       * son solamente referencias del
       * spritesheet y no se renderizan
       * sobre el restaurante.
       */
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
        ].includes(
          entity.type
        )
      ) {
        continue;
      }

      this.layout.food.set(
        entity.id,
        {
          id:
            entity.id,

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
            Number(
              entity.scale
            ) || 1,

          layer:
            Number(
              entity.layer
            ) || 0,

          section:
            Number(
              entity.section
            ) || 1
        }
      );
    }
  }

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
        this.raptorMap
          ?.background
          ?.width
      ) ||
      Number(
        this.foodMap
          ?.background
          ?.width
      ) ||
      this.backgroundImage
        ?.naturalWidth ||
      1536;

    const height =
      Number(
        this.raptorMap
          ?.background
          ?.height
      ) ||
      Number(
        this.foodMap
          ?.background
          ?.height
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
        width *
          this.scale
      ) / 2;

    this.offsetY =
      (
        this.canvas.height -
        height *
          this.scale
      ) / 2;
  }

  mapToScreen(
    x,
    y
  ) {
    return {
      x:
        this.offsetX +
        x *
          this.scale,

      y:
        this.offsetY +
        y *
          this.scale
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

    /*
     * 1. FONDO
     */
    this.renderBackground();

    /*
     * 2. Construimos una lista única
     *    de todos los elementos que
     *    necesitan respetar capas.
     */
    const renderList = [];

    /*
     * RAPTORS
     */
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

      if (!runtime) {
        continue;
      }

      renderList.push({
        kind:
          "raptor",

        layout,

        runtime,

        layer:
          layout.layer || 0,

        priority: 0
      });
    }

    /*
     * FOOD / DRINK / BAG
     */
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
        kind:
          "food",

        layout,

        runtime,

        layer:
          layout.layer || 0,

        priority: 0
      });
    }

    /*
     * CAPAS VISUALES FIJAS
     *
     * Aquí entra Mostrador.png.
     *
     * No se pega directamente sobre
     * el canvas antes/después de todo.
     *
     * Forma parte del mismo sistema
     * de ordenamiento.
     */
    for (
      const layer of
      this.renderLayers
    ) {
      renderList.push({
        kind:
          "layer",

        layer,

        runtime: null,

        priority:
          layer.priority
      });
    }

    /*
     * Orden final.
     *
     * Primero layer.
     * Si coinciden, priority.
     */
    renderList.sort(
      (a, b) => {
        const layerA =
          Number(
            a.layer
          ) || 0;

        const layerB =
          Number(
            b.layer
          ) || 0;

        if (
          layerA !==
          layerB
        ) {
          return (
            layerA -
            layerB
          );
        }

        const priorityA =
          Number(
            a.priority
          ) || 0;

        const priorityB =
          Number(
            b.priority
          ) || 0;

        return (
          priorityA -
          priorityB
        );
      }
    );

    /*
     * Render final.
     */
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

        continue;
      }

      if (
        item.kind ===
        "food"
      ) {
        this.renderFood(
          item.layout,
          item.runtime
        );

        continue;
      }

      if (
        item.kind ===
        "layer"
      ) {
        this.renderFixedLayer(
          item.layer
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
      width *
        this.scale,
      height *
        this.scale
    );
  }

  renderFixedLayer(
    layer
  ) {
    if (
      !layer ||
      !layer.image
    ) {
      return;
    }

    const {
      width,
      height
    } = this.getMapSize();

    /*
     * Mostrador.png tiene exactamente
     * 1536 x 1536, por lo que se dibuja
     * exactamente encima del mapa completo.
     */
    this.ctx.drawImage(
      layer.image,
      this.offsetX,
      this.offsetY,
      width *
        this.scale,
      height *
        this.scale
    );
  }

  renderRaptor(
    layout,
    runtime
  ) {
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

    if (
      layout.mirror
    ) {
      this.ctx.translate(
        position.x +
          width,
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
