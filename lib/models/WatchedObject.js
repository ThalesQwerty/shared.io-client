import { EventEmitter } from "events";
import { TypedEmitter } from "tiny-typed-emitter";

const IGNORED_KEYS = [...Object.keys(EventEmitter.prototype), ...Object.keys(new EventEmitter())].flat();

/**
 * @extends {TypedEmitter<{
    "change": (event: {newValues: Record<string, any>, oldValues: Record<string, any>}) => void,
    "write": (event: {property: string, oldValue: any, newValue: any}) => void,
    "call": (event: {methodName: string, parameters: any[], returnedValue: any}) => void
 * }>}
 */
class Watcher extends EventEmitter {
    constructor() {
        super();
    }
}
export class WatchedObject {    
    proxy;
    source;

    /**
     * @type {Watcher}
     */
    watcher;

    /**
     * @param {object} source 
     * @param {string[]} excludeKeys 
     */
    constructor(source, excludeKeys = []) {
        this.source = source;
        const watcher = this.watcher = new Watcher();

        const changes = {
            newValues: {},
            oldValues: {},
            emitting: false
        };

        const emitChange = (key, newValue, oldValue ) => {
            if (ignoredKeys.includes(key)) return;
            watcher.emit("write", { key, newValue, oldValue });

            changes.newValues[key] = newValue;
            changes.oldValues[key] = oldValue;

            if (!changes.emitting) {
                changes.emitting = true;
                
                setTimeout(() => {
                    const eventParams = {
                        newValues: changes.newValues,
                        oldValues: changes.oldValues
                    };

                    changes.newValues = {};
                    changes.oldValues = {};
                    changes.emitting = false;

                    watcher.emit("change", eventParams);
                }, 0);
            }
        }

        /**
         * @type {WatchedObject[]}
         */
        const duplicates = [];
        const ignoredKeys = [...IGNORED_KEYS, ...excludeKeys];

        this.proxy = new Proxy(source, {
            get(target, key) {
                const value = target[key];
                // if (ignoredKeys.includes(key)) return value;

                if (typeof value === "object") {
                    const duplicate = duplicates.find(duplicate => duplicate.source === value);

                    if (duplicate) {
                        return duplicate.proxy;
                    } else {
                        const watchedChild = new WatchedObject(value instanceof WatchedObject ? value.source : value);

                        watchedChild.watcher.on("write", () => {
                            if (target[key] === watchedChild.source) {
                                emitChange(key, value, value);
                            }
                        });

                        duplicates.push(watchedChild);

                        return watchedChild.proxy;
                    }
                } else if (typeof value === "function") {
                    return new Proxy(value, {
                        /**
                         * @param {Function} target 
                         * @param {object} thisArg 
                         * @param {any[]} params 
                         * @returns {any}
                         */
                        apply(target, thisArg, parameters) {
                            const returnedValue = target.apply(thisArg, parameters);

                            watcher.emit("call", { parameters, returnedValue, methodName: key });

                            return returnedValue;
                        }
                    });
                } else {
                    return value;
                }
            },
            set(target, key, value) {
                const previousValue = target[key];
                target[key] = value;

                if (value !== previousValue) {
                    emitChange(key, value, previousValue);
                }    

                return true;
            },
            deleteProperty(target, key) {
                if (Object.keys(target).includes(key)) {
                    const previousValue = target[key];
                    delete target[key];
                    emitChange(key, undefined, previousValue);
                }

                return true;
            }
        });
    }
}