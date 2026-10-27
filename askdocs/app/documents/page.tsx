import Link from "next/link";

const docs = [
  { id: 1, name: "Refund policy.pdf" },
  { id: 2, name: "Employee handbook.pdf" },
];

export default async function DocumentsPage() {
  return (
    <main>
      <h2>Your documents</h2>
      <ul>
        {docs.map(d => (
          <li key={d.id}>
            <Link href={`/documents/${d.id}`}>{d.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}