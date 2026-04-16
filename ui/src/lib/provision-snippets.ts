/** Copy-paste strings for managed nodes; keep in sync with server README. */

export function provisionOneShotCommand(apiBase: string, token: string): string {
  const url = `${apiBase}/provision/${token}/`;
  return `curl -sSL ${url} | sudo bash`;
}

/** Full contents for `/etc/cron.d/sanctum` (must end with a newline). */
export function provisionCronFileContents(apiBase: string, token: string): string {
  const url = `${apiBase}/provision/${token}/`;
  return `*/5 * * * * root curl -sSL ${url} | bash\n`;
}

export function heartbeatVerifyCommand(apiBase: string, token: string): string {
  return `curl -sSL -X POST "${apiBase}/heartbeat/${token}/" -d "hostname=$(hostname)"`;
}
