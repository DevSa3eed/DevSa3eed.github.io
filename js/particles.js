class Particle {
    constructor(x, y, size, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > window.innerWidth) this.speedX *= -1;
        if (this.y < 0 || this.y > window.innerHeight) this.speedY *= -1;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(1, 117, 194, ${this.opacity})`;
        ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.setupCanvas();
        this.createParticles();
        this.animate();
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '0';
        document.querySelector('.particles-container').appendChild(this.canvas);
    }

    createParticles() {
        const particleCount = Math.floor(window.innerWidth * window.innerHeight / 10000);
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 2 + 1;
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const speedX = (Math.random() - 0.5) * 0.5;
            const speedY = (Math.random() - 0.5) * 0.5;
            this.particles.push(new Particle(x, y, size, speedX, speedY));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.update();
            particle.draw(this.ctx);
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the particle system
document.addEventListener('DOMContentLoaded', () => {
    new ParticleSystem();
}); 