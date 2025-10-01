// Looker Studio injects `dscc` into the iframe automatically.
// We subscribe to table data and render a chat-like layout.

(function () {
  const rootId = "chat-root";

  const roleFromSender = (sender) => {
    if (!sender) return "left";
    const s = String(sender).toLowerCase();
    if (s.includes("agent") || s.includes("support") || s.includes("herocare")) return "right";
    if (s.includes("system") || s.includes("bot")) return "center";
    return "left"; // customer/stakeholder by default
  };

  const safe = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fmtTime = (ts) => {
    // Works with Date, ISO string, or raw text fallback
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

    // dscc.tableTransform shape:
    // data.tables.DEFAULT = [{ <fieldId>: value, <fieldId2>: value2, ... }, ...]
    const rows = (data && data.tables && (data.tables.DEFAULT || data.tables.default)) || [];

    // Gather dimension field IDs in the order the user adds them:
    // We expect [timestamp, sender, message]
    const dimOrder = (data && data.fields && (data.fields.dimensions || data.fields.dimensionDescriptors)) || [];
    const keys = rows[0] ? Object.keys(rows[0]) : [];

    // Fallback: assume first 3 keys correspond to ts/sender/message if we can't read descriptors
    let tsKey = keys[0], senderKey = keys[1], msgKey = keys[2];

    // If field descriptors are present, prefer them (first three dimensions)
    try {
      if (dimOrder.length >= 3) {
        tsKey = dimOrder[0].id || tsKey;
        senderKey = dimOrder[1].id || senderKey;
        msgKey = dimOrder[2].id || msgKey;
      }
    } catch (_) {}

    // Sort ascending by timestamp if possible
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

  // Subscribe using the table transform (the platform injects `dscc`)
  // If `dscc` is not present, fail silently (useful when testing outside LS).
  if (window.dscc && window.dscc.subscribeToData) {
    window.dscc.subscribeToData(draw, { transform: window.dscc.tableTransform });
  } else {
    // Optional local testing: render a tiny placeholder
    const el = document.getElementById(rootId);
    if (el) el.textContent = "Waiting for Looker Studio data…";
  }
})();
