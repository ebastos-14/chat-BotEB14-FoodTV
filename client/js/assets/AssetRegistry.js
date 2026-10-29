const ASSET_CATEGORIES = Object.freeze([
  "characters",
  "roles",
  "objects",
  "restaurant",
  "ui",
  "animations"
]);

export class AssetRegistry {
  constructor() {
    this.assets = new Map();
  }

  register(id, definition) {
    if (!id || typeof id !== "string") {
      throw new Error("El ID del recurso debe ser un texto válido.");
    }

    if (this.assets.has(id)) {
      throw new Error(`El recurso "${id}" ya está registrado.`);
    }

    if (!definition || typeof definition !== "object") {
      throw new Error(`Definición inválida para "${id}".`);
    }

    if (!ASSET_CATEGORIES.includes(definition.category)) {
      throw new Error(
        `Categoría inválida para "${id}": ${definition.category}`
      );
    }

    this.assets.set(id, Object.freeze({
      id,
      ...definition
    }));
  }

  get(id) {
    return this.assets.get(id) ?? null;
  }

  has(id) {
    return this.assets.has(id);
  }

  getAll() {
    return [...this.assets.values()];
  }

  getByCategory(category) {
    if (!ASSET_CATEGORIES.includes(category)) {
      return [];
    }

    return this.getAll().filter(
      (asset) => asset.category === category
    );
  }

  clear() {
    this.assets.clear();
  }
}

export { ASSET_CATEGORIES };
