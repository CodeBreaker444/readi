import 'leaflet';

declare module 'leaflet' {
  interface VelocityLayerDisplayOptions {
    velocityType?: string;
    position?: string;
    emptyString?: string;
    angleConvention?: string;
    showCardinal?: boolean;
    speedUnit?: string;
    directionString?: string;
    speedString?: string;
  }

  interface VelocityLayerOptions {
    displayValues?: boolean;
    displayOptions?: VelocityLayerDisplayOptions;
    data: unknown;
    minVelocity?: number;
    maxVelocity?: number;
    velocityScale?: number;
    colorScale?: string[];
    opacity?: number;
    paneName?: string;
  }

  class VelocityLayer extends Layer {
    constructor(options: VelocityLayerOptions);
    setData(data: unknown): void;
    setOptions(options: Partial<VelocityLayerOptions>): void;
  }

  function velocityLayer(options: VelocityLayerOptions): VelocityLayer;
}
