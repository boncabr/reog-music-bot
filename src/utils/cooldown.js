const cooldowns = new Map();

function checkCooldown(userId, commandName, cooldownMs) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expiry = cooldowns.get(key);
    if (now < expiry) {
      const remaining = ((expiry - now) / 1000).toFixed(1);
      return { onCooldown: true, remaining };
    }
  }

  cooldowns.set(key, now + cooldownMs);

  setTimeout(() => cooldowns.delete(key), cooldownMs + 1000);

  return { onCooldown: false, remaining: 0 };
}

function clearCooldown(userId, commandName) {
  cooldowns.delete(`${userId}:${commandName}`);
}

module.exports = { checkCooldown, clearCooldown };
