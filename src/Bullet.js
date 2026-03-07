import { getDistance } from './Utils.js';

export class Bullet {
    constructor(x, y, target, damage, speed, effect) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.effect = effect; // 'normal', 'splash', 'snipe', 'missile'
        this.active = true;
        this.dx = 0;
        this.dy = 0;
        this.updateDirection();
    }

    updateDirection() {
        if (!this.target.alive && !this.target.escaped) return;
        const dist = getDistance(this, this.target);
        if (dist > 0) {
            this.dx = ((this.target.x - this.x) / dist) * this.speed;
            this.dy = ((this.target.y - this.y) / dist) * this.speed;
        }
    }

    update(enemies, particles) {
        if (!this.active) return;

        if (this.target.alive) {
            this.updateDirection();
        }

        this.x += this.dx;
        this.y += this.dy;

        // Trail particles
        if (particles) {
            const trailColors = {
                normal: '#f39c12',
                splash: '#ff5500',
                snipe: '#0088ff',
                missile: '#ffcc00',
            };
            particles.addTrail(this.x, this.y, trailColors[this.effect] || '#ffffff');
        }

        if (this.target.alive) {
            if (getDistance(this, this.target) <= this.target.size + this.speed) {
                this.hit(enemies, particles);
                this.active = false;
            }
        } else {
            this.active = false;
        }
    }

    hit(enemies, particles) {
        if (this.effect === 'splash') {
            const splashRadius = 50;
            if (particles) {
                particles.addSplashExplosion(this.target.x, this.target.y);
            }
            for (let enemy of enemies) {
                if (enemy.alive) {
                    const dist = getDistance(this.target, enemy);
                    if (dist <= splashRadius) {
                        const dmgMultiplier = 1 - (dist / splashRadius) * 0.5;
                        enemy.takeDamage(this.damage * dmgMultiplier, particles);
                    }
                }
            }
        } else {
            if (particles) {
                const impactColors = {
                    normal: '#f39c12',
                    snipe: '#00aaff',
                    missile: '#ffcc00',
                };
                particles.addImpact(this.x, this.y, impactColors[this.effect] || '#ffffff');
            }
            this.target.takeDamage(this.damage, particles);
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.shadowBlur = 14;

        if (this.effect === 'splash') {
            ctx.shadowColor = '#ff4400';
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 6;
            ctx.fillStyle = '#ffee00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.effect === 'snipe') {
            ctx.shadowColor = '#00aaff';
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.dx * 6, this.y - this.dy * 6);
            ctx.stroke();
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.effect === 'missile') {
            ctx.shadowColor = '#ffcc00';
            const angle = Math.atan2(this.dy, this.dx);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillStyle = '#dddddd';
            ctx.fillRect(-2, -7, 4, 12);
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.moveTo(-2, -7);
            ctx.lineTo(2, -7);
            ctx.lineTo(0, -12);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(-2, 5);
            ctx.lineTo(2, 5);
            ctx.lineTo(0, 9);
            ctx.closePath();
            ctx.fill();

        } else {
            ctx.shadowColor = '#f39c12';
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
