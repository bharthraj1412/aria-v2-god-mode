"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateExecPolicy = evaluateExecPolicy;
function parseCommandName(command) {
    const trimmed = command.trim();
    if (!trimmed) {
        return '';
    }
    const first = trimmed.split(/\s+/)[0] || '';
    return first.toLowerCase();
}
function envFlagEnabled(name) {
    const value = process.env[name];
    if (!value) {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
function evaluateExecPolicy(config, command) {
    const commandName = parseCommandName(command);
    if (!commandName) {
        return {
            allowed: false,
            requiresApproval: false,
            reason: 'No command provided. Use exec: <command>',
        };
    }
    const allowlist = new Set(config.security.execAllowlist.map(item => item.toLowerCase()));
    if (!allowlist.has(commandName)) {
        return {
            allowed: false,
            requiresApproval: false,
            commandName,
            reason: `Blocked by policy. '${commandName}' is not in security.execAllowlist.`,
        };
    }
    const approvalSet = new Set(config.security.execRequireApproval.map(item => item.toLowerCase()));
    const approvalRequired = approvalSet.has(commandName);
    if (!approvalRequired) {
        return {
            allowed: true,
            requiresApproval: false,
            commandName,
        };
    }
    if (envFlagEnabled(config.security.approvalBypassEnv)) {
        return {
            allowed: true,
            requiresApproval: false,
            commandName,
        };
    }
    return {
        allowed: false,
        requiresApproval: true,
        commandName,
        reason: `Command '${commandName}' requires approval. Set ${config.security.approvalBypassEnv}=true only for trusted local sessions.`,
    };
}
