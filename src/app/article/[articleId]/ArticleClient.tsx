"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import type { ArticleCiphertextEnvelope } from "@/lib/article-ciphertext-types";
import { articleAccessMessage } from "@/lib/wallet-auth";
import {
  decryptArticleV1WebCrypto,
  hasBrowserContentKey,
  parseBrowserContentKeyHex,
} from "@/lib/webcrypto-decrypt";

type OrderStatusPayload = {
  order: { status: string; tokenId: string | null } | null;
  ownershipTokenId: string | null;
  displayTokenId: string | null;
};

type ContentOk =
  | {
      articleId: string;
      title: string;
      encryptionFormat: "v1-aes-gcm";
      encryptedContent: ArticleCiphertextEnvelope;
    }
  | {
      articleId: string;
      title: string;
      encryptionFormat: "legacy-plaintext";
      encryptedContent: string;
    };

function shortAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function buildWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function fillLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
): number {
  let yy = y;
  for (const ln of lines) {
    ctx.fillText(ln, x, yy);
    yy += lineHeight;
  }
  return yy;
}

export default function ArticleClient({ articleId }: { articleId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderPayload, setOrderPayload] = useState<OrderStatusPayload | null>(
    null
  );
  const [title, setTitle] = useState<string | null>(null);
  const [plainText, setPlainText] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [decryptHint, setDecryptHint] = useState<string | null>(null);
  const connectInFlight = useRef(false);
  const connectRetryTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** `eth_accounts` — no popup; avoids stacking requests when already approved. */
  const applyConnectedAccounts = useCallback(
    async (eth: ethers.providers.ExternalProvider) => {
      const prov = new ethers.providers.Web3Provider(eth);
      const accounts = await prov.listAccounts();
      if (accounts.length > 0) {
        setProvider(prov);
        setAddress(accounts[0]);
        return true;
      }
      return false;
    },
    []
  );

  useEffect(() => {
    const eth = (
      typeof window !== "undefined"
        ? (window as unknown as { ethereum?: ethers.providers.ExternalProvider })
            .ethereum
        : undefined
    );
    if (!eth) return;
    void (async () => {
      try {
        await applyConnectedAccounts(eth);
      } catch {
        /* ignore */
      }
    })();
  }, [applyConnectedAccounts]);

  useEffect(() => {
    return () => {
      connectRetryTimeouts.current.forEach(clearTimeout);
      connectRetryTimeouts.current = [];
    };
  }, []);

  useEffect(() => {
    const eth = (
      typeof window as unknown as { ethereum?: ethers.providers.ExternalProvider & { on?: (ev: string, fn: (...a: unknown[]) => void) => void; removeListener?: (ev: string, fn: (...a: unknown[]) => void) => void } }
    ).ethereum;
    if (!eth?.on) return;

    const onAccountsChanged = (accs: unknown) => {
      const list = accs as string[];
      if (!list?.length) {
        setProvider(null);
        setAddress(null);
        return;
      }
      const prov = new ethers.providers.Web3Provider(eth);
      setProvider(prov);
      setAddress(list[0]);
    };

    eth.on("accountsChanged", onAccountsChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (connectInFlight.current) {
      return;
    }
    setError(null);
    const eth = (
      typeof window !== "undefined"
        ? (window as unknown as { ethereum?: ethers.providers.ExternalProvider })
            .ethereum
        : undefined
    );
    if (!eth) {
      setError("No wallet found (install MetaMask or another EIP-1193 wallet).");
      return;
    }
    connectInFlight.current = true;
    try {
      const prov = new ethers.providers.Web3Provider(eth);
      const already = await prov.listAccounts();
      if (already.length > 0) {
        setProvider(prov);
        setAddress(already[0]);
        return;
      }
      await prov.send("eth_requestAccounts", []);
      const signer = prov.getSigner();
      const addr = await signer.getAddress();
      setProvider(prov);
      setAddress(addr);
    } catch (e) {
      const err = e as { code?: number; message?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "Connect failed");
      const code = err?.code;
      /** User closed MetaMask / rejected — safe to retry after wallet clears. */
      if (code === 4001 || /user rejected/i.test(msg)) {
        setError(
          "Connection was cancelled. Click Connect again, or refresh the page if MetaMask still shows a stuck request."
        );
      } else if (
        code === -32002 ||
        /already pending|already being processed/i.test(msg)
      ) {
        setError(
          "MetaMask still has a previous request open. We will retry without a new popup in ~2s and ~5s. You can also refresh the page or open MetaMask and dismiss any stuck prompt."
        );
        connectRetryTimeouts.current.forEach(clearTimeout);
        connectRetryTimeouts.current = [];
        const trySilent = async () => {
          try {
            const ok = await applyConnectedAccounts(eth);
            if (ok) setError(null);
          } catch {
            /* ignore */
          }
        };
        connectRetryTimeouts.current = [
          setTimeout(() => void trySilent(), 2500),
          setTimeout(() => void trySilent(), 5500),
        ];
      } else {
        setError(msg);
      }
    } finally {
      connectInFlight.current = false;
    }
  }, [applyConnectedAccounts]);

  const retrySilentConnect = useCallback(async () => {
    const eth = (
      typeof window !== "undefined"
        ? (window as unknown as { ethereum?: ethers.providers.ExternalProvider })
            .ethereum
        : undefined
    );
    if (!eth) return;
    setError(null);
    try {
      const ok = await applyConnectedAccounts(eth);
      if (!ok) {
        setError(
          "No account returned yet. Open MetaMask, finish or cancel any prompt, then click Connect."
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Retry failed";
      setError(msg);
    }
  }, [applyConnectedAccounts]);

  const unlock = useCallback(async () => {
    if (!provider || !address) return;
    setBusy(true);
    setError(null);
    setGateMessage(null);
    setDecryptHint(null);
    setPlainText(null);
    setOrderPayload(null);
    setTitle(null);

    try {
      const signer = provider.getSigner();
      const msg = articleAccessMessage(articleId, address);
      const signature = await signer.signMessage(msg);
      const body = JSON.stringify({ articleId, address, signature });
      const headers = { "Content-Type": "application/json" };

      const [orderRes, contentRes] = await Promise.all([
        fetch("/api/article-order-status", { method: "POST", headers, body }),
        fetch("/api/get-article-content", { method: "POST", headers, body }),
      ]);

      if (orderRes.ok) {
        const o = (await orderRes.json()) as OrderStatusPayload;
        setOrderPayload(o);
      }

      if (contentRes.status === 401) {
        setError("Invalid signature (try again).");
        return;
      }
      if (contentRes.status === 403) {
        setGateMessage(
          "This wallet is not entitled to this article (NFT / ownership cache)."
        );
        return;
      }
      if (contentRes.status === 404) {
        setError("Article not found.");
        return;
      }
      if (!contentRes.ok) {
        setError("Could not load encrypted content.");
        return;
      }

      const data = (await contentRes.json()) as ContentOk;
      setTitle(data.title);

      if (data.encryptionFormat === "legacy-plaintext") {
        setPlainText(data.encryptedContent);
        return;
      }

      if (!hasBrowserContentKey()) {
        setDecryptHint(
          "Set NEXT_PUBLIC_ARTICLE_CONTENT_KEY (64 hex chars, same as server ARTICLE_CONTENT_KEY) to decrypt in the browser — dev-only."
        );
        return;
      }

      const keyHex = process.env.NEXT_PUBLIC_ARTICLE_CONTENT_KEY!.trim();
      const raw = parseBrowserContentKeyHex(keyHex);
      const text = await decryptArticleV1WebCrypto(data.encryptedContent, raw);
      setPlainText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }, [provider, address, articleId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !plainText) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cssW = container.clientWidth;
      const padding = 24;
      const maxTextW = Math.max(280, cssW - padding * 2);
      const lineHeight = 22;
      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

      ctx.font =
        '16px ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"';
      const lines = buildWrappedLines(ctx, plainText, maxTextW);
      const cssH = Math.max(320, padding * 2 + 16 + lines.length * lineHeight);

      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fg =
        typeof window !== "undefined"
          ? getComputedStyle(document.documentElement).color || "#171717"
          : "#171717";
      const bg =
        typeof window !== "undefined"
          ? getComputedStyle(document.documentElement).backgroundColor ||
            "#ffffff"
          : "#ffffff";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.fillStyle = fg;
      ctx.font =
        '16px ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"';
      fillLines(ctx, lines, padding, padding + 16, lineHeight);
    };

    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [plainText]);

  const order = orderPayload?.order;
  const mintPending =
    order?.status === "PENDING" || order?.status === "PROCESSING";
  const mintFailed = order?.status === "FAILED";
  const displayToken =
    orderPayload?.displayTokenId ?? orderPayload?.ownershipTokenId;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">Article</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {title ?? "Premium content"}
        </h1>
        <p className="break-all font-mono text-xs text-zinc-500">{articleId}</p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Wallet
        </h2>
        {!address ? (
          <button
            type="button"
            onClick={connectWallet}
            className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Connect wallet
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm">{shortAddress(address)}</span>
            {displayToken ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                token #{displayToken}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">No token id yet</span>
            )}
          </div>
        )}
      </section>

      {address ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={unlock}
            className="w-fit rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {busy ? "Working…" : "Sign & load content"}
          </button>
          {mintPending ? (
            <div className="flex items-center gap-3 text-sm text-amber-800 dark:text-amber-200">
              <span
                className="inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
              <span>Mint queued or processing — check back shortly.</span>
            </div>
          ) : null}
          {mintFailed ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Mint failed for this payment. See order logs / support.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {/retry without|previous request open/i.test(error) ? (
            <button
              type="button"
              onClick={() => void retrySilentConnect()}
              className="w-fit rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Retry without new popup
            </button>
          ) : null}
        </div>
      ) : null}
      {gateMessage ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{gateMessage}</p>
      ) : null}
      {decryptHint ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {decryptHint}
        </p>
      ) : null}

      {plainText ? (
        <div ref={containerRef} className="w-full">
          <p className="mb-2 text-xs text-zinc-500">
            Canvas view — selection and context menu disabled to reduce casual
            copy.
          </p>
          <canvas
            ref={canvasRef}
            className="w-full max-w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
            style={{ userSelect: "none" }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      ) : null}
    </div>
  );
}
