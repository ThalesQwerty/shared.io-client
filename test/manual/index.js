import SharedIO from "../../lib/index.js";

const client = new SharedIO.Client("ws://localhost:3000");
client.connect();

window["client"] = client;
window["SharedIO"] = SharedIO;