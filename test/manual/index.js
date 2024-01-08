import SharedIO from "../../lib/index.js";

class Player extends SharedIO.Entity {
    name = "Thales";
    x = 0;
    y = 0;
}

const client = new SharedIO.Client("ws://localhost:3000");

client.on("open", () => {
    const channel = new SharedIO.Channel(client, "wololo");
    const player = new Player(channel);

    player.on("change", (event) => {
        console.log("CHANGE", event.changes);
    })

    console.log(player, channel);

    window["player"] = player;
})

window["Channel"] = Channel;
window["Entity"] = Entity;

console.log("hello there");