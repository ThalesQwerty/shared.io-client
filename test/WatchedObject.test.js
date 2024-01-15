import { WatchedObject } from "../lib/models/WatchedObject";

function delay(milliseconds = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
}

describe("WatchedObject", () => {
    test("Change event - primitives", async () => {
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

    test.only("Change event - objects", async () => {
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