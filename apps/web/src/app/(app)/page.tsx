import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { getAuthContext } from "@/lib/auth";
import { getMessages } from "@/lib/i18n/de";
import { Card } from "@/components/ui/card";
import { NewClientDialog } from "./new-client-dialog";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

export default async function HomePage() {
  const { supabase } = await getAuthContext();
  const m = getMessages();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  const list = clients ?? [];

  return (
    <div>
      {/* Editorialer Kopf – ein großer Kontextsatz, viel Luft. */}
      <section className="pb-12 pt-6 md:pb-16 md:pt-10">
        <p className="text-[13px] font-medium text-ink-2">{m.home.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2.5rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-tight">
          {m.home.greeting}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
          {m.home.context}
        </p>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <span className="tnum text-[13px] font-medium text-ink-2">
            {m.home.clientsCount(list.length)}
          </span>
          {list.length > 0 ? (
            <NewClientDialog triggerLabel={m.home.newClient} />
          ) : null}
        </div>

        {list.length === 0 ? (
          <Card className="grid place-items-center px-8 py-20 text-center md:py-28">
            <div className="grid size-12 place-items-center rounded-full bg-ink text-white">
              <UsersThree size={22} />
            </div>
            <h2 className="mt-6 text-xl font-medium tracking-tight">
              {m.home.emptyTitle}
            </h2>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">
              {m.home.emptyText}
            </p>
            <div className="mt-8">
              <NewClientDialog triggerLabel={m.home.emptyCta} />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {list.map((client) => (
              <Card key={client.id} className="flex min-h-44 flex-col p-7">
                <h2 className="text-xl font-medium tracking-tight">
                  {client.name}
                </h2>
                {client.description ? (
                  <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-2">
                    {client.description}
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between pt-6 text-[13px] font-medium text-ink-2">
                  <span>{m.home.noRunYet}</span>
                  <span className="tnum">
                    {m.home.createdAt(formatDate(client.created_at))}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
