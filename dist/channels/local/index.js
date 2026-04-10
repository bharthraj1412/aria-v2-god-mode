"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localExecChannel = void 0;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const config_1 = require("../../config");
const policy_1 = require("../../security/policy");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
async function runLocalCommand(command) {
    try {
        const { stdout, stderr } = await execAsync(command, { timeout: 30_000, windowsHide: true });
        const combined = [stdout?.trim(), stderr?.trim()].filter(Boolean).join('\n');
        return {
            content: combined || '(command completed with no output)',
            metadata: { mode: 'local-exec' },
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown local command failure';
        return {
            content: `Local command failed: ${message}`,
            metadata: { mode: 'local-exec' },
        };
    }
}
exports.localExecChannel = {
    name: 'local-exec',
    async handle(input) {
        const trimmed = input.message.trim();
        if (!trimmed.toLowerCase().startsWith('exec:')) {
            return {
                content: trimmed,
                metadata: { mode: 'pass-through' },
            };
        }
        const command = trimmed.slice(5).trim();
        if (!command) {
            return { content: 'No command provided. Use exec: <command>' };
        }
        const config = (0, config_1.loadRuntimeConfig)();
        const decision = (0, policy_1.evaluateExecPolicy)(config, command);
        if (!decision.allowed) {
            return {
                content: decision.reason || 'Command blocked by security policy.',
                metadata: {
                    mode: 'local-exec',
                    policy: decision.requiresApproval ? 'requires-approval' : 'blocked',
                },
            };
        }
        return runLocalCommand(command);
    },
};
