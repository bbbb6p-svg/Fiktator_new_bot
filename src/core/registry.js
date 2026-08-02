const commands = new Map();

export function registerCommand(name, plugin) {
  if (commands && typeof commands.set === 'function') {
    commands.set(name.toLowerCase(), plugin);
  }
}

export function getCommand(name) {
  if (!name) return null;
  return commands.get(String(name).trim().toLowerCase()) || null;
}

export { commands };
