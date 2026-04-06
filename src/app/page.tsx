import Link from "next/link";

const DEMO_ARTICLE_ID = "11111111-1111-4111-8111-111111111111";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-24 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Web3 content assetization — MVP
          </h1>
          <p className="max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            NFT-gated article preview: connect a wallet, sign, and read on a
            canvas (Day 9).
          </p>
        </div>
        <Link
          href={`/article/${DEMO_ARTICLE_ID}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Open demo article
        </Link>
      </main>
    </div>
  );
}
