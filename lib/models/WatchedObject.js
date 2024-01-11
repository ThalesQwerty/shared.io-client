import { EventEmitter } from "events";

const IGNORED_KEYS = [...Object.keys(EventEmitter.prototype), ...Object.keys(new EventEmitter())].flat();
export class WatchedObject {    
    proxy;
    source;

    /**
     * @type {EventEmitter}
     */
    watcher;

    /**
     * @param {object} source 
     * @param {string[]} excludeKeys 
     */
    constructor(source, excludeKeys = []) {
        const watcher = new EventEmitter();

        this.source = source;
        this.watcher = watcher;

        const changes = {
            ref: {}
        };

        const emitChange = (key, value) => {
            if (ignoredKeys.includes(key)) return;

            const hasChanges = !!Object.keys(changes.ref).length;

            changes.ref[key] = value;

            if (!hasChanges) {
                setTimeout(() => {
                    watcher.emit("change", {
                        values: changes.ref
                    });

                    changes.ref = {};
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

                        watchedChild.watcher.on("change", () => {
                            emitChange(key, value);
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
                        apply(target, thisArg, params) {
                            const returnedValue = target.apply(thisArg, params);

                            watcher.emit("call", { params, returnedValue });

                            return returnedValue;
                        }
                    });
                } else {
                    return value;
                }
            },
            set(target, key, value) {
                const previousValue = target[key];

                if (value !== previousValue) {
                    emitChange(key, value);
                }

                target[key] = value;
                return true;
            },
            deleteProperty(target, key) {
                if (Object.keys(target).includes(key)) {
                    delete target[key];
                    emitChange(key, undefined);
                }

                return true;
            }
        });
    }
}