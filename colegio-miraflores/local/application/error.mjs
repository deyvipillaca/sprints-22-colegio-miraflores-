export function invalid(message, status = 400) { throw Object.assign(new Error(message), { status }); }
