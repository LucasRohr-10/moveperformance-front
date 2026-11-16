import type { OfflinePriceLine } from "./present-checkout";

// The total follows the chosen option: with a discount the full price is crossed out next to the new one.
export function CheckoutTotal({ price, offer }: { price: string; offer: OfflinePriceLine | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em]">Total</span>
      <span data-testid="checkout-total" className="font-display text-[34px]">
        {offer?.discounted ? (
          <>
            <span className="mr-2.5 text-lg text-muted line-through">{offer.full}</span>
            {offer.discounted}
          </>
        ) : (
          price
        )}
      </span>
    </div>
  );
}
