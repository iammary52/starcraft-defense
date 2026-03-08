import { MapManager } from './Map.js';
import { Tower } from './Tower.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { ParticleSystem } from './Particles.js';
import { Sound } from './Sound.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cellSize = 40;

        this.map = new MapManager(this.width, this.height, this.cellSize);
        this.particles = new ParticleSystem();

        // Game State
        this.money = 150;
        this.lives = 20;
        this.wave = 0;
        this.score = 0;
        this.killCount = 0;
        this.waveKills = 0;

        this.towers = [];
        this.enemies = [];
        this.bullets = [];

        // Wave Management
        this.isWaveActive = false;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1000;

        // Build/select mode
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.mousePos = { x: 0, y: 0 };

        this.gameOver = false;
        this.gameSpeed = 1; // 1 or 2

        this.animationId = null;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDecay = 0.88;

        // Wave announce overlay
        this.waveAnnounce = { text: '', alpha: 0, timer: 0 };

        this.timestamp = 0;
    }

    init() {
        Sound.init();
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
            Sound.resume();
            if (this.selectedTowerType) {
                this.buildTower();
            } else {
                this.trySelectTower();
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.deselectAll();
        });

        const towerBtns = document.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                const cost = parseInt(btn.getAttribute('data-cost'));

                if (this.money >= cost) {
                    towerBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.selectedTowerType = { type, cost };
                    this.deselectTower();
                } else {
                    this.showMessage('미네랄 부족! (Not enough minerals)');
                }
            });
        });

        document.getElementById('start-wave-btn').addEventListener('click', () => {
            Sound.resume();
            if (!this.isWaveActive && !this.gameOver) {
                this.startNextWave();
            }
        });

        document.getElementById('speed-btn').addEventListener('click', () => {
            this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
            document.getElementById('speed-btn').textContent =
                this.gameSpeed === 1 ? 'SPEED x1' : 'SPEED x2 >>>';
            document.getElementById('speed-btn').classList.toggle('active', this.gameSpeed === 2);
        });

        document.getElementById('sell-btn').addEventListener('click', () => {
            this.sellSelectedTower();
        });

        document.getElementById('upgrade-btn').addEventListener('click', () => {
            this.upgradeSelectedTower();
        });

        document.querySelectorAll('.target-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.selectedTower) {
                    this.selectedTower.targetingMode = btn.getAttribute('data-mode');
                    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.showMessage(`타겟팅 모드: ${this.getModeName(btn.getAttribute('data-mode'))}`);
                }
            });
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('music-btn').addEventListener('click', () => {
            Sound.resume();
            const on = Sound.toggleMusic();
            const btn = document.getElementById('music-btn');
            btn.textContent = on ? '♪ BGM' : '♪ BGM ✕';
            btn.classList.toggle('active', on);
        });

        document.getElementById('sfx-btn').addEventListener('click', () => {
            Sound.resume();
            const on = Sound.toggleSfx();
            const btn = document.getElementById('sfx-btn');
            btn.textContent = on ? '♦ SFX' : '♦ SFX ✕';
            btn.classList.toggle('active', on);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            const hotkeys = { '1': 'marine', '2': 'firebat', '3': 'ghost', '4': 'tank', '5': 'turret' };
            if (hotkeys[e.key]) {
                document.querySelector(`[data-type="${hotkeys[e.key]}"]`)?.click();
            }
            if (e.key === 'Escape') this.deselectAll();
            if (e.key === 'u' || e.key === 'U') this.upgradeSelectedTower();
            if (e.key === 's' || e.key === 'S') this.sellSelectedTower();
            if (e.key === ' ') {
                e.preventDefault();
                if (!this.isWaveActive) this.startNextWave();
            }
        });
    }

    trySelectTower() {
        const col = Math.floor(this.mousePos.x / this.cellSize);
        const row = Math.floor(this.mousePos.y / this.cellSize);

        if (this.selectedTower) {
            this.selectedTower.selected = false;
        }
        this.selectedTower = null;

        for (let tower of this.towers) {
            const tc = Math.floor((tower.x - this.cellSize / 2) / this.cellSize);
            const tr = Math.floor((tower.y - this.cellSize / 2) / this.cellSize);
            if (tc === col && tr === row) {
                this.selectedTower = tower;
                tower.selected = true;
                break;
            }
        }
        this.updateTowerInfo();
    }

    deselectTower() {
        if (this.selectedTower) {
            this.selectedTower.selected = false;
            this.selectedTower = null;
        }
        this.updateTowerInfo();
    }

    deselectAll() {
        this.deselectTower();
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        this.selectedTowerType = null;
    }

    sellSelectedTower() {
        if (!this.selectedTower) return;
        const val = this.selectedTower.getSellValue();
        this.money += val;

        const col = Math.floor((this.selectedTower.x - this.cellSize / 2) / this.cellSize);
        const row = Math.floor((this.selectedTower.y - this.cellSize / 2) / this.cellSize);
        if (row >= 0 && row < this.map.rows && col >= 0 && col < this.map.cols) {
            this.map.grid[row][col] = 0;
        }

        this.particles.addExplosion(this.selectedTower.x, this.selectedTower.y, '#00ff88', 10);
        this.particles.addFloatingText(this.selectedTower.x, this.selectedTower.y - 20, `+${val}M`, '#00ff88');
        Sound.playSell();

        this.towers.splice(this.towers.indexOf(this.selectedTower), 1);
        this.selectedTower = null;
        this.showMessage(`타워 판매 완료: +${val} 미네랄`);
        this.updateUI();
        this.updateTowerInfo();
    }

    upgradeSelectedTower() {
        if (!this.selectedTower) return;
        const cost = this.selectedTower.getUpgradeCost();
        if (cost === null) {
            this.showMessage('이미 최대 레벨입니다! (MAX LEVEL)');
            return;
        }
        if (this.money < cost) {
            this.showMessage(`미네랄 부족! 업그레이드 비용: ${cost}M`);
            return;
        }
        this.money -= cost;
        this.selectedTower.totalCost += cost;
        this.selectedTower.upgrade();
        this.particles.addExplosion(this.selectedTower.x, this.selectedTower.y, '#00ffff', 14);
        this.particles.addFloatingText(this.selectedTower.x, this.selectedTower.y - 24, `LV${this.selectedTower.level}!`, '#00ffff');
        Sound.playUpgrade();
        this.showMessage(`업그레이드 완료! Lv${this.selectedTower.level}`);
        this.updateUI();
        this.updateTowerInfo();
    }

    getModeName(mode) {
        return { first: '선두 우선', nearest: '근거리 우선', strongest: '강함 우선' }[mode] || mode;
    }

    updateTowerInfo() {
        const panel = document.getElementById('tower-info');
        const sellBtn = document.getElementById('sell-btn');
        const upgradeBtn = document.getElementById('upgrade-btn');
        const targetPanel = document.getElementById('targeting-panel');

        if (!this.selectedTower) {
            panel.innerHTML = '<span class="info-placeholder">타워를 클릭하여 선택하세요</span>';
            sellBtn.style.display = 'none';
            upgradeBtn.style.display = 'none';
            targetPanel.style.display = 'none';
            return;
        }

        const t = this.selectedTower;
        const upgCost = t.getUpgradeCost();
        const levelStars = '*'.repeat(t.level) + ' '.repeat(3 - t.level);

        panel.innerHTML = `
            <div class="t-info-name">[${this.getTowerName(t.type)}] Lv${t.level} ${levelStars}</div>
            <div class="t-info-row"><span>DMG</span><span>${Math.floor(t.damage)}</span></div>
            <div class="t-info-row"><span>RANGE</span><span>${Math.floor(t.range)}</span></div>
            <div class="t-info-row"><span>RATE</span><span>${(1000 / t.fireRate).toFixed(1)}/s</span></div>
            <div class="t-info-row"><span>SELL</span><span>${t.getSellValue()}M</span></div>
        `;

        sellBtn.style.display = 'block';
        targetPanel.style.display = 'block';
        upgradeBtn.style.display = 'block';

        if (upgCost !== null) {
            upgradeBtn.textContent = `UPGRADE [U]  ${upgCost}M`;
            upgradeBtn.disabled = this.money < upgCost;
            upgradeBtn.classList.toggle('disabled', this.money < upgCost);
        } else {
            upgradeBtn.textContent = 'MAX LEVEL ***';
            upgradeBtn.disabled = true;
            upgradeBtn.classList.add('disabled');
        }

        document.querySelectorAll('.target-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === t.targetingMode);
        });
    }

    getTowerName(type) {
        const names = {
            marine: '마린', firebat: '파이어뱃', ghost: '고스트',
            tank: '시즈탱크', turret: '미사일터렛',
        };
        return names[type] || type;
    }

    startNextWave() {
        this.wave++;
        this.waveKills = 0;
        this.isWaveActive = true;
        this.waveAnnounce = { text: `-- WAVE ${this.wave} --`, alpha: 1.0, timer: Date.now() };
        Sound.playWaveStart();
        if (this.wave === 1) Sound.startMusic();
        this.showMessage(`웨이브 ${this.wave} 시작! 방어선을 강화하십시오!`);
        const btn = document.getElementById('start-wave-btn');
        btn.textContent = '[ IN COMBAT ]';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        this.generateWave();
    }

    generateWave() {
        this.enemiesToSpawn = [];
        const count = 10 + this.wave * 2;

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
                const tower = new Tower(
                    this.selectedTowerType.type,
                    col * this.cellSize,
                    row * this.cellSize,
                    this.cellSize
                );
                this.towers.push(tower);
                this.map.placeTower(col, row);
                this.particles.addExplosion(
                    col * this.cellSize + this.cellSize / 2,
                    row * this.cellSize + this.cellSize / 2,
                    '#4af626', 10
                );
                Sound.playBuild();
                this.updateUI();
                this.showMessage(`${this.getTowerName(this.selectedTowerType.type)} 건설 완료!`);
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                this.selectedTowerType = null;
            }
        } else {
            this.showMessage('건설 불가 구역! (Cannot build here)');
        }
    }

    showMessage(text) {
        document.getElementById('msg-text').textContent = text;
    }

    updateUI() {
        document.getElementById('money').textContent = this.money;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('score').textContent = this.score;
        document.getElementById('kill-count').textContent = this.killCount;

        document.querySelectorAll('.tower-btn').forEach(btn => {
            const cost = parseInt(btn.getAttribute('data-cost'));
            btn.classList.toggle('disabled', this.money < cost);
        });

        if (this.selectedTower) {
            this.updateTowerInfo();
        }
    }

    addScreenShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    loop() {
        if (this.gameOver) return;
        this.timestamp = performance.now();

        // Run multiple physics steps for game speed
        for (let i = 0; i < this.gameSpeed; i++) {
            this.update();
        }

        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    update() {
        // Spawn enemies
        if (this.isWaveActive && this.enemiesToSpawn.length > 0) {
            const now = Date.now();
            const interval = this.spawnInterval / this.gameSpeed;
            if (now - this.spawnTimer > interval) {
                const type = this.enemiesToSpawn.shift();
                this.enemies.push(new Enemy(type, this.wave, this.map.waypoints));
                this.spawnTimer = now;
                this.spawnInterval = Math.max(300, 1000 - this.wave * 50);
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update();

            if (enemy.escaped) {
                this.lives--;
                this.addScreenShake(6);
                Sound.playAlert();
                this.enemies.splice(i, 1);
                this.updateUI();
                this.showMessage(`경보! 적이 기지를 통과했습니다! 기지 체력: ${this.lives}`);
                if (this.lives <= 0) this.triggerGameOver();

            } else if (!enemy.alive) {
                this.money += enemy.reward;
                this.score += enemy.reward * 10;
                this.killCount++;
                this.waveKills++;

                // Death burst particles
                this.particles.addDeathBurst(enemy.x, enemy.y, enemy.color, enemy.size);
                this.particles.addFloatingText(
                    enemy.x + (Math.random() - 0.5) * 20,
                    enemy.y - 16,
                    `+${enemy.reward}M`,
                    '#00ff88'
                );
                Sound.playEnemyDeath();

                if (enemy.type === 'ultra') this.addScreenShake(10);
                if (enemy.type === 'hydra') this.addScreenShake(3);

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
            bullet.update(this.enemies, this.particles);
            if (!bullet.active) {
                this.bullets.splice(i, 1);
            }
        }

        // Update particles
        this.particles.update();

        // Screen shake decay
        this.shakeIntensity *= this.shakeDecay;

        // Check wave end
        if (this.isWaveActive && this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
            this.isWaveActive = false;
            const bonus = 20 + this.wave * 5;
            this.money += bonus;
            this.score += bonus * 5;
            Sound.playWaveComplete();
            this.updateUI();
            this.showMessage(`WAVE ${this.wave} CLEAR! 처치: ${this.waveKills} | 보너스: +${bonus}M`);

            const btn = document.getElementById('start-wave-btn');
            btn.textContent = '[ NEXT WAVE ] (Space)';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    }

    draw() {
        const ctx = this.ctx;

        // Screen shake offset
        const shake = this.shakeIntensity > 0.4;
        const sx = shake ? (Math.random() - 0.5) * this.shakeIntensity * 2.5 : 0;
        const sy = shake ? (Math.random() - 0.5) * this.shakeIntensity * 2.5 : 0;

        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.translate(sx, sy);

        // Map
        this.map.draw(ctx, this.timestamp);

        // Build preview
        if (this.selectedTowerType) {
            const col = Math.floor(this.mousePos.x / this.cellSize);
            const row = Math.floor(this.mousePos.y / this.cellSize);
            const x = col * this.cellSize;
            const y = row * this.cellSize;
            const canBuild = this.map.canBuild(col, row);

            ctx.fillStyle = canBuild ? 'rgba(46, 204, 113, 0.28)' : 'rgba(231, 76, 60, 0.28)';
            ctx.fillRect(x, y, this.cellSize, this.cellSize);
            ctx.strokeStyle = canBuild ? '#2ecc71' : '#e74c3c';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, this.cellSize, this.cellSize);

            // Range ring
            const tempTower = new Tower(this.selectedTowerType.type, 0, 0, this.cellSize);
            ctx.beginPath();
            ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, tempTower.range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Selected tower range ring
        if (this.selectedTower) {
            const t = this.selectedTower;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.28)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Towers
        for (let tower of this.towers) {
            tower.draw(ctx);
        }

        // Enemies
        for (let enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Bullets
        for (let bullet of this.bullets) {
            bullet.draw(ctx);
        }

        // Particles
        this.particles.draw(ctx);

        // Wave announcement overlay
        if (this.waveAnnounce.alpha > 0) {
            const elapsed = (Date.now() - this.waveAnnounce.timer) / 1000;
            this.waveAnnounce.alpha = Math.max(0, 1 - elapsed * 0.75);
            if (this.waveAnnounce.alpha > 0) {
                ctx.save();
                ctx.globalAlpha = this.waveAnnounce.alpha;
                ctx.font = 'bold 68px VT323, monospace';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 35;
                ctx.shadowColor = '#4af626';
                ctx.fillStyle = '#4af626';
                ctx.fillText(this.waveAnnounce.text, this.width / 2, this.height / 2);
                ctx.restore();
            }
        }

        ctx.restore();

        // Game speed indicator (outside shake)
        if (this.gameSpeed > 1) {
            ctx.save();
            ctx.font = 'bold 20px VT323, monospace';
            ctx.fillStyle = 'rgba(255, 220, 0, 0.85)';
            ctx.textAlign = 'right';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ffcc00';
            ctx.fillText(`>>> x${this.gameSpeed}`, this.width - 8, 22);
            ctx.restore();
        }
    }

    triggerGameOver() {
        this.gameOver = true;
        Sound.stopMusic();
        Sound.playGameOver();
        const el = document.getElementById('game-over');
        document.getElementById('final-wave').textContent = this.wave;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-kills').textContent = this.killCount;
        el.classList.remove('hidden');
        cancelAnimationFrame(this.animationId);
    }
}
