import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Only who is being booked and how to change it: what each slot costs the client is said in the cart. */
export function SelectedClientBar({ name, onChange }: { name: string; onChange(): void }) {
  return (
    <Card role="region" aria-label="Cliente elegido" padding="sm" className="flex items-center justify-between gap-3">
      <span className="font-semibold">{name}</span>
      <Button type="button" variant="secondary" size="sm" touchTarget onClick={onChange}>
        Cambiar cliente
      </Button>
    </Card>
  );
}
