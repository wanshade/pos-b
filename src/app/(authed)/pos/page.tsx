import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { PosTerminal } from "./pos-terminal";

export const metadata = { title: "POS Terminal — POS App" };
export const dynamic = "force-dynamic";

export default async function PosPage() {
  await requireAuth();

  // Load all the data the terminal needs in one query batch.
  const [categories, items, activeShift] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        modifiers: { orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }] },
      },
    }),
    (async () => {
      const session = await requireAuth();
      const userId = (session.user as { id?: string }).id;
      if (!userId) return null;
      return db.shift.findFirst({ where: { userId, status: "OPEN" } });
    })(),
  ]);

  return (
    <PosTerminal
      categories={categories}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price.toString(),
        categoryId: i.categoryId,
        categoryName: categories.find((c) => c.id === i.categoryId)?.name ?? "",
        imageUrl: i.imageUrl,
        trackStock: i.trackStock,
        variants: i.variants.map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta.toString() })),
        modifiers: i.modifiers.map((m) => ({ id: m.id, groupName: m.groupName, name: m.name, priceDelta: m.priceDelta.toString() })),
      }))}
      activeShift={activeShift ? { id: activeShift.id, openedAt: activeShift.openedAt.toISOString() } : null}
    />
  );
}
