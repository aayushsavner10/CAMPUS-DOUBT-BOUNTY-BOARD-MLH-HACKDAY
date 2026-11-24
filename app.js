"use strict";

/* ============================================================
   Campus Peer-to-Peer Micro-Skill and Doubt Bounty Board
   - USP: The Campus Knowledge Vault (Searchable Library of Doubts & Solutions)
   - Real-time Duplicate Bug Radar in Post Modal
   - Complete Student Dashboard with KPIs, Badges & Activity
   - Dedicated "My Solvers & Peer Reviews" section with ratings
   - Optional video call (written solutions & chat prioritized)
   - Multi-photo attachment for doubts, solutions, and chat
   - Two-way handshake & meeting scheduling
   - 15-minute live problem solving countdown
   ============================================================ */

const STORAGE_KEY = "doubtbounty_v9";
const MAX_MSG_CHARS = 1000;
const MAX_IMAGE_EDGE = 550; // Max edge for reliable ~30KB storage in localStorage
const IMAGE_QUALITY = 0.62;
const SESSION_MS = 15 * 60 * 1000; // 15-minute live session
const MAX_SKILLS = 10;

function getDayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const URG = {
  low:    { label: "Low",           w: 1, class: "urg-low" },
  medium: { label: "Medium",        w: 2, class: "urg-med" },
  high:   { label: "High",          w: 3, class: "urg-high" },
  exam:   { label: "Exam tomorrow", w: 4, class: "urg-exam" }
};

const STATUS_ORDER = { open: 0, proposed: 1, scheduled: 2, claimed: 3, resolved: 4 };
const AV_COLORS = ["#e3ede6", "#e1e6f0", "#f4e3e5", "#f1e5c4", "#e9e4f0", "#dce9ea"];

/* ---------- State Management ---------- */
function seedState() {
  const now = Date.now();
  const min = 60000;
  return {
    currentUserId: 1,
    nextId: 100,
    students: SAMPLE_STUDENTS.map(s => {
      const history = {};
      if (s.solveOffsets) {
        for (const [offsetStr, count] of Object.entries(s.solveOffsets)) {
          history[getDayKey(Number(offsetStr))] = count;
        }
      } else {
        history[getDayKey(0)] = 2;
        history[getDayKey(-1)] = 1;
      }
      return {
        ...s,
        skills: [...s.skills],
        solveHistory: history,
        allTimeSolved: s.allTimeSolved || s.sessions || 12,
        monthSolved: s.monthSolved || Math.round((s.sessions || 10) * 0.6)
      };
    }),
    doubts: SAMPLE_DOUBTS.map(d => ({
      ...d,
      tags: [...d.tags],
      department: d.department || "General",
      upvotes: d.upvotes || Math.floor(Math.random() * 15) + 3,
      postedAt: now - d.postedMinAgo * min,
      claimedAt: d.claimedMinAgo != null ? now - d.claimedMinAgo * min : null,
      resolvedAt: d.resolvedMinAgo != null ? now - d.resolvedMinAgo * min : null,
      rating: d.rating || null,
      feedback: d.feedback || "",
      scheduledTime: d.scheduledTime || null,
      helpMode: d.helpMode || "written",
      proposal: d.proposal ? {
        ...d.proposal,
        proposedAt: now - (d.proposal.proposedAtMinAgo || 5) * min
      } : null,
      solution: d.solution ? {
        ...d.solution,
        submittedAt: now - (d.solution.submittedAtMinAgo || 5) * min,
        images: d.solution.images || []
      } : null,
      meetLink: d.meetLink || null,
      images: d.images || (d.image ? [d.image] : []),
      messages: (SAMPLE_MESSAGES[d.id] || []).map((m, i) => ({
        id: "msg-" + d.id + "-" + i,
        by: m.by,
        text: m.text,
        images: m.images || (m.image ? [m.image] : []),
        at: now - m.minAgo * min
      }))
    }))
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.students && parsed.students.length) {
        parsed.students.forEach(s => {
          if (!s.solveHistory) {
            const sample = SAMPLE_STUDENTS.find(x => x.id === s.id);
            const history = {};
            if (sample && sample.solveOffsets) {
              for (const [offsetStr, count] of Object.entries(sample.solveOffsets)) {
                history[getDayKey(Number(offsetStr))] = count;
              }
            } else {
              history[getDayKey(0)] = 2;
            }
            s.solveHistory = history;
            s.allTimeSolved = s.allTimeSolved || (sample ? sample.allTimeSolved : s.sessions) || 15;
            s.monthSolved = s.monthSolved || (sample ? sample.monthSolved : 8) || 8;
          }
        });
      }
      return parsed;
    }
  } catch (e) {
    console.warn("Storage load error, falling back to seed data", e);
  }
  return seedState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error("Storage full or unavailable", e);
    return false;
  }
}

let state = loadState();

// UI ephemeral states
const ui = {
  tab: "dashboard",
  drafts: {},
  chatPendingImages: {},       // { [doubtId]: [base64_1, base64_2, ...] }
  postPendingImages: [],        // [base64_1, base64_2, ...] for new doubt
  solutionPendingImages: [],    // [base64_1, base64_2, ...] for solution form
  vaultSearch: "",
  vaultDept: "All",
  activeProposingDoubtId: null,
  activeSolutionDoubtId: null
};

/* ---------- Utility Helpers ---------- */
const $ = sel => document.querySelector(sel);
const norm = t => String(t).trim().toLowerCase();
const student = id => state.students.find(s => s.id === id) || { name: "Unknown", branch: "Campus", rating: 4.5, skills: [] };
const me = () => student(state.currentUserId);

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function timeAgo(ts) {
  if (!ts) return "recently";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.floor(h / 24);
  return d + (d === 1 ? " day ago" : " days ago");
}

const initials = name => (name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const avatar = (s, size = "") =>
  `<span class="avatar ${size}" style="background:${AV_COLORS[(s.id || 1) % AV_COLORS.length]}" title="${esc(s.name)}">${esc(initials(s.name))}</span>`;
const stars = n => "★".repeat(Math.round(n || 5)) + "☆".repeat(5 - Math.round(n || 5));

function knownSkills() {
  const map = {};
  state.students.forEach(s => s.skills.forEach(sk => { map[norm(sk)] = sk; }));
  return map;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast" + (isError ? " toast-error" : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/* ---------- Image Compression (Reliable & Storage Friendly) ---------- */
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file selected."));
    if (!file.type.startsWith("image/")) return reject(new Error("Selected file is not an image."));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file from disk."));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image data."));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > MAX_IMAGE_EDGE || h > MAX_IMAGE_EDGE) {
          if (w > h) {
            h = Math.round((h * MAX_IMAGE_EDGE) / w);
            w = MAX_IMAGE_EDGE;
          } else {
            w = Math.round((w * MAX_IMAGE_EDGE) / h);
            h = MAX_IMAGE_EDGE;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        resolve(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressMultipleFiles(fileList) {
  const promises = Array.from(fileList).map(file => compressImageFile(file));
  return Promise.all(promises);
}

/* ---------- Skill Matching Algorithm ---------- */
function overlap(doubt, st) {
  const skills = (st.skills || []).map(norm);
  return (doubt.tags || []).filter(t => skills.includes(norm(t)));
}

function rankPeers(doubt) {
  return state.students
    .filter(s => s.id !== doubt.postedBy)
    .map(s => {
      const m = overlap(doubt, s);
      return { s, m, score: m.length * 10 + s.rating };
    })
    .filter(x => x.m.length > 0)
    .sort((a, b) => b.score - a.score);
}

/* ---------- Handshake & Scheduling Actions ---------- */
function openProposeModal(doubtId) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d || d.status !== "open") return;
  if (d.postedBy === state.currentUserId) {
    toast("You cannot offer to help on your own doubt.", true);
    return;
  }
  ui.activeProposingDoubtId = doubtId;
  const poster = student(d.postedBy);
  $("#proposeTargetTitle").textContent = d.title;
  $("#proposeTargetAsker").textContent = poster.name + " (" + poster.branch + ")";
  $("#proposeNote").value = "";
  $("#proposeHelpMode").value = "written";
  $("#proposeTimeSelect").value = "In 15 minutes";
  $("#customTimeWrap").hidden = true;
  $("#customTimeInput").value = "";
  $("#proposeDialog").showModal();
}

function submitProposal(helpMode, time, note) {
  const doubtId = ui.activeProposingDoubtId;
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d) return;

  d.status = "proposed";
  d.proposal = {
    helperId: state.currentUserId,
    helpMode: helpMode || "written",
    proposedTime: time,
    note: note || "Ready to share solution with step-by-step photos.",
    proposedAt: Date.now()
  };

  saveState();
  renderAll();
  $("#proposeDialog").close();
  toast("Help proposal sent! Waiting for " + student(d.postedBy).name + " to confirm.");
}

function cancelProposal(doubtId) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d || d.status !== "proposed") return;
  if (d.proposal?.helperId !== state.currentUserId) return;
  d.status = "open";
  d.proposal = null;
  saveState();
  renderAll();
  toast("Your help proposal was withdrawn.");
}

function acceptProposal(doubtId) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d || d.status !== "proposed") return;
  if (d.postedBy !== state.currentUserId) {
    toast("Only the doubt author can confirm this.", true);
    return;
  }
  const helper = student(d.proposal.helperId);
  d.status = "claimed";
  d.claimedBy = d.proposal.helperId;
  d.claimedAt = Date.now();
  d.helpMode = d.proposal.helpMode;
  d.scheduledTime = d.proposal.proposedTime;
  d.meetLink = "https://meet.jit.si/CampusDoubt-" + d.id + "-" + Math.random().toString(36).slice(2, 7);

  d.messages = d.messages || [];
  d.messages.push({
    id: "sys-" + Date.now(),
    by: d.claimedBy,
    text: d.helpMode === "written"
      ? "📝 Connected! " + helper.name + " is preparing a written solution with photos/steps below."
      : "💬 Connected! 15-minute live help session active. Video call is optional if screen-share is needed.",
    images: [],
    at: Date.now()
  });

  saveState();
  renderAll();
  toast("Help proposal accepted! You can now exchange text, multiple photos, or join the optional video room.");
}

function declineProposal(doubtId) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d || d.status !== "proposed") return;
  if (d.postedBy !== state.currentUserId) return;
  d.status = "open";
  d.proposal = null;
  saveState();
  renderAll();
  toast("Proposal declined. Doubt is reopened to the campus board.");
}

/* ---------- Dedicated Written Solution Submission ---------- */
function openSolutionModal(doubtId) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d) return;
  ui.activeSolutionDoubtId = doubtId;
  ui.solutionPendingImages = [];
  $("#solDoubtTitle").textContent = d.title;
  $("#solText").value = d.solution ? d.solution.text : "";
  renderSolutionImagesPreview();
  $("#solutionDialog").showModal();
}

function renderSolutionImagesPreview() {
  const wrap = $("#solImgPreviewWrap");
  if (!ui.solutionPendingImages.length) {
    wrap.innerHTML = "";
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  wrap.innerHTML = ui.solutionPendingImages.map((src, idx) => `
    <div class="thumb-card">
      <img src="${src}" alt="Solution photo ${idx + 1}" data-action="view-image" data-src="${src}" />
      <button type="button" class="btn-remove-thumb" data-action="remove-sol-photo" data-idx="${idx}">×</button>
    </div>
  `).join("");
}

function submitWrittenSolution(text) {
  const doubtId = ui.activeSolutionDoubtId;
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d) return;

  const images = [...ui.solutionPendingImages];
  d.solution = {
    by: state.currentUserId,
    text: text.trim(),
    images: images,
    submittedAt: Date.now()
  };

  d.messages = d.messages || [];
  d.messages.push({
    id: "sol-msg-" + Date.now(),
    by: state.currentUserId,
    text: "💡 [Submitted Written Solution]:\n" + text.trim(),
    images: images,
    at: Date.now()
  });

  if (!saveState()) {
    toast("Browser storage is full. Please remove some photos.", true);
    return;
  }

  ui.solutionPendingImages = [];
  $("#solutionDialog").close();
  renderAll();
  toast("Written solution and photos submitted! Asker has been notified to review and award bounty.");
}

function resolveDoubt(id, ratingOverride, feedbackOverride) {
  const d = state.doubts.find(x => x.id === id);
  if (!d || d.status !== "claimed") return;
  if (d.postedBy !== state.currentUserId) {
    toast("Only the student who asked can mark this doubt solved.", true);
    return;
  }
  const ratingEl = document.getElementById("rate-" + id);
  const rating = ratingOverride || (ratingEl ? Number(ratingEl.value) : 5);
  const feedback = feedbackOverride || "";

  const helper = student(d.claimedBy);
  helper.points += d.bounty;
  helper.rating = Math.round(((helper.rating * helper.sessions + rating) / (helper.sessions + 1)) * 10) / 10;
  helper.sessions += 1;

  // Track Streak & Question Solving metrics
  const todayKey = getDayKey(0);
  helper.solveHistory = helper.solveHistory || {};
  helper.solveHistory[todayKey] = (helper.solveHistory[todayKey] || 0) + 1;
  helper.allTimeSolved = (helper.allTimeSolved || 0) + 1;
  helper.monthSolved = (helper.monthSolved || 0) + 1;

  d.status = "resolved";
  d.resolvedAt = Date.now();
  d.rating = rating;
  d.feedback = feedback;
  d.upvotes = d.upvotes || 1;
  saveState();
  renderAll();
  toast("Doubt solved & automatically indexed into the Campus Knowledge Vault! +" + d.bounty + " Pts awarded.");
}

function simulateSolveDoubt(studentId) {
  const s = student(studentId || state.currentUserId);
  if (!s) return;
  const todayKey = getDayKey(0);
  s.solveHistory = s.solveHistory || {};
  s.solveHistory[todayKey] = (s.solveHistory[todayKey] || 0) + 1;
  s.allTimeSolved = (s.allTimeSolved || 0) + 1;
  s.monthSolved = (s.monthSolved || 0) + 1;
  s.points += 25;
  saveState();
  renderAll();
  toast(`🔥 Solved 1 doubt! Streak updated (Today: ${s.solveHistory[todayKey]} solved).`);
}

function updateSolverRating(doubtId, newRating, feedbackText) {
  const d = state.doubts.find(x => x.id === doubtId);
  if (!d || d.status !== "resolved") return;
  if (d.postedBy !== state.currentUserId) {
    toast("You can only review solvers on doubts you asked.", true);
    return;
  }

  const helper = student(d.claimedBy);
  const oldRating = d.rating || 5;

  if (helper.sessions > 0) {
    const totalScore = helper.rating * helper.sessions - oldRating + newRating;
    helper.rating = Math.max(1, Math.min(5, Math.round((totalScore / helper.sessions) * 10) / 10));
  }

  d.rating = newRating;
  d.feedback = feedbackText.trim();

  saveState();
  renderAll();
  toast("Updated review to " + newRating + "★ for " + helper.name + "!");
}

function upvoteVaultDoubt(id) {
  const d = state.doubts.find(x => x.id === id);
  if (!d) return;
  d.upvotes = (d.upvotes || 0) + 1;
  saveState();
  renderVault();
  toast("👍 Upvoted! Thank you for validating this solution.");
}

function copySolutionText(id) {
  const d = state.doubts.find(x => x.id === id);
  if (!d || !d.solution) return;
  navigator.clipboard.writeText(d.solution.text).then(() => {
    toast("📋 Solution copied to clipboard!");
  }).catch(() => {
    toast("Copied solution snippet.");
  });
}

function releaseDoubt(id) {
  const d = state.doubts.find(x => x.id === id);
  if (!d || (d.status !== "claimed" && d.status !== "scheduled")) return;
  d.status = "open";
  d.claimedBy = null;
  d.claimedAt = null;
  d.meetLink = null;
  d.proposal = null;
  d.scheduledTime = null;
  delete ui.drafts[id];
  delete ui.chatPendingImages[id];
  saveState();
  renderAll();
  toast("Doubt released back to the campus board.");
}

function deleteDoubt(id) {
  const d = state.doubts.find(x => x.id === id);
  if (!d || (d.status !== "open" && d.status !== "proposed") || d.postedBy !== state.currentUserId) return;
  if (!confirm("Are you sure you want to delete this doubt from the board?")) return;
  state.doubts = state.doubts.filter(x => x.id !== id);
  saveState();
  renderAll();
  toast("Doubt deleted.");
}

function postDoubt(title, description, tagsText, urgency, bounty, images) {
  const known = knownSkills();
  const tags = [...new Set(
    tagsText.split(",").map(t => t.trim()).filter(Boolean).map(t => known[norm(t)] || t)
  )];
  state.doubts.unshift({
    id: state.nextId++,
    title,
    description,
    tags,
    department: me().branch.split(",")[0] || "General",
    urgency,
    bounty,
    status: "open",
    postedBy: state.currentUserId,
    claimedBy: null,
    postedAt: Date.now(),
    claimedAt: null,
    resolvedAt: null,
    rating: null,
    feedback: "",
    meetLink: null,
    images: images || [],
    proposal: null,
    scheduledTime: null,
    helpMode: null,
    solution: null,
    upvotes: 0,
    messages: []
  });
  saveState();
  renderAll();
  toast("Doubt posted with attached photos and bounty!");
}

function addSkill(raw) {
  const name = raw.trim();
  if (!name) return;
  const u = me();
  const skill = knownSkills()[norm(name)] || name;
  if (u.skills.map(norm).includes(norm(skill))) {
    toast("You already have " + skill + " in your skills.", true);
    return;
  }
  if (u.skills.length >= MAX_SKILLS) {
    toast("You can list up to " + MAX_SKILLS + " skills.", true);
    return;
  }
  u.skills.push(skill);
  saveState();
  renderAll();
  toast(skill + " added to your profile.");
  const input = $("#skillInput");
  if (input) { input.value = ""; input.focus(); }
}

function removeSkill(skill) {
  const u = me();
  if (u.skills.length <= 1) {
    toast("Please keep at least one skill on your profile.", true);
    return;
  }
  u.skills = u.skills.filter(s => norm(s) !== norm(skill));
  saveState();
  renderAll();
}

/* ---------- Session Chat Messaging & Photos ---------- */
function sendMessage(id) {
  const d = state.doubts.find(x => x.id === id);
  if (!d || d.status !== "claimed") return;
  if (state.currentUserId !== d.postedBy && state.currentUserId !== d.claimedBy) {
    toast("Only the asker and the helper can chat in this session.", true);
    return;
  }
  const ta = document.getElementById("msg-" + id);
  const text = (ta ? ta.value : (ui.drafts[id] || "")).trim().slice(0, MAX_MSG_CHARS);
  const images = ui.chatPendingImages[id] || [];

  if (!text && !images.length) {
    toast("Type a message or attach photos first.", true);
    return;
  }

  d.messages = d.messages || [];
  d.messages.push({
    id: "msg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    by: state.currentUserId,
    text,
    images: [...images],
    at: Date.now()
  });

  if (!saveState()) {
    d.messages.pop();
    toast("Browser storage is full. Please remove some photos.", true);
    return;
  }

  delete ui.drafts[id];
  delete ui.chatPendingImages[id];
  renderAll();
  const next = document.getElementById("msg-" + id);
  if (next) next.focus();
}

function viewImage(src, altText = "Image preview") {
  if (!src) return;
  $("#lightImg").src = src;
  $("#lightImg").alt = altText;
  $("#imgDialog").showModal();
}

function renderImageGallery(images, extraClass = "") {
  if (!images || !images.length) return "";
  return `<div class="img-gallery ${extraClass}">
    ${images.map((src, i) => `
      <div class="gallery-item">
        <img src="${src}" alt="Photo ${i + 1}" data-action="view-image" data-src="${src}" title="Click to enlarge" />
      </div>
    `).join("")}
  </div>`;
}

function messageHTML(d, m) {
  const author = student(m.by);
  const mine = m.by === state.currentUserId;
  const who = mine ? "You" : author.name;
  const images = m.images || (m.image ? [m.image] : []);
  const gallery = renderImageGallery(images, "msg-gallery");

  return `<div class="msg ${mine ? "mine" : ""}">
    <div class="msg-meta">${esc(who)} · ${timeAgo(m.at)}</div>
    <div class="bubble">
      ${m.text ? `<p class="bubble-text">${esc(m.text)}</p>` : ""}
      ${gallery}
    </div>
  </div>`;
}

function composerHTML(d) {
  const draft = ui.drafts[d.id] || "";
  const pending = ui.chatPendingImages[d.id] || [];

  const previewHtml = pending.length ? `
    <div class="composer-previews">
      ${pending.map((src, idx) => `
        <div class="thumb-card">
          <img src="${src}" alt="Pending photo ${idx + 1}" data-action="view-image" data-src="${src}" />
          <button type="button" class="btn-remove-thumb" data-action="remove-chat-photo" data-id="${d.id}" data-idx="${idx}">×</button>
        </div>
      `).join("")}
    </div>
  ` : "";

  return `<div class="composer">
    <textarea class="msg-input" id="msg-${d.id}" data-id="${d.id}" rows="2" maxlength="${MAX_MSG_CHARS}"
      placeholder="Type message, share solution steps, or paste code..." aria-label="Write a message">${esc(draft)}</textarea>
    ${previewHtml}
    <div class="composer-row">
      <button type="button" class="btn ghost sm" data-action="pick-chat-photo" data-id="${d.id}">
        📷 Attach Photos (Multiple)
      </button>
      <input type="file" id="chat-file-${d.id}" data-id="${d.id}" multiple accept="image/*" style="display:none;" />
      <span class="spacer"></span>
      <span class="composer-hint">Shift+Enter for newline</span>
      <button type="button" class="btn green sm" data-action="send-msg" data-id="${d.id}">Send Reply</button>
    </div>
  </div>`;
}

function threadHTML(d, canPost) {
  const list = d.messages || [];
  return `<div class="thread">
    <div class="thread-head">
      <span>💬 Session Chat & Solution Walkthrough</span>
      <span class="thread-count">${list.length} message${list.length === 1 ? "" : "s"}</span>
    </div>
    <div class="thread-list">${list.length
      ? list.map(m => messageHTML(d, m)).join("")
      : `<p class="thread-empty">No messages yet. Send a message or attach multiple photos of your work.</p>`}</div>
    ${canPost ? composerHTML(d) : `<div class="composer"><p class="hint">Only the asker and the helper can post in this active thread.</p></div>`}
  </div>`;
}

function solvedThreadHTML(d) {
  const list = d.messages || [];
  if (!list.length) return "";
  const photos = list.flatMap(m => m.images || (m.image ? [m.image] : [])).length;
  const label = `${list.length} message${list.length === 1 ? "" : "s"}` +
    (photos ? `, ${photos} photo${photos === 1 ? "" : "s"}` : "");
  return `<details class="thread-done">
    <summary>View past session notes & photos (${label})</summary>
    <div class="thread"><div class="thread-list">${list.map(m => messageHTML(d, m)).join("")}</div></div>
  </details>`;
}

/* ---------- Rendering: Sidebar & Profile ---------- */
function renderUserSelect() {
  $("#userSelect").innerHTML = state.students
    .map(s => `<option value="${s.id}" ${s.id === state.currentUserId ? "selected" : ""}>${esc(s.name)} (${esc(s.branch.split(",")[0])})</option>`)
    .join("");
}

function renderProfile() {
  const u = me();
  $("#profile").innerHTML = `<div class="profile-card">
    <div class="who">
      ${avatar(u, "lg")}
      <div>
        <div class="who-name">${esc(u.name)}</div>
        <div class="who-sub">${esc(u.branch)}</div>
      </div>
    </div>
    <div class="profile-section-label">Your Mentorship Skills (${u.skills.length}/${MAX_SKILLS}):</div>
    <div class="tags">${u.skills.map(k => `
      <span class="tag mine">${esc(k)}<button class="x" data-action="remove-skill" data-skill="${esc(k)}" title="Remove skill">×</button></span>`).join("")}
    </div>
    <form id="skillForm" class="skill-add">
      <input id="skillInput" list="skillList" placeholder="+ Add a skill (e.g. C++, React)" maxlength="30" aria-label="Add a skill" />
      <button class="btn ghost sm" type="submit">Add</button>
    </form>
    <div class="mini-stats">
      <div class="mini-stat">
        <span class="mini-stat-num">${u.points}</span>
        <span class="mini-stat-label">Bounty Pts</span>
      </div>
      <div class="mini-stat">
        <span class="mini-stat-num">${u.sessions}</span>
        <span class="mini-stat-label">Sessions</span>
      </div>
      <div class="mini-stat">
        <span class="mini-stat-num">★ ${u.rating.toFixed(1)}</span>
        <span class="mini-stat-label">Rating</span>
      </div>
    </div>
  </div>`;
}

function renderTagOptions() {
  const sel = $("#filterTag");
  const prev = sel.value;
  const tags = [...new Set(state.doubts.flatMap(d => d.tags))].sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="">All Topics & Skills</option>` +
    tags.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  sel.value = tags.includes(prev) ? prev : "";

  const allSkills = [...new Set(state.students.flatMap(s => s.skills))].sort();
  $("#skillList").innerHTML = allSkills.map(s => `<option value="${esc(s)}"></option>`).join("");
}

function renderSummary() {
  const open = state.doubts.filter(d => d.status === "open").length;
  const proposed = state.doubts.filter(d => d.status === "proposed").length;
  const live = state.doubts.filter(d => d.status === "claimed").length;
  const done = state.doubts.filter(d => d.status === "resolved").length;

  $("#summary").innerHTML = `
    <div class="summary-pill"><span class="badge-dot open"></span><strong>${open}</strong> open doubts</div>
    <div class="summary-pill"><span class="badge-dot proposed"></span><strong>${proposed}</strong> handshake pending</div>
    <div class="summary-pill"><span class="badge-dot live"></span><strong>${live}</strong> in solution session</div>
    <div class="summary-pill"><span class="badge-dot resolved"></span><strong>${done}</strong> in Knowledge Vault</div>
  `;
}

/* ---------- Rendering: Feed Tickets & Cards ---------- */
function getFilteredDoubts() {
  const search = $("#search").value.trim().toLowerCase();
  const owner = $("#filterOwner").value;
  const tag = $("#filterTag").value;
  const urgency = $("#filterUrgency").value;
  const status = $("#filterStatus").value;
  const sort = $("#sortBy").value;
  const mine = $("#filterMine").checked;
  const user = me();

  const list = state.doubts.filter(d => {
    if (search && !(d.title + " " + d.description + " " + d.tags.join(" ")).toLowerCase().includes(search)) return false;
    if (owner === "asked" && d.postedBy !== user.id) return false;
    if (owner === "helping" && d.claimedBy !== user.id && d.proposal?.helperId !== user.id) return false;
    if (tag && !d.tags.some(t => norm(t) === norm(tag))) return false;
    if (urgency && d.urgency !== urgency) return false;
    if (status && d.status !== status) return false;
    if (mine && !(d.status === "open" && d.postedBy !== user.id && overlap(d, user).length)) return false;
    return true;
  });

  list.sort((a, b) => {
    if (sort === "bounty") return b.bounty - a.bounty;
    if (sort === "newest") return b.postedAt - a.postedAt;
    return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
           (URG[b.urgency].w - URG[a.urgency].w) ||
           (b.postedAt - a.postedAt);
  });
  return list;
}

function ticketHTML(d) {
  const poster = student(d.postedBy);
  const helper = d.claimedBy ? student(d.claimedBy) : (d.proposal ? student(d.proposal.helperId) : null);
  const user = me();
  const isAsker = d.postedBy === user.id;
  const isHelper = (d.claimedBy === user.id) || (d.proposal?.helperId === user.id);
  const mySkills = user.skills.map(norm);

  const tags = d.tags
    .map(t => `<span class="tag ${mySkills.includes(norm(t)) ? "mine" : ""}">${esc(t)}</span>`)
    .join("");

  const doubtImages = d.images || (d.image ? [d.image] : []);
  const doubtImagesHtml = doubtImages.length
    ? `<div class="doubt-attachment">
        <div class="attachment-label">📷 Attached Screenshots (${doubtImages.length}):</div>
        ${renderImageGallery(doubtImages, "doubt-gallery")}
       </div>`
    : "";

  let extra = "";
  let stub = "";

  // 1. OPEN STATUS
  if (d.status === "open") {
    const peers = rankPeers(d).slice(0, 3);
    const peersHtml = peers.length
      ? `<div class="peers-banner">
          <div class="peers-title">Suggested Peer Mentors on Campus:</div>
          <div class="peers-list">${peers.map(p => `
            <div class="peer-item">
              ${avatar(p.s)}
              <strong>${esc(p.s.name)}</strong>
              <span class="rate">★ ${p.s.rating.toFixed(1)}</span>
              <span class="why">knows ${p.m.map(esc).join(", ")}</span>
            </div>`).join("")}</div>
        </div>`
      : `<p class="hint">No matching peer listed these tags yet. Tags help qualified peers discover this doubt.</p>`;

    extra = peersHtml;

    const isExam = d.urgency === "exam";
    stub = `<div class="ticket-stub is-open ${isExam ? "is-exam" : ""}">
      <span class="stub-bounty-badge">${URG[d.urgency].label}</span>
      <div class="stub-num">${d.bounty}</div>
      <div class="stub-unit">Bounty Pts</div>
      ${isAsker
        ? `<div class="stub-controls">
            <span class="stub-note">Waiting for helper</span>
            <button class="btn quiet sm" data-action="delete" data-id="${d.id}">Delete Doubt</button>
           </div>`
        : `<button class="btn ${isExam ? "white" : "ink"} block" data-action="propose-help" data-id="${d.id}">
            🤝 Offer Solution / Help
           </button>`}
    </div>`;

  // 2. PROPOSED STATUS
  } else if (d.status === "proposed") {
    const prop = d.proposal;
    const propHelper = student(prop.helperId);
    const modeLabel = prop.helpMode === "written"
      ? "📝 Written Solution & Photos (No call)"
      : (prop.helpMode === "video" ? "📹 15-Minute Live Video Call" : "💬 Text Chat & Solution Walkthrough");

    if (isAsker) {
      extra = `<div class="handshake-box asker-view">
        <div class="handshake-header">
          ${avatar(propHelper, "md")}
          <div>
            <strong>${esc(propHelper.name)} (${esc(propHelper.branch)}) offered to solve this!</strong>
            <div class="handshake-sub">Rating: ★ ${propHelper.rating.toFixed(1)} · ${propHelper.sessions} sessions completed</div>
          </div>
        </div>
        <div class="handshake-details">
          <div><strong>Help Format:</strong> <span class="mode-pill">${modeLabel}</span></div>
          <div><strong>Timing:</strong> <span class="time-highlight">${esc(prop.proposedTime)}</span></div>
          ${prop.note ? `<div class="handshake-note">"${esc(prop.note)}"</div>` : ""}
        </div>
        <div class="handshake-actions">
          <button class="btn green sm" data-action="accept-proposal" data-id="${d.id}">
            ✓ Accept & Connect
          </button>
          <button class="btn ghost sm" data-action="decline-proposal" data-id="${d.id}">
            Decline
          </button>
        </div>
      </div>`;
    } else if (isHelper) {
      extra = `<div class="handshake-box helper-view">
        <div class="handshake-header">
          <span class="pulse-icon">⏳</span>
          <div>
            <strong>You offered to help ${esc(poster.name)}!</strong>
            <div class="handshake-sub">Format: <strong>${modeLabel}</strong> · Timing: <strong>${esc(prop.proposedTime)}</strong></div>
          </div>
        </div>
        ${prop.note ? `<div class="handshake-note">Your note: "${esc(prop.note)}"</div>` : ""}
        <div class="handshake-actions">
          <span class="hint">Waiting for ${esc(poster.name)} to accept your offer...</span>
          <button class="btn quiet sm" data-action="cancel-proposal" data-id="${d.id}">Withdraw Offer</button>
        </div>
      </div>`;
    } else {
      extra = `<div class="handshake-box other-view">
        <strong>🤝 Help offer pending acceptance</strong>
        <span class="hint">${esc(propHelper.name)} offered to help ${esc(poster.name)}.</span>
      </div>`;
    }

    stub = `<div class="ticket-stub is-proposed">
      <span class="stub-bounty-badge">Handshake</span>
      <div class="stub-num">${d.bounty}</div>
      <div class="stub-unit">Points</div>
      <div class="stub-status-pill">Pending Confirm</div>
    </div>`;

  // 3. CLAIMED / IN ACTIVE SESSION
  } else if (d.status === "claimed") {
    const solutionHtml = d.solution ? `
      <div class="solution-card">
        <div class="solution-card-header">
          <span class="solution-badge">💡 Written Solution from ${esc(helper.name)}</span>
          <span class="solution-time">${timeAgo(d.solution.submittedAt)}</span>
        </div>
        <div class="solution-text">${esc(d.solution.text)}</div>
        ${d.solution.images && d.solution.images.length ? `
          <div class="solution-gallery-label">Solution Photos & Annotated Steps (${d.solution.images.length}):</div>
          ${renderImageGallery(d.solution.images, "sol-gallery")}
        ` : ""}
        ${isAsker ? `
          <div class="solution-confirm-bar">
            <span>Did this solve your problem? Confirm to award the bounty!</span>
            <button class="btn green sm" data-action="jump-resolve" data-id="${d.id}">
              ✓ Accept & Mark Solved (+${d.bounty} pts)
            </button>
          </div>
        ` : ""}
      </div>
    ` : "";

    const videoBanner = `
      <div class="session-options-bar">
        <div class="session-status-text">
          <span class="live-dot" aria-hidden="true"></span>
          <span><strong>${esc(helper.name)}</strong> is working with <strong>${esc(poster.name)}</strong></span>
        </div>
        <div class="session-actions-row">
          ${isHelper ? `
            <button class="btn green sm" data-action="open-solution-modal" data-id="${d.id}">
              ✍️ Submit Written Solution & Photos
            </button>
          ` : ""}
          <a class="btn ghost sm video-optional-btn" href="${esc(d.meetLink || 'https://meet.jit.si')}" target="_blank" rel="noopener" title="Google Meet / Jitsi screen share">
            📹 Video Call (Optional)
          </a>
        </div>
      </div>
    `;

    extra = videoBanner + solutionHtml + threadHTML(d, isAsker || isHelper);

    let controls;
    if (isAsker) {
      controls = `
        <div class="resolve-card" id="resolve-box-${d.id}">
          <label class="resolve-label" for="rate-${d.id}">Rate Helper's Solution:</label>
          <select id="rate-${d.id}" class="resolve-select" aria-label="Rate this session">
            <option value="5">★★★★★ 5 - Excellent</option>
            <option value="4">★★★★☆ 4 - Good</option>
            <option value="3">★★★☆☆ 3 - Satisfactory</option>
            <option value="2">★★☆☆☆ 2 - Needs improvement</option>
            <option value="1">★☆☆☆☆ 1 - Unhelpful</option>
          </select>
          <button class="btn white block sm" data-action="resolve" data-id="${d.id}">
            ✓ Confirm Solved (+${d.bounty} Pts)
          </button>
        </div>`;
    } else if (isHelper) {
      controls = `
        <div class="helper-claimed-status">
          <p class="stub-note">Waiting for ${esc(poster.name.split(" ")[0])} to review & confirm</p>
          <button class="btn outline-w block sm" data-action="release" data-id="${d.id}">Release Doubt</button>
        </div>`;
    } else {
      controls = `<p class="stub-note">Active solve session</p>`;
    }

    stub = `<div class="ticket-stub is-claimed">
      <span class="stub-bounty-badge">In Session</span>
      <div class="ring" data-end="${d.claimedAt + SESSION_MS}">
        <div class="ring-in"><span class="t">15:00</span><small>timer</small></div>
      </div>
      ${controls}
    </div>`;

  // 4. RESOLVED STATUS
  } else {
    const mins = Math.max(1, Math.round(((d.resolvedAt || Date.now()) - (d.claimedAt || Date.now())) / 60000));
    const rating = d.rating || 5;

    const solutionPreview = d.solution ? `
      <div class="solution-card resolved-view">
        <div class="solution-card-header">
          <span class="solution-badge">✓ Accepted Solution by ${esc(helper ? helper.name : "Peer")}</span>
        </div>
        <div class="solution-text">${esc(d.solution.text)}</div>
        ${d.solution.images && d.solution.images.length ? renderImageGallery(d.solution.images, "sol-gallery") : ""}
      </div>
    ` : "";

    extra = `<div class="resolved-banner">
      <span class="resolved-check">✓</span>
      <div>
        <strong>Solved by ${esc(helper ? helper.name : "Peer")}</strong> in ~${mins} min.
        <div class="rating-display">Asker Rating: <span class="stars">${stars(rating)}</span> (${rating}/5)</div>
        ${d.feedback ? `<div class="review-quote">"${esc(d.feedback)}"</div>` : ""}
      </div>
    </div>` + solutionPreview + solvedThreadHTML(d);

    stub = `<div class="ticket-stub is-resolved">
      <div class="stub-check" aria-hidden="true">✓</div>
      <div class="stub-unit">Archived in Vault</div>
      <div class="stub-plus">+${d.bounty} Pts</div>
    </div>`;
  }

  return `<article class="ticket status-${d.status}" data-id="${d.id}">
    <div class="ticket-main">
      <div class="ticket-head">
        <div class="ticket-meta">
          ${avatar(poster, "sm")}
          <span class="poster-name">${esc(poster.name)}</span>
          <span class="poster-branch">${esc(poster.branch)}</span>
          <span class="bullet">·</span>
          <span class="post-time">${timeAgo(d.postedAt)}</span>
        </div>
        <span class="status-badge badge-${d.status}">${d.status.toUpperCase()}</span>
      </div>
      <h3 class="ticket-title">${esc(d.title)}</h3>
      <p class="desc">${esc(d.description)}</p>
      ${doubtImagesHtml}
      <div class="tags">${tags}</div>
      ${extra}
    </div>
    ${stub}
  </article>`;
}

/* ---------- Rendering: Campus Knowledge Vault (USP) ---------- */
function renderVault() {
  const resolvedList = state.doubts.filter(d => d.status === "resolved");
  const search = (ui.vaultSearch || "").trim().toLowerCase();
  const dept = ui.vaultDept || "All";

  const filtered = resolvedList.filter(d => {
    if (dept !== "All" && (d.department || "General") !== dept) return false;
    if (search) {
      const haystack = (d.title + " " + d.description + " " + (d.solution ? d.solution.text : "") + " " + d.tags.join(" ")).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

  const totalVaultCount = resolvedList.length;
  const totalUpvotes = resolvedList.reduce((acc, d) => acc + (d.upvotes || 0), 0);
  const totalHoursSaved = Math.round(totalVaultCount * 3.5);

  const departments = ["All", "CSE", "Mech", "Civil", "ECE", "Maths", "Design"];

  const cardsHtml = filtered.length ? filtered.map(d => {
    const poster = student(d.postedBy);
    const helper = student(d.claimedBy);
    const sol = d.solution || { text: d.description, images: [] };

    return `
      <div class="vault-card" data-id="${d.id}">
        <div class="vault-card-header">
          <div class="vault-dept-badge">${esc(d.department || 'General')} Lab Solution</div>
          <div class="vault-tags">
            ${d.tags.map(t => `<span class="tag sm">${esc(t)}</span>`).join("")}
          </div>
        </div>

        <h3 class="vault-title">${esc(d.title)}</h3>
        <p class="vault-problem-desc"><strong>Problem Context:</strong> ${esc(d.description)}</p>

        <div class="vault-solution-box">
          <div class="vault-solution-meta">
            <span class="vault-check-icon">✓</span>
            <div>
              <strong>Verified Fix by ${esc(helper.name)}</strong> (${esc(helper.branch)})
              <span class="vault-rating">★ ${(d.rating || 5).toFixed(1)} student verified</span>
            </div>
            <button class="btn ghost sm vault-copy-btn" data-action="copy-solution" data-id="${d.id}" title="Copy code or solution to clipboard">
              📋 Copy Solution
            </button>
          </div>
          <div class="vault-solution-content">${esc(sol.text)}</div>
          ${sol.images && sol.images.length ? renderImageGallery(sol.images, "vault-gallery") : ""}
        </div>

        <div class="vault-card-footer">
          <div class="vault-meta-info">
            Asked by ${esc(poster.name)} · Solved ${timeAgo(d.resolvedAt)} · Earned +${d.bounty} Pts
          </div>
          <button class="btn ghost sm vault-upvote-btn" data-action="upvote-vault" data-id="${d.id}">
            👍 Helpful (${d.upvotes || 0})
          </button>
        </div>
      </div>
    `;
  }).join("") : `
    <div class="empty-state">
      <div class="empty-icon">📖</div>
      <strong>No verified solutions match your vault query</strong>
      <p>Try searching another keyword (e.g., "STAAD", "FFT", "useEffect", "Overfitting") or clear the department filter.</p>
    </div>
  `;

  $("#vaultView").innerHTML = `
    <div class="vault-wrap">
      <!-- Knowledge Vault Hero -->
      <div class="vault-hero">
        <div class="vault-hero-content">
          <span class="vault-hero-badge">🏛️ Campus Institutional Memory</span>
          <h2>The Campus Knowledge Vault</h2>
          <p>Every solved doubt, debugging walkthrough, and verified photo is archived here. Search campus-tested fixes before spending your bounty points!</p>
        </div>

        <div class="vault-hero-stats">
          <div class="vault-stat-box">
            <span class="vault-stat-val">${totalVaultCount}</span>
            <span class="vault-stat-lbl">Verified Solutions</span>
          </div>
          <div class="vault-stat-box">
            <span class="vault-stat-val">${totalHoursSaved}h</span>
            <span class="vault-stat-lbl">Debugging Saved</span>
          </div>
          <div class="vault-stat-box">
            <span class="vault-stat-val">👍 ${totalUpvotes}</span>
            <span class="vault-stat-lbl">Student Upvotes</span>
          </div>
        </div>
      </div>

      <!-- Vault Search & Filter Bar -->
      <div class="vault-filter-bar">
        <div class="vault-search-wrap">
          <span class="vault-search-icon">🔍</span>
          <input type="search" id="vaultSearchInput" placeholder="Search verified campus solutions (e.g. C++ segfault, STAAD Pro, FFT NaN)..." value="${esc(ui.vaultSearch)}" />
        </div>
        <div class="vault-dept-chips">
          ${departments.map(deptName => `
            <button type="button" class="dept-chip ${ui.vaultDept === deptName ? 'active' : ''}" data-action="set-vault-dept" data-dept="${deptName}">
              ${deptName}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- Solutions Feed -->
      <div class="vault-feed">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/* ---------- Duplicate Radar on New Doubt Modal ---------- */
function checkVaultDuplicateRadar(query) {
  const radar = $("#vaultMatchRadar");
  if (!query || query.length < 3) {
    radar.hidden = true;
    return;
  }

  const q = query.toLowerCase();
  const resolvedList = state.doubts.filter(d => d.status === "resolved");
  const match = resolvedList.find(d => {
    return d.title.toLowerCase().includes(q) ||
           d.tags.some(t => q.includes(t.toLowerCase())) ||
           d.description.toLowerCase().includes(q);
  });

  if (match) {
    radar.hidden = false;
    $("#radarCount").textContent = "💡 We found a verified solution in the Knowledge Vault that might solve this for free!";
    $("#radarTitle").textContent = `"${match.title}" (Solved by ${student(match.claimedBy).name} · ★ ${match.rating || 5}.0)`;
    $("#radarViewBtn").dataset.targetId = match.id;
  } else {
    radar.hidden = true;
  }
}

/* ---------- Problem Solving Streak & Activity Analytics ---------- */
function computeStreakStats(user) {
  const history = user.solveHistory || {};
  const todayKey = getDayKey(0);
  const todaySolved = history[todayKey] || 0;

  // Streak rules:
  // - Solved more problems -> Dark Green
  // - Solved less problems -> Light Green
  // - Zero problems solved -> Streak ends!
  let currentStreak = 0;
  if (todaySolved > 0) {
    currentStreak = 1;
    let offset = -1;
    while (true) {
      const k = getDayKey(offset);
      const c = history[k] || 0;
      if (c > 0) {
        currentStreak++;
        offset--;
      } else {
        break;
      }
    }
  } else {
    // 0 problems solved today -> streak broken / ends
    currentStreak = 0;
  }

  // Calculate longest streak in the 60-day historical window
  let longestStreak = 0;
  let tempStreak = 0;
  for (let offset = -60; offset <= 0; offset++) {
    const k = getDayKey(offset);
    const count = history[k] || 0;
    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0; // Streak broken
    }
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  // Monthly solved (current month, e.g. "2026-11")
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleString("default", { month: "long" });
  let calculatedMonthSolved = 0;
  for (const [k, count] of Object.entries(history)) {
    if (k.startsWith(currentYearMonth)) {
      calculatedMonthSolved += count;
    }
  }
  const monthSolved = Math.max(calculatedMonthSolved, user.monthSolved || 0);

  // All-time solved questions
  let totalHistory = 0;
  for (const count of Object.values(history)) {
    totalHistory += count;
  }
  const allTimeSolved = Math.max(totalHistory, user.allTimeSolved || 0, user.sessions || 0);

  return {
    todaySolved,
    currentStreak,
    longestStreak,
    monthSolved,
    allTimeSolved,
    monthName
  };
}

function renderStreakMapHtml(user, stats) {
  const history = user.solveHistory || {};
  const today = new Date();

  // Generate 10 weeks (70 days) of calendar columns
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const currentSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
  const startDate = new Date(currentSunday.getFullYear(), currentSunday.getMonth(), currentSunday.getDate() - (9 * 7));

  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;

  for (let w = 0; w < 10; w++) {
    const daysInWeek = [];
    let weekMonthLabel = "";

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (w * 7 + d));
      const y = cellDate.getFullYear();
      const m = String(cellDate.getMonth() + 1).padStart(2, "0");
      const day = String(cellDate.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${day}`;
      const count = history[dateKey] || 0;

      // Track month transitions
      if (cellDate.getMonth() !== lastMonth && (d === 0 || cellDate.getDate() <= 7)) {
        weekMonthLabel = cellDate.toLocaleString("default", { month: "short" });
        lastMonth = cellDate.getMonth();
      }

      const isFuture = cellDate.getTime() > today.getTime() && dateKey !== getDayKey(0);
      const isToday = dateKey === getDayKey(0);

      // Level classifications:
      // - level-0: 0 solved -> streak ends
      // - level-1: 1 solved -> light green
      // - level-2: 2-3 solved -> medium green
      // - level-3: 4+ solved -> dark green
      let levelClass = "level-0";
      if (!isFuture) {
        if (count >= 4) levelClass = "level-3";
        else if (count >= 2) levelClass = "level-2";
        else if (count === 1) levelClass = "level-1";
        else levelClass = "level-0";
      }

      const dateReadable = cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
      const tipText = isFuture ? "Upcoming day" :
        count === 0 ? `${dateReadable}: 0 doubts solved (Streak Ends ⚠️)` :
        count === 1 ? `${dateReadable}: 1 doubt solved (Light Green)` :
        count < 4 ? `${dateReadable}: ${count} doubts solved (Medium Green)` :
        `${dateReadable}: ${count} doubts solved (Dark Green 🔥)`;

      daysInWeek.push({
        dateKey,
        count,
        levelClass,
        isFuture,
        isToday,
        tipText
      });
    }

    monthLabels.push(weekMonthLabel);
    weeks.push(daysInWeek);
  }

  const streakPillHtml = stats.currentStreak > 0
    ? `<span class="streak-pill active">🔥 ${stats.currentStreak}-Day Active Streak!</span>`
    : `<span class="streak-pill ended">⚠️ Streak Ended (0 Solved Today)</span>`;

  return `
    <div class="dash-streak-card">
      <div class="dash-streak-header">
        <div class="dash-streak-title-group">
          <h3>🔥 Problem Solving Streak Map</h3>
          <p class="dash-streak-sub">
            Dark green = Solved more · Light green = Solved less · Grey = Zero solved (Streak Ends)
          </p>
        </div>
        <div class="dash-streak-badges">
          ${streakPillHtml}
          <span class="streak-stat-pill">🏆 Best: <strong>${stats.longestStreak} Days</strong></span>
          <span class="streak-stat-pill">📅 ${stats.monthName}: <strong>${stats.monthSolved} Solved</strong></span>
          <span class="streak-stat-pill">🌟 All-Time: <strong>${stats.allTimeSolved} Solved</strong></span>
        </div>
      </div>

      <div class="streak-heatmap-wrap">
        <div class="streak-heatmap-inner">
          <div class="streak-month-labels">
            ${monthLabels.map(lbl => `<span style="width: 58px; display: inline-block;">${lbl}</span>`).join("")}
          </div>
          <div class="streak-body-row">
            <div class="streak-weekday-labels">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>
            <div class="streak-grid-weeks">
              ${weeks.map(week => `
                <div class="streak-week-col">
                  ${week.map(day => `
                    <div class="streak-cell ${day.levelClass} ${day.isToday ? 'is-today' : ''}"
                         title="${day.tipText}"
                         data-tip="${day.tipText}"
                         data-date="${day.dateKey}"
                         style="${day.isFuture ? 'opacity: 0.2; pointer-events: none;' : ''}">
                    </div>
                  `).join("")}
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="streak-footer">
        <div class="streak-legend">
          <span>Streak Ends (0)</span>
          <div class="streak-legend-cells">
            <span class="streak-legend-cell level-0" title="0 Solved (Streak Ends)"></span>
            <span class="streak-legend-cell level-1" title="1 Solved (Light Green)"></span>
            <span class="streak-legend-cell level-2" title="2-3 Solved (Medium Green)"></span>
            <span class="streak-legend-cell level-3" title="4+ Solved (Dark Green)"></span>
          </div>
          <span>Solved More (Dark Green)</span>
        </div>
        <div class="streak-actions">
          <button type="button" class="btn-solve-demo" data-action="solve-demo-doubt">
            <span>⚡</span> + Log Solved Doubt (+1 Today)
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ---------- Rendering: Student Dashboard ---------- */
function renderDashboard() {
  const u = me();
  const sortedStudents = [...state.students].sort((a, b) => b.points - a.points);
  const rank = sortedStudents.findIndex(s => s.id === u.id) + 1;

  const stats = computeStreakStats(u);
  const streakHtml = renderStreakMapHtml(u, stats);

  const askedByMe = state.doubts.filter(d => d.postedBy === u.id);
  const askedSolved = askedByMe.filter(d => d.status === "resolved");
  const askedActive = askedByMe.filter(d => d.status !== "resolved");

  const helpedByMe = state.doubts.filter(d => d.claimedBy === u.id || d.proposal?.helperId === u.id);
  const helpedSolved = state.doubts.filter(d => d.claimedBy === u.id && d.status === "resolved");
  const helpedActive = state.doubts.filter(d => (d.claimedBy === u.id || d.proposal?.helperId === u.id) && d.status !== "resolved");

  const openMatchingDoubts = state.doubts.filter(d => d.status === "open" && d.postedBy !== u.id && overlap(d, u).length > 0);

  const badges = [
    { icon: "🌟", title: "Top-Rated Mentor", desc: "Maintained ≥4.7 campus mentorship rating", earned: u.rating >= 4.7 },
    { icon: "⚡", title: "Rapid Solver", desc: "Completed 5+ live problem solving sessions", earned: u.sessions >= 5 },
    { icon: "💰", title: "Bounty Champion", desc: "Earned over 200 bounty points", earned: u.points >= 200 },
    { icon: "🎓", title: "Campus Contributor", desc: "Active doubt author and peer helper", earned: askedByMe.length > 0 && u.sessions > 0 },
    { icon: "📚", title: "Vault Author", desc: "Authored solutions archived in the Campus Vault", earned: helpedSolved.length > 0 }
  ];

  const activeEngagements = [...askedActive, ...helpedActive];
  const activeEngagementsHtml = activeEngagements.length ? `
    <div class="dash-active-list">
      ${activeEngagements.map(d => {
        const isAuthor = d.postedBy === u.id;
        const otherPerson = isAuthor
          ? (d.claimedBy ? student(d.claimedBy) : (d.proposal ? student(d.proposal.helperId) : null))
          : student(d.postedBy);

        return `
          <div class="dash-active-card">
            <div class="dash-active-info">
              <span class="status-badge badge-${d.status}">${d.status.toUpperCase()}</span>
              <strong>${esc(d.title)}</strong>
              <span class="dash-active-sub">
                ${isAuthor ? "You asked" : "You are helping"} · ${otherPerson ? otherPerson.name : "Waiting for helper"} · ${d.bounty} Pts
              </span>
            </div>
            <button class="btn green sm" data-action="switch-to-board-ticket" data-id="${d.id}">
              View Session
            </button>
          </div>
        `;
      }).join("")}
    </div>
  ` : `<div class="dash-empty-banner">You have no pending doubts or active sessions right now. Browse open doubts below!</div>`;

  $("#dashboardView").innerHTML = `
    <div class="dash-wrap">
      <div class="dash-hero-card">
        <div class="dash-hero-main">
          ${avatar(u, "lg")}
          <div>
            <div class="dash-hero-title">
              <h2>${esc(u.name)}</h2>
              <span class="dash-rank-badge">🏆 Campus Rank #${rank}</span>
            </div>
            <p class="dash-hero-branch">${esc(u.branch)} · Verified Campus Student</p>
            <div class="dash-hero-skills">
              <span class="skill-label">Active Skills:</span>
              ${u.skills.map(k => `<span class="tag mine sm">${esc(k)}</span>`).join("")}
            </div>
          </div>
        </div>
        <div class="dash-hero-actions">
          <button class="btn green sm" data-action="open-post-dialog">+ Post New Doubt</button>
          <button class="btn ghost sm" data-action="switch-to-open-matches">
            Browse ${openMatchingDoubts.length} Open Doubts For You
          </button>
        </div>
      </div>

      <!-- Problem Solving Streak & Daily Activity Heatmap -->
      ${streakHtml}

      <!-- Comprehensive KPI Metrics Grid -->
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card highlight-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">Solved This Month</span><span class="dash-kpi-icon">📅</span></div>
          <div class="dash-kpi-num">${stats.monthSolved}</div>
          <div class="dash-kpi-sub">Doubts in ${stats.monthName}</div>
        </div>
        <div class="dash-kpi-card highlight-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">All-Time Solved</span><span class="dash-kpi-icon">⚡</span></div>
          <div class="dash-kpi-num">${stats.allTimeSolved}</div>
          <div class="dash-kpi-sub">Total verified peer fixes</div>
        </div>
        <div class="dash-kpi-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">Bounty Wallet</span><span class="dash-kpi-icon">💰</span></div>
          <div class="dash-kpi-num">${u.points}</div>
          <div class="dash-kpi-sub">Points balance</div>
        </div>
        <div class="dash-kpi-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">Mentorship Sessions</span><span class="dash-kpi-icon">🤝</span></div>
          <div class="dash-kpi-num">${u.sessions}</div>
          <div class="dash-kpi-sub">★ ${u.rating.toFixed(1)} Campus Rating</div>
        </div>
        <div class="dash-kpi-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">Doubts Asked</span><span class="dash-kpi-icon">❓</span></div>
          <div class="dash-kpi-num">${askedByMe.length}</div>
          <div class="dash-kpi-sub">${askedSolved.length} solved · ${askedActive.length} active</div>
        </div>
        <div class="dash-kpi-card">
          <div class="dash-kpi-header"><span class="dash-kpi-title">Matching Doubts</span><span class="dash-kpi-icon">🎯</span></div>
          <div class="dash-kpi-num">${openMatchingDoubts.length}</div>
          <div class="dash-kpi-sub">Waiting for your skills</div>
        </div>
      </div>

      <div class="dash-section">
        <div class="dash-section-header">
          <h3>⚡ Ongoing Sessions & Active Doubts</h3>
          <span class="hint">Your collaborative tickets</span>
        </div>
        ${activeEngagementsHtml}
      </div>

      <div class="dash-section">
        <div class="dash-section-header">
          <h3>🎖️ Mentorship Badges & Micro-Credentials</h3>
          <span class="hint">Earned by helping peers & sharing verified solutions</span>
        </div>
        <div class="dash-badges-grid">
          ${badges.map(b => `
            <div class="badge-card ${b.earned ? 'badge-earned' : 'badge-locked'}">
              <span class="badge-icon">${b.icon}</span>
              <div class="badge-info">
                <strong>${esc(b.title)}</strong>
                <p>${esc(b.desc)}</p>
                <span class="badge-status">${b.earned ? '✓ Earned' : '🔒 In Progress'}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

/* ---------- Rendering: My Solvers & Reviews Section ---------- */
function renderMySolvers() {
  const user = me();
  const mySolvedDoubts = state.doubts.filter(d => d.postedBy === user.id && d.status === "resolved");

  const totalSolved = mySolvedDoubts.length;
  const uniqueSolvers = new Set(mySolvedDoubts.map(d => d.claimedBy).filter(Boolean));
  const totalBountyPaid = mySolvedDoubts.reduce((sum, d) => sum + (d.bounty || 0), 0);

  const tabEl = document.querySelector(".tab[data-tab='solvers']");
  if (tabEl) {
    tabEl.innerHTML = `🤝 My Solvers & Reviews <span class="tab-count">${totalSolved}</span>`;
  }

  if (!totalSolved) {
    $("#solversView").innerHTML = `
      <div class="solvers-header-stats">
        <div class="solver-stat-card"><span class="solver-stat-num">0</span><span class="solver-stat-label">Doubts Solved for You</span></div>
        <div class="solver-stat-card"><span class="solver-stat-num">0</span><span class="solver-stat-label">Helpful Peers</span></div>
        <div class="solver-stat-card"><span class="solver-stat-num">0</span><span class="solver-stat-label">Bounty Points Paid</span></div>
      </div>
      <div class="empty-state">
        <div class="empty-icon">🤝</div>
        <strong>No one has solved a doubt for you yet</strong>
        <p>Post a doubt on the campus board, and when a peer provides a solution, they will appear here so you can rate their help and leave testimonials!</p>
        <button class="btn green sm" style="margin-top: 14px;" data-action="open-post-dialog">+ Post a Doubt</button>
      </div>
    `;
    return;
  }

  const solverCardsHtml = mySolvedDoubts.map(d => {
    const helper = student(d.claimedBy);
    const currentRating = d.rating || 5;
    const currentFeedback = d.feedback || "";
    const solutionSnippet = d.solution ? d.solution.text : (d.description || "Resolved in session.");
    const solImages = (d.solution && d.solution.images) ? d.solution.images : [];

    return `
      <div class="solver-card">
        <div class="solver-card-top">
          <div class="solver-profile">
            ${avatar(helper, "lg")}
            <div class="solver-info">
              <h4 class="solver-name">${esc(helper.name)}</h4>
              <div class="solver-branch">${esc(helper.branch)}</div>
              <div class="solver-tags">${helper.skills.map(k => `<span class="tag sm">${esc(k)}</span>`).join("")}</div>
            </div>
          </div>
          <div class="solver-bounty-badge">
            <span class="pts-pill">+${d.bounty} Pts Paid</span>
            <span class="solved-date">${timeAgo(d.resolvedAt)}</span>
          </div>
        </div>

        <div class="solver-doubt-block">
          <div class="solver-doubt-title">
            <span class="doubt-icon">📌</span>
            <strong>${esc(d.title)}</strong>
          </div>
          <div class="solver-solution-box">
            <div class="solution-box-title">Solution Provided by ${esc(helper.name)}:</div>
            <p class="solution-box-text">${esc(solutionSnippet)}</p>
            ${renderImageGallery(solImages, "sol-gallery")}
          </div>
        </div>

        <div class="solver-rating-box">
          <div class="rating-box-header">
            <strong>⭐ Rate & Review ${esc(helper.name)}'s Help:</strong>
            <span class="hint">Adjust rating or write a testimonial anytime</span>
          </div>
          <form class="solver-rate-form" data-doubt-id="${d.id}">
            <div class="rating-input-row">
              <label class="rating-select-label">
                <span>Rating:</span>
                <select class="solver-rating-select" id="solver-rate-${d.id}">
                  <option value="5" ${currentRating === 5 ? "selected" : ""}>★★★★★ 5 - Exceptional help</option>
                  <option value="4" ${currentRating === 4 ? "selected" : ""}>★★★★☆ 4 - Good & clear</option>
                  <option value="3" ${currentRating === 3 ? "selected" : ""}>★★★☆☆ 3 - Okay / Satisfactory</option>
                  <option value="2" ${currentRating === 2 ? "selected" : ""}>★★☆☆☆ 2 - Partially solved</option>
                  <option value="1" ${currentRating === 1 ? "selected" : ""}>★☆☆☆☆ 1 - Unhelpful</option>
                </select>
              </label>
              <span class="current-rate-stars">${stars(currentRating)}</span>
            </div>
            <div class="feedback-input-row">
              <input type="text" class="solver-feedback-input" id="solver-fb-${d.id}"
                placeholder="Write a quick thank-you note or review..." value="${esc(currentFeedback)}" />
              <button type="submit" class="btn green sm">Save Review</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }).join("");

  $("#solversView").innerHTML = `
    <div class="solvers-header-stats">
      <div class="solver-stat-card"><span class="solver-stat-num">${totalSolved}</span><span class="solver-stat-label">Doubts Solved for You</span></div>
      <div class="solver-stat-card"><span class="solver-stat-num">${uniqueSolvers.size}</span><span class="solver-stat-label">Helpful Campus Peers</span></div>
      <div class="solver-stat-card"><span class="solver-stat-num">${totalBountyPaid}</span><span class="solver-stat-label">Total Bounty Points Paid</span></div>
    </div>
    <div class="solvers-feed">${solverCardsHtml}</div>
  `;
}

function renderBoard() {
  const list = getFilteredDoubts();
  $("#doubtList").innerHTML = list.length
    ? list.map(ticketHTML).join("")
    : `<div class="empty-state">
        <div class="empty-icon">🔍</div>
        <strong>No doubts found matching these filters</strong>
        <p>Try clearing your search keyword, selecting "All tags", or post a new doubt!</p>
       </div>`;
  tick();
  document.querySelectorAll(".thread-list").forEach(el => { el.scrollTop = el.scrollHeight; });
}

/* ---------- Rendering: Leaderboard ---------- */
function renderLeaderboard() {
  const user = me();
  const rows = [...state.students].sort((a, b) => b.points - a.points).map((s, i) => `
    <tr class="${s.id === user.id ? "me-row" : ""}">
      <td><span class="rank r${i + 1}">${i + 1}</span></td>
      <td>
        <div class="person">
          ${avatar(s, "md")}
          <div>
            <strong>${esc(s.name)} ${s.id === user.id ? '<span class="you-badge">(You)</span>' : ""}</strong>
            <span>${esc(s.branch)}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="tags">${s.skills.map(k => `<span class="tag">${esc(k)}</span>`).join("")}</div>
      </td>
      <td class="text-center"><strong>${s.sessions}</strong></td>
      <td class="text-center"><span class="rating-badge">★ ${s.rating.toFixed(1)}</span></td>
      <td class="pts text-right">${s.points}</td>
    </tr>`).join("");

  $("#leaderboard").innerHTML = `<div class="board-wrap"><table>
    <thead><tr>
      <th style="width: 60px;">Rank</th>
      <th>Peer Mentor</th>
      <th>Mentorship Skills</th>
      <th class="text-center">Sessions</th>
      <th class="text-center">Avg Rating</th>
      <th class="text-right">Bounty Points</th>
    </tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function renderAll() {
  renderUserSelect();
  renderProfile();
  renderSummary();
  renderTagOptions();
  renderDashboard();
  renderBoard();
  renderVault();
  renderMySolvers();
  renderLeaderboard();

  $("#dashboardView").hidden = ui.tab !== "dashboard";
  $("#boardView").hidden = ui.tab !== "board";
  $("#vaultView").hidden = ui.tab !== "vault";
  $("#solversView").hidden = ui.tab !== "solvers";
  $("#leaderboardView").hidden = ui.tab !== "leaderboard";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === ui.tab));
}

/* ---------- Countdown Timer ---------- */
function tick() {
  document.querySelectorAll(".ring").forEach(el => {
    const left = Number(el.dataset.end) - Date.now();
    const abs = Math.abs(left);
    const mm = String(Math.floor(abs / 60000)).padStart(2, "0");
    const ss = String(Math.floor((abs % 60000) / 1000)).padStart(2, "0");
    const t = el.querySelector(".t");
    const label = el.querySelector("small");
    el.style.setProperty("--p", String(Math.max(0, Math.min(1, left / SESSION_MS)) * 100));
    if (left >= 0) {
      if (t) t.textContent = `${mm}:${ss}`;
      if (label) label.textContent = "left";
      el.classList.remove("over");
    } else {
      if (t) t.textContent = `+${mm}:${ss}`;
      if (label) label.textContent = "overtime";
      el.classList.add("over");
    }
  });
}
setInterval(tick, 1000);

/* ---------- Event Delegation & User Interactions ---------- */
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (btn) {
    const id = Number(btn.dataset.id);
    switch (btn.dataset.action) {
      case "solve-demo-doubt":
        simulateSolveDoubt();
        break;
      case "open-post-dialog":
        $("#openPost").click();
        break;
      case "switch-to-open-matches":
        $("#filterMine").checked = true;
        ui.tab = "board";
        renderAll();
        break;
      case "switch-to-board-ticket":
        ui.tab = "board";
        renderAll();
        setTimeout(() => {
          const card = document.querySelector(`.ticket[data-id="${id}"]`) || document.querySelector(`.ticket`);
          if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
        break;
      case "upvote-vault":
        upvoteVaultDoubt(id);
        break;
      case "copy-solution":
        copySolutionText(id);
        break;
      case "set-vault-dept":
        ui.vaultDept = btn.dataset.dept;
        renderVault();
        break;
      case "propose-help":
        openProposeModal(id);
        break;
      case "accept-proposal":
        acceptProposal(id);
        break;
      case "decline-proposal":
        declineProposal(id);
        break;
      case "cancel-proposal":
        cancelProposal(id);
        break;
      case "open-solution-modal":
        openSolutionModal(id);
        break;
      case "jump-resolve": {
        const sel = document.getElementById("rate-" + id);
        if (sel) sel.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
      case "resolve":
        resolveDoubt(id);
        break;
      case "release":
        releaseDoubt(id);
        break;
      case "delete":
        deleteDoubt(id);
        break;
      case "remove-skill":
        removeSkill(btn.dataset.skill);
        break;
      case "send-msg":
        sendMessage(id);
        break;
      case "pick-chat-photo": {
        const f = document.getElementById("chat-file-" + id);
        if (f) f.click();
        break;
      }
      case "remove-chat-photo": {
        const idx = Number(btn.dataset.idx);
        if (ui.chatPendingImages[id]) {
          ui.chatPendingImages[id].splice(idx, 1);
          renderBoard();
        }
        break;
      }
      case "remove-sol-photo": {
        const idx = Number(btn.dataset.idx);
        ui.solutionPendingImages.splice(idx, 1);
        renderSolutionImagesPreview();
        break;
      }
      case "view-image":
        viewImage(btn.dataset.src || btn.src);
        break;
    }
    return;
  }

  const tab = e.target.closest(".tab");
  if (tab) {
    ui.tab = tab.dataset.tab;
    renderAll();
  }
});

// Vault search live input
document.addEventListener("input", e => {
  if (e.target.id === "vaultSearchInput") {
    ui.vaultSearch = e.target.value;
    renderVault();
  }
});

// Radar click to view vault solution directly
$("#radarViewBtn").addEventListener("click", e => {
  const targetId = Number(e.target.dataset.targetId);
  $("#postDialog").close();
  ui.tab = "vault";
  ui.vaultSearch = "";
  ui.vaultDept = "All";
  renderAll();
  setTimeout(() => {
    const card = document.querySelector(`.vault-card[data-id="${targetId}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
});

// Live Duplicate Radar on typing doubt title
$("#pTitle").addEventListener("input", e => {
  checkVaultDuplicateRadar(e.target.value);
});

// Submit review from My Solvers view
document.addEventListener("submit", e => {
  if (e.target.classList.contains("solver-rate-form")) {
    e.preventDefault();
    const doubtId = Number(e.target.dataset.doubtId);
    const newRating = Number(document.getElementById("solver-rate-" + doubtId).value);
    const feedback = document.getElementById("solver-fb-" + doubtId).value;
    updateSolverRating(doubtId, newRating, feedback);
  }
});

// Draft text preservation
document.addEventListener("input", e => {
  if (e.target.classList && e.target.classList.contains("msg-input")) {
    ui.drafts[e.target.dataset.id] = e.target.value;
  }
});

// Enter sends, Shift+Enter adds new line
document.addEventListener("keydown", e => {
  if (e.target.classList && e.target.classList.contains("msg-input") &&
      e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMessage(Number(e.target.dataset.id));
  }
});

// Chat: Multiple photos attached
document.addEventListener("change", async e => {
  if (e.target.id && e.target.id.startsWith("chat-file-")) {
    const id = Number(e.target.dataset.id);
    const files = e.target.files;
    if (files && files.length) {
      try {
        const newImages = await compressMultipleFiles(files);
        ui.chatPendingImages[id] = ui.chatPendingImages[id] || [];
        ui.chatPendingImages[id].push(...newImages);
        renderBoard();
      } catch (err) {
        toast(err.message, true);
      }
    }
    e.target.value = "";
  }
});

// Solution Modal: Multiple photos attached
$("#solImgFile").addEventListener("change", async e => {
  const files = e.target.files;
  if (files && files.length) {
    try {
      const newImages = await compressMultipleFiles(files);
      ui.solutionPendingImages.push(...newImages);
      renderSolutionImagesPreview();
    } catch (err) {
      toast(err.message, true);
    }
  }
  e.target.value = "";
});

$("#solutionForm").addEventListener("submit", e => {
  e.preventDefault();
  const text = $("#solText").value.trim();
  if (!text && !ui.solutionPendingImages.length) {
    toast("Please enter solution steps or attach photos.", true);
    return;
  }
  submitWrittenSolution(text);
});
$("#cancelSolution").addEventListener("click", () => $("#solutionDialog").close());

// Propose Modal custom time dropdown toggle
$("#proposeTimeSelect").addEventListener("change", e => {
  const isCustom = e.target.value === "custom";
  $("#customTimeWrap").hidden = !isCustom;
  if (isCustom) $("#customTimeInput").focus();
});

$("#proposeForm").addEventListener("submit", e => {
  e.preventDefault();
  const helpMode = $("#proposeHelpMode").value;
  const selectVal = $("#proposeTimeSelect").value;
  const time = selectVal === "custom" ? $("#customTimeInput").value.trim() : selectVal;
  if (!time) {
    toast("Please select an estimated time.", true);
    return;
  }
  const note = $("#proposeNote").value.trim();
  submitProposal(helpMode, time, note);
});

$("#cancelPropose").addEventListener("click", () => $("#proposeDialog").close());

// Post doubt screenshot attachment (multiple)
$("#postImgFile").addEventListener("change", async e => {
  const files = e.target.files;
  if (files && files.length) {
    try {
      const newImages = await compressMultipleFiles(files);
      ui.postPendingImages.push(...newImages);
      renderPostImagesPreview();
    } catch (err) {
      toast(err.message, true);
    }
  }
  e.target.value = "";
});

function renderPostImagesPreview() {
  const wrap = $("#postImgPreviewWrap");
  if (!ui.postPendingImages.length) {
    wrap.innerHTML = "";
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  wrap.innerHTML = ui.postPendingImages.map((src, idx) => `
    <div class="thumb-card">
      <img src="${src}" alt="Screenshot ${idx + 1}" data-action="view-image" data-src="${src}" />
      <button type="button" class="btn-remove-thumb" data-action="remove-post-photo" data-idx="${idx}">×</button>
    </div>
  `).join("");
}

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-action='remove-post-photo']");
  if (btn) {
    const idx = Number(btn.dataset.idx);
    ui.postPendingImages.splice(idx, 1);
    renderPostImagesPreview();
  }
});

// Post Doubt Modal
$("#openPost").addEventListener("click", () => {
  $("#postingAs").textContent = "Posting as " + me().name + " (" + me().branch + ").";
  ui.postPendingImages = [];
  renderPostImagesPreview();
  $("#vaultMatchRadar").hidden = true;
  $("#postDialog").showModal();
});
$("#cancelPost").addEventListener("click", () => $("#postDialog").close());

$("#postForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("#pTitle").value.trim();
  const desc = $("#pDesc").value.trim();
  const tags = $("#pTags").value;
  if (!title || !desc || !tags.trim()) return;

  postDoubt(
    title,
    desc,
    tags,
    $("#pUrgency").value,
    Number($("#pBounty").value) || 20,
    [...ui.postPendingImages]
  );

  $("#postForm").reset();
  ui.postPendingImages = [];
  renderPostImagesPreview();
  $("#postDialog").close();
});

// Profile & Filter Event Listeners
$("#search").addEventListener("input", renderBoard);
["filterOwner", "filterTag", "filterUrgency", "filterStatus", "sortBy", "filterMine"].forEach(id =>
  $("#" + id).addEventListener("change", renderBoard));

$("#userSelect").addEventListener("change", e => {
  state.currentUserId = Number(e.target.value);
  ui.drafts = {};
  ui.chatPendingImages = {};
  saveState();
  renderAll();
  toast("Switched view to " + me().name);
});

document.addEventListener("submit", e => {
  if (e.target.id === "skillForm") {
    e.preventDefault();
    addSkill($("#skillInput").value);
  }
});

$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all campus board demo data to original state?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = seedState();
  saveState();
  renderAll();
  toast("Demo state reset to defaults.");
});

// Lightbox close
$("#closeLightbox").addEventListener("click", () => $("#imgDialog").close());
$("#imgDialog").addEventListener("click", e => {
  if (e.target.id === "imgDialog" || e.target.id === "lightImg") {
    $("#imgDialog").close();
  }
});

/* ---------- Initialization ---------- */
renderAll();
