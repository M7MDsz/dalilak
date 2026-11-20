// Owner: advisor. Strings used only by the advisor panel, copied verbatim from spec 2.6 and 3.14. «دليلك»'s replies are
// not here: they come from the brain (src/lib/brain/advisor/templates.ts) and the router.
export const ADVISOR_COPY = {
  /** 3.14 header. */
  name: "دليلك",
  /** 3.14 header line (v3). */
  headerLine: "مرشدك إلى وظيفتك",
  /** 3.14 header buttons. */
  newChat: "محادثة جديدة",
  close: "إغلاق",
  /** 3.14 mode line: exactly one of the two shows. */
  modeLocal: "وضع محلي: دليلك يعمل دون اتصال.",
  modeOnline: "متصل: رسائلك وملخص ملفك تُرسل إلى مزوّد نموذج الذكاء الاصطناعي للرد فقط.",
  /** 3.14 composer. */
  placeholder: "اسأل دليلك أو اطلب منه أن يفتح لك صفحة…",
  /** 2.6 desktop launcher. */
  launcher: "اسأل دليلك",
  /** 2.6 the one nudge. */
  nudge: "مسارك جاهز. اسألني: وش أسوي الحين؟",
  /** The thread's accessible name and the suggestion row's. */
  threadLabel: "المحادثة مع دليلك",
  chipsLabel: "اقتراحات",
} as const;
