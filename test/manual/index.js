import SharedIO from "../../lib/index.js";

const client = new SharedIO.Client("ws://localhost:3000");

window["client"] = client;
window["SharedIO"] = SharedIO;

/**
 * @type {Entity}
 */
let mySquareEntity = null;

const controls = {};
const position = {
    x: Math.random() * 256,
    y: Math.random() * 256
};

/**
 * @type {Channel}
 */
let channel;

/**
 * @param {Entity} entity 
 */
async function createSquare(entity) {
    const color = "#" + Math.floor(Math.random() * Math.pow(16, 6)).toString(16).padStart(6, "0");

    const square = document.createElement("div");
    square.style.width = square.style.height = "32px";
    square.style.background = color;
    square.style.border = `solid 2px black`;
    square.style.position = "absolute";

    document.body.appendChild(square);

    if (entity) {
        entity._square = square;
    } else {
        square.style.top = position.y + "px";
        square.style.left = position.x + "px";

        window.addEventListener("keydown", event => {
            controls[event.key] = true;
        });

        window.addEventListener("keyup", event => {
            controls[event.key] = false;
        });

        await client.connect();
        channel = await client.joinChannel("square");

        channel.on("createEntity", ({ entity }) => {
            if (!entity.owned) createSquare(entity);
        });

        mySquareEntity = await channel.createEntity({ position: {...position}, color, _square: square });

        animate();
    }
}

const squareSpeed = 128;
let lastUpdate = Date.now();

function animate() {
    const deltaTime = (Date.now() - lastUpdate) / 1000;
    const displacement = squareSpeed * deltaTime;
    lastUpdate = Date.now();

    if (controls.ArrowRight) mySquareEntity.position.x += displacement;
    if (controls.ArrowLeft) mySquareEntity.position.x -= displacement;

    if (controls.ArrowDown) mySquareEntity.position.y += displacement;
    if (controls.ArrowUp) mySquareEntity.position.y -= displacement;

    channel.entities.forEach(entity => {
        if (!entity._square) return;
        entity._square.style.top = entity.position.y + "px";
        entity._square.style.left = entity.position.x + "px";
    });

    requestAnimationFrame(animate);
}

createSquare();