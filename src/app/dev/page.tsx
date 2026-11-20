import Link from "next/link";

// Index of the design-foundation galleries (development only).
const pages = ["kit", "motion", "icons", "icons-utility", "avatars", "brand", "chat", "game", "brain"];

export default function DevIndex() {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-bold">Masari · dev galleries</h1>
      <ul className="mt-6 grid gap-2" dir="ltr">
        {pages.map((p) => (
          <li key={p}>
            <Link className="underline" href={`/dev/${p}`}>
              /dev/{p}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
