export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawn(opts) {
        this.particles.push({
            x: opts.x,
            y: opts.y,
            dx: opts.dx || 0,
            dy: opts.dy || 0,
            life: opts.life !== undefined ? opts.life : 1.0,
            decay: opts.decay || 0.025,
            size: opts.size || 3,
            color: opts.color || '#ffffff',
            text: opts.text || null,
            glow: opts.glow || false,
            gravity: opts.gravity !== undefined ? opts.gravity : 0.05,
        });
    }

    addExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
            const speed = 2 + Math.random() * 4;
            this.spawn({
                x, y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.025 + Math.random() * 0.02,
                size: 2 + Math.random() * 4,
                color,
                glow: true,
            });
        }
    }

    addSplashExplosion(x, y) {
        this.addExplosion(x, y, '#ff6600', 18);
        this.addExplosion(x, y, '#ffaa00', 10);
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.spawn({
                x, y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 1.5,
                decay: 0.012,
                size: 4 + Math.random() * 7,
                color: '#ff4400',
                gravity: 0.09,
                glow: true,
            });
        }
    }

    addImpact(x, y, color) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.spawn({
                x, y,
                dx: Math.cos(angle) * (1.5 + Math.random() * 2.5),
                dy: Math.sin(angle) * (1.5 + Math.random() * 2.5),
                life: 0.7,
                decay: 0.06 + Math.random() * 0.04,
                size: 1 + Math.random() * 3,
                color,
                gravity: 0.04,
            });
        }
    }

    addTrail(x, y, color) {
        this.spawn({
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            life: 0.4,
            decay: 0.06,
            size: 1 + Math.random() * 2,
            color,
            gravity: 0,
        });
    }

    addFloatingText(x, y, text, color = '#ffff00') {
        this.spawn({
            x,
            y,
            dx: (Math.random() - 0.5) * 0.6,
            dy: -1.8 - Math.random() * 0.5,
            life: 1.0,
            decay: 0.016,
            size: 18,
            color,
            text,
            gravity: -0.01,
        });
    }

    addDeathBurst(x, y, color, size) {
        const count = Math.floor(8 + size / 4);
        this.addExplosion(x, y, color, count);
        // Shockwave ring
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 / 16) * i;
            const speed = 3 + size * 0.1;
            this.spawn({
                x, y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 0.5,
                decay: 0.04,
                size: 2,
                color: '#ffffff',
                gravity: 0,
                glow: true,
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.dy += p.gravity;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            if (p.life <= 0) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life));

            if (p.text) {
                ctx.font = `bold ${p.size}px VT323, monospace`;
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.shadowBlur = 6;
                ctx.shadowColor = p.color;
                ctx.fillText(p.text, p.x, p.y);
            } else {
                if (p.glow) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = p.color;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}
