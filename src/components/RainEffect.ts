export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(addend: Vector2) {
    this.x += addend.x;
    this.y += addend.y;
  }
}

class RainDrop {
  size: number = 2;
  life: number = 0;
  ttl: number = 0;
  position: Vector2;
  velocity: Vector2;
  terminalVelocity: number = 8;
  parent: Rain;

  constructor(parent: Rain) {
    this.parent = parent;
    this.init();
  }

  init() {
    this.life = 0;
    this.ttl = Math.random() * 500 + 300;
    this.position = new Vector2(Math.random() * window.innerWidth, 0);
    this.velocity = new Vector2(0.5 - Math.random() * 1, Math.random() * 1 + 0.2);
  }

  update() {
    if (this.position.x > window.innerWidth || this.position.x < -this.size || this.life > this.ttl) {
      this.init();
    }
    if (this.position.y > this.parent.floor) {
      this.position.y = this.parent.floor - this.size;
      this.velocity.y *= -0.2 - Math.random() * 0.3;
    }
    this.life++;
    this.position.add(this.velocity);
    this.velocity.y += 0.1;
  }
}

interface RainProps {
  rainDropCount: number;
  rainColor: string;
  backgroundColor: string;
}

export class Rain {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rainDrops: RainDrop[] = [];
  private dimensions: { width: number; height: number };
  floor: number;

  constructor(private props: RainProps) {
    this.init();
  }

  init() {
    this.createCanvas();
    this.resize();
    this.loop();
  }

  resize() {
    const attr = 'position: absolute; z-index: 0; top: 0; left: 0; height: 100vh; width: 100vw;';
    this.canvas.setAttribute('style', attr);

    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    this.canvas.width = this.dimensions.width;
    this.canvas.height = this.dimensions.height;
    this.floor = this.dimensions.height * 0.7;
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    
    document.body.insertBefore(this.canvas, document.body.firstChild);
  }

  draw() {
    this.ctx.fillStyle = this.props.backgroundColor;
    this.ctx.fillRect(0, 0, this.dimensions.width, this.floor);
    
    for (let i = 0; i < this.rainDrops.length; i++) {
      const rainDrop = this.rainDrops[i];
      rainDrop.update();
      this.ctx.fillStyle = this.props.rainColor;
      this.ctx.fillRect(rainDrop.position.x, rainDrop.position.y, rainDrop.size, rainDrop.size);
    }
    
    this.reflect();
  }

  reflect() {
    const grad = this.ctx.createLinearGradient(
      this.dimensions.width / 2,
      this.floor * 0.6,
      this.dimensions.width / 2,
      this.floor
    );
    grad.addColorStop(0, 'rgba(80,90,100,1)');
    grad.addColorStop(1, 'rgba(80,90,100,0)');
    
    this.ctx.save();
    this.ctx.scale(1, -1);
    this.ctx.translate(0, this.floor * -2);
    this.ctx.filter = 'blur(3px) saturate(150%)';
    this.ctx.drawImage(
      this.canvas,
      0,
      0,
      this.dimensions.width,
      this.floor,
      0,
      0,
      this.dimensions.width,
      this.floor
    );
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.dimensions.width, this.floor);
    this.ctx.restore();
  }

  loop() {
    if (this.rainDrops.length < this.props.rainDropCount) {
      setTimeout(() => {
        this.rainDrops.push(new RainDrop(this));
      }, Math.random() * 200);
    }
    
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  cleanup() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
} 