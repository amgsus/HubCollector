/*
 * Author: A.G.
 *   Date: 2021/11/06
 */

import { HubClient }    from "@amgsus/hub-client";

import { HubCollector } from "../index.mjs";

const MASK = "*";
const TIMEOUT = 2500;
const IDLE_THRESHOLD = 500;

HubClient.connectNow().then(async (client) => {
    console.log(`Connected.\r\nCollecting notifications during ${TIMEOUT} ms (idle threshold ${IDLE_THRESHOLD} ms)...`);

    let collector = HubCollector.create(client);

    collector.timeout = TIMEOUT;
    collector.idleThreshold = IDLE_THRESHOLD;

    collector.on("filter", (notification, accept) => {
        accept(notification); // Accept all.
    });

    collector.start((error, collection, stopReason) => {
        console.log(`Stop reason: ${stopReason}`);
        for ( let v of collection ) {
            let { name, value } = v.lastNotification;
            console.log(`> ${name}=${value}`);
        }
        client.disconnect().then(() => console.log("Disconnected"));
    });

    await client.list(MASK);
}).catch(console.error);
