/* Nour Eddin Production — public site. All content comes from /api/site (edited in /admin). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html")
        el.innerHTML = v; // only used with our own icon markup, never with site data
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const LANGS = ["ar", "de", "en"];
  const STORE = "nour-";
  const store = {
    get(k) {
      try {
        return localStorage.getItem(STORE + k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(STORE + k, v);
      } catch {
        /* private mode */
      }
    }
  };
  const session = {
    get(k) {
      try {
        return sessionStorage.getItem(STORE + k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        sessionStorage.setItem(STORE + k, v);
      } catch {
        /* private mode */
      }
    }
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const UI = {
    ar: {
      skip: "انتقل إلى المحتوى",
      enter: "ادخل",
      enterQuiet: "الدخول بدون موسيقى",
      navServices: "الخدمات",
      navWorks: "الأعمال",
      navAbout: "من نحن",
      navContact: "تواصل",
      ctaWa: "اطلب عبر واتساب",
      ctaWorks: "شاهد أعمالنا",
      orbitHint: "اضغط على أي خدمة لتعرف تفاصيلها.",
      kServices: "ماذا نقدّم",
      hServices: "خدماتنا",
      kWorks: "معرض الأعمال",
      hWorks: "من أعمالنا",
      kContact: "تواصل معنا",
      hContact: "حدّثنا عن مشروعك",
      fName: "الاسم",
      fService: "الخدمة",
      fDate: "التاريخ (اختياري)",
      fPlace: "المكان (اختياري)",
      fMsg: "رسالتك",
      sendWa: "إرسال عبر واتساب",
      sendMail: "إرسال بالإيميل",
      formNote: "لا يحفظ الموقع بياناتك. تُرسل فقط عندما تضغط أنت «إرسال» داخل واتساب أو برنامج الإيميل.",
      privacy: "سياسة الخصوصية",
      design: "تصميم الموقع",
      askService: "اطلب هذه الخدمة",
      seeWorks: "شاهد الأعمال",
      all: "الكل",
      other: "استفسار عام",
      close: "إغلاق",
      music: "الموسيقى",
      musicOn: "إيقاف الموسيقى",
      musicOff: "تشغيل الموسيقى",
      needName: "اكتب اسمك من فضلك.",
      noWa: "رقم الواتساب غير متوفر حالياً.",
      play: "تشغيل الفيديو",
      ytNote: "يُعرض هذا الفيديو من YouTube. عند التشغيل تنتقل بيانات مثل عنوان IP إلى Google.",
      ytBtn: "تشغيل من YouTube",
      openLink: "فتح الرابط",
      callUs: "اتصل بنا",
      writeUs: "راسلنا",
      whereWe: "موقعنا",
      followUs: "تابعنا",
      photo: "صورة",
      video: "فيديو",
      link: "رابط",
      noWorks: "تُضاف الأعمال قريباً.",
      msgHello: "مرحباً، أتواصل معكم من موقع نور الدين للإنتاج الإعلامي والفني.",
      msgService: "أرغب بالاستفسار عن خدمة",
      social: { youtube: "يوتيوب", facebook: "فيسبوك", instagram: "إنستغرام", tiktok: "تيك توك", email: "الإيميل", whatsapp: "واتساب" }
    },
    de: {
      skip: "Zum Inhalt",
      enter: "Eintreten",
      enterQuiet: "Ohne Musik eintreten",
      navServices: "Leistungen",
      navWorks: "Arbeiten",
      navAbout: "Über uns",
      navContact: "Kontakt",
      ctaWa: "Anfrage per WhatsApp",
      ctaWorks: "Unsere Arbeiten",
      orbitHint: "Tippen Sie auf eine Leistung, um mehr zu erfahren.",
      kServices: "Was wir machen",
      hServices: "Unsere Leistungen",
      kWorks: "Portfolio",
      hWorks: "Unsere Arbeiten",
      kContact: "Kontakt",
      hContact: "Erzählen Sie uns von Ihrem Projekt",
      fName: "Name",
      fService: "Leistung",
      fDate: "Datum (optional)",
      fPlace: "Ort (optional)",
      fMsg: "Ihre Nachricht",
      sendWa: "Per WhatsApp senden",
      sendMail: "Per E-Mail senden",
      formNote:
        "Ihre Angaben werden auf dieser Website nicht gespeichert. Sie werden erst übertragen, wenn Sie die Nachricht in WhatsApp oder in Ihrem E-Mail-Programm selbst absenden.",
      privacy: "Datenschutz",
      design: "Webdesign",
      askService: "Diese Leistung anfragen",
      seeWorks: "Arbeiten ansehen",
      all: "Alle",
      other: "Allgemeine Anfrage",
      close: "Schließen",
      music: "Musik",
      musicOn: "Musik ausschalten",
      musicOff: "Musik einschalten",
      needName: "Bitte geben Sie Ihren Namen ein.",
      noWa: "WhatsApp-Nummer ist derzeit nicht verfügbar.",
      play: "Video abspielen",
      ytNote: "Dieses Video wird von YouTube geladen. Beim Abspielen werden Daten wie Ihre IP-Adresse an Google übertragen.",
      ytBtn: "Von YouTube abspielen",
      openLink: "Link öffnen",
      callUs: "Anrufen",
      writeUs: "Schreiben",
      whereWe: "Standort",
      followUs: "Folgen Sie uns",
      photo: "Foto",
      video: "Video",
      link: "Link",
      noWorks: "Arbeiten folgen in Kürze.",
      msgHello: "Hallo, ich melde mich über die Website von Nour Eddin Production.",
      msgService: "Ich interessiere mich für",
      social: { youtube: "YouTube", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", email: "E-Mail", whatsapp: "WhatsApp" }
    },
    en: {
      skip: "Skip to content",
      enter: "Enter",
      enterQuiet: "Enter without music",
      navServices: "Services",
      navWorks: "Work",
      navAbout: "About",
      navContact: "Contact",
      ctaWa: "Ask on WhatsApp",
      ctaWorks: "See our work",
      orbitHint: "Tap a service to learn more.",
      kServices: "What we do",
      hServices: "Our services",
      kWorks: "Portfolio",
      hWorks: "Our work",
      kContact: "Contact",
      hContact: "Tell us about your project",
      fName: "Name",
      fService: "Service",
      fDate: "Date (optional)",
      fPlace: "Place (optional)",
      fMsg: "Your message",
      sendWa: "Send on WhatsApp",
      sendMail: "Send by email",
      formNote: "This website does not store your details. They are only sent when you press send yourself in WhatsApp or your email app.",
      privacy: "Privacy",
      design: "Web design",
      askService: "Ask about this service",
      seeWorks: "See the work",
      all: "All",
      other: "General enquiry",
      close: "Close",
      music: "Music",
      musicOn: "Turn music off",
      musicOff: "Turn music on",
      needName: "Please enter your name.",
      noWa: "WhatsApp number is not available right now.",
      play: "Play video",
      ytNote: "This video is loaded from YouTube. When it plays, data such as your IP address is sent to Google.",
      ytBtn: "Play from YouTube",
      openLink: "Open link",
      callUs: "Call",
      writeUs: "Write",
      whereWe: "Location",
      followUs: "Follow us",
      photo: "Photo",
      video: "Video",
      link: "Link",
      noWorks: "Work coming soon.",
      msgHello: "Hello, I'm contacting you from the Nour Eddin Production website.",
      msgService: "I'm interested in",
      social: { youtube: "YouTube", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", email: "Email", whatsapp: "WhatsApp" }
    }
  };
  /* Labels used inside the WhatsApp/email message, in the language the studio chose in the dashboard */
  const MSG = {
    ar: { name: "الاسم", service: "الخدمة", date: "التاريخ", place: "المكان", msg: "التفاصيل", subject: "طلب من الموقع" },
    de: { name: "Name", service: "Leistung", date: "Datum", place: "Ort", msg: "Details", subject: "Anfrage über die Website" },
    en: { name: "Name", service: "Service", date: "Date", place: "Place", msg: "Details", subject: "Website enquiry" }
  };

  let site = null,
    lang = "de",
    t = UI.de,
    filter = "all";
  const tx = (o, l = lang) => (o && (o[l] || o.de || o.en || o.ar)) || "";
  const icon = (name) =>
    h("span", {
      class: "medal",
      "aria-hidden": "true",
      html: `<svg viewBox="0 0 48 48">${(window.NOUR_ICONS || {})[name] || (window.NOUR_ICONS || {}).star || ""}</svg>`
    });
  const sIcon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${(window.NOUR_SOCIAL || {})[name] || ""}</svg>`;
  const asset = (p) => (!p ? "" : p.startsWith("/") ? p : "/" + p);
  const track = (type, ref) => {
    const body = JSON.stringify({ type, ref: ref || undefined, lang });
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))
        : fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch {
      /* ignore */
    }
  };
  const waLink = (text) => (site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : null);

  /* ------------------------------------------------------------ language */
  function pickLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    const s = store.get("lang");
    if (LANGS.includes(s)) return s;
    return LANGS.includes(document.documentElement.lang.slice(0, 2)) ? document.documentElement.lang.slice(0, 2) : site.defaultLang;
  }
  function setLang(l, push) {
    lang = l;
    t = UI[l];
    store.set("lang", l);
    document.documentElement.lang = l === "de" ? "de-AT" : l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    if (push) {
      const u = new URL(location.href);
      if (l === site.defaultLang) u.searchParams.delete("lang");
      else u.searchParams.set("lang", l);
      history.replaceState(null, "", u);
    }
    document.querySelectorAll("[data-t]").forEach((el) => {
      if (t[el.dataset.t]) el.textContent = t[el.dataset.t];
    });
    document.querySelectorAll("#langs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
    document.querySelectorAll("[data-close]").forEach((b) => b.setAttribute("aria-label", t.close));
    const brand = l === "ar" ? site.nameAr || site.name : site.name;
    const full = `${brand} – ${tx(site.tagline)}`;
    document.title = full.length <= 60 ? full : brand;
    render();
  }

  /* ------------------------------------------------------------ rendering */
  function render() {
    $("#heroTag").textContent = tx(site.tagline);
    $("#heroSub").textContent = tx(site.heroSub);
    $(".h-ar").textContent = site.nameAr || site.name;
    $("#gateLine").textContent = tx(site.intro.text);
    renderOrbit();
    renderTiles();
    renderWorks();
    renderAbout();
    renderContact();
    renderSocial();
    const wa = waLink(t.msgHello);
    const heroWa = $("#heroWa");
    if (wa) {
      heroWa.href = wa;
      heroWa.target = "_blank";
      heroWa.rel = "noopener";
    } else {
      heroWa.href = "#contact";
      heroWa.removeAttribute("target");
    }
    document.querySelectorAll(".wa-ic").forEach((s) => {
      s.innerHTML = (window.NOUR_SOCIAL || {}).whatsapp || "";
    });
    const note = $("#demoNote");
    note.hidden = !tx(site.demoNote);
    note.textContent = tx(site.demoNote);
    const q = lang !== site.defaultLang ? "?lang=" + lang : "";
    $("#lnkImp").href = "/impressum.html" + q;
    $("#lnkPriv").href = "/datenschutz.html" + q;
    $("#musicLbl").textContent = t.music;
    updateMusicBtn();
  }

  function renderOrbit() {
    $("#ring").replaceChildren(
      ...site.services.map((s) =>
        h(
          "button",
          { type: "button", class: "face", title: tx(s.name), onclick: () => openService(s) },
          icon(s.icon),
          h("b", { text: tx(s.short) || tx(s.name) })
        )
      )
    );
    orbit.layout();
  }
  function renderTiles() {
    $("#srvGrid").replaceChildren(
      ...site.services.map((s) =>
        h(
          "button",
          { type: "button", class: "tile rv", onclick: () => openService(s) },
          icon(s.icon),
          h("b", { text: tx(s.name) }),
          h("small", { text: tx(s.desc) })
        )
      )
    );
    const sel = $("#fService");
    const cur = sel.value;
    sel.replaceChildren(
      ...site.services.map((s) => h("option", { value: s.id, text: tx(s.name) })),
      h("option", { value: "", text: t.other })
    );
    if (cur !== undefined && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
    observe();
  }

  const BADGE = {
    image: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 12h14l-4.5-6-3.5 4.5-2.5-3z"/>',
    video: '<path d="M8 5v14l11-7z"/>',
    youtube: '<path d="M8 5v14l11-7z"/>',
    link: '<path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>'
  };
  function renderWorks() {
    const cats = site.services.filter((s) => site.works.some((w) => w.cat === s.id));
    if (filter !== "all" && !cats.some((c) => c.id === filter)) filter = "all";
    const chip = (id, label) =>
      h("button", {
        type: "button",
        "aria-pressed": String(filter === id),
        text: label,
        onclick: () => {
          filter = id;
          renderWorks();
        }
      });
    $("#chips").replaceChildren(
      ...(cats.length > 1 ? [chip("all", t.all), ...cats.map((c) => chip(c.id, tx(c.short) || tx(c.name)))] : [])
    );
    const list = site.works.filter((w) => filter === "all" || w.cat === filter);
    const grid = $("#worksGrid");
    if (!list.length) {
      grid.replaceChildren(h("p", { class: "works-empty", text: t.noWorks }));
      return;
    }
    grid.replaceChildren(
      ...list.map((w) => {
        const title = tx(w.title) || tx((site.services.find((s) => s.id === w.cat) || {}).name);
        const cover = w.img
          ? h("img", { src: asset(w.img), alt: "", loading: "lazy", decoding: "async" })
          : h("div", { class: "about-media" }, h("div", { class: "ph" }, h("img", { src: "/brand/mark.webp", alt: "" })));
        const kids = [
          cover,
          h("span", { class: "badge", html: `<svg viewBox="0 0 24 24" aria-hidden="true">${BADGE[w.type]}</svg>` }),
          h("span", { class: "cap", text: title })
        ];
        const label = `${title} – ${{ image: t.photo, video: t.video, youtube: t.video, link: t.link }[w.type]}`;
        if (w.type === "link")
          return h(
            "a",
            { class: "work rv", href: w.url, target: "_blank", rel: "noopener", "aria-label": label, onclick: () => track("work", w.id) },
            ...kids
          );
        return h("button", { type: "button", class: "work rv", "aria-label": label, onclick: () => openWork(w, title) }, ...kids);
      })
    );
    observe();
  }
  function renderAbout() {
    const a = site.about;
    $("#aboutRole").textContent = tx(a.role);
    $("#aboutTitle").textContent = tx(a.title) || t.navAbout;
    $("#aboutText").replaceChildren(
      ...tx(a.text)
        .split(/\n+/)
        .filter(Boolean)
        .map((p) => h("p", { text: p }))
    );
    $("#aboutMedia").replaceChildren(
      a.photo
        ? h("img", { src: asset(a.photo), alt: tx(a.title), loading: "lazy" })
        : h("div", { class: "ph" }, h("img", { src: "/brand/logo-full.webp", alt: "", width: "805", height: "1000", loading: "lazy" }))
    );
    $("#aboutStats").replaceChildren(
      ...a.stats.map((s) => h("div", { class: "stat" }, h("b", { text: s.value }), h("span", { text: tx(s.label) })))
    );
    $("#aboutLinks").replaceChildren(
      ...a.links.map((l) => h("a", { class: "btn ghost", href: l.url, target: "_blank", rel: "noopener", text: tx(l.label) }))
    );
  }
  function renderContact() {
    const rows = [];
    site.phones.forEach((p) =>
      rows.push(
        h(
          "a",
          { class: "c-row", href: "tel:" + p.replace(/[^\d+]/g, ""), onclick: () => track("call"), html: sIcon("phone") },
          h("span", { text: p })
        )
      )
    );
    if (site.whatsapp)
      rows.push(
        h(
          "a",
          {
            class: "c-row",
            href: waLink(t.msgHello),
            target: "_blank",
            rel: "noopener",
            onclick: () => track("whatsapp"),
            html: sIcon("whatsapp")
          },
          h("span", { text: "WhatsApp" })
        )
      );
    if (site.email)
      rows.push(
        h(
          "a",
          { class: "c-row", href: "mailto:" + site.email, onclick: () => track("email"), html: sIcon("email") },
          h("span", { text: site.email })
        )
      );
    if (tx(site.city))
      rows.push(
        h(
          "div",
          {
            class: "c-row",
            html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'
          },
          h("span", { text: tx(site.city) })
        )
      );
    $("#contactCard").replaceChildren(h("h3", { text: site.nameAr && lang === "ar" ? site.nameAr : site.name }), ...rows);
  }
  function socialLinks() {
    const out = [];
    ["youtube", "facebook", "instagram", "tiktok"].forEach((k) => {
      if (site.social[k]) out.push({ k, href: site.social[k] });
    });
    if (site.email) out.push({ k: "email", href: "mailto:" + site.email });
    if (site.whatsapp) out.push({ k: "whatsapp", href: waLink(t.msgHello) });
    return out;
  }
  function renderSocial() {
    const items = socialLinks();
    const make = (s, tip) =>
      h(
        "a",
        {
          href: s.href,
          target: s.k === "email" ? null : "_blank",
          rel: "noopener",
          "aria-label": t.social[s.k],
          html: sIcon(s.k),
          onclick: () => track(s.k === "email" ? "email" : s.k === "whatsapp" ? "whatsapp" : "social", s.k)
        },
        tip ? h("span", { class: "tip", text: t.social[s.k] }) : null
      );
    $("#social").replaceChildren(...items.map((s) => make(s, true)));
    $("#footSocial").replaceChildren(...items.map((s) => make(s, false)));
    document.body.classList.toggle("has-social", items.length > 0);
  }

  /* ------------------------------------------------------------ dialogs */
  let lastFocus = null;
  function openDialog(d) {
    lastFocus = document.activeElement;
    d.showModal();
  }
  document.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
    });
    d.addEventListener("close", () => {
      if (d.id === "viewer") {
        $("#viewerBody").replaceChildren();
        resumeMusic();
      }
      if (lastFocus) lastFocus.focus();
    });
  });
  function openService(s) {
    track("service", s.id);
    $("#srvDlgIcon").replaceChildren(icon(s.icon).firstChild);
    $("#srvDlgTitle").textContent = tx(s.name);
    $("#srvDlgDesc").textContent = tx(s.desc);
    $("#srvDlgPoints").replaceChildren(...s.points.map((p) => h("li", { text: tx(p) })));
    const wa = waLink(`${t.msgHello}\n${t.msgService}: ${tx(s.name)}`);
    const btn = $("#srvDlgWa");
    if (wa) {
      btn.href = wa;
      btn.target = "_blank";
      btn.onclick = () => track("whatsapp", s.id);
    } else {
      btn.href = "#contact";
      btn.removeAttribute("target");
      btn.onclick = () => {
        $("#fService").value = s.id;
        $("#srvDlg").close();
      };
    }
    const works = site.works.some((w) => w.cat === s.id);
    const wb = $("#srvDlgWorks");
    wb.hidden = !works;
    wb.onclick = () => {
      filter = s.id;
      renderWorks();
      $("#srvDlg").close();
      $("#works").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    };
    openDialog($("#srvDlg"));
  }
  function openWork(w, title) {
    track("work", w.id);
    const body = $("#viewerBody");
    $("#viewerTitle").textContent = title;
    if (w.type === "image") body.replaceChildren(h("img", { src: asset(w.img), alt: title }));
    if (w.type === "video") {
      pauseMusic(true);
      body.replaceChildren(
        h("video", {
          src: w.video,
          poster: w.img ? asset(w.img) : null,
          controls: true,
          autoplay: true,
          playsinline: true,
          preload: "metadata"
        })
      );
    }
    if (w.type === "youtube") {
      // Two clicks: nothing is loaded from YouTube until the visitor agrees.
      body.replaceChildren(
        h(
          "div",
          { class: "consent" },
          h("p", { text: t.ytNote }),
          h(
            "button",
            {
              type: "button",
              class: "btn gold",
              onclick: () => {
                pauseMusic(true);
                body.replaceChildren(
                  h("iframe", {
                    src: `https://www.youtube-nocookie.com/embed/${w.youtube}?autoplay=1&rel=0`,
                    title,
                    allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
                    allowfullscreen: true,
                    referrerpolicy: "strict-origin-when-cross-origin"
                  })
                );
              }
            },
            h("span", { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' }),
            t.ytBtn
          )
        )
      );
    }
    openDialog($("#viewer"));
  }

  /* ------------------------------------------------------------ contact form */
  function buildMessage() {
    const m = MSG[site.messageLang] || MSG.ar;
    const sid = $("#fService").value;
    const srv = site.services.find((s) => s.id === sid);
    const lines = [
      t.msgHello,
      "",
      `${m.name}: ${$("#fName").value.trim()}`,
      `${m.service}: ${srv ? tx(srv.name, site.messageLang) : UI[site.messageLang].other}`
    ];
    if ($("#fDate").value) lines.push(`${m.date}: ${$("#fDate").value.split("-").reverse().join(".")}`);
    if ($("#fPlace").value.trim()) lines.push(`${m.place}: ${$("#fPlace").value.trim()}`);
    if ($("#fMsg").value.trim()) lines.push(`${m.msg}: ${$("#fMsg").value.trim()}`);
    return { text: lines.join("\n"), subject: `${m.subject} – ${srv ? tx(srv.name, site.messageLang) : ""}`.replace(/ – $/, ""), ref: sid };
  }
  function validName() {
    const err = $("#formErr");
    if ($("#fName").value.trim().length < 2) {
      err.textContent = t.needName;
      err.hidden = false;
      $("#fName").focus();
      return false;
    }
    err.hidden = true;
    return true;
  }
  $("#form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validName()) return;
    const m = buildMessage();
    const link = waLink(m.text);
    if (!link) {
      $("#formErr").textContent = t.noWa;
      $("#formErr").hidden = false;
      return;
    }
    track("whatsapp", m.ref || undefined);
    window.open(link, "_blank", "noopener");
  });
  $("#sendMail").addEventListener("click", () => {
    if (!validName() || !site.email) return;
    const m = buildMessage();
    track("email", m.ref || undefined);
    location.href = `mailto:${site.email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
  });

  /* ------------------------------------------------------------ music */
  const audio = $("#bgm");
  let musicWanted = false,
    fadeTimer = null;
  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    const start = audio.volume,
      steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
      if (i >= steps) {
        clearInterval(fadeTimer);
        done && done();
      }
    }, 50);
  }
  function startMusic() {
    if (!site.music.enabled) return;
    if (!audio.src) audio.src = asset(site.music.track.src);
    audio.volume = 0;
    const p = audio.play();
    musicWanted = true;
    store.set("music", "on");
    if (p && p.then)
      p.then(() => {
        fadeTo(site.music.volume, 2500);
        track("music");
        updateMusicBtn();
      }).catch(() => {
        musicWanted = false;
        updateMusicBtn();
      });
    updateMusicBtn();
  }
  function stopMusic(remember) {
    musicWanted = false;
    if (remember) store.set("music", "off");
    fadeTo(0, 600, () => audio.pause());
    updateMusicBtn();
  }
  let pausedForVideo = false;
  function pauseMusic(forVideo) {
    if (!audio.paused) {
      pausedForVideo = !!forVideo;
      fadeTo(0, 400, () => audio.pause());
    }
  }
  function resumeMusic() {
    if (pausedForVideo && musicWanted) {
      pausedForVideo = false;
      audio
        .play()
        .then(() => fadeTo(site.music.volume, 1200))
        .catch(() => {});
    }
  }
  function updateMusicBtn() {
    const b = $("#musicBtn");
    if (!site || !site.music.enabled) {
      b.hidden = true;
      return;
    }
    b.hidden = false;
    b.setAttribute("aria-pressed", String(musicWanted));
    b.setAttribute("aria-label", musicWanted ? t.musicOn : t.musicOff);
    b.title = musicWanted ? t.musicOn : t.musicOff;
  }
  $("#musicBtn").addEventListener("click", () => (musicWanted ? stopMusic(true) : startMusic()));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !audio.paused) audio.pause();
    else if (!document.hidden && musicWanted && audio.paused && !$("#viewer").open) audio.play().catch(() => {});
  });

  /* Browsers only allow sound after the visitor clicks. The intro screen gives that click;
     without the intro, music starts on the first tap anywhere (unless the visitor turned it off). */
  function setupIntro() {
    const gate = $("#gate");
    const showGate = site.music.enabled && site.intro.enabled && session.get("gate") !== "1";
    if (!showGate) {
      if (site.music.enabled && store.get("music") !== "off") {
        const first = (e) => {
          if (e.target.closest && e.target.closest("#musicBtn")) return;
          removeEventListener("pointerdown", first, true);
          removeEventListener("keydown", first, true);
          if (!musicWanted) startMusic();
        };
        addEventListener("pointerdown", first, true);
        addEventListener("keydown", first, true);
      }
      return;
    }
    gate.hidden = false;
    document.body.style.overflow = "hidden";
    const close = (withMusic) => {
      session.set("gate", "1");
      if (withMusic) startMusic();
      else stopMusic(true);
      gate.classList.add("out");
      document.body.style.overflow = "";
      setTimeout(() => {
        gate.hidden = true;
      }, 1100);
      $("#main").focus({ preventScroll: true });
    };
    $("#gateEnter").addEventListener("click", () => close(true));
    $("#gateQuiet").addEventListener("click", () => close(false));
    setTimeout(() => $("#gateEnter").focus(), 50);
  }

  /* ------------------------------------------------------------ 3D logo + orbit */
  /* The services travel on an ellipse around the logo. Items in front pass over the logo,
     items behind pass under it, smaller and dimmer, which gives the 3D feeling on every phone. */
  const orbit = {
    angle: Math.PI / 2,
    last: 0,
    paused: false,
    geo: null,
    raf: 0,
    layout() {
      const stage = $("#stage"),
        faces = [...document.querySelectorAll("#ring .face")];
      if (!faces.length) return;
      const W = stage.clientWidth,
        fw = faces[0].offsetWidth,
        fh = faces[0].offsetHeight;
      const logo = $("#logo3d"),
        lt = logo.offsetTop,
        lh = logo.offsetHeight;
      const rx = Math.max(60, W / 2 - fw / 2 - 2),
        ry = Math.min(W * 0.17, 110);
      const cy = lt + lh * 0.64;
      stage.style.height = Math.ceil(cy + ry + fh * 0.62 + 6) + "px";
      this.geo = { cx: W / 2, cy, rx, ry, faces };
      stage.style.setProperty("--cx", W / 2 + "px");
      stage.style.setProperty("--cy", cy + "px");
      stage.style.setProperty("--rx", rx + "px");
      stage.style.setProperty("--ry", ry + "px");
      this.draw();
    },
    draw() {
      const g = this.geo;
      if (!g) return;
      const n = g.faces.length;
      g.faces.forEach((f, i) => {
        const p = this.angle + (i * 2 * Math.PI) / n;
        const depth = (Math.sin(p) + 1) / 2; // 1 = front, 0 = back
        const x = g.cx + g.rx * Math.cos(p),
          y = g.cy + g.ry * Math.sin(p);
        f.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.74 + 0.26 * depth).toFixed(3)})`;
        f.style.opacity = (0.42 + 0.58 * depth).toFixed(2);
        f.style.zIndex = depth > 0.5 ? 3 : 1;
        // With many services only the ones near the front show their name, so labels never pile up.
        const from = g.cx < 260 ? 0.86 : 0.5; // phones: only the front name or two
        f.lastChild.style.opacity = n > 9 || g.cx < 260 ? Math.max(0, Math.min(1, (depth - from) * 7)).toFixed(2) : "1";
      });
    },
    tick(ts) {
      if (!this.last) this.last = ts;
      const dt = Math.min(64, ts - this.last);
      this.last = ts;
      if (!this.paused && !document.hidden) {
        this.angle -= dt * ((2 * Math.PI) / 52000);
        this.draw();
      }
      this.raf = requestAnimationFrame((x) => this.tick(x));
    },
    start() {
      const stage = $("#stage");
      addEventListener("resize", () => this.layout());
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.layout());
      stage.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") this.paused = true;
      });
      stage.addEventListener("pointerleave", () => {
        this.paused = false;
      });
      stage.addEventListener("focusin", () => {
        this.paused = true;
      });
      stage.addEventListener("focusout", () => {
        this.paused = false;
      });
      if (!reduced) this.raf = requestAnimationFrame((x) => this.tick(x));
    }
  };
  function buildLogo() {
    const box = $("#logo3d");
    const layers = reduced ? 3 : 9;
    for (let i = layers; i >= 1; i--) {
      const img = h("img", { src: "/brand/mark-depth.webp", alt: "", decoding: "async", draggable: "false" });
      img.style.transform = `translateZ(${-i * 1.6}px)`;
      img.style.opacity = String(1 - i * 0.05);
      box.append(img);
    }
    box.append(h("img", { class: "front", src: "/brand/mark.webp", alt: "", draggable: "false" }), h("span", { class: "shine" }));
  }

  /* ------------------------------------------------------------ reveal on scroll */
  const io =
    "IntersectionObserver" in window && !reduced
      ? new IntersectionObserver(
          (es) =>
            es.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add("in");
                io.unobserve(e.target);
              }
            }),
          { rootMargin: "0px 0px -8% 0px" }
        )
      : null;
  function observe() {
    document.querySelectorAll(".rv:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  }

  /* ------------------------------------------------------------ start */
  async function start() {
    try {
      site = await (await fetch("/api/site")).json();
    } catch {
      return;
    }
    $("#main").setAttribute("tabindex", "-1");
    $("#year").textContent = new Date().getFullYear();
    buildLogo();
    orbit.start();
    setLang(pickLang(), false);
    document.querySelectorAll("#langs button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang, true)));
    setupIntro();
    track("view");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
