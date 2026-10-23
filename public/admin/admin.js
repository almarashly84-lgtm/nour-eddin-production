/* Nour Eddin Production — dashboard. Everything the public site shows is edited here and saved to /api/admin/site. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html")
        el.innerHTML = v; // only our own icon markup
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = !!v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const LANGS = [
    ["ar", "ع"],
    ["de", "DE"],
    ["en", "EN"]
  ];
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const ICON_NAMES = {
    rings: "خاتمان (أفراح)",
    mic: "مايك (بودكاست)",
    broadcast: "بث (تغطية)",
    interview: "حوار (لقاءات)",
    corporate: "مبنى (شركات)",
    megaphone: "مكبّر صوت (إعلانات)",
    camera: "كاميرا تصوير",
    edit: "كلاكيت (مونتاج)",
    drone: "درون",
    live: "بث مباشر",
    studio: "إضاءة استوديو",
    music: "موسيقى",
    web: "موقع إلكتروني",
    print: "طابعة",
    laser: "ليزر",
    target: "هدف (إعلانات أونلاين)",
    portrait: "صورة شخصية",
    star: "نجمة"
  };
  const TYPES = { image: "صورة", video: "فيديو مرفوع", youtube: "فيديو من YouTube", link: "رابط (إنستغرام، تيك توك، فيسبوك…)" };
  const ERR = {
    service_name_required: "توجد خدمة بلا اسم.",
    work_video_required: "يوجد عمل من نوع «فيديو» بلا ملف فيديو.",
    work_youtube_required: "رابط YouTube غير صحيح في أحد الأعمال.",
    work_link_required: "يوجد عمل من نوع «رابط» بلا رابط صحيح يبدأ بـ https.",
    work_image_required: "يوجد عمل من نوع «صورة» بلا صورة.",
    bad_whatsapp: "رقم الواتساب غير صحيح. اكتبه بالأرقام مع رمز الدولة، مثل 436766662827.",
    bad_email: "الإيميل غير صحيح.",
    too_large: "الملف كبير جدًا.",
    bad_type: "نوع الملف غير مدعوم.",
    unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.",
    no_file: "لم يُختر ملف.",
    wrong_password: "كلمة السر غير صحيحة.",
    weak_password: "كلمة السر الجديدة قصيرة (10 أحرف على الأقل).",
    same_password: "اختر كلمة سر مختلفة عن الحالية.",
    not_configured: "لم تُضبط كلمة السر المؤقتة بعد في Cloudflare (ADMIN_INITIAL_PASSWORD).",
    storage_missing: "التخزين R2 غير مربوط في Cloudflare.",
    locked: "محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.",
    conflict: "تم حفظ تغييرات من جهاز آخر.",
    server_error: "تعذّر الاتصال بالخادم. تحقّق من الإنترنت وحاول مرة أخرى."
  };

  let site = null,
    saved = "",
    siteVersion = null, // when the site was last saved on the server (to notice edits from another device)
    tab = "stats";

  /* ------------------------------------------------------------ helpers */
  const toast = (msg, bad = false) => {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.toggle("bad", bad);
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 3600);
  };
  async function api(path, opts = {}) {
    const r = await fetch("/api/admin/" + path, {
      credentials: "same-origin",
      ...opts,
      headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) }
    });
    let d = {};
    try {
      d = await r.json();
    } catch {
      /* empty */
    }
    if (path === "site" && r.ok && r.headers.get("X-Site-Updated") != null) siteVersion = r.headers.get("X-Site-Updated");
    if (r.status === 401 && path !== "login" && path !== "password") {
      showGate();
      throw new Error("unauthorized");
    }
    if (!r.ok) {
      const e = new Error(d.error || "server_error");
      e.data = d;
      throw e;
    }
    return d;
  }
  const errText = (e) => ERR[e.message] || "حدث خطأ. حاول مرة أخرى.";
  const tx = (o) => (o && (o.ar || o.de || o.en)) || "";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const src = (p) => (p ? (p.startsWith("/") ? p : "/" + p) : "/brand/icon-180.png");
  const newId = (p) => p + "-" + Math.random().toString(36).slice(2, 7);
  const move = (arr, i, d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  };
  const mb = (n) => (n / 1048576).toFixed(0) + " MB";
  const iconSvg = (name) =>
    `<svg viewBox="0 0 48 48" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.NOUR_ICONS || {})[name] || ""}</svg>`;

  function markDirty() {
    const dirty = JSON.stringify(site) !== saved;
    $("#saveBtn").disabled = !dirty;
    $("#saveState").textContent = dirty ? "تغييرات غير محفوظة" : "";
  }
  addEventListener("beforeunload", (e) => {
    if (site && JSON.stringify(site) !== saved) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  function field(label, obj, key, opts = {}) {
    const tag = opts.area ? "textarea" : "input";
    const inp = h(tag, {
      class: "in",
      type: opts.type || (opts.area ? null : "text"),
      value: obj[key] ?? "",
      placeholder: opts.ph || null,
      dir: opts.dir || null,
      inputmode: opts.inputmode || null,
      maxlength: opts.max || null,
      rows: opts.rows || null
    });
    inp.addEventListener("input", () => {
      obj[key] = inp.value;
      opts.onchange && opts.onchange(inp.value);
      markDirty();
    });
    return h(
      "label",
      { class: "field" },
      h("span", { text: label }),
      inp,
      opts.help ? h("small", { class: "help", text: opts.help }) : null
    );
  }
  function tri(label, obj, key, opts = {}) {
    if (!obj[key] || typeof obj[key] !== "object") obj[key] = {};
    const o = obj[key];
    return h(
      "div",
      { class: "tri" },
      h("span", { text: label }),
      ...LANGS.map(([l, short]) => {
        const inp = h(opts.area ? "textarea" : "input", {
          class: "in",
          value: o[l] || "",
          lang: l,
          dir: l === "ar" ? "rtl" : "ltr",
          rows: opts.rows || (opts.area ? 3 : null),
          maxlength: opts.max || null,
          "aria-label": `${label} (${short})`
        });
        inp.addEventListener("input", () => {
          o[l] = inp.value;
          opts.onchange && opts.onchange();
          markDirty();
        });
        return h("div", { class: "row" }, h("b", { text: short }), inp);
      }),
      opts.help ? h("small", { class: "help", text: opts.help }) : null
    );
  }
  function check(label, obj, key, onchange, invert = false) {
    const inp = h("input", { type: "checkbox", checked: invert ? obj[key] === false : !!obj[key] });
    inp.addEventListener("change", () => {
      const v = invert ? !inp.checked : inp.checked;
      if (key === "hidden") {
        if (v) obj[key] = true;
        else delete obj[key];
      } else obj[key] = v;
      onchange && onchange(v);
      markDirty();
    });
    return h("label", { class: "check" }, inp, label);
  }
  function select(label, obj, key, options, onchange) {
    const sel = h("select", { class: "in" }, ...options.map(([v, t]) => h("option", { value: v, text: t })));
    sel.value = String(obj[key] ?? options[0][0]);
    sel.addEventListener("change", () => {
      obj[key] = sel.value;
      onchange && onchange(sel.value);
      markDirty();
    });
    return h("label", { class: "field" }, h("span", { text: label }), sel);
  }
  const card = (title, help, ...kids) =>
    h(
      "section",
      { class: "card" },
      h("header", {}, h("h2", { text: title })),
      help ? h("p", { class: "help", text: help }) : null,
      ...kids
    );
  const arrowBtns = (arr, i, rerender) => [
    h("button", {
      type: "button",
      class: "btn sm icon",
      title: "إلى الأعلى",
      "aria-label": "إلى الأعلى",
      text: "↑",
      disabled: i === 0,
      onclick: () => {
        move(arr, i, -1);
        markDirty();
        rerender();
      }
    }),
    h("button", {
      type: "button",
      class: "btn sm icon",
      title: "إلى الأسفل",
      "aria-label": "إلى الأسفل",
      text: "↓",
      disabled: i === arr.length - 1,
      onclick: () => {
        move(arr, i, 1);
        markDirty();
        rerender();
      }
    })
  ];

  /* ------------------------------------------------------------ uploads (streamed to storage, with progress) */
  const LIMIT = { image: 6 * 1048576, audio: 25 * 1048576, video: 95 * 1048576 };
  async function shrink(file) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      let blob = await new Promise((res) => c.toBlob(res, "image/webp", 0.84));
      if (!blob || blob.type !== "image/webp") blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.86));
      return blob || file;
    } catch {
      return file;
    }
  }
  function sendFile(kind, blob, onProgress) {
    return new Promise((resolve, reject) => {
      if (blob.size > LIMIT[kind]) return reject(Object.assign(new Error("too_large"), { data: {} }));
      const x = new XMLHttpRequest();
      x.open("POST", "/api/admin/upload?kind=" + kind);
      x.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
      x.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      x.onload = () => {
        let d = {};
        try {
          d = JSON.parse(x.responseText);
        } catch {
          /* ignore */
        }
        if (x.status === 401) {
          showGate();
          return reject(new Error("unauthorized"));
        }
        if (x.status >= 200 && x.status < 300 && d.url) resolve(d.url);
        else reject(new Error(d.error || "server_error"));
      };
      x.onerror = () => reject(new Error("server_error"));
      x.send(blob);
    });
  }
  async function upload(kind, file, onProgress) {
    const blob = kind === "image" ? await shrink(file) : file;
    return sendFile(kind, blob, onProgress);
  }
  /* A button that picks a file, uploads it and hands back its address */
  function uploadBtn(kind, label, accept, onDone) {
    const file = h("input", { type: "file", accept, hidden: true });
    const btn = h("button", { type: "button", class: "btn sm", text: label, onclick: () => file.click() });
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > LIMIT[kind] && kind !== "image") {
        toast(`الملف كبير جدًا (${mb(f.size)}). الحد الأقصى ${mb(LIMIT[kind])}.`, true);
        file.value = "";
        return;
      }
      btn.disabled = true;
      btn.textContent = "جارٍ الرفع…";
      try {
        const url = await upload(kind, f, (p) => {
          btn.textContent = `جارٍ الرفع… ${p}%`;
        });
        onDone(url, f);
        toast("رُفع الملف. لا تنسَ «حفظ التغييرات».");
      } catch (e) {
        toast(errText(e), true);
      } finally {
        btn.disabled = false;
        btn.textContent = label;
        file.value = "";
      }
    });
    return h("span", {}, btn, file);
  }
  function imagePicker(label, obj, key, onchange, help) {
    const img = h("img", { src: src(obj[key]), alt: "" });
    const rm = h("button", {
      type: "button",
      class: "btn sm danger",
      text: "إزالة",
      hidden: !obj[key],
      onclick: () => {
        obj[key] = "";
        img.src = src("");
        rm.hidden = true;
        onchange && onchange();
        markDirty();
      }
    });
    const up = uploadBtn("image", "رفع صورة", "image/*", (url) => {
      obj[key] = url;
      img.src = src(url);
      rm.hidden = false;
      onchange && onchange();
      markDirty();
    });
    return h(
      "div",
      { class: "field" },
      h("span", { text: label }),
      h("div", { class: "img-pick" }, img, up, rm),
      help ? h("small", { class: "help", text: help }) : null
    );
  }
  function editor(title, buildBody, onClose) {
    const dlg = h("dialog", { class: "ed", "aria-label": title });
    const body = h("div", { class: "ed-body" });
    const draw = () => body.replaceChildren(...buildBody(draw));
    draw();
    const close = () => {
      dlg.close();
      dlg.remove();
      onClose && onClose();
      render();
    };
    dlg.append(
      h(
        "div",
        { class: "ed-head" },
        h("h2", { text: title }),
        h("button", { type: "button", class: "btn sm", text: "إغلاق", onclick: close })
      ),
      body,
      h("div", { class: "ed-foot" }, h("button", { type: "button", class: "btn primary", text: "تم", onclick: close }))
    );
    dlg.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    document.body.append(dlg);
    dlg.showModal();
  }

  /* ------------------------------------------------------------ auth */
  function showGate() {
    $("#app").hidden = true;
    $("#force").hidden = true;
    $("#gate").hidden = false;
    $("#loginPass").focus();
  }
  async function boot() {
    try {
      const me = await api("me");
      if (me.mustChange) {
        $("#gate").hidden = true;
        $("#force").hidden = false;
        return;
      }
      // After the session expired mid-edit: keep the unsaved changes instead of replacing them with the server copy
      const draft = site && JSON.stringify(site) !== saved ? site : null;
      const fresh = await api("site");
      saved = JSON.stringify(fresh);
      site = draft || fresh;
      $("#gate").hidden = true;
      $("#force").hidden = true;
      $("#app").hidden = false;
      render();
      markDirty();
      if (draft) toast("تم الاحتفاظ بتعديلاتك غير المحفوظة. اضغط «حفظ» لنشرها.");
    } catch (e) {
      if (e.message !== "unauthorized") showGate();
    }
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#loginErr");
    err.hidden = true;
    try {
      await api("login", { method: "POST", body: JSON.stringify({ password: $("#loginPass").value }) });
      $("#loginPass").value = "";
      boot();
    } catch (x) {
      err.hidden = false;
      err.textContent =
        x.message === "locked"
          ? `محاولات كثيرة. حاول بعد ${x.data.minutes} دقيقة.`
          : x.message === "wrong_password"
            ? "كلمة السر غير صحيحة. " +
              (["لم تبقَ محاولات.", "بقيت محاولة واحدة.", "بقيت محاولتان."][x.data.left] || `بقيت ${x.data.left} محاولات.`)
            : errText(x);
    }
  });
  $("#forceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#forceErr");
    err.hidden = true;
    if ($("#fNew").value !== $("#fNew2").value) {
      err.hidden = false;
      err.textContent = "كلمتا السر الجديدتان غير متطابقتين.";
      return;
    }
    try {
      await api("password", { method: "POST", body: JSON.stringify({ current: $("#fCur").value, next: $("#fNew").value }) });
      toast("تم تغيير كلمة السر.");
      boot();
    } catch (x) {
      err.hidden = false;
      err.textContent = errText(x);
    }
  });
  $$("[data-eye]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = document.getElementById(b.dataset.eye);
      i.type = i.type === "password" ? "text" : "password";
    })
  );

  $("#saveBtn").addEventListener("click", async () => {
    const btn = $("#saveBtn");
    btn.disabled = true;
    $("#saveState").textContent = "جارٍ الحفظ…";
    const put = (force) =>
      api("site", {
        method: "PUT",
        body: JSON.stringify(site),
        headers: { ...(siteVersion != null ? { "X-Base-Updated": siteVersion } : {}), ...(force ? { "X-Force": "1" } : {}) }
      });
    try {
      let d;
      try {
        d = await put(false);
      } catch (e) {
        if (e.message !== "conflict") throw e;
        if (
          !confirm(
            "تم حفظ تغييرات على الموقع من جهاز آخر بعد أن فتحتَ لوحة التحكم هنا.\n\nموافق = استبدالها بتعديلاتك الحالية.\nإلغاء = لا تحفظ الآن (حدّث الصفحة لترى النسخة الأحدث)."
          )
        )
          throw e;
        d = await put(true);
      }
      if (d.updated != null) siteVersion = String(d.updated);
      site = d.site;
      saved = JSON.stringify(site);
      markDirty();
      render();
      toast("تم الحفظ. التغييرات ظاهرة على الموقع خلال دقيقة.");
    } catch (e) {
      toast(errText(e), true);
      markDirty();
    }
  });

  /* ------------------------------------------------------------ tabs */
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    tab = b.dataset.tab;
    $$("#tabs button").forEach((x) => x.setAttribute("aria-current", x === b ? "page" : "false"));
    render();
    scrollTo(0, 0);
  });
  function render() {
    const main = $("#main");
    main.replaceChildren();
    ({
      stats: renderStats,
      music: renderMusic,
      services: renderServices,
      works: renderWorks,
      about: renderAbout,
      contact: renderContact,
      texts: renderTexts,
      legal: renderLegal,
      security: renderSecurity
    })[tab](main);
  }

  /* ------------------------------------------------------------ statistics */
  const KPIS = [
    ["view", "زيارة للموقع"],
    ["service", "مرة فُتحت فيها خدمة"],
    ["work", "مرة فُتح فيها عمل"],
    ["whatsapp", "ضغطة على واتساب"],
    ["call", "اتصال"],
    ["email", "ضغطة على الإيميل"],
    ["social", "ضغطة على منصة تواصل"],
    ["music", "تشغيل للموسيقى"]
  ];
  function barChart(values, fmt) {
    const max = Math.max(1, ...values);
    return [
      h(
        "div",
        { class: "chart" },
        ...values.map((v, i) => {
          const bar = h(
            "div",
            { class: "bar" + (v ? "" : " zero"), tabindex: "0", "aria-label": `${MONTHS[i]}: ${fmt(v)}` },
            h("i"),
            h("span", { class: "tip", text: `${MONTHS[i]}: ${fmt(v)}` })
          );
          bar.firstChild.style.height = (v / max) * 100 + "%";
          return bar;
        })
      ),
      h("div", { class: "axis", "aria-hidden": "true" }, ...MONTHS.map((_, i) => h("span", { text: String(i + 1) })))
    ];
  }
  function rank(rows, nameOf) {
    if (!rows.length) return h("p", { class: "muted", text: "لا توجد بيانات بعد." });
    const max = Math.max(1, ...rows.map((r) => r.n));
    return h(
      "ol",
      { class: "rank" },
      ...rows.map((r) =>
        h(
          "li",
          {},
          h("span", { text: nameOf(r.ref) }),
          h("b", { text: r.n }),
          h(
            "span",
            { class: "meter" },
            (() => {
              const i = h("i");
              i.style.width = (r.n / max) * 100 + "%";
              return i;
            })()
          )
        )
      )
    );
  }
  async function renderStats(main) {
    const box = h("div", { class: "list" }, h("p", { class: "muted", text: "جارٍ تحميل الإحصائيات…" }));
    main.append(box);
    let r;
    try {
      r = await api("stats?year=" + (renderStats.year || new Date().getFullYear()));
    } catch (e) {
      box.replaceChildren(h("p", { class: "err", text: errText(e) }));
      return;
    }
    const yearSel = h("select", { class: "in", "aria-label": "السنة" }, ...r.years.map((y) => h("option", { value: y, text: y })));
    yearSel.value = r.year;
    yearSel.addEventListener("change", () => {
      renderStats.year = Number(yearSel.value);
      render();
    });
    const sname = Object.fromEntries(site.services.map((s) => [s.id, tx(s.name)]));
    const social = { youtube: "يوتيوب", facebook: "فيسبوك", instagram: "إنستغرام", tiktok: "تيك توك" };
    box.replaceChildren(
      card(
        `إحصائيات سنة ${r.year}`,
        "أرقام مجهولة الهوية من الموقع نفسه، بدون Cookies. «ضغطة على واتساب» تعني أن الزائر فتح واتساب، ولا نعرف إن أرسل الرسالة فعلاً.",
        h("div", { class: "grid3" }, h("label", { class: "field" }, h("span", { text: "السنة" }), yearSel)),
        h(
          "div",
          { class: "kpis" },
          ...KPIS.map(([k, l]) =>
            h("div", { class: "kpi" }, h("b", { text: (r.totals[k] || 0).toLocaleString("de-AT") }), h("span", { text: l }))
          )
        )
      ),
      card(
        "الزيارات حسب الشهر",
        null,
        ...barChart(
          r.months.map((m) => m.view),
          (v) => `${v} زيارة`
        )
      ),
      card(
        "طلبات واتساب حسب الشهر",
        null,
        ...barChart(
          r.months.map((m) => m.whatsapp),
          (v) => `${v} ضغطة`
        )
      ),
      card(
        "أكثر الخدمات اهتمامًا",
        null,
        rank(r.services, (id) => sname[id] || id)
      ),
      card(
        "المنصات الأكثر زيارة",
        null,
        rank(r.socials, (id) => social[id] || id)
      ),
      card(
        "مسح الإحصائيات",
        "يحذف أرقام هذه السنة نهائيًا.",
        h("button", {
          type: "button",
          class: "btn danger",
          text: `مسح إحصائيات ${r.year}`,
          onclick: async () => {
            if (!confirm(`هل تريد حذف كل إحصائيات ${r.year}؟ لا يمكن التراجع.`)) return;
            try {
              await api("stats?year=" + r.year, { method: "DELETE" });
              toast("تم المسح.");
              render();
            } catch (e) {
              toast(errText(e), true);
            }
          }
        })
      )
    );
  }

  /* ------------------------------------------------------------ music */
  function renderMusic(main) {
    const m = site.music;
    const vol = h("input", {
      type: "range",
      min: "5",
      max: "100",
      step: "5",
      value: String(Math.round(m.volume * 100)),
      "aria-label": "مستوى الصوت"
    });
    const volTxt = h("b", { text: Math.round(m.volume * 100) + "%" });
    vol.addEventListener("input", () => {
      m.volume = Number(vol.value) / 100;
      volTxt.textContent = vol.value + "%";
      $$("audio[data-prev]").forEach((a) => (a.volume = m.volume));
      markDirty();
    });
    const list = h("div", { class: "list" });
    const drawList = () => {
      list.replaceChildren(
        ...(m.tracks.length
          ? m.tracks.map((t, i) => {
              const radio = h("input", {
                type: "radio",
                name: "activeTrack",
                checked: m.active === t.id,
                "aria-label": "اجعلها الموسيقى الحالية"
              });
              radio.addEventListener("change", () => {
                m.active = t.id;
                markDirty();
              });
              const au = h("audio", { controls: true, preload: "none", src: src(t.src), "data-prev": "1" });
              au.volume = m.volume;
              const title = h("input", { class: "in", value: t.title, maxlength: "80", "aria-label": "اسم المقطع" });
              title.addEventListener("input", () => {
                t.title = title.value;
                markDirty();
              });
              return h(
                "div",
                { class: "card" },
                h("label", { class: "check" }, radio, "تُشغَّل على الموقع"),
                title,
                au,
                h(
                  "div",
                  { class: "row-actions" },
                  ...arrowBtns(m.tracks, i, drawList),
                  h("button", {
                    type: "button",
                    class: "btn sm danger",
                    text: "حذف",
                    onclick: () => {
                      if (!confirm("حذف هذا المقطع؟")) return;
                      m.tracks.splice(i, 1);
                      if (m.active === t.id) m.active = m.tracks[0] ? m.tracks[0].id : "";
                      markDirty();
                      drawList();
                    }
                  })
                )
              );
            })
          : [h("p", { class: "muted", text: "لا توجد مقاطع. ارفع ملف MP3." })])
      );
    };
    drawList();
    main.append(
      card(
        "الموسيقى الخلفية",
        "المتصفحات لا تسمح بتشغيل الصوت قبل أن يضغط الزائر. لذلك تظهر شاشة ترحيب بزر «ادخل» يبدأ معه تشغيل الموسيقى بهدوء. وإن أطفأت شاشة الترحيب، تبدأ الموسيقى عند أول لمسة للزائر في الصفحة.",
        check("تشغيل الموسيقى على الموقع", m, "enabled"),
        check("شاشة الترحيب عند فتح الموقع", site.intro, "enabled"),
        tri("جملة شاشة الترحيب", site.intro, "text", { max: 120 }),
        h("div", { class: "field" }, h("span", { text: "مستوى الصوت عند التشغيل" }), h("div", { class: "row-actions" }, vol, volTxt))
      ),
      card(
        "المقاطع",
        "اختر المقطع الذي يُشغَّل بالضغط على الدائرة بجانبه. الملف MP3 أو M4A، حتى 25 MB. استخدم فقط موسيقى تملك حق استخدامها (من إنتاجكم، أو مرخّصة، أو مجانية الحقوق)، فالأغاني المعروفة محمية ولا يجوز وضعها على موقع تجاري.",
        list,
        uploadBtn("audio", "+ رفع مقطع موسيقى", "audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a", (url, f) => {
          const t = { id: newId("track"), title: f.name.replace(/\.[^.]+$/, "").slice(0, 80), src: url };
          m.tracks.push(t);
          if (!m.active || m.tracks.length === 1) m.active = t.id;
          markDirty();
          drawList();
        })
      )
    );
  }

  /* ------------------------------------------------------------ services */
  function renderServices(main) {
    const list = h("div", { class: "list" });
    const draw = () =>
      list.replaceChildren(
        ...site.services.map((s, i) =>
          h(
            "div",
            { class: "row-item" + (s.hidden ? " is-hidden" : "") },
            h("span", { class: "ico-box", html: iconSvg(s.icon) }),
            h("div", { class: "t" }, h("b", { text: tx(s.name) }), h("small", { text: s.hidden ? "مخفية" : tx(s.short) || "" })),
            h(
              "div",
              { class: "row-actions" },
              ...arrowBtns(site.services, i, draw),
              h("button", { type: "button", class: "btn sm", text: "تعديل", onclick: () => editService(s) })
            )
          )
        )
      );
    draw();
    main.append(
      card(
        "الخدمات",
        "تظهر الخدمات حول الشعار المتحرك وفي قسم «خدماتنا». الضغط على أي خدمة يفتح بطاقتها. الترتيب هنا هو ترتيبها في الموقع.",
        list,
        h("button", {
          type: "button",
          class: "btn",
          text: "+ خدمة جديدة",
          disabled: site.services.length >= 16,
          onclick: () => {
            const s = { id: newId("srv"), icon: "star", name: {}, short: {}, desc: {}, points: [] };
            site.services.push(s);
            markDirty();
            editService(s, true);
          }
        })
      )
    );
  }
  function editService(s, isNew) {
    const original = clone(s);
    editor(
      isNew ? "خدمة جديدة" : "تعديل خدمة",
      (redraw) => [
        h(
          "div",
          { class: "field" },
          h("span", { text: "الأيقونة" }),
          h(
            "div",
            { class: "row-actions wrap" },
            ...Object.entries(ICON_NAMES).map(([k, l]) =>
              h("button", {
                type: "button",
                class: "btn sm" + (s.icon === k ? " primary" : ""),
                title: l,
                "aria-label": l,
                "aria-pressed": String(s.icon === k),
                html: iconSvg(k),
                onclick: () => {
                  s.icon = k;
                  markDirty();
                  redraw();
                }
              })
            )
          )
        ),
        tri("اسم الخدمة", s, "name", { max: 60 }),
        tri("اسم قصير (يظهر حول الشعار)", s, "short", { max: 24, help: "كلمة أو كلمتان. إن تركته فارغًا يظهر الاسم الكامل." }),
        tri("الوصف", s, "desc", { area: true, rows: 3, max: 700 }),
        h(
          "div",
          { class: "field" },
          h("span", { text: "ماذا تشمل الخدمة (نقاط)" }),
          ...s.points.map((p, i) =>
            h(
              "div",
              { class: "card" },
              tri(`النقطة ${i + 1}`, s.points, i, { max: 120 }),
              h("button", {
                type: "button",
                class: "btn sm danger",
                text: "حذف النقطة",
                onclick: () => {
                  s.points.splice(i, 1);
                  markDirty();
                  redraw();
                }
              })
            )
          ),
          h("button", {
            type: "button",
            class: "btn sm",
            text: "+ نقطة",
            disabled: s.points.length >= 8,
            onclick: () => {
              s.points.push({});
              markDirty();
              redraw();
            }
          })
        ),
        check("إخفاء الخدمة من الموقع", s, "hidden"),
        h("button", {
          type: "button",
          class: "btn danger",
          text: "حذف الخدمة",
          onclick: () => {
            if (!confirm("حذف هذه الخدمة؟ الأعمال المرتبطة بها تبقى بلا تصنيف.")) return;
            site.services.splice(site.services.indexOf(s), 1);
            site.works.forEach((w) => {
              if (w.cat === s.id) w.cat = "";
            });
            markDirty();
            $("dialog.ed .ed-foot .btn").click();
          }
        })
      ],
      () => {
        const i = site.services.indexOf(s);
        if (i < 0) return; // deleted inside the editor
        if (isNew && !tx(s.name)) {
          site.services.splice(i, 1);
          markDirty();
          toast("لم تُضف الخدمة لأنها بلا اسم.", true);
        } else if (!tx(s.name)) {
          Object.assign(s, original);
          toast("الاسم لا يمكن أن يكون فارغًا، فأعدنا الاسم السابق.", true);
        }
      }
    );
  }

  /* ------------------------------------------------------------ works */
  function renderWorks(main) {
    const list = h("div", { class: "list" });
    const cat = (id) => tx((site.services.find((s) => s.id === id) || {}).name) || "بدون تصنيف";
    const draw = () =>
      list.replaceChildren(
        ...(site.works.length
          ? site.works.map((w, i) =>
              h(
                "div",
                { class: "row-item" + (w.hidden ? " is-hidden" : "") },
                h("img", { src: src(w.img), alt: "" }),
                h(
                  "div",
                  { class: "t" },
                  h("b", { text: tx(w.title) || "(بدون عنوان)" }),
                  h("small", { text: `${TYPES[w.type].split(" (")[0]} · ${cat(w.cat)}${w.hidden ? " · مخفي" : ""}` })
                ),
                h(
                  "div",
                  { class: "row-actions" },
                  ...arrowBtns(site.works, i, draw),
                  h("button", { type: "button", class: "btn sm", text: "تعديل", onclick: () => editWork(w) })
                )
              )
            )
          : [h("p", { class: "muted", text: "لا توجد أعمال بعد." })])
      );
    draw();
    main.append(
      card(
        "الأعمال",
        "صور وفيديوهات وروابط من أعمال الاستوديو. الفيديو المرفوع حتى 95 MB (MP4). للفيديوهات الأطول ارفعها على YouTube وأضف رابطها هنا. الأعمال التي تبدأ بـ«نموذج» مؤقتة؛ احذفها عند إضافة الأعمال الحقيقية.",
        list,
        h("button", {
          type: "button",
          class: "btn",
          text: "+ عمل جديد",
          disabled: site.works.length >= 150,
          onclick: () => {
            const w = { id: newId("work"), type: "image", cat: site.services[0] ? site.services[0].id : "", title: {}, img: "" };
            site.works.unshift(w);
            markDirty();
            editWork(w, true);
          }
        })
      )
    );
  }
  function editWork(w, isNew) {
    editor(
      isNew ? "عمل جديد" : "تعديل عمل",
      (redraw) => {
        const kids = [
          select("نوع العمل", w, "type", Object.entries(TYPES), () => redraw()),
          select("الخدمة (التصنيف)", w, "cat", [["", "بدون تصنيف"], ...site.services.map((s) => [s.id, tx(s.name)])]),
          tri("العنوان", w, "title", { max: 100 }),
          imagePicker(
            w.type === "image" ? "الصورة" : "صورة الغلاف",
            w,
            "img",
            null,
            w.type === "image" ? null : "اختيارية، لكنها تجعل المعرض أجمل."
          )
        ];
        if (w.type === "video") {
          const vid = w.video
            ? h("video", { src: w.video, controls: true, preload: "metadata", class: "vid-prev" })
            : h("p", { class: "muted", text: "لم يُرفع فيديو بعد." });
          kids.push(
            h(
              "div",
              { class: "field" },
              h("span", { text: "ملف الفيديو (MP4 أو WebM، حتى 95 MB)" }),
              vid,
              uploadBtn("video", w.video ? "استبدال الفيديو" : "رفع فيديو", "video/mp4,video/webm,.mp4,.webm,.mov", (url) => {
                w.video = url;
                markDirty();
                redraw();
              }),
              h("small", {
                class: "help",
                text: "إن كان الفيديو أكبر، صدّره بدقة 1080p أو ارفعه على YouTube واختر النوع «فيديو من YouTube»."
              })
            )
          );
        }
        if (w.type === "youtube")
          kids.push(
            field("رابط الفيديو على YouTube", w, "youtube", {
              dir: "ltr",
              ph: "https://www.youtube.com/watch?v=…",
              help: "يقبل روابط الفيديو والـShorts. لا يُحمَّل شيء من YouTube إلا إذا ضغط الزائر «تشغيل»."
            })
          );
        if (w.type === "link")
          kids.push(
            field("الرابط", w, "url", {
              dir: "ltr",
              ph: "https://www.instagram.com/p/…",
              help: "رابط منشور على إنستغرام أو تيك توك أو فيسبوك أو أي موقع. يجب أن يبدأ بـ https://"
            })
          );
        kids.push(
          check("إخفاء العمل من الموقع", w, "hidden"),
          h("button", {
            type: "button",
            class: "btn danger",
            text: "حذف العمل",
            onclick: () => {
              if (!confirm("حذف هذا العمل؟")) return;
              site.works.splice(site.works.indexOf(w), 1);
              markDirty();
              $("dialog.ed .ed-foot .btn").click();
            }
          })
        );
        return kids;
      },
      () => {
        const i = site.works.indexOf(w);
        if (i < 0) return;
        const ok =
          w.type === "image"
            ? !!w.img
            : w.type === "video"
              ? !!w.video
              : w.type === "youtube"
                ? !!(w.youtube || "").trim()
                : /^https:\/\//.test(w.url || "");
        if (!ok && isNew) {
          site.works.splice(i, 1);
          markDirty();
          toast("لم يُضف العمل لأنه بلا ملف أو رابط.", true);
        } else if (!ok) toast("هذا العمل ناقص (صورة أو فيديو أو رابط). أكمله قبل الحفظ.", true);
      }
    );
  }

  /* ------------------------------------------------------------ about */
  function renderAbout(main) {
    const a = site.about;
    const stats = h("div", { class: "list" });
    const drawStats = () =>
      stats.replaceChildren(
        ...a.stats.map((s, i) =>
          h(
            "div",
            { class: "card" },
            field("الرقم (مثل 500+ أو 10)", s, "value", { max: 12, dir: "ltr" }),
            tri("الوصف", s, "label", { max: 40 }),
            h("button", {
              type: "button",
              class: "btn sm danger",
              text: "حذف",
              onclick: () => {
                a.stats.splice(i, 1);
                markDirty();
                drawStats();
              }
            })
          )
        ),
        h("button", {
          type: "button",
          class: "btn sm",
          text: "+ رقم",
          disabled: a.stats.length >= 4,
          onclick: () => {
            a.stats.push({ value: "", label: {} });
            markDirty();
            drawStats();
          }
        })
      );
    const links = h("div", { class: "list" });
    const drawLinks = () =>
      links.replaceChildren(
        ...a.links.map((l, i) =>
          h(
            "div",
            { class: "card" },
            tri("اسم الزر", l, "label", { max: 50 }),
            field("الرابط (https://…)", l, "url", { dir: "ltr" }),
            h("button", {
              type: "button",
              class: "btn sm danger",
              text: "حذف",
              onclick: () => {
                a.links.splice(i, 1);
                markDirty();
                drawLinks();
              }
            })
          )
        ),
        h("button", {
          type: "button",
          class: "btn sm",
          text: "+ رابط",
          disabled: a.links.length >= 6,
          onclick: () => {
            a.links.push({ label: {}, url: "" });
            markDirty();
            drawLinks();
          }
        })
      );
    drawStats();
    drawLinks();
    main.append(
      card(
        "السيرة الذاتية",
        "قسم «من نحن» في الموقع. كل سطر جديد في النص يصبح فقرة. الصورة الشخصية تظهر في إطار دائري ذهبي.",
        tri("العنوان", a, "title", { max: 80 }),
        tri("المسمّى المهني (افصل بين الصفات بالعلامة |)", a, "role", { max: 160 }),
        tri("نبذة قصيرة (تظهر أولاً)", a, "short", {
          area: true,
          rows: 3,
          max: 700,
          help: "تظهر في الموقع أولاً، وتحتها زر «اقرأ السيرة الكاملة». إن تركتها فارغة يظهر النص الكامل مباشرة."
        }),
        tri("السيرة الكاملة", a, "text", { area: true, rows: 9, max: 3000 }),
        imagePicker("صورة شخصية أو صورة للاستوديو", a, "photo", null, "إن لم توجد صورة يظهر الشعار.")
      ),
      card("أرقام (اختياري)", "مثل: سنوات الخبرة، عدد الحفلات، عدد العملاء. اكتب أرقامًا حقيقية فقط. القسم لا يظهر إن كان فارغًا.", stats),
      card("روابط إضافية (اختياري)", "مثل: قناة YouTube، ملف أعمال PDF، مقابلة صحفية.", links)
    );
  }

  /* ------------------------------------------------------------ contact & socials */
  function renderContact(main) {
    while (site.phones.length < 3) site.phones.push("");
    const phones = site.phones.map((p, i) => field(`رقم هاتف ${i + 1}`, site.phones, i, { dir: "ltr", inputmode: "tel", max: 30 }));
    main.append(
      card(
        "التواصل",
        null,
        field("رقم الواتساب (أرقام فقط مع رمز الدولة، بدون + أو 00)", site, "whatsapp", {
          dir: "ltr",
          inputmode: "numeric",
          ph: "436766662827",
          help: "مثال: الرقم ‎+43 676 6662827 يُكتب 436766662827"
        }),
        ...phones,
        field("الإيميل", site, "email", { dir: "ltr", type: "email" }),
        tri("المدينة", site, "city", { max: 60 }),
        select("لغة الرسائل التي تصلكم من الموقع", site, "messageLang", [
          ["ar", "العربية"],
          ["de", "الألمانية"],
          ["en", "الإنجليزية"]
        ])
      ),
      card(
        "منصات التواصل الاجتماعي",
        "تظهر كأيقونات على يسار الموقع وفي أسفله. الحقل الفارغ لا يظهر. انسخ الرابط الكامل من التطبيق.",
        field("YouTube", site.social, "youtube", { dir: "ltr", ph: "https://www.youtube.com/@…" }),
        field("Facebook", site.social, "facebook", { dir: "ltr", ph: "https://www.facebook.com/…" }),
        field("Instagram", site.social, "instagram", { dir: "ltr", ph: "https://www.instagram.com/…" }),
        field("TikTok", site.social, "tiktok", { dir: "ltr", ph: "https://www.tiktok.com/@…" })
      )
    );
  }

  /* ------------------------------------------------------------ texts & SEO */
  function renderTexts(main) {
    main.append(
      card(
        "الاسم والعناوين",
        null,
        h(
          "div",
          { class: "grid2" },
          field("الاسم بالإنجليزية", site, "name", { dir: "ltr", max: 50 }),
          field("الاسم بالعربية", site, "nameAr", { max: 50 })
        ),
        tri("الجملة تحت الاسم (وعنوان الصفحة في Google)", site, "tagline", { max: 120 }),
        tri("النص التعريفي في أعلى الموقع", site, "heroSub", { area: true, rows: 2, max: 240 }),
        select("لغة الموقع الافتراضية", site, "defaultLang", [
          ["de", "الألمانية"],
          ["ar", "العربية"],
          ["en", "الإنجليزية"]
        ])
      ),
      card(
        "Google (SEO)",
        "الوصف يظهر تحت اسم الموقع في نتائج البحث (حتى 160 حرفًا). الكلمات المفتاحية تُكتب مفصولة بفواصل.",
        tri("وصف Google", site, "seoDesc", { area: true, rows: 2, max: 160 }),
        tri("الكلمات المفتاحية", site, "keywords", { area: true, rows: 2, max: 400 })
      ),
      card(
        "ملاحظة النسخة التجريبية",
        "تظهر أسفل الموقع. احذف النص من اللغات الثلاث عند التسليم النهائي.",
        tri("الملاحظة", site, "demoNote", { max: 200 })
      )
    );
  }

  /* ------------------------------------------------------------ legal */
  function renderLegal(main) {
    const L = site.legal;
    const f = (label, key, help) => field(label, L, key, { dir: "ltr", max: 160, help });
    main.append(
      card(
        "Impressum (إلزامي في النمسا)",
        "هذه البيانات تبني صفحتي Impressum وسياسة الخصوصية تلقائيًا. الحقول الناقصة تظهر بالأحمر في الصفحة.",
        f("اسم الشركة", "company"),
        f("اسم المالك أو المدير", "owner"),
        f("الشكل القانوني (مثل Einzelunternehmen)", "legalForm"),
        f("النشاط (Unternehmensgegenstand)", "trade"),
        f("العنوان الكامل", "address"),
        f("الهاتف", "phone"),
        f("الإيميل", "email"),
        f("UID-Nummer (إن وجد)", "uid"),
        f("رقم السجل التجاري (إن وجد)", "registerNo"),
        f("محكمة السجل (إن وجد)", "registerCourt"),
        f("GISA-Zahl", "gisa"),
        f("عضوية الغرفة (مثل WKO Wien)", "chamber"),
        f("الجهة الرقابية (مثل Magistratisches Bezirksamt)", "authority")
      )
    );
  }

  /* ------------------------------------------------------------ security */
  function renderSecurity(main) {
    const cur = h("input", { class: "in", type: "password", autocomplete: "current-password", "aria-label": "كلمة السر الحالية" });
    const n1 = h("input", {
      class: "in",
      type: "password",
      autocomplete: "new-password",
      minlength: 10,
      "aria-label": "كلمة السر الجديدة"
    });
    const n2 = h("input", { class: "in", type: "password", autocomplete: "new-password", minlength: 10, "aria-label": "تأكيد كلمة السر" });
    const err = h("p", { class: "err", role: "alert", hidden: true });
    main.append(
      card(
        "تغيير كلمة السر",
        "بعد التغيير يُسجَّل الخروج من كل الأجهزة الأخرى. استخدم 10 أحرف على الأقل.",
        h("label", { class: "field" }, h("span", { text: "كلمة السر الحالية" }), cur),
        h("label", { class: "field" }, h("span", { text: "كلمة السر الجديدة" }), n1),
        h("label", { class: "field" }, h("span", { text: "أعد كتابة الجديدة" }), n2),
        err,
        h("button", {
          type: "button",
          class: "btn primary",
          text: "تغيير كلمة السر",
          onclick: async () => {
            err.hidden = true;
            if (n1.value !== n2.value) {
              err.hidden = false;
              err.textContent = "كلمتا السر الجديدتان غير متطابقتين.";
              return;
            }
            try {
              await api("password", { method: "POST", body: JSON.stringify({ current: cur.value, next: n1.value }) });
              cur.value = n1.value = n2.value = "";
              toast("تم تغيير كلمة السر.");
            } catch (e) {
              err.hidden = false;
              err.textContent = errText(e);
            }
          }
        })
      ),
      card(
        "نسخة احتياطية",
        "نزّل نسخة من كل نصوص الموقع وإعداداته واحفظها عندك (مرة كل شهر مثلًا). الصور والفيديوهات نفسها لا تدخل في الملف، تبقى محفوظة في Cloudflare.",
        h(
          "div",
          { class: "btn-row" },
          h("button", {
            type: "button",
            class: "btn",
            text: "تنزيل نسخة احتياطية",
            onclick: () => {
              const blob = new Blob([JSON.stringify(site, null, 2)], { type: "application/json" });
              const a = h("a", {
                href: URL.createObjectURL(blob),
                download: `nour-eddin-backup-${new Date().toISOString().slice(0, 10)}.json`
              });
              document.body.append(a);
              a.click();
              setTimeout(() => {
                URL.revokeObjectURL(a.href);
                a.remove();
              }, 1000);
            }
          }),
          h("button", {
            type: "button",
            class: "btn",
            text: "استعادة من نسخة",
            onclick: (e) => e.currentTarget.nextElementSibling.click()
          }),
          h("input", {
            type: "file",
            accept: "application/json,.json",
            hidden: true,
            "aria-label": "ملف النسخة الاحتياطية",
            onchange: async (e) => {
              const f = e.target.files[0];
              e.target.value = "";
              if (!f) return;
              try {
                if (f.size > 512 * 1024) throw new Error("big");
                const data = JSON.parse(await f.text());
                if (!data || !Array.isArray(data.services) || !data.music) throw new Error("bad");
                site = data;
                render();
                markDirty();
                toast("تم تحميل النسخة. راجعها ثم اضغط «حفظ» لنشرها على الموقع.");
              } catch {
                toast("هذا الملف ليس نسخة احتياطية صالحة لهذا الموقع.", true);
              }
            }
          })
        )
      ),
      card(
        "تسجيل الخروج",
        null,
        h("button", {
          type: "button",
          class: "btn",
          text: "خروج",
          onclick: async () => {
            try {
              await api("logout", { method: "POST" });
            } catch {
              /* ignore */
            }
            site = null;
            saved = "";
            showGate();
          }
        })
      )
    );
  }

  boot();
})();
