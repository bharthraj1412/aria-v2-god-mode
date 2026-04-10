"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannel = getChannel;
const local_1 = require("./local");
const channels = new Map([[local_1.localExecChannel.name, local_1.localExecChannel]]);
function getChannel(name) {
    const channel = channels.get(name);
    if (!channel) {
        throw new Error(`Unknown channel: ${name}`);
    }
    return channel;
}
