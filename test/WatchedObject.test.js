import { WatchedObject } from "../lib/models/WatchedObject";

function delay(milliseconds = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
}

describe("WatchedObject", () => {
    describe("Write event", () => {
        test("Primitives", () => {
            let writeEvent;

            const { proxy, watcher } = new WatchedObject({
                a: 1,
                b: 2,
                c: 3,
                ignoredKey: 0
            }, ["ignoredKey"]);

            watcher.on("write", event => {
                writeEvent = event;
            });

            proxy.ignoredKey = 1;
            expect(writeEvent).toBeUndefined();

            proxy.a = 10;
            expect(writeEvent).toEqual({ propertyName: "a", oldValue: 1, newValue: 10 });

            proxy.b = 20;
            expect(writeEvent).toEqual({ propertyName: "b", oldValue: 2, newValue: 20 });

            proxy.c = 30;
            expect(writeEvent).toEqual({ propertyName: "c", oldValue: 3, newValue: 30 });
        });

        test("Objects", () => {
            let writeEvent;

            const { proxy, watcher } = new WatchedObject({
                obj: {
                    x: 0,
                    y: 1
                }
            });

            watcher.on("write", event => {
                writeEvent = event;
            });

            const oldObj = proxy.obj;

            proxy.obj.y = 0;
            expect(writeEvent).toEqual({ propertyName: "obj", oldValue: oldObj, newValue: oldObj });

            const newObj = proxy.obj = {
                x: 1,
                y: 0
            };
            expect(writeEvent).toEqual({ propertyName: "obj", oldValue: oldObj, newValue: newObj });

            writeEvent = undefined;
            
            oldObj.z = -1;
            expect(writeEvent).toBeUndefined();

            proxy.obj.z = -1;
            expect(writeEvent).toEqual({ propertyName: "obj", oldValue: newObj, newValue: newObj });
        });
    });

    describe("Change event", () => {
        test("Primitives", async () => {
            let changeEvent;

            const { proxy, watcher } = new WatchedObject({
                a: 1,
                b: 2,
                c: 3,
                ignoredKey: 0
            }, ["ignoredKey"]);

            watcher.on("change", event => {
                changeEvent = event;
            });

            proxy.a = 1;
            proxy.b = 2;
            proxy.c = 3;
            await delay();

            expect(changeEvent).toBeUndefined();

            proxy.ignoredKey = 3;
            await delay();

            expect(changeEvent).toBeUndefined();

            proxy.a = 10;
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                a: 10
            });

            proxy.a = 100;
            proxy.b = 200;
            proxy.c = 300;
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                a: 100,
                b: 200,
                c: 300
            });

            proxy.ignoredKey = 400;
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                a: 100,
                b: 200,
                c: 300
            });
        });

        test("Objects", async () => {
            let changeEvent;

            const { proxy, watcher } = new WatchedObject({
                obj: {
                    x: 0,
                    y: 0
                },
                arr: [0, 1, 2]
            });

            watcher.on("change", event => {
                changeEvent = event;
            });

            proxy.obj.x = 0;
            proxy.obj.y = 0;
            await delay();

            expect(changeEvent).toBeUndefined();

            proxy.obj = {
                x: 0,
                y: 1
            };
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                obj: {
                    x: 0,
                    y: 1
                }
            });

            proxy.obj.x = 1;
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                obj: {
                    x: 1,
                    y: 1
                }
            });

            proxy.arr.push(3);
            proxy.arr.shift();
            await delay();

            expect(changeEvent).toBeDefined();
            expect(changeEvent.newValues).toEqual({
                arr: [1, 2, 3]
            });
        });
    });

    describe("Call event", () => {
        test("Functions", () => {
            let callEvent;

            const { proxy, watcher } = new WatchedObject({
                sum(a, b) {
                    return a + b;
                }
            });

            watcher.on("call", event => {
                callEvent = event;
            });

            const result = proxy.sum(7, 5);

            expect(result).toBe(12);
            expect(callEvent).toEqual({ methodName: "sum", parameters: [7, 5], returnedValue: 12 });
        });
    });
});