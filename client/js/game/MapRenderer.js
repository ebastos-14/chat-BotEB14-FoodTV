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

  render() {
    if (this.error) {
      this.renderError();
      return;
    }

    if (!this.loaded) {
      this.renderLoading();
      return;
    }

    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;

    const imageWidth = this.image.naturalWidth;
    const imageHeight = this.image.naturalHeight;

    const scale = Math.min(
      canvasWidth / imageWidth,
      canvasHeight / imageHeight
    );

    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.imageSmoothingEnabled = false;

    this.ctx.drawImage(
      this.image,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
  }

  renderLoading() {
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "20px monospace";
    this.ctx.textAlign = "center";

    this.ctx.fillText(
      "Cargando mapa...",
      canvasWidth / 2,
      canvasHeight / 2
    );
  }

  renderError() {
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.ctx.fillStyle = "#f44";
    this.ctx.font = "18px monospace";
    this.ctx.textAlign = "center";

    this.ctx.fillText(
      this.error,
      canvasWidth / 2,
      canvasHeight / 2
    );
  }
}
