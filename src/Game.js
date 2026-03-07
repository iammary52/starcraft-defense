import { MapManager } from './Map.js';
import { Tower } from './Tower.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cellSize = 40;

        this.map = new MapManager(this.width, this.height, this.cellSize);

        // Game State
        this.money = 100;
        this.lives = 20;
        this.wave = 0;
        this.score = 0;

        this.towers = [];
        this.enemies = [];
        this.bullets = [];

        // Wave Management
        this.isWaveActive = false;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1000;

        // Build mode
        this.selectedTowerType = null;
        this.mousePos = { x: 0, y: 0 };

        this.gameOver = false;

        // Request animation frame ID
        this.animationId = null;
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.loop();
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', () => {
            if (this.selectedTowerType) {
                this.buildTower();
            }
        });

        const towerBtns = document.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                const cost = parseInt(btn.getAttribute('data-cost'));

                if (this.money >= cost) {
                    // Deselect previous
                    towerBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedTowerType = { type, cost };
                } else {
                    this.showMessage('미네랄이 부족합니다. (Not enough minerals)');
                }
            });
        });

        const startWaveBtn = document.getElementById('start-wave-btn');
        startWaveBtn.addEventListener('click', () => {
            if (!this.isWaveActive && !this.gameOver) {
                this.startNextWave();
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            window.location.reload();
        });
    }

    startNextWave() {
        this.wave++;
        this.isWaveActive = true;
        this.showMessage(`웨이브 ${this.wave} 시작! 적들이 접근합니다!`);
        document.getElementById('start-wave-btn').innerText = '전투 중 (In Combat)';
        document.getElementById('start-wave-btn').style.opacity = '0.5';

        this.generateWave();
    }

    generateWave() {
        this.enemiesToSpawn = [];
        const count = 10 + this.wave * 2;

        // Wave logic
        const types = ['zergling', 'hydra', 'muta', 'ultra'];
        for (let i = 0; i < count; i++) {
            let type = 'zergling';
            if (this.wave > 2 && Math.random() > 0.7) type = 'hydra';
            if (this.wave > 4 && Math.random() > 0.8) type = 'muta';
            if (this.wave > 6 && i % 10 === 0) type = 'ultra';

            this.enemiesToSpawn.push(type);
        }

        this.spawnTimer = Date.now();
    }

    buildTower() {
        if (!this.selectedTowerType) return;

        const col = Math.floor(this.mousePos.x / this.cellSize);
        const row = Math.floor(this.mousePos.y / this.cellSize);

        if (this.map.canBuild(col, row)) {
            if (this.money >= this.selectedTowerType.cost) {
                this.money -= this.selectedTowerType.cost;
                this.towers.push(new Tower(this.selectedTowerType.type, col * this.cellSize, row * this.cellSize, this.cellSize));
                this.map.placeTower(col, row);
                this.updateUI();
                this.showMessage(`${this.selectedTowerType.type} 건설 완료!`);

                // Deselect after building
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                this.selectedTowerType = null;
            }
        } else {
            this.showMessage('이곳에는 건설할 수 없습니다! (Cannot build here)');
        }
    }

    showMessage(text) {
        document.getElementById('msg-text').innerText = text;
    }

    updateUI() {
        document.getElementById('money').innerText = this.money;
        document.getElementById('lives').innerText = this.lives;
        document.getElementById('wave').innerText = this.wave;
        document.getElementById('score').innerText = this.score;

        // Update button states
        const towerBtns = document.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            const cost = parseInt(btn.getAttribute('data-cost'));
            if (this.money < cost) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    loop() {
        if (this.gameOver) return;

        this.update();
        this.draw();

        this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
        // Spawn enemies
        if (this.isWaveActive && this.enemiesToSpawn.length > 0) {
            const now = Date.now();
            if (now - this.spawnTimer > this.spawnInterval) {
                const type = this.enemiesToSpawn.shift();
                this.enemies.push(new Enemy(type, this.wave, this.map.waypoints));
                this.spawnTimer = now;

                // Decrease spawn interval as wave increases
                this.spawnInterval = Math.max(300, 1000 - this.wave * 50);
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update();

            if (enemy.escaped) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.updateUI();

                if (this.lives <= 0) {
                    this.triggerGameOver();
                }
            } else if (!enemy.alive) {
                this.money += enemy.reward;
                this.score += enemy.reward * 10;
                this.enemies.splice(i, 1);
                this.updateUI();
            }
        }

        // Update towers
        for (let tower of this.towers) {
            tower.update(this.enemies, this.bullets, Bullet);
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(this.enemies);
            if (!bullet.active) {
                this.bullets.splice(i, 1);
            }
        }

        // Check wave end
        if (this.isWaveActive && this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
            this.isWaveActive = false;
            this.money += 20 + this.wave * 5; // Wave clear bonus
            this.updateUI();
            this.showMessage(`웨이브 ${this.wave} 클리어! 추가 자원을 획득했습니다.`);

            const btn = document.getElementById('start-wave-btn');
            btn.innerText = '명령 대기중... (Next Wave)';
            btn.style.opacity = '1';
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw map
        this.map.draw(this.ctx);

        // Draw build preview
        if (this.selectedTowerType) {
            const col = Math.floor(this.mousePos.x / this.cellSize);
            const row = Math.floor(this.mousePos.y / this.cellSize);
            const x = col * this.cellSize;
            const y = row * this.cellSize;

            this.ctx.fillStyle = this.map.canBuild(col, row) ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

            // Draw range
            // Need to create a fake tower to get range
            let tempTower = new Tower(this.selectedTowerType.type, 0, 0, this.cellSize);
            this.ctx.beginPath();
            this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, tempTower.range, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.stroke();
        }

        // Draw towers
        for (let tower of this.towers) {
            tower.draw(this.ctx);
        }

        // Draw enemies
        for (let enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        // Draw bullets
        for (let bullet of this.bullets) {
            bullet.draw(this.ctx);
        }
    }

    triggerGameOver() {
        this.gameOver = true;
        document.getElementById('game-over').classList.remove('hidden');
        cancelAnimationFrame(this.animationId);
    }
}
