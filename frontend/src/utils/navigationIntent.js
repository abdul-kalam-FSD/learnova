
let backIntent = false;

export function markBackIntent() {
  backIntent = true;
}
export function consumeBackIntent() {
  const value = backIntent;
  backIntent = false;
  return value;
}