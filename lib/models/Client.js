import { EventEmitter } from "events";
import { TypedEmitter } from "tiny-typed-emitter";
import { v4 as UUID } from "uuid";

import { Channel } from "./Channel.js";
import { Entity } from "./Entity.js";

/**
 * @typedef {{
 *  action: "join"|"leave"|"create"|"read"|"update"|"delete"
 *  channelId: string,
 *  outputId?: string,
 *  params?: Record<string, any>
 * }} Output
 */

/**
 * @extends {TypedEmitter<{
    "connect": (event: { client: Client }) => void,
    "disconnect": (event: { client: Client }) => void
    "joinChannel": (event: { client: Client, channel: Channel }) => void,
    "leaveChannel": (event: { client: Client, channel: Channel }) => void,
   }>}
 */
export class Client extends EventEmitter {
    /**
     * @type {WebSocket}
     */
    #ws;

    /**
     * @type {Record<string, Function>}
     */
    #pendingResponses = {};

    /**
     * @type {Channel[]}
     */
    channels = [];

    url;

    get connected() {
        return this.#ws && this.#ws.readyState === this.#ws.OPEN;
    }

    constructor(url = "") {
        super();
        this.url = url;
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.connected) return;

            const { url } = this;

            this.#ws?.disconnect();
            this.#ws = new WebSocket(url);

            this.#ws.onopen = () => {
                console.log("Websocket connection open at", url);

                resolve();
                this.emit("connect");
            };

            this.#ws.onmessage = (event) => {
                try {
                    /**
                     * @type {Output}
                     */
                    const output = JSON.parse(event.data);

                    const channel = this.channels.find(channel => channel.id === output.channelId);

                    const connectToChannel = (channel) => {
                        channel.connected = true;
                        channel.emit("join");
                        this.emit("joinChannel", { channel });
                    }

                    if (channel) {
                        switch (output.action) {
                            case "create": {
                                const oldEntity = channel.entities.find(entity => entity.id === output.params.entityId);
                                
                                if (oldEntity) {
                                    if (oldEntity.owned) {
                                        // server confirmed entity creation
                                        oldEntity.active = true;
                                        oldEntity.emit("create");
                                        channel.emit("createEntity", { entity: oldEntity });
                                        break;
                                    }
                                    else Entity.delete(oldEntity);
                                }

                                const newEntity = new Entity(channel, output.params.values, output.params.entityId);
                                newEntity.active = true;
                                newEntity.emit("create");                               
                                channel.emit("createEntity", { entity: newEntity });

                                break;
                            }

                            case "read": {
                                const entity = channel.entities.find(entity => entity.id === output.params.entityId);

                                if (entity) {
                                    const seralized = Entity.read(entity);

                                    channel.send({
                                        action: "read",
                                        params: {
                                            entityId: entity.id,
                                            values: seralized
                                        }
                                    }, undefined, output.outputId);
                                }

                                break;
                            }

                            case "update": {
                                const entity = channel.entities.find(entity => entity.id === output.params.entityId);
                                if (entity) Entity.write(entity, output.params.values, false);

                                break;
                            }

                            case "delete": {
                                const entity = channel.entities.find(entity => entity.id === output.params.entityId);
                                if (entity) Entity.delete(entity);

                                break;
                            }

                            case "join": {
                                connectToChannel(channel);
                                break;
                            }

                            case "leave": {
                                channel.leave();
                            }
                        }
                    } else if (output.action === "join") {
                        const newChannel = new Channel(this, output.channelId);
                        connectToChannel(newChannel);
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            this.#ws.onclose = () => {
                this.emit("disconnect");
                
                for (const channel of this.channels) {
                    channel.leave();
                }
            }

            this.#ws.onerror = (error) => {
                reject(error);
                throw error;
            }
        });
    }

    disconnect() {
        this.#ws.close();
    }

    /**
     * @param {string} channelId 
     * @param {Record<string, any>} credentials 
     * @returns {Promise<Channel>}
     */
    joinChannel(channelId = "", credentials = null) {
        return new Promise((resolve, reject) => {
            const channel = this.channels.find(channel => channel.id === channelId) ?? new Channel(this, channelId);
            if (channel.connected) return resolve(channel);

            channel.on("join", () => {
                resolve(channel);
            });

            // TO-DO: Handle rejection
            
            this.send({
                action: "join",
                channelId
            });

            channel.join(credentials);            
        });
    }

    leaveChannel(channelId = "") {
        const channel = this.channels.find(channel => channel.id === channelId);
        if (channel) channel.leave();
    }

    /**
     * 
     * @param {Record<string, any>} data 
     * @param {Function} onResponse 
     * @param {string|undefined} inputId
     */
    send(data, onResponse, inputId) {
        data.inputId = inputId ?? UUID();

        this.#ws.send(JSON.stringify(data));

        if (onResponse && typeof onResponse === "function") {
            this.#pendingResponses[data.inputId] = onResponse;
        }
    }
}