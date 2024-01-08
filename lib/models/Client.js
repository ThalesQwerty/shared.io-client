import { EventEmitter } from "events";
import { v4 as UUID } from "uuid";

import { Channel } from "./Channel.js";

export class Client extends EventEmitter {
    ws;

    /**
     * @type {Record<string, Function>}
     */
    pendingResponses = {};

    /**
     * @type {Channel[]}
     */
    channels = [];

    constructor(url) {
        super();

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("Websocket connection open at", url);

            this.emit("open");
        };

        this.ws.onmessage = (event) => {
            console.log("received", event.data);

            // TO-DO: Broadcast message to channels
        }

        this.ws.onclose = (event) => {
            console.log("Connection closed at", url);
            delete Channel.websockets[url];

            this.reset();
        }

        this.ws.onerror = (error) => {
            throw error;
        }
    }

    joinChannel(channelId = "") {
        this.send({
            action: "join",
            channelId
        })
    }

    leaveChannel(channelId = "") {
        this.send({
            action: "leave",
            channelId
        })
    }

    /**
     * 
     * @param {Record<string, any>} data 
     * @param {Function} onResponse 
     */
    send(data, onResponse) {
        const inputId = UUID();
        data.inputId = inputId;

        this.ws.send(JSON.stringify(data));

        if (onResponse && typeof onResponse === "function") {
            this.pendingResponses[inputId] = onResponse;
        }
    }
}