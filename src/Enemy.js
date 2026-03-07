import { getDistance } from './Utils.js';
import { Images } from './Assets.js';

export class Enemy {
    constructor(type, waveNumber, waypoints) {
        this.type = type;
        this.waypoints = waypoints;
        this.targetWaypoint = 0;

        // Initial pos
        this.x = waypoints[0].x;
        this.y = waypoints[0].y;

        this.alive = true;
        this.escaped = false; // Reached the end

        this.setupStats(type, waveNumber);

        this.currentHp = this.maxHp;

        // Visual effects
        this.hitTime = 0;

        // Face moving direction
        this.angle = 0;
    }

    setupStats(type, waveNum) {
        const hpScaling = 1 + waveNum * 0.2; // 20% hp increase per wave
        switch (type) {
            case 'zergling':
                this.maxHp = 20 * hpScaling;
                this.speed = 1.5;
                this.size = 12;
                this.reward = 5;
                break;
            case 'hydra':
                this.maxHp = 60 * hpScaling;
                this.speed = 1.0;
                this.size = 16;
                this.reward = 10;
                break;
            case 'muta':
                this.maxHp = 45 * hpScaling;
                this.speed = 1.8;
                this.size = 18;
                this.reward = 12;
                break;
            case 'ultra':
                this.maxHp = 250 * hpScaling;
                this.speed = 0.6;
                this.size = 28;
                this.reward = 30;
                break;
            default:
                this.maxHp = 30;
                this.speed = 1;
                this.size = 12;
                this.reward = 5;
        }
    }

    takeDamage(amount) {
        this.currentHp -= amount;
        this.hitTime = Date.now();
        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.alive = false;
        }
    }

    update() {
        if (!this.alive) return;

        const target = this.waypoints[this.targetWaypoint + 1];
        if (!target) {
            this.escaped = true;
            this.alive = false;
            return;
        }

        // Distance
        const dist = getDistance(this, target);

        if (dist <= this.speed) {
            this.x = target.x;
            this.y = target.y;
            this.targetWaypoint++;
        } else {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            this.angle = Math.atan2(dy, dx);
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    draw(ctx) {
        if (!this.alive && !this.escaped) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // assuming the top-down image faces UP naturally

        let img = Images[this.type];
        if (img && img.complete) {
            const renderSize = this.size * 2;
            ctx.drawImage(img, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

            if (Date.now() - this.hitTime < 100) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(-renderSize / 2, -renderSize / 2, renderSize, renderSize);
            }
        }

        // Restore context before drawing HP bar so it isn't rotated
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);

        // HP Bar
        const hpPercent = this.currentHp / this.maxHp;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-this.size, -this.size - 8, this.size * 2, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-this.size, -this.size - 8, this.size * 2 * hpPercent, 4);

        ctx.restore();
    }
}
