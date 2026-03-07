import { Game } from './Game.js';
import { loadAssets } from './Assets.js';

window.addEventListener('load', () => {
    loadAssets(() => {
        const game = new Game('gameCanvas');
        game.init();
    });
});
