export const Images = {
    marine: new Image(),
    tank: new Image(),
    zergling: new Image(),
    hydra: new Image(),
    bg: new Image(),

    // Default placeholders for units we didn't generate (they can use existing images or just colors if not loaded yet)
    ghost: new Image(),
    firebat: new Image(),
    turret: new Image(),
    muta: new Image(),
    ultra: new Image()
};

let loadedCount = 0;
const totalImages = 5; // We generated 5 mainly

export function loadAssets(callback) {
    const onLoad = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
            callback();
        }
    };

    Images.marine.src = '../assets/images/marine.png';
    Images.marine.onload = onLoad;

    Images.tank.src = '../assets/images/tank.png';
    Images.tank.onload = onLoad;

    Images.zergling.src = '../assets/images/zergling.png';
    Images.zergling.onload = onLoad;

    Images.hydra.src = '../assets/images/hydra.png';
    Images.hydra.onload = onLoad;

    Images.bg.src = '../assets/images/bg.png';
    Images.bg.onload = onLoad;

    // Reuse marine for firebat/ghost tint or just use marine image since it's terran infantry
    Images.firebat.src = '../assets/images/marine.png';
    Images.ghost.src = '../assets/images/marine.png';
    Images.turret.src = '../assets/images/tank.png';

    Images.muta.src = '../assets/images/hydra.png';
    Images.ultra.src = '../assets/images/zergling.png';
}
