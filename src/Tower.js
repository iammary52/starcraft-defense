import { getDistance } from './Utils.js';
import { Images } from './Assets.js';

const TOWER_CONFIGS = {
    marine:  { range: 100, fireRate: 500,  damage: 10,  color: '#3498db', effect: 'normal',  cost: 20 },
    firebat: { range: 60,  fireRate: 800,  damage: 25,  color: '#e74c3c', effect: 'splash',  cost: 35 },
    ghost:   { range: 250, fireRate: 1200, damage: 45,  color: '#9b59b6', effect: 'snipe',   cost: 45 },
    tank:    { range: 300, fireRate: 2500, damage: 100, color: '#7f8c8d', effect: 'splash',  cost: 90 },
    turret:  { range: 200, fireRate: 300,  damage: 15,  color: '#f1c40f', effect: 'missile', cost: 40 },
};

export class Tower {
    constructor(type, x, y, cellSize) {
        this.type = type;
        this.x = x + cellSize / 2;
        this.y = y + cellSize / 2;
        this.cellSize = cellSize;

        this.level = 1;
        this.totalCost = TOWER_CONFIGS[type]?.cost || 20;
        this.targetingMode = 'first'; // 'nearest', 'first', 'strongest'
        this.selected = false;

        this.setupStats(type);

        this.lastFired = 0;
        this.lastShotTime = 0;
        this.target = null;
        this.angle = 0;
    }

    setupStats(type) {
        const cfg = TOWER_CONFIGS[type];
        if (cfg) {
            const lvlBonus = (this.level - 1) * 0.5;
            this.range = cfg.range * (1 + (this.level - 1) * 0.2);
            this.fireRate = cfg.fireRate / (1 + (this.level - 1) * 0.25);
            this.damage = cfg.damage * (1 + lvlBonus);
            this.color = cfg.color;
            this.effect = cfg.effect;
        } else {
            this.range = 100;
            this.fireRate = 500;
            this.damage = 10;
            this.color = '#ffffff';
            this.effect = 'normal';
        }
    }

    getUpgradeCost() {
        if (this.level >= 3) return null;
        const baseCost = TOWER_CONFIGS[this.type]?.cost || 20;
        return Math.floor(baseCost * 0.7 * this.level);
    }

    getSellValue() {
        return Math.floor(this.totalCost * 0.5);
    }

    upgrade() {
        if (this.level >= 3) return false;
        this.level++;
        this.setupStats(this.type);
        return true;
    }

    findTarget(enemies) {
        const candidates = enemies.filter(e => {
            if (!e.alive) return false;
            if (this.type === 'turret' && e.type !== 'muta') return false;
            if (this.type !== 'turret' && e.type === 'muta') return false;
            return getDistance(this, e) <= this.range;
        });

        if (candidates.length === 0) {
            this.target = null;
            return;
        }

        switch (this.targetingMode) {
            case 'first':
                this.target = candidates.reduce((a, b) =>
                    a.progressAlongPath > b.progressAlongPath ? a : b
                );
                break;
            case 'strongest':
                this.target = candidates.reduce((a, b) =>
                    a.currentHp > b.currentHp ? a : b
                );
                break;
            case 'nearest':
            default:
                this.target = candidates.reduce((a, b) =>
                    getDistance(this, a) < getDistance(this, b) ? a : b
                );
        }
    }

    update(enemies, bullets, BulletClass) {
        this.findTarget(enemies);

        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const now = Date.now();
            if (now - this.lastFired >= this.fireRate) {
                this.fire(bullets, BulletClass);
                this.lastFired = now;
                this.lastShotTime = now;
            }
        }
    }

    fire(bullets, BulletClass) {
        let speed = 8;
        if (this.effect === 'missile') speed = 15;
        if (this.effect === 'snipe') speed = 20;

        bullets.push(new BulletClass(
            this.x, this.y,
            this.target,
            this.damage,
            speed,
            this.effect
        ));
    }

    draw(ctx) {
        const now = Date.now();
        const recentlyFired = now - this.lastShotTime < 130;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Selection ring
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(0, 0, this.cellSize / 2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ffff';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Firing glow
        if (recentlyFired) {
            ctx.shadowBlur = 24;
            ctx.shadowColor = this.color;
        }

        // Base platform - tech panel look
        const bs = this.cellSize / 2 - 2;
        ctx.fillStyle = '#141e1c';
        ctx.fillRect(-bs, -bs, bs * 2, bs * 2);

        // Color accent border
        ctx.strokeStyle = this.color + '99';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-bs, -bs, bs * 2, bs * 2);

        // Corner tech details
        const cd = 7;
        ctx.fillStyle = this.color + '55';
        ctx.fillRect(-bs, -bs, cd, cd);
        ctx.fillRect(bs - cd, -bs, cd, cd);
        ctx.fillRect(-bs, bs - cd, cd, cd);
        ctx.fillRect(bs - cd, bs - cd, cd, cd);

        ctx.shadowBlur = 0;

        // Rotate and draw unit image
        ctx.rotate(this.angle + Math.PI / 2);

        const img = Images[this.type];
        if (img && img.complete) {
            const size = this.cellSize * 1.15;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);

            // Type color tints
            const tints = {
                firebat: 'rgba(231, 76, 60, 0.28)',
                ghost: 'rgba(155, 89, 182, 0.28)',
                turret: 'rgba(241, 196, 15, 0.22)',
            };
            if (tints[this.type]) {
                ctx.fillStyle = tints[this.type];
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        } else {
            // Colored fallback shape
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.cellSize / 2 - 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Level indicator (outside rotation)
        if (this.level > 1) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.font = `bold 11px VT323, monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = this.level >= 3 ? '#ffd700' : '#aaaaaa';
            ctx.shadowBlur = 4;
            ctx.shadowColor = this.level >= 3 ? '#ffd700' : '#888888';
            ctx.fillText('*'.repeat(this.level), 0, this.cellSize / 2 + 10);
            ctx.restore();
        }

        // Muzzle flash on recently fired
        if (recentlyFired) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const flashAngle = this.angle + Math.PI / 2;
            const flashDist = this.cellSize / 2;
            const fx = Math.cos(this.angle) * flashDist;
            const fy = Math.sin(this.angle) * flashDist;
            const flash = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10);
            flash.addColorStop(0, this.color + 'cc');
            flash.addColorStop(1, 'transparent');
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(fx, fy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
