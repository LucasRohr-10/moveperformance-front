export interface PasswordCheck {
  label: string;
  ok: boolean;
}

// Visual guidance only: the actual password requirement enforced by the
// schema (and the backend) is just a minimum length. These extra checks
// nudge toward a stronger password without blocking submission on them.
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "8+ caracteres", ok: password.length >= 8 },
    { label: "Una mayúscula", ok: /[A-Z]/.test(password) },
    { label: "Un número", ok: /\d/.test(password) },
    { label: "Un símbolo", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}
