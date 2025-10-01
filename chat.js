(function () {
  const rootId = "chat-root";

  // ensure a root exists even when LS doesn't load index.html
  let existing = document.getElementById(rootId);
  if (!existing) {
    existing = document.createElement("div");
    existing.id = rootId;
    existing.className = "chat-container";
    document.body.appendChild(existing);
  }

  // inject minimal CSS so we don’t depend on styles.css
  const style = document.createElement("style");
  style.textContent = `
    .chat-container{box-sizing:border-box;width:100%;height:100%;padding:12px;background:#0f1115;color:#e9eef7;overflow:auto;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    .chat{display:flex;flex-direction:column;gap:8px}
    .bubble{max-width:520px;padding:10px 12px;border-radius:18px;line-height:1.35;word-break:break-word;white-space:pre-wrap;box-shadow:0 1px 2px rgba(0,0,0,.22)}
    .left{align-self:flex-start;background:#eaf2ff;color:#0b2142}
    .right{align-self:flex-end;background:#fff5cc;color:#3a2b00}
    .center{align-self:center;background:#eaf7ee;color:#12351c}
    .meta{font-size:11px;opacity:.65;margin-bottom:4px;display:flex;gap:8px}
    .meta .sender{font-weight:600}
  `;
  document.head.appendChild(style);

  const roleFromSender = (sender) => {
    if (!sender) return "left";
    const s = String(sender).toLowerCase();
    if (s.includes("agent") || s.includes("support") || s.includes("herocare")) return "right";
    if (s.includes("system") || s.includes("bot")) return "center";
    return "left"; // default customer/stakeholder
  };

  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fmtTime = (ts) => {
    try {
      const d = new Date(ts);
      if (!isNaN(d)) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return String(ts);
    } catch {
      return String(ts);
    }
  };

  const draw = (data) => {
    const el = document.getElementById(rootId);
    if (!el) return;
    el.innerHTML = "";

    const rows = (data && data.tables && (data.tables.DEFAULT || data.tables.default)) || [];
    const keys = rows[0] ? Object.keys(rows[0]) : [];
    let tsKey = keys[0], senderKey = keys[1], msgKey = keys[2];

    // sort by timestamp if possible
    const sorted = rows.slice().sort((a, b) => {
      const A = new Date(a[tsKey]);
      const B = new Date(b[tsKey]);
      if (!isNaN(A) && !isNaN(B)) return A - B;
      return 0;
    });

    const wrapper = document.createElement("div");
    wrapper.className = "chat";

    sorted.forEach((r) => {
      const ts = r[tsKey];
      const sender = r[senderKey];
      const msg = r[msgKey];

      const role = roleFromSender(sender);
      const bubble = document.createElement("div");
      bubble.className = `bubble ${role}`;

      bubble.innerHTML = `
        <div class="meta">
          <span class="ts">${safe(fmtTime(ts))}</span>
          <span class="sender">${safe(sender)}</span>
        </div>
        <div class="msg">${safe(msg)}</div>
      `;

      wrapper.appendChild(bubble);
    });

    el.appendChild(wrapper);
  };

  if (window.dscc && window.dscc.subscribeToData) {
    window.dscc.subscribeToData(draw, { transform: window.dscc.tableTransform });
  } else {
    document.getElementById(rootId).textContent = "Waiting for Looker Studio data…";
  }
})();
