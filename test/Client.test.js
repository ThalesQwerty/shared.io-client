import { Channel } from "../lib/models/Channel";
import { Client } from "../lib/models/Client";
import { delay } from "./helpers/delay";
import { WS as WebSocketServer } from "jest-websocket-mock";

/**
 * @type {WebSocketServer}
 */
let server;

/**
 * @type {Client}
 */
let client;

describe("Client", () => {
    beforeEach(() => {
        server = new WebSocketServer("ws://localhost:1234");
        client = new Client("ws://localhost:1234");
    }); 

    afterEach(() => {
        server.close();
        WebSocketServer.clean();
        client.disconnect();
        client.removeAllListeners();
    });

    describe("Network", () => {
        test("Connection and disconnection by client", async () => {
            let connected = false;

            client.on("connect", () => {
                connected = true;
            });

            client.on("disconnect", () => {
                connected = false;
            });
    
            await client.connect();
            await server.connected;
    
            expect(connected).toBe(true);
            expect(client.connected).toBe(true);

            client.disconnect();

            await delay(50);

            expect(connected).toBe(false);
            expect(client.connected).toBe(false);
        });

        test("Disconnection by server", async () => {
            let connected = false;
    
            client.on("connect", () => {
                connected = true;
            });

            client.on("disconnect", () => {
                connected = false;
            });
    
            await client.connect();
            await server.connected;
    
            expect(connected).toBe(true);
            expect(client.connected).toBe(true);

            server.close();

            await delay(50);

            expect(connected).toBe(false);
            expect(client.connected).toBe(false);
        });
    });

    describe("Outputs", () => {
        test("Join and leave", async () => {
            /**
             * @type {Channel}
             */
            let channel;
            let hasLeft = false;

            await client.connect();
            await server.connected;

            client.on("joinChannel", event => {
                channel = event.channel;
            });

            client.on("leaveChannel", () => {
                hasLeft = true;
            });

            server.send(JSON.stringify({
                action: "join",
                channelId: "test"
            }));

            await delay(50);

            expect(client.channels).toHaveLength(1);
            expect(client.channels).toContain(channel);
            expect(channel).toBeDefined();
            expect(channel.id).toBe("test");
            expect(channel.client).toBe(client);
            expect(hasLeft).toBe(false);

            server.send(JSON.stringify({
                action: "leave",
                channelId: "test"
            }));

            await delay(50);

            expect(client.channels).toHaveLength(0);
            expect(client.channels).not.toContain(channel);
            expect(channel.id).toBe("test");
            expect(channel.client).toBe(client);
            expect(hasLeft).toBe(true);
        });
    });
});