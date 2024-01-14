import SharedIO from "../../lib/index.js";

const client = new SharedIO.Client("ws://localhost:3000");

window["client"] = client;
window["SharedIO"] = SharedIO;

await client.connect();

async function joinChannel(channelName) {
    document.querySelectorAll(".channel_name").forEach(span => span.innerHTML = channelName);

    document.querySelector("#join_channel").style.display = "none";
    document.querySelector("#loading_channel").style.display = "block";
    document.querySelector("#leave_channel").style.display = "none";

    const channel = await client.joinChannel(channelName);

    document.querySelector("#loading_channel").style.display = "none";
    document.querySelector("#leave_channel").style.display = "block";

    console.log("Joined channel", channelName);

    channel.on("createEntity", ({ entity }) => {
        console.log("created", entity);
        createSquare(entity);
    });

    /**
     * @param {Entity} entity 
     */
    function createSquare(entity) {
        const square = document.createElement("div");
        square.style.width = square.style.height = "32px";
        square.style.border = `solid 2px black`;
        square.style.position = "absolute";
        square.style.background = entity.color;
        square.style.top = entity.position.y + "px";
        square.style.left = entity.position.x + "px";
        square.style.zIndex = -1;
        square.style.pointerEvents = "none";

        document.querySelector("#squares").appendChild(square);

        entity._square = square;

        entity.on("delete", () => {
            square.remove();
        });

        if (entity.owned) {
            window.addEventListener("keydown", event => {
                entity._controls[event.key] = true;
            });

            window.addEventListener("keyup", event => {
                entity._controls[event.key] = false;
            });
        }
    }

    const squareSpeed = 128;
    let lastUpdate = Date.now();

    function animate() {
        const deltaTime = (Date.now() - lastUpdate) / 1000;
        const displacement = squareSpeed * deltaTime;
        lastUpdate = Date.now();

        for (const entity of channel.entities) {
            if (!entity._square) return;
            entity._square.style.top = entity.position.y + "px";
            entity._square.style.left = entity.position.x + "px";

            if (entity.owned) {       
                if (entity._controls.ArrowRight) entity.position.x += displacement;
                if (entity._controls.ArrowLeft) entity.position.x -= displacement;

                if (entity._controls.ArrowDown) entity.position.y += displacement;
                if (entity._controls.ArrowUp) entity.position.y -= displacement;
            }
        }

        requestAnimationFrame(animate);
    }

    await channel.createEntity({
        color: "#" + Math.floor(Math.random() * Math.pow(16, 6)).toString(16).padStart(6, "0"),
        position: {
            x: Math.random() * 256,
            y: Math.random() * 256
        },
        _controls: {}
    });

    window["leaveChannel"] = function() {
        channel.leave();

        document.querySelector("#join_channel").style.display = "block";
        document.querySelector("#loading_channel").style.display = "none";
        document.querySelector("#leave_channel").style.display = "none";
    }

    animate();
}

window["joinChannel"] = joinChannel;
window["leaveChannel"] = function() {};