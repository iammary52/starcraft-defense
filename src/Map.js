import { Images } from './Assets.js';

export class MapManager {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = width / cellSize;
        this.rows = height / cellSize;

        // Path waypoints (center of cells)
        this.waypoints = [
            { x: -cellSize, y: 3 * cellSize + cellSize / 2 },
            { x: 5 * cellSize + cellSize / 2, y: 3 * cellSize + cellSize / 2 },
            { x: 5 * cellSize + cellSize / 2, y: 11 * cellSize + cellSize / 2 },
            { x: 14 * cellSize + cellSize / 2, y: 11 * cellSize + cellSize / 2 },
            { x: 14 * cellSize + cellSize / 2, y: 4 * cellSize + cellSize / 2 },
            { x: width + cellSize, y: 4 * cellSize + cellSize / 2 }
        ];

        // Create a basic grid to store which cell has a tower
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));

        // Mark path area on grid so players can't build on it
        this.markPathOnGrid();
    }

    markPathOnGrid() {
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const p1 = this.waypoints[i];
            const p2 = this.waypoints[i + 1];

            const startCol = Math.max(0, Math.floor(Math.min(p1.x, p2.x) / this.cellSize) - 1);
            const endCol = Math.min(this.cols - 1, Math.floor(Math.max(p1.x, p2.x) / this.cellSize));
            const startRow = Math.max(0, Math.floor(Math.min(p1.y, p2.y) / this.cellSize) - 1);
            const endRow = Math.min(this.rows - 1, Math.floor(Math.max(p1.y, p2.y) / this.cellSize));

            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    this.grid[r][c] = 1; // 1 means not buildable (path)
                }
            }
        }
    }

    canBuild(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        return this.grid[row][col] === 0; // 0 means empty
    }

    placeTower(col, row) {
        this.grid[row][col] = 2; // 2 means occupied by tower
    }

    draw(ctx) {
        // Draw background texture
        if (Images.bg && Images.bg.complete) {
            const pattern = ctx.createPattern(Images.bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Draw path lines (dirt road or mechanical path)
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.7)'; // semi-transparent dark path
        ctx.lineWidth = this.cellSize * 1.5;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        ctx.beginPath();
        for (let i = 0; i < this.waypoints.length; i++) {
            if (i === 0) ctx.moveTo(this.waypoints[i].x, this.waypoints[i].y);
            else ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();

        // Path border
        ctx.strokeStyle = '#4af626';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}
