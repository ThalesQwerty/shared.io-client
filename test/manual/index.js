import SharedIO from "../../lib/index.js";

const client = new SharedIO.Client("ws://localhost:3000");

window["client"] = client;
window["SharedIO"] = SharedIO;

/**
 * @type {Element}
 */
let mySquare = null;

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
        const apply = (e) => {
            square.style.background = entity.color;
            square.style.top = entity.position.y + "px";
            square.style.left = entity.position.x + "px";
        }
        apply();
        entity.on("change", e => apply(e));
    } else {
        mySquare = square;

        mySquare.style.top = position.y + "px";
        mySquare.style.left = position.x + "px";

        window.addEventListener("keydown", event => {
            controls[event.key] = true;
        });

        window.addEventListener("keyup", event => {
            controls[event.key] = false;
        });

        await client.connect();
        const channel = await client.joinChannel("square");

        channel.on("createEntity", ({ entity }) => {
            if (!entity.owned) createSquare(entity);
        });

        mySquareEntity = await channel.createEntity({ position: {...position}, color });

        animate();
    }
}

const squareSpeed = 128;
let lastUpdate = Date.now();

function animate() {
    const deltaTime = (Date.now() - lastUpdate) / 1000;
    const displacement = squareSpeed * deltaTime;
    lastUpdate = Date.now();

    if (controls.ArrowRight) position.x += displacement;
    if (controls.ArrowLeft) position.x -= displacement;

    if (controls.ArrowDown) position.y += displacement;
    if (controls.ArrowUp) position.y -= displacement;

    mySquare.style.top = position.y + "px";
    mySquare.style.left = position.x + "px";

    mySquareEntity.position.x = position.x;
    mySquareEntity.position.y = position.y;

    requestAnimationFrame(animate);
}

createSquare();