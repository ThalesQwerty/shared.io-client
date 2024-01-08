import { v4 as UUID } from "uuid";

import { Client } from "./Client.js";
import { Entity } from "./Entity.js";

export class Channel {
    id;
    client;
    
    /**
     * @type {Entity[]}
     */
    entities = [];

    /**
     * @param {Client} client 
     * @param {string} id 
     */
    constructor(client, id) {
        this.client = client;
        this.id = id || UUID();

        this.join();
    }

    join() {
        return this.client.joinChannel(this.id);
    }

    leave() {
        return this.client.leaveChannel(this.id);
    }

    /**
     * @param {Record<string, any>} data 
     * @param {Function} onResponse 
     */
    send(data, onResponse) {
        return this.client.send({
            ...data,
            channelId: this.id
        }, onResponse);
    }
}