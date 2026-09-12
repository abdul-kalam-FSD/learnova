import api from "../api/axios";

// Public VAPID key is meant to be exposed client-side (that's how the
// Web Push protocol works — only the private key stays server-side).
const VAPID_PUBLIC_KEY =
  "BON4lqZ3WXWoQXcl2SSa9w_9J063rZzhHhQsAh4hyEj3datvcoksjFBLbhgS4ksUX08ddN739l0YB_YkvULKSTc";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush() {
  const reg = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await api.post("/notifications/subscribe", subscription.toJSON());
  return subscription;
}

export async function unsubscribeFromPush() {
  const existing = await getExistingSubscription();
  if (!existing) return;
  await api.post("/notifications/unsubscribe", { endpoint: existing.endpoint });
  await existing.unsubscribe();
}
