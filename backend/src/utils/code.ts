export function generateCode(prefix = "", length = 6): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return prefix ? `${prefix}${code}` : code;
}

export function makeCode(prefix = "", length = 6): string {
  return generateCode(prefix, length);
}

export default generateCode;
