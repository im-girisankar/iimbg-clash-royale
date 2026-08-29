import QRCode from "qrcode";

/* Server-side QR generation only — no client-side QR library, no CDN. The
   SVG is dark-on-white regardless of the app's dark theme, because that is
   what keeps it reliably scannable across phone cameras. */
export async function Share({ url }: { url: string }) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#101744", light: "#FFFFFF" },
  });

  return (
    <section
      aria-label="Share this bracket"
      className="panel flex flex-col items-center gap-3 p-4 text-center"
    >
      <div
        className="h-40 w-40 rounded-cell bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="max-w-full break-all text-sm text-fg-muted">{url}</p>
      <p className="titled text-xs uppercase tracking-wide text-accent">Scan to follow the carnage</p>
    </section>
  );
}
