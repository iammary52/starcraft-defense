import { getDistance } from './Utils.js';
import { Images } from './Assets.js';

export class Enemy {
    constructor(type, waveNumber, waypoints) {
        this.type = type;
        this.waypoints = waypoints;
        this.targetWaypoint = 0;

        this.x = waypoints[0].x;
        this.y = waypoints[0].y;

        this.alive = true;
        this.escaped = false;

        this.setupStats(type, waveNumber);

        this.currentHp = this.maxHp;
        this.hitTime = 0;
        this.hitFlashDuration = 110;
        this.angle = 0;

        // Entrance animation
        this.spawnTime = Date.now();
        this.spawnAnimDuration = 300;
    }

    setupStats(type, waveNum) {
        const hpScaling = 1 + waveNum * 0.2;
        switch (type) {
            case 'zergling':
                this.maxHp = 20 * hpScaling;
                this.speed = 1.5;
                this.size = 12;
                this.reward = 5;
                this.color = '#cc2200';
                break;
            case 'hydra':
                this.maxHp = 60 * hpScaling;
                this.speed = 1.0;
                this.size = 16;
                this.reward = 10;
                this.color = '#00aa44';
                break;
            case 'muta':
                this.maxHp = 45 * hpScaling;
                this.speed = 1.8;
                this.size = 18;
                this.reward = 12;
                this.color = '#6600cc';
                break;
            case 'ultra':
                this.maxHp = 250 * hpScaling;
                this.speed = 0.6;
                this.size = 28;
                this.reward = 30;
                this.color = '#cc8800';
                break;
            default:
                this.maxHp = 30;
                this.speed = 1;
                this.size = 12;
                this.reward = 5;
                this.color = '#ffffff';
        }
    }

    takeDamage(amount, particles) {
        this.currentHp -= amount;
        this.hitTime = Date.now();

        if (particles) {
            particles.addImpact(this.x, this.y, this.color);
            particles.addFloatingText(
                this.x + (Math.random() - 0.5) * 20,
                this.y - this.size - 4,
                `-${Math.floor(amount)}`,
                '#ff4444'
            );
        }

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

    get progressAlongPath() {
        return this.targetWaypoint;
    }

    draw(ctx) {
        if (!this.alive && !this.escaped) return;

        const now = Date.now();
        const isHit = now - this.hitTime < this.hitFlashDuration;
        const hitAlpha = isHit ? (1 - (now - this.hitTime) / this.hitFlashDuration) : 0;

        // Spawn pop-in animation
        const spawnElapsed = now - this.spawnTime;
        const spawnScale = spawnElapsed < this.spawnAnimDuration
            ? 0.4 + 0.6 * (spawnElapsed / this.spawnAnimDuration)
            : 1.0;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Boss/air glow effects
        if (this.type === 'ultra') {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ff8800';
        } else if (this.type === 'muta') {
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#8800ff';
        }

        ctx.rotate(this.angle + Math.PI / 2);
        ctx.scale(spawnScale, spawnScale);

        const img = Images[this.type];
        if (img && img.complete) {
            const renderSize = this.size * 2.3;
            ctx.drawImage(img, -renderSize / 2, -renderSize / 2, renderSize, renderSize);

            // Hit flash overlay
            if (isHit) {
                ctx.globalAlpha = hitAlpha * 0.75;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-renderSize / 2, -renderSize / 2, renderSize, renderSize);
                ctx.globalAlpha = 1;
            }
        } else {
            // Fallback colored circle
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // HP Bar (drawn without rotation)
        ctx.save();
        ctx.translate(this.x, this.y);

        const barW = this.size * 2.6;
        const barH = 5;
        const barY = -(this.size + 14);

        // Shadow backing
        ctx.fillStyle = '#000000';
        ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

        // HP fill with color coding
        const hpPercent = this.currentHp / this.maxHp;
        const hpColor = hpPercent > 0.6 ? '#00ee44' : hpPercent > 0.3 ? '#ffcc00' : '#ff2200';
        ctx.fillStyle = hpColor;
        ctx.fillRect(-barW / 2, barY, barW * hpPercent, barH);

        // Glow effect on low HP
        if (hpPercent < 0.3) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff2200';
            ctx.fillStyle = '#ff4422';
            ctx.fillRect(-barW / 2, barY, barW * hpPercent, barH);
        }

        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

        ctx.restore();
    }
}
