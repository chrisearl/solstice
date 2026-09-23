const PHRASE = "We have assumed control!";
const INK_STEP_MS = 70;

export function AssumedControl({ tone }: { tone: "night" | "parchment" }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[34%] z-10 flex -translate-y-1/2 justify-center px-6 text-center">
      {tone === "parchment" ? <InkLine /> : <TerminalLine />}
    </div>
  );
}

function TerminalLine() {
  return (
    <p className="assumed-control-glitch" data-text={PHRASE}>
      {PHRASE}
      <span className="assumed-control-scanlines" aria-hidden="true" />
    </p>
  );
}

function InkLine() {
  return (
    <p className="assumed-control-ink" aria-label={PHRASE}>
      <span aria-hidden="true">
        {Array.from(PHRASE).map((char, index) => (
          <span
            key={`${char}-${index}`}
            className="assumed-control-ink-glyph"
            style={{ animationDelay: `${index * INK_STEP_MS}ms` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
        <span
          className="assumed-control-nib"
          style={{ animationDuration: `${PHRASE.length * INK_STEP_MS}ms` }}
        />
      </span>
    </p>
  );
}
