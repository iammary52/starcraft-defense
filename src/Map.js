import { Images } from './Assets.js';

export class MapManager {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = width / cellSize;
        this.rows = height / cellSize;

        this.waypoints = [
            { x: -cellSize, y: 3 * cellSize + cellSize / 2 },
            { x: 5 * cellSize + cellSize / 2, y: 3 * cellSize + cellSize / 2 },
            { x: 5 * cellSize + cellSize / 2, y: 11 * cellSize + cellSize / 2 },
            { x: 14 * cellSize + cellSize / 2, y: 11 * cellSize + cellSize / 2 },
            { x: 14 * cellSize + cellSize / 2, y: 4 * cellSize + cellSize / 2 },
            { x: width + cellSize, y: 4 * cellSize + cellSize / 2 }
        ];

        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
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
                    this.grid[r][c] = 1;
                }
            }
        }
    }

    canBuild(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        return this.grid[row][col] === 0;
    }

    placeTower(col, row) {
        this.grid[row][col] = 2;
    }

    draw(ctx, timestamp = 0) {
        // Background
        if (Images.bg && Images.bg.complete) {
            const pattern = ctx.createPattern(Images.bg, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = '#0a120a';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Subtle tech grid overlay
        ctx.strokeStyle = 'rgba(74, 246, 38, 0.04)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c <= this.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * this.cellSize, 0);
            ctx.lineTo(c * this.cellSize, this.height);
            ctx.stroke();
        }
        for (let r = 0; r <= this.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * this.cellSize);
            ctx.lineTo(this.width, r * this.cellSize);
            ctx.stroke();
        }

        // Draw path - layered for depth
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        const drawPath = (color, width) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            for (let i = 0; i < this.waypoints.length; i++) {
                if (i === 0) ctx.moveTo(this.waypoints[i].x, this.waypoints[i].y);
                else ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
            }
            ctx.stroke();
        };

        // Outer dark ground
        drawPath('rgba(8, 12, 8, 0.9)', this.cellSize * 1.7);
        // Mid layer
        drawPath('rgba(18, 28, 18, 0.88)', this.cellSize * 1.3);
        // Inner worn surface
        drawPath('rgba(28, 42, 28, 0.85)', this.cellSize * 1.0);

        // Animated dashed center line (direction arrows)
        const dashOffset = -(timestamp * 0.04) % (this.cellSize);
        ctx.strokeStyle = 'rgba(74, 246, 38, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        for (let i = 0; i < this.waypoints.length; i++) {
            if (i === 0) ctx.moveTo(this.waypoints[i].x, this.waypoints[i].y);
            else ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Soft green edge glow
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(74, 246, 38, 0.25)';
        ctx.strokeStyle = 'rgba(74, 246, 38, 0.08)';
        ctx.lineWidth = this.cellSize * 1.8;
        ctx.beginPath();
        for (let i = 0; i < this.waypoints.length; i++) {
            if (i === 0) ctx.moveTo(this.waypoints[i].x, this.waypoints[i].y);
            else ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Entry / Exit labels
        ctx.save();
        ctx.font = 'bold 13px VT323, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4af626';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#4af626';
        ctx.fillText('IN', 10, this.waypoints[0].y - 6);
        ctx.fillText('OUT', this.width - 12, this.waypoints[this.waypoints.length - 1].y - 6);
        ctx.restore();
    }
}
