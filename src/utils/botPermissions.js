const {
  addAccessRole,
  clearAccessRoles,
  getBotPermissionSettings,
  normalizeAccessName,
  removeAccessRole
} = require("../services/botPermissionStore");
const { isBotOwner } = require("./adminAccess");

function getAccessRoleIds(guildId, accessName) {
  if (!guildId) {
    return [];
  }

  const normalizedAccess = normalizeAccessName(accessName);

  if (!normalizedAccess) {
    return [];
  }

  return getBotPermissionSettings(guildId).accessRoles[normalizedAccess] || [];
}

function listConfiguredAccessNames(guildId) {
  return Object.keys(getBotPermissionSettings(guildId).accessRoles || {}).sort((left, right) => left.localeCompare(right));
}

async function hasBotPermissionAccess(member, accessName, client) {
  if (!member?.guild?.id || !member?.id) {
    return false;
  }

  if (await isBotOwner(member.id, client)) {
    return true;
  }

  const roleIds = getAccessRoleIds(member.guild.id, accessName);

  if (!roleIds.length) {
    return false;
  }

  return roleIds.some((roleId) => member.roles?.cache?.has(roleId));
}

async function buildBotPermissionAccessState(member, accessName, client) {
  const normalizedAccess = normalizeAccessName(accessName);
  const botOwner = await isBotOwner(member?.id, client);
  const configuredRoleIds = getAccessRoleIds(member?.guild?.id, normalizedAccess);
  const hasRoleAccess = configuredRoleIds.some((roleId) => member?.roles?.cache?.has(roleId));

  return {
    accessName: normalizedAccess,
    botOwner,
    hasRoleAccess,
    hasAccess: botOwner || hasRoleAccess,
    configuredRoleIds
  };
}

function buildAccessListLines(settings) {
  const accessEntries = Object.entries(settings.accessRoles || {})
    .sort(([left], [right]) => left.localeCompare(right));

  if (!accessEntries.length) {
    return "Belum ada akses role yang diset.";
  }

  return accessEntries.map(([accessName, roleIds]) => {
    const mentions = roleIds.length
      ? roleIds.map((roleId) => `<@&${roleId}>`).join(", ")
      : "Belum ada role";

    return `- **${accessName}**: ${mentions}`;
  }).join("\n");
}

function buildAccessShowLines(guildId, accessName) {
  const normalizedAccess = normalizeAccessName(accessName);
  const roleIds = getAccessRoleIds(guildId, normalizedAccess);

  return {
    accessName: normalizedAccess,
    description: roleIds.length
      ? roleIds.map((roleId) => `- <@&${roleId}>`).join("\n")
      : "Belum ada role yang diset untuk akses ini."
  };
}

module.exports = {
  addAccessRole,
  buildAccessListLines,
  buildAccessShowLines,
  buildBotPermissionAccessState,
  clearAccessRoles,
  getAccessRoleIds,
  getBotPermissionSettings,
  hasBotPermissionAccess,
  listConfiguredAccessNames,
  normalizeAccessName,
  removeAccessRole
};
