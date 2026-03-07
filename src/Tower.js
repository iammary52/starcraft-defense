import { getDistance, drawCircle } from './Utils.js';
import { Images } from './Assets.js';

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

        // Base structure backing
        ctx.fillStyle = '#1c2833';
        ctx.fillRect(-this.cellSize / 2 + 2, -this.cellSize / 2 + 2, this.cellSize - 4, this.cellSize - 4);

        // Tower Body & rotation
        ctx.rotate(this.angle + Math.PI / 2); // Top down facing up

        let img = Images[this.type];
        if (img && img.complete) {
            // make image slightly larger than cell
            const size = this.cellSize * 1.2;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);

            // Add tint based on type maybe?
            if (this.type === 'firebat') {
                ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            } else if (this.type === 'ghost') {
                ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        }

        ctx.restore();
    }
}
