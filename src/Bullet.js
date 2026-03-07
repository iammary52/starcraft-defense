import { getDistance, drawCircle } from './Utils.js';

export class Bullet {
    constructor(x, y, target, damage, speed, effect, map) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.effect = effect; // 'normal', 'splash', 'snipe'
        this.active = true;

        // Fix coordinates for movement
        this.dx = 0;
        this.dy = 0;

        // Homing bullet calculations
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

    update(enemies) {
        if (!this.active) return;

        // Homing
        if (this.target.alive) {
            this.updateDirection();
        }

        this.x += this.dx;
        this.y += this.dy;

        // Check collision
        if (this.target.alive) {
            if (getDistance(this, this.target) <= this.target.size + this.speed) {
                this.hit(enemies);
                this.active = false;
            }
        } else {
            // Target died, fly out or disappear
            this.active = false; // Just disappear to keep simple
        }
    }

    hit(enemies) {
        if (this.effect === 'splash') {
            const splashRadius = 50;
            for (let enemy of enemies) {
                if (enemy.alive) {
                    const dist = getDistance(this.target, enemy);
                    if (dist <= splashRadius) {
                        // Full damage at center, descending to half at edge
                        const dmgMultiplier = 1 - (dist / splashRadius) * 0.5;
                        enemy.takeDamage(this.damage * dmgMultiplier);
                    }
                }
            }
        } else {
            this.target.takeDamage(this.damage);
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.beginPath();
        if (this.effect === 'splash') {
            drawCircle(ctx, this.x, this.y, 4, '#e74c3c'); // Explosive shell
        } else if (this.effect === 'snipe') {
            drawCircle(ctx, this.x, this.y, 2, '#3498db'); // Laser
        } else if (this.effect === 'missile') {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(this.x - 2, this.y - 4, 4, 8); // Simple missile
        } else {
            drawCircle(ctx, this.x, this.y, 3, '#f39c12'); // Normal bullet
        }
    }
}
