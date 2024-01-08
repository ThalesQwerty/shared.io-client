import { v4 as UUID } from "uuid";
import { EventEmitter } from "events";

import { Channel } from "./Channel.js";

const IGNORED_KEYS = [...Object.keys(EventEmitter.prototype), ...Object.keys(new EventEmitter()), "id", "type", "channel", "owned"].flat();

export class Entity extends EventEmitter {
    id = UUID();
    type = "Entity";
    channel;
    owned = false;

    /**
     * 
     * @param {Channel} channel 
     * @param {boolean} owned 
     * @returns 
     */
    constructor(channel, owned = true) {
        super();

        this.type = this.constructor.name;
        this.channel = channel;
        this.owned = owned;

        const changes = {
            ref: {}
        };

        setTimeout(() => {
            const initialValues = {};

            for (const key of Object.keys(this)) {
                if (!IGNORED_KEYS.includes(key)) {
                    initialValues[key] = this[key];
                }
            }

            this.channel.send({
                action: "create",
                params: {
                    entityId: this.id,
                    values: initialValues
                }
            });

            console.log("init", initialValues);
        }, 0);

        return new Proxy(this, {
            get(entity, key) {
                return entity[key];
            },
            set(entity, key, value) {
                if (!owned) return false;
                const previousValue = entity[key];

                if (!IGNORED_KEYS.includes(key) && value !== previousValue) {
                    const hasChanges = !!Object.keys(changes.ref).length;

                    changes.ref[key] = value;

                    if (!hasChanges) {
                        setTimeout(() => {                            
                            entity.channel.send({
                                action: "update",
                                params: {
                                    entityId: entity.id,
                                    values: changes.ref
                                }
                            });

                            entity.emit("change", {
                                values: changes.ref
                            });

                            changes.ref = {};
                        }, 0);
                    }
                }

                entity[key] = value;
                return true;
            }
        });
    }
}