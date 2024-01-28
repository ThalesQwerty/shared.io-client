import { v4 as UUID } from "uuid";
import { TypedEmitter } from "tiny-typed-emitter";
import { EventEmitter } from "events";

import { Channel } from "./Channel.js";
import { WatchedObject } from "./WatchedObject.js";

/**
 * @extends {TypedEmitter<{
    "create": (event: { entity: Entity }) => void,
    "delete": (event: { entity: Entity }) => void
    "change": (event: { newValues: Record<string, any>, entity: Entity }) => void
   }>}
 */
export class Entity extends EventEmitter {
    static IGNORED_KEYS = [...Object.keys(EventEmitter.prototype), ...Object.keys(new EventEmitter()), ...Object.keys(new Entity())];
    static UPDATE_RATE = 128;

    static isKeyPrivate(key) {
        return key[0] === "_";
    }

    /**
     * @param {Entity} entity 
     * @returns {Record<string, any>}
     */
    static read(entity) {
        const serialized = {};

        for (const key of Object.keys(entity)) {
            if (!Entity.IGNORED_KEYS.includes(key)) {
                serialized[key] = entity[key];
            }
        }

        return serialized;
    }

    /**
     * @param {Entity} entity 
     * @param {Record<string, any>} values
     */
    static write(entity, values, bypassPrivateKeys = true) {
        for (const key in values) {
            if (!bypassPrivateKeys && Entity.isKeyPrivate(key)) continue;
            entity[key] = values[key];
        }
    }

    /**
     * @param {Entity} entity 
     */
    static delete(entity) {
        if (!entity.active) return false;

        const entityIndex = entity.channel.entities.indexOf(entity);

        if (entityIndex >= 0) {
            entity.channel.entities.splice(entityIndex, 1);
        }

        if (entity.owned) {
            entity.channel.send({
                action: "delete",
                params: {
                    entityId: entity.id
                }
            });
        }

        entity.active = false;
        entity.emit("delete", { entity });
        entity.channel.emit("deleteEntity", { entity });

        return true;
    }

    id;
    type = "Entity";
    channel;
    owned = false;
    active = false;

    /**
     * @param {Channel} channel 
     * @param {string} type
     * @param {Record<string, any>} values
     * @param {string|null} id 
     * @returns 
     */
    constructor(channel, type, values = {}, id = null) {
        super();

        this.type = type;
        this.channel = channel;
        this.id = id || UUID();

        const owned = this.owned = !id;

        const watchedObject = new WatchedObject(this, Entity.IGNORED_KEYS);

        /**
         * @type { Entity }
         */
        const proxy = watchedObject.proxy;
        const watcher = watchedObject.watcher;

        Entity.write(this, values, true);

        if (this.channel) {
            this.channel.entities.push(proxy);

            const changes = { newValues: {}, lastUpdate: Date.now() };

            watcher.on("change", ({ newValues }) => {
                if (owned) {
                    const hadPreviousChanges = !!Object.keys(changes.newValues).length;

                    for (const key in newValues) {
                        if (Entity.isKeyPrivate(key)) continue;
                        changes.newValues[key] = newValues[key];
                    }

                    const hasNewChanges = !hadPreviousChanges && Object.keys(changes.newValues).length;

                    if (hasNewChanges) {
                        const deltaTimeMs = Date.now() - changes.lastUpdate;
                        const delayMs = Math.max(0, Math.round(1000 / Entity.UPDATE_RATE) - deltaTimeMs);

                        setTimeout(() => {
                            this.channel.send({
                                action: "update",
                                params: {
                                    entityId: this.id,
                                    values: changes.newValues
                                }
                            });

                            changes.newValues = {};
                            changes.lastUpdate = Date.now();
                        }, delayMs);
                    }
                }

                proxy.emit("change", {
                    entity: proxy,
                    newValues
                });
            });

            setTimeout(() => {
                if (owned) {
                    this.channel.send({
                        action: "create",
                        params: {
                            entityId: this.id,
                            type: this.type,
                            values: Entity.read(this)
                        }
                    });
                }
            }, 0);
        }

        return proxy;
    }
}