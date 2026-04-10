"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSkills = listSkills;
exports.listSkillSources = listSkillSources;
exports.listSkillCategories = listSkillCategories;
exports.summarizeSkills = summarizeSkills;
const markxxx_1 = require("./markxxx");
const paperclip_1 = require("./paperclip");
function getAllSkills() {
    return [...markxxx_1.markXxxSkills, ...(0, paperclip_1.loadPaperclipSkills)()];
}
function countBy(values) {
    const counts = new Map();
    for (const value of values) {
        counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}
function normalizeFilterValues(input) {
    if (!input) {
        return [];
    }
    const values = (Array.isArray(input) ? input : [input])
        .flatMap(value => value.split(','))
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
    return Array.from(new Set(values));
}
function matchesFilterValues(candidateValues, filters, mode) {
    if (filters.length === 0) {
        return true;
    }
    if (candidateValues.length === 0) {
        return false;
    }
    return mode === 'all'
        ? filters.every(filter => candidateValues.includes(filter))
        : filters.some(filter => candidateValues.includes(filter));
}
function listSkills(options) {
    const sourceFilter = options?.source?.trim().toLowerCase();
    const searchFilter = options?.search?.trim().toLowerCase();
    const tagFilters = normalizeFilterValues(options?.tag);
    const capabilityFilters = normalizeFilterValues(options?.capability);
    const tagMode = options?.tagMode === 'all' ? 'all' : 'any';
    const capabilityMode = options?.capabilityMode === 'all' ? 'all' : 'any';
    const allSkills = getAllSkills();
    return allSkills.filter(skill => {
        if (sourceFilter && skill.source.toLowerCase() !== sourceFilter) {
            return false;
        }
        if (!matchesFilterValues((skill.tags || []).map(tag => tag.toLowerCase()), tagFilters, tagMode)) {
            return false;
        }
        if (!matchesFilterValues((skill.capabilities || []).map(capability => capability.toLowerCase()), capabilityFilters, capabilityMode)) {
            return false;
        }
        if (!searchFilter) {
            return true;
        }
        return (skill.id.toLowerCase().includes(searchFilter) ||
            skill.title.toLowerCase().includes(searchFilter) ||
            skill.category.toLowerCase().includes(searchFilter) ||
            skill.description.toLowerCase().includes(searchFilter) ||
            (skill.tags || []).some(tag => tag.toLowerCase().includes(searchFilter)) ||
            (skill.capabilities || []).some(capability => capability.toLowerCase().includes(searchFilter)));
    });
}
function listSkillSources() {
    const allSkills = getAllSkills();
    return Array.from(new Set(allSkills.map(skill => skill.source))).sort();
}
function listSkillCategories(options) {
    const records = listSkills(options);
    return Array.from(new Set(records.map(skill => skill.category))).sort();
}
function summarizeSkills(options) {
    const records = listSkills(options);
    return {
        total: records.length,
        sources: countBy(records.map(skill => skill.source)),
        categories: countBy(records.map(skill => skill.category)),
        tags: countBy(records.flatMap(skill => skill.tags || []).map(tag => tag.toLowerCase())),
        capabilities: countBy(records.flatMap(skill => skill.capabilities || []).map(capability => capability.toLowerCase())),
    };
}
