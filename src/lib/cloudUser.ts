/** Registre léger de l'utilisateur connecté, pour les syncs fire-and-forget. */
let currentUserId: string | null = null;

export function setCloudUserId(id: string | null) {
  currentUserId = id;
}

export function cloudUserId(): string | null {
  return currentUserId;
}
