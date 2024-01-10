import SharedIO from "../../lib/index.js";

class Player extends SharedIO.Entity {
    name = "Thales";
    x = 0;
    y = 0;

    constructor(channel, name) {
        super(channel);

        this.name = name;
    }
}

const client = new SharedIO.Client("ws://localhost:3000");
client.connect();

client.on("connect", () => {
    const channel = new SharedIO.Channel(client, "wololo");
    channel.join();

    window["channel"] = channel;

    channel.on("join", () => {
        console.log("JOINED", channel.id);
    });

    channel.on("createEntity", (event) => {
        console.log("NEW ENTITY", event.entity);
    });
});

window["Entity"] = SharedIO.Entity;
window["Player"] = Player;