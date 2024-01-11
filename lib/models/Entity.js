import { v4 as UUID } from "uuid";
import { EventEmitter } from "events";

import { Channel } from "./Channel.js";
import { WatchedObject } from "./WatchedObject.js";

const IGNORED_KEYS = [...Object.keys(EventEmitter.prototype), ...Object.keys(new EventEmitter()), "id", "type", "channel", "owned"].flat();

export class Entity extends EventEmitter {
    /**
     * @param {Entity} entity 
     * @returns {Record<string, any>}
     */
      static read(entity) {
        const serialized = {};

        for (const key of Object.keys(entity)) {
            if (!IGNORED_KEYS.includes(key)) {
                serialized[key] = entity[key];
            }
        }

        return serialized;
    }

    /**
     * @param {Entity} entity 
     * @param {Record<string, any>} values
     */
    static write(entity, values) {
        for (const key in values) {
            entity[key] = values[key];
        }
    }

    /**
     * @param {Entity} entity 
     */
    static delete(entity) {
        const entityIndex = entity.channel.entities.indexOf(entity);

        if (entityIndex >= 0) {
            entity.channel.entities.splice(entityIndex, 1);

            if (entity.owned) {
                entity.channel.send({
                    action: "delete",
                    params: {
                        entityId: entity.id
                    }
                });
            }

            entity.emit("delete");
            this.channel.emit("deleteEntity", { entity });

            return true;
        }

        return false;
    }

    id;
    type = "Entity";
    channel;
    owned = false;

    /**
     * 
     * @param {Channel} channel 
     * @param {Record<string, any>} values
     * @param {string|null} id 
     * @returns 
     */
    constructor(channel, values = {}, id = null) {
        super();

        this.type = this.constructor.name;
        this.channel = channel;
        this.id = id || UUID();

        const owned = this.owned = !id;

        Entity.write(this, values);

        const { proxy, watcher } = new WatchedObject(this, ["id", "type", "channel", "owned"]);

        watcher.on("change", event => {
            if (owned) {
                this.channel.send({
                    action: "update",
                    params: {
                        entityId: this.id,
                        values: event.values
                    }
                });
            }

            this.emit("change", event);
        });

        this.channel.entities.push(proxy);

        setTimeout(() => {
            if (owned) {
                this.channel.send({
                    action: "create",
                    params: {
                        entityId: this.id,
                        values: Entity.read(this)
                    }
                });
            }
        }, 0);

        return proxy;
    }
}