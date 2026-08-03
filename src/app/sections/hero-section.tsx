export function HeroSection() {
  return (
    <section className="pt-10 sm:pt-16 lg:pt-24 pb-14 sm:pb-18">
      {/* Overline — whisper before the shout */}
      <div className="mb-4 sm:mb-8">
        <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/20">
          8-разрезный анализ продукта
        </span>
      </div>

      {/* Three-line architectural stack — width-filling macro type */}
      <div>
        {/* Line 1 — foundation, fills ~90% at W1280 */}
        <p
          className="font-bold leading-[0.88] tracking-[-0.03em] text-foreground/[0.18] text-[clamp(2.6rem,12vw,9.6rem)]"
          aria-hidden="true"
        >
          Инженерно-
        </p>

        {/* Line 2 — builds weight, fills ~93% at W1280 */}
        <p
          className="font-bold leading-[0.88] tracking-[-0.03em] text-foreground/[0.35] text-[clamp(2.4rem,11.5vw,9.2rem)]"
          aria-hidden="true"
        >
          дизайнерский
        </p>

        {/* Line 3 — MONUMENTAL, fills ~97% at W1280, 2.5× the size */}
        <h1
          className="font-black leading-[1] tracking-[-0.04em] text-[clamp(5rem,24vw,19.2rem)] text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300/80"
          aria-label="Инженерно-дизайнерский разбор"
        >
          разбор
        </h1>
      </div>

      {/* Descriptor — typographic continuation */}
      <p className="mt-12 sm:mt-20 text-sm text-muted-foreground/40 leading-relaxed font-light max-w-lg">
        Вставьте ссылку или загрузите изображение — получите полный AI-анализ
        <br className="hidden sm:block" /> по 8 профессиональным методологиям + VLM.
      </p>
    </section>
  );
}
