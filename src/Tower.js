import { getDistance, drawCircle } from './Utils.js';

export class Tower {
    constructor(type, x, y, cellSize) {
        this.type = type;
        this.x = x + cellSize / 2;
        this.y = y + cellSize / 2;
        this.cellSize = cellSize;

        this.setupStats(type);

        this.lastFired = 0;
        this.target = null;
        this.angle = 0;
    }

    setupStats(type) {
        switch (type) {
            case 'marine':
                this.range = 100;
                this.fireRate = 500; // ms
                this.damage = 10;
                this.color = '#3498db';
                this.effect = 'normal';
                break;
            case 'firebat':
                this.range = 60;
                this.fireRate = 800;
                this.damage = 25;
                this.color = '#e74c3c';
                this.effect = 'splash'; // Actually linear but splash is easy
                break;
            case 'ghost':
                this.range = 250;
                this.fireRate = 1200;
                this.damage = 45;
                this.color = '#9b59b6';
                this.effect = 'snipe';
                break;
            case 'tank':
                this.range = 300;
                this.fireRate = 2500;
                this.damage = 100;
                this.color = '#7f8c8d';
                this.effect = 'splash';
                break;
            case 'turret':
                this.range = 200;
                this.fireRate = 300;
                this.damage = 15;
                this.color = '#f1c40f';
                this.effect = 'missile';
                break;
            default:
                this.range = 100;
                this.fireRate = 500;
                this.damage = 10;
                this.color = '#fff';
                this.effect = 'normal';
        }
    }

    findTarget(enemies) {
        let bestTarget = null;
        let bestDist = Infinity;

        for (let enemy of enemies) {
            if (!enemy.alive) continue;

            // simple targeting algorithm logic
            if (this.type === 'turret' && enemy.type !== 'muta') continue;
            if (this.type !== 'turret' && enemy.type === 'muta') continue;

            let dist = getDistance(this, enemy);
            if (dist <= this.range && dist < bestDist) {
                bestDist = dist;
                bestTarget = enemy;
            }
        }

        this.target = bestTarget;
    }

    update(enemies, bullets, BulletClass) {
        this.findTarget(enemies);

        if (this.target) {
            // Update rotation angle
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

            const now = Date.now();
            if (now - this.lastFired >= this.fireRate) {
                this.fire(bullets, BulletClass);
                this.lastFired = now;
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
        ctx.save();
        ctx.translate(this.x, this.y);

        // Base
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-this.cellSize / 2 + 2, -this.cellSize / 2 + 2, this.cellSize - 4, this.cellSize - 4);

        // Tower Body & rotation
        ctx.rotate(this.angle);

        ctx.fillStyle = this.color;

        if (this.type === 'marine') {
            drawCircle(ctx, 0, 0, 8, this.color);
            // Gun
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(5, -2, 12, 4);
        } else if (this.type === 'firebat') {
            ctx.fillRect(-10, -6, 20, 12);
            // Flame nozzle
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(10, -8, 8, 16);
        } else if (this.type === 'ghost') {
            drawCircle(ctx, 0, 0, 10, this.color);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI); // Visor
            ctx.fill();
            // Sniper rifle
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(8, -1, 20, 2);
        } else if (this.type === 'tank') {
            ctx.fillRect(-15, -15, 30, 30);
            drawCircle(ctx, 0, 0, 12, '#34495e');
            // Siege cannon
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(0, -4, 25, 8);
        } else if (this.type === 'turret') {
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(8, -8, 10, 4);
            ctx.fillRect(8, 4, 10, 4);
        }

        ctx.restore();
    }
}
