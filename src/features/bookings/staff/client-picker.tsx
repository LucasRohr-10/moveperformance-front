"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listClients } from "@/features/clients/staff/clients-api";
import type { ClientRow } from "@/lib/api/types";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 8;
const EMPTY_COPY = "No encontramos clientes activos con esa búsqueda.";
const ERROR_COPY = "No pudimos buscar clientes. Probá de nuevo.";

type SearchResult = { term: string; status: "ready"; items: ClientRow[] } | { term: string; status: "error" };

function fullNameOf(client: ClientRow): string {
  return `${client.name} ${client.lastName ?? ""}`.trim();
}

/** Looks for an active client by name or email; nothing is listed until staff types. */
export function ClientPicker({ onPick }: { onPick(client: ClientRow): void }) {
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const trimmed = term.trim();

  useEffect(() => {
    if (!trimmed) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      listClients({ q: trimmed, pageSize: PAGE_SIZE })
        .then((page) => isCurrent && setResult({ term: trimmed, status: "ready", items: page.items }))
        .catch(() => isCurrent && setResult({ term: trimmed, status: "error" }));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // The answer on screen belongs to an older term while a new one is still being asked.
  const shown = trimmed && result?.term === trimmed ? result : null;

  return (
    <Card className="max-w-[560px]">
      <form role="search" aria-label="Buscar cliente" onSubmit={(event) => event.preventDefault()}>
        <Input
          label="Cliente"
          name="q"
          placeholder="Nombre o email"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </form>
      <div role="status" className="mt-3 text-sm text-muted">
        {trimmed && !shown ? "Buscando…" : null}
        {shown?.status === "error" ? ERROR_COPY : null}
        {shown?.status === "ready" && shown.items.length === 0 ? EMPTY_COPY : null}
      </div>
      {shown?.status === "ready" && shown.items.length > 0 ? (
        <ul className="mt-1 divide-y divide-line">
          {shown.items.map((client) => (
            <li key={client.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <span className="block font-medium">{fullNameOf(client)}</span>
                <span className="block truncate text-xs text-muted">{client.email}</span>
              </div>
              <Button type="button" variant="secondary" size="sm" touchTarget onClick={() => onPick(client)}>
                Elegir<span className="sr-only">{` a ${fullNameOf(client)}`}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
