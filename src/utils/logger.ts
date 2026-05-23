const isDev = process.env.NODE_ENV !== 'production';

function log(level: 'info' | 'warn' | 'error', data: Record<string, unknown>): void {
  const entry = JSON.stringify({ level, ts: new Date().toISOString(), ...data });
  if (level === 'error') {
    console.error(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

export const logger = {
  info: (data: Record<string, unknown>) => log('info', data),
  warn: (data: Record<string, unknown>) => log('warn', data),
  error: (data: Record<string, unknown>) => {
    if (isDev && data.stack) {
      console.error(data.stack);
    }
    log('error', data);
  },
};
