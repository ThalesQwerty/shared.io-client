import { Channel } from "../lib/models/Channel";
import { Client } from "../lib/models/Client";
import { Entity } from "../lib/models/Entity";
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
        describe("Channels", () => {
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

        describe("Entities", () => {
            /**
             * @type {Channel}
             */
            let channel;

            beforeEach(async () => {
                await client.connect();
                await server.connected;

                server.send(JSON.stringify({
                    action: "join",
                    channelId: "test"
                }));

                await delay(50);

                expect(client.channels).toHaveLength(1);

                channel = client.channels[0];
                expect(channel).toBeDefined();
                expect(channel.entities).toHaveLength(0);
            });

            test("Create and update non-owned entity", async () => {
                /**
                 * @type {Entity}
                 */
                let entity;

                channel.on("createEntity", event => {
                    entity = event.entity;
                })

                server.send(JSON.stringify({
                    action: "create",
                    channelId: "test",
                    params: {
                        entityId: "entity",
                        type: "Test",
                        values: {
                            a: 1,
                            b: 2
                        }
                    }
                }));

                await delay(50);

                expect(channel.entities).toHaveLength(1);
                expect(entity).toBeDefined();
                expect(channel.entities).toContain(entity);
                expect(entity.type).toBe("Test");
                expect(entity.owned).toBe(false);
                expect(entity.a).toBe(1);
                expect(entity.b).toBe(2);

                server.send(JSON.stringify({
                    action: "update",
                    channelId: "test",
                    params: {
                        entityId: "entity",
                        type: "Test",
                        values: {
                            a: 3
                        }
                    }
                }));

                await delay(50);

                expect(channel.entities).toHaveLength(1);
                expect(channel.entities).toContain(entity);
                expect(entity.type).toBe("Test");
                expect(entity.owned).toBe(false);
                expect(entity.a).toBe(3);
                expect(entity.b).toBe(2);
            });

            test("Create owned entity", async () => {
                /**
                 * @type {Entity}
                 */
                let createdEntity;

                channel.on("createEntity", event => {
                    createdEntity = event.entity;
                })

                channel.createEntity("Test", {
                    a: 1,
                    b: 2
                }); 

                expect(channel.entities).toHaveLength(1);
                
                const entity = channel.entities[0];
                expect(entity).toBeDefined();
                expect(entity.type).toBe("Test");
                expect(entity.owned).toBe(true);
                expect(entity.active).toBe(false);
                expect(entity.a).toBe(1);
                expect(entity.b).toBe(2);
                expect(createdEntity).toBeUndefined();

                server.send(JSON.stringify({
                    action: "create",
                    channelId: "test",
                    params: {
                        entityId: entity.id,
                        type: "Test",
                        values: {
                            a: 1,
                            b: 2
                        }
                    }
                }));

                await delay(50);

                expect(entity.type).toBe("Test");
                expect(entity.owned).toBe(true);
                expect(entity.active).toBe(true);
                expect(entity.a).toBe(1);
                expect(entity.b).toBe(2);
                expect(createdEntity).toBe(entity);
            });
        });
    });
});