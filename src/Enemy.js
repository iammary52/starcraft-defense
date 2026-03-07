import { getDistance } from './Utils.js';

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
    }

    setupStats(type, waveNum) {
        const hpScaling = 1 + waveNum * 0.2; // 20% hp increase per wave
        switch (type) {
            case 'zergling':
                this.maxHp = 20 * hpScaling;
                this.speed = 1.5;
                this.color = '#e67e22'; // Orange/Brown
                this.size = 10;
                this.reward = 5;
                break;
            case 'hydra':
                this.maxHp = 60 * hpScaling;
                this.speed = 1.0;
                this.color = '#8e44ad'; // Purple
                this.size = 14;
                this.reward = 10;
                break;
            case 'muta':
                this.maxHp = 45 * hpScaling;
                this.speed = 1.8;
                this.color = '#2980b9'; // Blue, flying
                this.size = 12;
                this.reward = 12;
                break;
            case 'ultra':
                this.maxHp = 250 * hpScaling;
                this.speed = 0.6;
                this.color = '#7f8c8d'; // Grey/Huge
                this.size = 20;
                this.reward = 30;
                break;
            default:
                this.maxHp = 30;
                this.speed = 1;
                this.color = '#fff';
                this.size = 10;
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
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    draw(ctx) {
        if (!this.alive && !this.escaped) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // draw different shapes
        ctx.beginPath();
        if (this.type === 'zergling') {
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        } else if (this.type === 'hydra') {
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
        } else if (this.type === 'muta') {
            ctx.moveTo(-this.size, -this.size);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
        } else if (this.type === 'ultra') {
            ctx.rect(-this.size, -this.size * 0.7, this.size * 2, this.size * 1.4);
        } else {
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        }

        // Check if recently hit
        if (Date.now() - this.hitTime < 100) {
            ctx.fillStyle = '#fff'; // Flash white
        } else {
            ctx.fillStyle = this.color;
        }
        ctx.fill();

        // HP Bar
        const hpPercent = this.currentHp / this.maxHp;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-this.size, -this.size - 8, this.size * 2, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-this.size, -this.size - 8, this.size * 2 * hpPercent, 4);

        ctx.restore();
    }
}
