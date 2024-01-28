import { v4 as UUID } from "uuid";
import { TypedEmitter } from "tiny-typed-emitter";
import { EventEmitter } from "events";

import { Client } from "./Client.js";
import { Entity } from "./Entity.js";


/**
 * @extends {TypedEmitter<{
    "leave": (event: { channel: Channel }) => void,
    "join": (event: { channel: Channel }) => void,
    "createEntity": (event: { channel: Channel, entity: Entity }) => void,
    "deleteEntity": (event: { channel: Channel, entity: Entity }) => void
   }>}
 */
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
     * @param {string} type
     * @param {Record<string, any>} values 
     * @returns {Promise<Entity>}
     */
    createEntity(type, values = {}) {
        return new Promise((resolve, reject) => {
            const entity = new Entity(this, type, values);

            entity.on("create", () => {
                resolve(entity);
            });

            // TO-DO: Handle rejection
        });
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

    /**
     * @fires Channel#leave
     */
    leave() {
        if (this.connected) {
            this.client.send({
                action: "leave",
                channelId: this.id
            });
            this.connected = false;
        }

        for (const entity of this.entities) {
            Entity.delete(entity);
        }

        const channelIndex = this.client.channels.indexOf(this);
        if (channelIndex >= 0) this.client.channels.splice(channelIndex, 1);

        this.emit("leave");
        this.client.emit("leaveChannel", { channel: this, client: this.client });

        return this;
    }

    /**
     * @param {Record<string, any>} data 
     * @param {Function} onResponse 
     * @param {string|undefined} threadId
     */
    send(data, onResponse, threadId) {
        if (!this.connected) return;
        return this.client.send({
            ...data,
            channelId: this.id
        }, onResponse, threadId);
    }
}