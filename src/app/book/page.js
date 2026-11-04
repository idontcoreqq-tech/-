import { BookingSheet } from "@/components/BookingSheet";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SHOP } from "@/lib/shop";

export default function BookPage() {
  return (
    <div>
      <SiteHeader />
      <section className="px-5 pb-6 pt-32 md:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="badge">Календарь</p>
          <h1 className="mt-4">Запись</h1>
          <p className="lede mt-4">
            Услуга, мастер, день и время. Слот появляется в листе сразу после подтверждения.
          </p>
          <a href={SHOP.telegram} className="btn-outline mt-6" target="_blank" rel="noreferrer">
            Записаться в Telegram
          </a>
        </div>
      </section>
      <main className="mx-auto max-w-4xl px-5 pb-16 md:px-10">
        <BookingSheet />
      </main>
      <SiteFooter />
    </div>
  );
}
