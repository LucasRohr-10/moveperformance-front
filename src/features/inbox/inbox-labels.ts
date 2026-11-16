// What a screen reader hears on the bell: the count is only in the label, the badge is hidden from it.
export function inboxBellLabel(unreadCount: number): string {
  return unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones";
}

// The panel header's counter.
export function inboxCountText(unreadCount: number): string {
  return unreadCount > 0 ? `${unreadCount} sin leer` : "Todo leído";
}
