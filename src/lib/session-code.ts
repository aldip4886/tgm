const CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateSessionCode(length = 6): string {
  let result = "";
  const charactersLength = CHARACTERS.length;
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
