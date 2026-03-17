function parsePrefixedCommand(content, prefix) {
  if (!content || !content.toLowerCase().startsWith(prefix.toLowerCase())) {
    return null;
  }

  const withoutPrefix = content.slice(prefix.length).trim();

  if (!withoutPrefix) {
    return null;
  }

  const args = withoutPrefix.split(/\s+/);
  const commandName = args.shift().toLowerCase();

  return {
    commandName,
    args
  };
}

module.exports = {
  parsePrefixedCommand
};
