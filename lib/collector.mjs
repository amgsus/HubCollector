/*
 * Author: A.G.
 *   Date: 2021/11/06
 */

import { EventEmitter, once } from "events";
import { sliceCallbackWithTimeout } from "./utils.mjs";

const DEFAULT_IDLE_THRESHOLD = -1; // No timeout.
const DEFAULT_TIMEOUT = -1; // No timeout.
const EV_COLLECT = "collect";
const EV_START = "start";
const EV_STOP = "stop";
const EV_FILTER = "filter";

export class HubCollector extends EventEmitter {

    #client;
    #updateHandler;
    #collection = {};
    #timeoutHandle = null;
    #idleThreshold = DEFAULT_IDLE_THRESHOLD;
    #timeout = DEFAULT_TIMEOUT;
    #idleTimeoutHandle = null;

    constructor(client) {
        super();
        this.#client = client;
        this.#updateHandler = this.#onUpdate.bind(this);
    }

    start(opts = null) {
        if (this.collecting) { throw "Already started"; }

        let {
            args,
            callback
        } = sliceCallbackWithTimeout(arguments);

        if (typeof args[0] === "object") {
            opts = args[0];
            if (typeof opts.idleThreshold !== "undefined") {
                this.idleThreshold = opts.idleThreshold;
            }
            if (typeof opts.timeout !== "undefined") {
                this.timeout = opts.timeout;
            }
        } else if (typeof args[0] === "number") {
            this.timeout = args[0];
        }

        this.#collection = {};
        this.#client.on("update", this.#updateHandler);

        if (this.#timeout > 0) {
            this.#timeoutHandle = setTimeout(this.#timeoutHandler.bind(this, "timeout"), this.#timeout);
        }

        if (typeof callback === "function") {
            once(this, EV_COLLECT).then((data) => callback(null, data[0], data[1])).catch(callback);
        }

        if (this.#idleThreshold > 0) {
            this.#reloadIdleTimeout(true); // Force.
        }

        this.emit(EV_START);
    }

    #timeoutHandler(reason) {
        this.#cleanup();
        this.#notify(reason);
    }

    #reloadIdleTimeout(force = false) {
        if (this.#idleTimeoutHandle || force) {
            clearTimeout(this.#idleTimeoutHandle);
            this.#idleTimeoutHandle = setTimeout(this.#timeoutHandler.bind(this, "idle"), this.#idleThreshold);
        }
    }

    #onUpdate(notification) {
        if (this.listenerCount(EV_FILTER) > 0) {
            let dropped = true;
            const acceptDelegate = (updatedNotification) => {
                dropped = false;
                if (!dropped) {
                    if (updatedNotification) {
                        notification = updatedNotification;
                    }
                }
            };
            if (this.emit(EV_FILTER, notification, acceptDelegate)) { // Synchronous.
                if (dropped) {
                    return;
                }
            }
        }
        let count = this.#collection[notification.name] ? (this.#collection[notification.name].count || 0) : 0;
        this.#collection[notification.name] = {
            lastNotification: notification,
            timestamp: Date.now(),
            count: count + 1
        };
        this.#reloadIdleTimeout();
    }

    terminate() {
        if (!this.collecting) { throw "Invalid state"; }
        this.#cleanup();
        this.#notify("terminated");
    }

    #notify(stopReason) {
        let items = Object.values(this.#collection);
        this.emit(EV_STOP, stopReason);
        this.emit(EV_COLLECT, items, stopReason);
    }

    #cleanup() {
        this.#client.removeListener("update", this.#updateHandler);
        clearTimeout(this.#timeoutHandle);
        this.#timeoutHandle = null;
        clearTimeout(this.#idleTimeoutHandle);
        this.#idleTimeoutHandle = null;
    }

    get collection() { return this.#collection; }

    get arrayCollection() { return Object.values(this.#collection).map((item) => item.lastNotification); }

    get collecting() { return this.#timeoutHandle !== null; }

    get idleThreshold() { return this.#idleThreshold; }

    get timeout() { return this.#timeout; }

    set idleThreshold(value) {
        let n = Number(value);
        if (isNaN(n)) {
            throw "Value is not valid number";
        }
        this.#idleThreshold = n;
    }

    set timeout(value) {
        let n = Number(value);
        if (isNaN(n)) {
            throw "Value is not valid number";
        }
        this.#timeout = n;
    }

    static create(client) {
        return new HubCollector(client);
    }
}
