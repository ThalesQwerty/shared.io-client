import { v4 as UUID } from "uuid";
import { EventEmitter } from "events";

import { Client } from "./Client.js";
import { Entity } from "./Entity.js";

export class Channel extends EventEmitter {
    id;
    client;
    
    /**
     * @type {Entity[]}
     */
    entities = [];

    connected = false;

    /**
     * @param {Client} client 
     * @param {string} id 
     */
    constructor(client, id) {
        super();

        this.client = client;
        this.id = id || UUID();

        if (!this.client.channels.includes(this)) {
            this.client.channels.push(this);
        }
    }

    /**
     * @param {Record<string, any>} values 
     * @returns {Entity}
     */
    createEntity(values = {}) {
        return new Entity(this, values);
    }

    /**
     * @param {Record<string, any>} credentials 
     */
    join(credentials = null) {
        if (!this.connected) {
            this.client.send({
                action: "join",
                channelId: this.id,
                params: {
                    credentials
                }
            });
        }

        return this;
    }

    leave() {
        if (this.connected) {
            this.client.send({
                action: "leave",
                channelId: this.id
            });
        }

        const channelIndex = this.client.channels.indexOf(this);
        if (channelIndex >= 0) this.client.channels.splice(channelIndex, 1);

        this.connected = false;
        this.emit("leave");

        return this;
    }

    /**
     * @param {Record<string, any>} data 
     * @param {Function} onResponse 
     * @param {string|undefined} inputId
     */
    send(data, onResponse, inputId) {
        return this.client.send({
            ...data,
            channelId: this.id
        }, onResponse, inputId);
    }
}