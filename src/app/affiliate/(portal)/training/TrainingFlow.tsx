"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { useTranslation } from "@/i18n/context";
import type { Dictionary } from "@/i18n/dictionaries/en";

const TOTAL_SLIDES = 5;

export function TrainingFlow({ startSlide, alreadyCompleted }: { startSlide: number; alreadyCompleted: boolean }) {
  const router = useRouter();
  const { dict, t } = useTranslation();
  const [slide, setSlide] = useState(Math.min(startSlide, TOTAL_SLIDES));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadyCompleted);
  const [error, setError] = useState<string | null>(null);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [referralLink, setReferralLink] = useState<{ code: string; url: string } | null>(null);

  useEffect(() => {
    if (!alreadyCompleted) {
      fetch("/api/affiliate/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide: 1, action: "start" }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function next() {
    setSubmitting(true);
    setError(null);
    try {
      if (slide < TOTAL_SLIDES) {
        await fetch("/api/affiliate/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide, action: "complete_slide" }),
        });
        setSlide(slide + 1);
      } else {
        const res = await fetch("/api/affiliate/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slide: TOTAL_SLIDES, action: "finish", contractAccepted }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) {
          setError(json?.error || dict.common.somethingWentWrong);
          setSubmitting(false);
          return;
        }
        if (json.referralLink) {
          setReferralLink({ code: json.referralLink.code, url: json.referralLink.url });
        }
        setDone(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-extrabold text-nmsa-navy">{dict.training.congratsTitle}</h1>
        <p className="mt-3 text-nmsa-gray-dark max-w-md mx-auto">{dict.training.congratsBody}</p>

        {referralLink && (
          <div className="mt-8 max-w-sm mx-auto rounded-xl2 bg-nmsa-navy text-white p-6 text-left">
            <p className="text-xs text-nmsa-gold font-bold uppercase tracking-wide">{dict.training.yourCodeLabel}</p>
            <p className="text-2xl font-extrabold mt-1 tracking-wide">{referralLink.code}</p>
            <p className="text-xs text-white/70 mt-3 break-all">{referralLink.url}</p>
            <p className="text-xs text-white/70 mt-2">{dict.training.yourCodeNote}</p>
            <div className="flex gap-2 mt-4">
              <CopyButton value={referralLink.code} label={dict.common.copyCode} />
              <CopyButton value={referralLink.url} label={dict.common.copyLink} />
            </div>
          </div>
        )}

        <Button className="mt-8" onClick={() => router.push("/affiliate/referral-link")}>
          {dict.training.getReferralLink}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_SLIDES }, (_, i) => i + 1).map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= slide ? "bg-nmsa-gold" : "bg-gray-200"}`} />
        ))}
      </div>

      {error && <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

      {slide === 1 && <Slide1 dict={dict} />}
      {slide === 2 && <Slide2 dict={dict} />}
      {slide === 3 && <Slide3 dict={dict} />}
      {slide === 4 && <Slide4 dict={dict} />}
      {slide === 5 && <Slide5 dict={dict} contractAccepted={contractAccepted} setContractAccepted={setContractAccepted} />}

      <div className="mt-10 flex justify-between items-center">
        <div className="text-xs text-nmsa-gray-dark">{t(dict.training.slideOf, { n: slide })}</div>
        <Button onClick={next} disabled={submitting || (slide === TOTAL_SLIDES && !contractAccepted)}>
          {submitting ? dict.training.pleaseWait : slide < TOTAL_SLIDES ? dict.training.continue : dict.training.finishTraining}
        </Button>
      </div>
    </div>
  );
}

function SlideShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold tracking-widest text-nmsa-gold bg-nmsa-navy inline-block px-3 py-1 rounded-full uppercase">
        {eyebrow}
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-nmsa-navy mt-4">{title}</h2>
      <div className="mt-5 space-y-4 text-sm sm:text-base text-nmsa-navy/90 leading-relaxed">{children}</div>
    </div>
  );
}

function Slide1({ dict }: { dict: Dictionary }) {
  const s = dict.training.slide1;
  return (
    <SlideShell eyebrow={s.eyebrow} title={s.title}>
      <p>{s.body}</p>
      <div className="rounded-xl bg-nmsa-navy/5 border border-nmsa-navy/10 p-5">
        <p className="font-semibold text-nmsa-navy">{s.takeawayLabel}</p>
        <p className="mt-1">{s.takeaway}</p>
      </div>
    </SlideShell>
  );
}

function Slide2({ dict }: { dict: Dictionary }) {
  const s = dict.training.slide2;
  return (
    <SlideShell eyebrow={s.eyebrow} title={s.title}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {s.audiences.map((a) => (
          <div key={a} className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm">
            {a}
          </div>
        ))}
      </div>
      <p className="font-semibold text-nmsa-navy mt-4">{s.questionsLabel}</p>
      <ul className="list-disc list-inside space-y-1">
        {s.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
      <div className="rounded-xl bg-amber-50 border border-amber-300 p-5 text-amber-900">
        <p className="font-bold">{s.importantTitle}</p>
        <p className="mt-1 text-sm">{s.important}</p>
        <p className="mt-2 text-sm">{s.importantNote}</p>
      </div>
    </SlideShell>
  );
}

function Slide3({ dict }: { dict: Dictionary }) {
  const s = dict.training.slide3;
  return (
    <SlideShell eyebrow={s.eyebrow} title={s.title}>
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-nmsa-navy">{s.levelITitle}</p>
          <p className="text-sm mt-1">{s.levelIBody}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {s.levelIServices.map((svc) => (
              <span key={svc} className="text-xs bg-nmsa-navy/5 rounded-full px-2.5 py-1">
                {svc}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-nmsa-navy">{s.levelIITitle}</p>
          <p className="text-sm mt-1">{s.levelIIBody}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {s.levelIIServices.map((svc) => (
              <span key={svc} className="text-xs bg-nmsa-navy/5 rounded-full px-2.5 py-1">
                {svc}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-nmsa-navy">{s.levelIIITitle}</p>
          <p className="text-sm mt-1">{s.levelIIIBody}</p>

          <p className="text-sm font-semibold text-nmsa-navy mt-4">{s.levelIIIQualifyLabel}</p>
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
            {s.levelIIIQualifyCredentials.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>

          <p className="text-sm font-semibold text-nmsa-navy mt-4">{s.levelIIIServicesLabel}</p>
          <p className="text-sm mt-1">{s.levelIIIServicesBody}</p>
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
            {s.levelIIIServices.map((svc) => (
              <li key={svc}>{svc}</li>
            ))}
          </ul>

          <p className="text-sm font-semibold text-nmsa-navy mt-4">{s.levelIIIMedDirectorLabel}</p>
          <p className="text-sm mt-1">{s.levelIIIMedDirectorBody}</p>
          <p className="text-sm mt-2">{s.levelIIIMedDirectorRequiredWhen}</p>
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
            {s.levelIIIMedDirectorTriggers.map((tItem) => (
              <li key={tItem}>{tItem}</li>
            ))}
          </ul>
          <p className="text-sm mt-2">{s.levelIIIMedDirectorNote}</p>
        </div>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-300 p-5 text-amber-900">
        <p className="font-bold">{s.neverTellTitle}</p>
        <p className="mt-1 text-sm italic">{s.neverTellQuote}</p>
        <p className="font-bold mt-3">{s.insteadTitle}</p>
        <p className="mt-1 text-sm">{s.insteadQuote}</p>
      </div>
    </SlideShell>
  );
}

function Slide4({ dict }: { dict: Dictionary }) {
  const s = dict.training.slide4;
  return (
    <SlideShell eyebrow={s.eyebrow} title={s.title}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {s.steps.map((step) => (
          <div key={step.n} className="rounded-xl border border-gray-200 p-4 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-nmsa-navy text-nmsa-gold font-bold flex items-center justify-center shrink-0">
              {step.n}
            </div>
            <div>
              <p className="font-bold text-nmsa-navy">{step.title}</p>
              <p className="text-sm mt-0.5">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-nmsa-navy text-white p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-nmsa-gold font-bold uppercase">{s.paymentMethodLabel}</p>
          <p className="font-bold mt-1">{s.paymentMethod}</p>
        </div>
        <div>
          <p className="text-xs text-nmsa-gold font-bold uppercase">{s.payoutScheduleLabel}</p>
          <p className="font-bold mt-1">{s.payoutSchedule}</p>
        </div>
        <div>
          <p className="text-xs text-nmsa-gold font-bold uppercase">{s.minimumPayoutLabel}</p>
          <p className="font-bold mt-1">$200</p>
        </div>
      </div>
      <p className="text-sm text-nmsa-gray-dark">{s.rollover}</p>
    </SlideShell>
  );
}

function Slide5({
  dict,
  contractAccepted,
  setContractAccepted,
}: {
  dict: Dictionary;
  contractAccepted: boolean;
  setContractAccepted: (v: boolean) => void;
}) {
  const s = dict.training.slide5;
  return (
    <SlideShell eyebrow={s.eyebrow} title={s.title}>
      <p>{s.intro}</p>

      <div className="rounded-xl border border-gray-200 p-5">
        <img
          src="/marketing/nmsa-approved-graphic.jpg"
          alt={s.imageAlt}
          className="w-full rounded-lg border border-gray-200"
        />
        <p className="text-xs text-nmsa-gray-dark mt-2">{s.imageCaption}</p>
        <a
          href="/marketing/nmsa-approved-graphic.jpg"
          download
          className="inline-block mt-3 rounded-xl border-2 border-nmsa-navy text-nmsa-navy px-3 py-1.5 text-sm font-bold hover:bg-nmsa-navy hover:text-white transition"
        >
          {dict.common.download}
        </a>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-300 p-5 text-amber-900">
        <p className="font-bold">{s.rulesTitle}</p>
        <ul className="list-disc list-inside space-y-1.5 text-sm mt-2">
          {s.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-nmsa-navy/5 border border-nmsa-navy/10 p-5">
        <p className="font-semibold text-nmsa-navy">{s.bestPracticeLabel}</p>
        <p className="mt-1">{s.bestPractice}</p>
      </div>

      <label className="flex items-start gap-2.5 text-sm bg-white border-2 border-nmsa-navy/20 rounded-xl p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-nmsa-navy"
          checked={contractAccepted}
          onChange={(e) => setContractAccepted(e.target.checked)}
        />
        <span className="font-semibold text-nmsa-navy">{s.contractLabel}</span>
      </label>
    </SlideShell>
  );
}
