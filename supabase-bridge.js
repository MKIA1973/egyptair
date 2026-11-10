import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const root = document.getElementById("authRoot");
const form = document.getElementById("signInForm");
const message = document.getElementById("authMessage");
const button = document.getElementById("signInButton");

if (!SUPABASE_URL.includes("YOUR_PROJECT_REF") && !SUPABASE_PUBLISHABLE_KEY.startsWith("YOUR_")) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const statusMap = { pending: "open", approved: "progress", rejected: "open", implemented: "done" };
  const reverseStatus = { open: "pending", progress: "pending", done: "implemented" };

  async function requireActiveProfile(user) {
    const { data, error } = await supabase.from("profiles")
      .select("id,full_name,role,is_active").eq("id", user.id).single();
    if (error) throw new Error("تعذر التحقق من صلاحيات الحساب. يرجى التواصل مع مسؤول النظام.");
    if (!data.is_active) throw new Error("هذا الحساب غير مفعل. يرجى التواصل مع مسؤول النظام.");
    return data;
  }

  async function loadDecisions() {
    const { data, error } = await supabase.from("decisions")
      .select("id,reference_no,title,decision,status,workflow_status,priority,due_date,department_code,rationale,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.reference_no || row.id,
      dbId: row.id,
      title: row.title,
      dept: row.department_code || "strategy",
      owner: row.rationale || "",
      priority: row.priority || "medium",
      due: row.due_date || "",
      status: row.workflow_status || statusMap[row.status] || "open"
    }));
  }

  async function persistDecisions(items) {
    // Only newly-created records are inserted here; existing database rows are updated by UUID.
    for (const item of items) {
      if (!item._new && !item._dirty) continue;
      if (item._new && !item.dbId) {
        const { data, error } = await supabase.from("decisions").insert({
          reference_no: item.id,
          title: item.title,
          decision: item.title,
          rationale: item.owner || "",
          status: reverseStatus[item.status] || "pending",
          workflow_status: item.status || "open",
          priority: item.priority || "medium",
          due_date: item.due || null,
          department_code: item.dept || null
        }).select("id").single();
        if (error) throw error;
        item.dbId = data.id;
        item._new = false;
        item._dirty = false;
      } else if (item._dirty && item.dbId) {
        const { error } = await supabase.from("decisions").update({
          workflow_status: item.status,
          status: reverseStatus[item.status] || "pending"
        }).eq("id", item.dbId);
        if (error) throw error;
        item._dirty = false;
      }
    }
  }

  async function activate(session) {
    if (!session?.user) {
      root.hidden = false;
      return;
    }
    try {
      const profile = await requireActiveProfile(session.user);
      window.aeroBackend = {
        supabase,
        profile,
        async saveDecisions(items) { await persistDecisions(items); }
      };
      const rows = await loadDecisions();
      if (rows.length) window.aeroApp?.replaceDecisions(rows);
      root.hidden = true;
      const profileName = profile.full_name || session.user.email || "مستخدم";
      const nameNode = document.querySelector(".profile strong");
      if (nameNode) nameNode.textContent = profileName;
      const roleNode = document.querySelector(".profile small");
      if (roleNode) roleNode.textContent = profile.role;
    } catch (error) {
      await supabase.auth.signOut();
      root.hidden = false;
      message.textContent = error.message || "تعذر تحميل بيانات الحساب.";
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "جارٍ التحقق…";
    try {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await activate(data.session);
    } catch (error) {
      message.textContent = error.message || "فشل تسجيل الدخول.";
    } finally {
      button.disabled = false;
      button.textContent = "دخول آمن";
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    // Defer async profile/database work outside the auth callback.
    setTimeout(() => activate(session), 0);
  });
  supabase.auth.getSession().then(({ data }) => activate(data.session));
} else {
  root.hidden = false;
  message.textContent = "أكمل إعداد config.js بإضافة Supabase URL و Publishable key.";
  button.disabled = true;
}
