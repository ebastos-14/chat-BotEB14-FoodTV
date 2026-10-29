export class MapRenderer {
  constructor(ctx, mapDefinition) {
    this.ctx = ctx;
    this.mapDefinition = mapDefinition;

    this.image = new Image();
    this.loaded = false;
    this.error = null;

    this.load();
  }

  load() {
    this.image.onload = () => {
      this.loaded = true;
    };

    this.image.onerror = () => {
      this.error = "No se pudo cargar el fondo del mapa.";
      console.error(this.error);
    };

    this.image.src = this.mapDefinition.background.asset;
  }

  render(viewport) {
    if (this.error) {
      this.renderError(viewport);
      return;
    }

    if (!this.loaded) {
      this.renderLoading(viewport);
      return;
    }

    const { ctx } = this;
    const background = this.mapDefinition.background;

    ctx.drawImage(
      this.image,
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
      0,
      0,
      viewport.canvasWidth,
      viewport.canvasHeight
    );

    void background;
  }

  renderLoading(viewport) {
    const { ctx } = this;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, viewport.canvasWidth, viewport.canvasHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
      "Cargando mapa...",
      viewport.canvasWidth / 2,
      viewport.canvasHeight / 2
    );
  }

  renderError(viewport) {
    const { ctx } = this;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, viewport.canvasWidth, viewport.canvasHeight);

    ctx.fillStyle = "#f44";
    ctx.font = "18px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
      this.error,
      viewport.canvasWidth / 2,
      viewport.canvasHeight / 2
    );
  }
}
