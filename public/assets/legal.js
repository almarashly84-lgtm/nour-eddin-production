/* Impressum + Datenschutz, built from the data entered in the dashboard (tab "Impressum"). */
(() => {
  "use strict";
  const LANGS = ["ar", "de", "en"];
  const page = document.body.dataset.page;       // "impressum" | "privacy"
  const h = (tag, attrs = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null) continue; if (k === "text") el.textContent = v; else el.setAttribute(k, v); } kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c))); return el; };

  const T = {
    de: {
      back: "Zurück zur Startseite", impressum: "Impressum", privacy: "Datenschutzerklärung", missing: "fehlt – bitte im Dashboard eintragen",
      imp_intro: "Informationen und Offenlegung gemäß § 5 E-Commerce-Gesetz, § 14 Unternehmensgesetzbuch, § 63 Gewerbeordnung und § 25 Mediengesetz.",
      f: { company: "Unternehmen", owner: "Inhaber / Geschäftsführung", legalForm: "Rechtsform", trade: "Unternehmensgegenstand", address: "Anschrift", phone: "Telefon", email: "E-Mail", uid: "UID-Nummer", registerNo: "Firmenbuchnummer", registerCourt: "Firmenbuchgericht", gisa: "GISA-Zahl", chamber: "Kammerzugehörigkeit", authority: "Aufsichtsbehörde" },
      law: "Anwendbare Rechtsvorschriften: Gewerbeordnung, abrufbar unter www.ris.bka.gv.at.",
      media: "Medieninhaber und Herausgeber: siehe oben. Blattlinie: Informationen über das Studio, seine Leistungen und Arbeiten.",
      rights: "Alle Fotos, Videos und Musikstücke auf dieser Website sind urheberrechtlich geschützt und dürfen ohne Zustimmung nicht verwendet werden.",
      langNote: null,
      privacy: [
        ["Verantwortlicher", (L) => `${L.company || "–"}, ${L.address || "–"}. E-Mail: ${L.email || "–"}, Telefon: ${L.phone || "–"}.`],
        ["Kurz gesagt", () => "Diese Website verwendet keine Werbe- oder Tracking-Cookies, keine Analyse-Dienste von Drittanbietern und lädt keine Schriftarten oder Skripte von fremden Servern. Daten verarbeiten wir nur, wenn Sie uns selbst kontaktieren."],
        ["Hosting", () => "Die Website wird bei Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, USA) betrieben. Beim Aufruf verarbeitet Cloudflare technisch notwendige Daten wie Ihre IP-Adresse, Datum und Uhrzeit, um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert."],
        ["Besuchsstatistik", () => "Wir zählen anonym, wie oft die Seite aufgerufen, Leistungen und Arbeiten geöffnet und Kontaktknöpfe angetippt werden. Dabei werden weder Cookies gesetzt noch Namen, Telefonnummern oder IP-Adressen gespeichert (Art. 6 Abs. 1 lit. f DSGVO)."],
        ["Kontakt per WhatsApp oder E-Mail", () => "Wenn Sie das Kontaktformular nutzen, öffnet sich WhatsApp oder Ihr E-Mail-Programm mit Ihrer Nachricht (Name, Leistung, Datum, Ort, Nachricht). Die Daten werden erst übertragen, wenn Sie die Nachricht dort selbst senden; unsere Website speichert sie nicht. WhatsApp wird von WhatsApp Ireland Limited (Meta) betrieben; dort gilt deren Datenschutzerklärung. Wir verwenden Ihre Angaben nur zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b DSGVO) und löschen sie, wenn sie nicht mehr benötigt werden."],
        ["YouTube-Videos", () => "Einige Videos sind bei YouTube gespeichert. Sie werden erst geladen, wenn Sie auf „Von YouTube abspielen“ klicken. Dann wird eine Verbindung zu Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland) im erweiterten Datenschutzmodus (youtube-nocookie.com) hergestellt, und Daten wie Ihre IP-Adresse werden an Google übertragen. Rechtsgrundlage ist Ihre Einwilligung durch den Klick (Art. 6 Abs. 1 lit. a DSGVO)."],
        ["Hintergrundmusik", () => "Die Musik startet erst, nachdem Sie die Seite betreten oder darauf getippt haben, und lässt sich jederzeit mit dem Musik-Knopf ausschalten. Die Musikdatei wird von unserem eigenen Server geladen."],
        ["Speicher im Browser", () => "Ihre Sprachauswahl und ob Sie die Musik ein- oder ausgeschaltet haben, werden im lokalen Speicher Ihres Browsers abgelegt. Für die Dauer des Besuchs merkt sich der Browser außerdem, dass Sie den Startbildschirm bereits gesehen haben. Diese Angaben verlassen Ihr Gerät nicht."],
        ["Externe Links", () => "Links zu WhatsApp, Instagram, Facebook, TikTok oder YouTube öffnen die Seiten dieser Anbieter. Erst dann gelten deren Datenschutzbestimmungen."],
        ["Ihre Rechte", () => "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich dazu an die oben genannte E-Mail-Adresse. Sie können sich außerdem bei der Österreichischen Datenschutzbehörde beschweren: Barichgasse 40–42, 1030 Wien, www.dsb.gv.at."],
        ["Stand", () => "Oktober 2026"]
      ]
    },
    en: {
      back: "Back to the home page", impressum: "Imprint", privacy: "Privacy policy", missing: "missing – please add it in the dashboard",
      imp_intro: "Information and disclosure under Austrian law (§ 5 ECG, § 14 UGB, § 63 GewO, § 25 MedienG).",
      f: { company: "Company", owner: "Owner / management", legalForm: "Legal form", trade: "Business activity", address: "Address", phone: "Phone", email: "Email", uid: "VAT ID", registerNo: "Company register no.", registerCourt: "Register court", gisa: "GISA no.", chamber: "Chamber membership", authority: "Supervisory authority" },
      law: "Applicable regulations: Austrian Trade Regulation Act (Gewerbeordnung), available at www.ris.bka.gv.at.",
      media: "Media owner and publisher: see above. Purpose: information about the studio, its services and work.",
      rights: "All photos, videos and music on this website are protected by copyright and may not be used without permission.",
      langNote: "This is a translation. The German version is legally binding.",
      privacy: [
        ["Controller", (L) => `${L.company || "–"}, ${L.address || "–"}. Email: ${L.email || "–"}, phone: ${L.phone || "–"}.`],
        ["In short", () => "This website uses no advertising or tracking cookies, no third-party analytics, and loads no fonts or scripts from other servers. We only process data when you contact us yourself."],
        ["Hosting", () => "The website runs on Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, USA). When you visit, Cloudflare processes technically necessary data such as your IP address, date and time to deliver the page and protect it from attacks. Legal basis: our legitimate interest in secure operation (Art. 6(1)(f) GDPR). Cloudflare is certified under the EU-US Data Privacy Framework."],
        ["Visit statistics", () => "We count anonymously how often the page is visited, services and works are opened, and contact buttons are tapped. No cookies are set and no names, phone numbers or IP addresses are stored (Art. 6(1)(f) GDPR)."],
        ["Contact via WhatsApp or email", () => "When you use the contact form, WhatsApp or your email app opens with your message (name, service, date, place, message). Nothing is transferred until you send it there yourself; our website does not store it. WhatsApp is operated by WhatsApp Ireland Limited (Meta); its privacy policy applies there. We use your details only to handle your request (Art. 6(1)(b) GDPR) and delete them when no longer needed."],
        ["YouTube videos", () => "Some videos are hosted on YouTube. They are only loaded after you click “Play from YouTube”. A connection is then made to Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland) in privacy-enhanced mode (youtube-nocookie.com), and data such as your IP address is sent to Google. Legal basis: your consent by clicking (Art. 6(1)(a) GDPR)."],
        ["Background music", () => "Music only starts after you enter or tap the page and can be switched off at any time with the music button. The music file is loaded from our own server."],
        ["Browser storage", () => "Your language and whether you switched the music on or off are saved in your browser's local storage. For the length of your visit the browser also remembers that you have seen the start screen. This never leaves your device."],
        ["External links", () => "Links to WhatsApp, Instagram, Facebook, TikTok or YouTube open those providers' sites, where their privacy policies apply."],
        ["Your rights", () => "You have the right to access, rectification, erasure, restriction of processing, data portability and objection. Contact us at the email address above. You may also complain to the Austrian Data Protection Authority: Barichgasse 40–42, 1030 Vienna, www.dsb.gv.at."],
        ["Last updated", () => "October 2026"]
      ]
    },
    ar: {
      back: "العودة إلى الصفحة الرئيسية", impressum: "Impressum (بيانات الناشر)", privacy: "سياسة الخصوصية", missing: "ناقص – أضِفه من لوحة التحكم",
      imp_intro: "معلومات وإفصاح وفق القانون النمساوي (§ 5 ECG، § 14 UGB، § 63 GewO، § 25 MedienG).",
      f: { company: "الشركة", owner: "المالك / الإدارة", legalForm: "الشكل القانوني", trade: "النشاط", address: "العنوان", phone: "الهاتف", email: "الإيميل", uid: "الرقم الضريبي UID", registerNo: "رقم السجل التجاري", registerCourt: "محكمة السجل", gisa: "رقم GISA", chamber: "عضوية الغرفة", authority: "الجهة الرقابية" },
      law: "الأنظمة المطبّقة: قانون المهن النمساوي (Gewerbeordnung)، متاح على www.ris.bka.gv.at.",
      media: "مالك الوسيلة الإعلامية وناشرها: انظر أعلاه. الهدف: معلومات عن الاستوديو وخدماته وأعماله.",
      rights: "جميع الصور والفيديوهات والمقاطع الموسيقية في هذا الموقع محمية بحقوق النشر، ولا يجوز استخدامها دون إذن.",
      langNote: "هذه ترجمة، والنص الألماني هو المعتمد قانونيًا.",
      privacy: [
        ["الجهة المسؤولة", (L) => `${L.company || "–"}، ${L.address || "–"}. الإيميل: ${L.email || "–"}، الهاتف: ${L.phone || "–"}.`],
        ["باختصار", () => "لا يستخدم هذا الموقع ملفات تعريف (Cookies) للإعلانات أو التتبّع، ولا خدمات تحليل خارجية، ولا يحمّل خطوطًا أو برامج من خوادم أخرى. لا نعالج بياناتك إلا إذا تواصلت معنا بنفسك."],
        ["الاستضافة", () => "الموقع مستضاف لدى Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, USA). عند زيارتك تعالج Cloudflare بيانات تقنية ضرورية، مثل عنوان IP والتاريخ والوقت، لعرض الصفحة وحمايتها من الهجمات. الأساس القانوني: مصلحتنا المشروعة في تشغيل آمن (المادة 6 فقرة 1 بند f من DSGVO). Cloudflare حاصلة على شهادة EU-US Data Privacy Framework."],
        ["إحصاءات الزيارات", () => "نعدّ بشكل مجهول عدد الزيارات، ومرات فتح الخدمات والأعمال، والضغط على أزرار التواصل. لا نضع ملفات Cookies، ولا نحفظ أسماء أو أرقام هواتف أو عناوين IP (المادة 6 فقرة 1 بند f)."],
        ["التواصل عبر واتساب أو الإيميل", () => "عند استخدام نموذج التواصل يُفتح واتساب أو برنامج الإيميل برسالتك (الاسم، الخدمة، التاريخ، المكان، الرسالة). لا يُرسل شيء حتى تضغط أنت «إرسال» هناك، وموقعنا لا يحفظ هذه البيانات. واتساب تديره شركة WhatsApp Ireland Limited (Meta) وتسري هناك سياسة الخصوصية الخاصة بها. نستخدم بياناتك فقط للرد على طلبك (المادة 6 فقرة 1 بند b)، ونحذفها حين لا نعود بحاجة إليها."],
        ["فيديوهات YouTube", () => "بعض الفيديوهات محفوظة على YouTube، ولا تُحمَّل إلا بعد ضغطك على «تشغيل من YouTube». عندها يتصل الموقع بشركة Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland) في وضع الخصوصية المحسّن (youtube-nocookie.com)، وتنتقل بيانات مثل عنوان IP إلى Google. الأساس القانوني: موافقتك بالضغط (المادة 6 فقرة 1 بند a)."],
        ["الموسيقى الخلفية", () => "لا تبدأ الموسيقى إلا بعد دخولك الموقع أو ضغطك عليه، ويمكن إيقافها في أي وقت بزر الموسيقى. ملف الموسيقى يُحمَّل من خادمنا نفسه."],
        ["التخزين في المتصفح", () => "نحفظ في ذاكرة متصفحك اللغة التي اخترتها، وهل شغّلت الموسيقى أم أوقفتها. ويتذكر المتصفح خلال زيارتك أنك شاهدت شاشة البداية. هذه المعلومات لا تغادر جهازك."],
        ["الروابط الخارجية", () => "روابط واتساب وInstagram وFacebook وTikTok وYouTube تفتح مواقع هذه الشركات، وتسري عندها سياسات الخصوصية الخاصة بها."],
        ["حقوقك", () => "لك الحق في الاطلاع على بياناتك وتصحيحها وحذفها وتقييد معالجتها ونقلها والاعتراض على معالجتها. راسلنا على الإيميل المذكور أعلاه. ويمكنك تقديم شكوى لدى هيئة حماية البيانات النمساوية: Barichgasse 40–42, 1030 Wien، www.dsb.gv.at."],
        ["آخر تحديث", () => "أكتوبر 2026"]
      ]
    }
  };

  function pickLang(site) {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem("nour-lang"); if (LANGS.includes(s)) return s; } catch { /* ignore */ }
    return site.defaultLang || "de";
  }

  async function start() {
    const main = document.getElementById("legal");
    let site;
    try { site = await (await fetch("/api/site")).json(); } catch { main.textContent = "⚠"; return; }
    const lang = pickLang(site), t = T[lang], L = site.legal || {};
    document.documentElement.lang = lang === "de" ? "de-AT" : lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const title = page === "impressum" ? t.impressum : t.privacy;
    document.title = `${title} – ${site.name}`;
    const kids = [h("p", {}, h("a", { href: "/" + (lang !== site.defaultLang ? "?lang=" + lang : ""), text: t.back })), h("h1", { text: title })];
    if (t.langNote) kids.push(h("p", { class: "muted", text: t.langNote }));
    if (page === "impressum") {
      kids.push(h("p", { text: t.imp_intro }));
      const dl = h("dl");
      ["company", "owner", "legalForm", "trade", "address", "phone", "email", "uid", "registerNo", "registerCourt", "gisa", "chamber", "authority"].forEach((k) => {
        const required = ["company", "owner", "address", "phone", "email"].includes(k);
        if (!L[k] && !required) return;
        dl.append(h("dt", { text: t.f[k] }), L[k] ? h("dd", { dir: "ltr", text: L[k] }) : h("dd", { class: "missing", text: t.missing }));
      });
      kids.push(dl, h("p", { text: t.law }), h("p", { text: t.media }), h("p", { text: t.rights }));
    } else {
      t.privacy.forEach(([head, body]) => kids.push(h("h2", { text: head }), h("p", { text: body(L) })));
    }
    kids.push(h("p", { class: "muted small" }, ...LANGS.filter((l) => l !== lang).flatMap((l, i) => [i ? " · " : "", h("a", { href: `?lang=${l}`, lang: l, text: { ar: "العربية", de: "Deutsch", en: "English" }[l] })])));
    main.replaceChildren(...kids);
  }
  start();
})();
