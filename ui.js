// ============================================================
// ui.js — Interface Rythme v2
// ============================================================

const UI = {
  isRunning: false,
  _loadingStep: 0,
  _loadingTimer: null,

  init() {
    const btn = document.getElementById("btn-organiser");
    const input = document.getElementById("requete-input");

    btn.addEventListener("click", () => this.handleSubmit());
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.handleSubmit(); }
    });

    // Auto-resize textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });

    document.getElementById("btn-export-ics").addEventListener("click", () => this.exportICS());
    document.getElementById("btn-export-csv").addEventListener("click", () => this.exportCSV());

    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        input.value = chip.dataset.query;
        input.dispatchEvent(new Event("input"));
        input.focus();
      });
    });
  },

  async handleSubmit() {
    if (this.isRunning) return;
    const input = document.getElementById("requete-input");
    const requete = input.value.trim();
    if (!requete) { input.closest(".input-card")?.classList.add("shake"); setTimeout(() => input.closest(".input-card")?.classList.remove("shake"), 400); return; }

    this.isRunning = true;
    this.reset();
    this.showLoading(true);

    try {
      const result = await Agent.executer(requete);
      this.renderResult(result);
    } catch(e) {
      console.error(e);
      this.appendConsoleLog("ERREUR", "Erreur : " + e.message);
    } finally {
      this.isRunning = false;
      this.showLoading(false);
    }
  },

  reset() {
    document.getElementById("console-log").innerHTML = "";
    document.getElementById("sql-panel").innerHTML = "";
    ["section-result","section-why","section-options","section-plan","section-semaine"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    this._loadingStep = 0;
  },

  showLoading(show) {
    const ov = document.getElementById("loading-overlay");
    ov.classList.toggle("active", show);
    document.getElementById("btn-organiser").disabled = show;

    if (show) {
      const steps = ov.querySelectorAll(".lstep");
      steps.forEach(s => s.classList.remove("active","done"));
      steps[0].classList.add("active");
      this._loadingStep = 0;
      this._loadingTimer = setInterval(() => {
        steps[this._loadingStep]?.classList.remove("active");
        steps[this._loadingStep]?.classList.add("done");
        this._loadingStep++;
        if (this._loadingStep < steps.length) steps[this._loadingStep].classList.add("active");
      }, 800);
    } else {
      clearInterval(this._loadingTimer);
    }
  },

  // ----------------------------------------------------------
  // Console logs
  // ----------------------------------------------------------
  appendConsoleLog(etape, msg) {
    const el = document.getElementById("console-log");
    const div = document.createElement("div");
    div.className = `tl-row tl-${etape.toLowerCase()}`;

    const badge = document.createElement("span");
    badge.className = "tl-badge";
    badge.textContent = etape;

    const text = document.createElement("span");
    text.className = "tl-msg";
    text.textContent = msg;

    const ts = document.createElement("span");
    ts.className = "tl-ts";
    ts.textContent = new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

    div.append(badge, text, ts);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  // ----------------------------------------------------------
  // SQL panel
  // ----------------------------------------------------------
  appendSQLLog(entry) {
    const el = document.getElementById("sql-panel");
    const ph = el.querySelector(".sql-placeholder");
    if (ph) ph.remove();

    const wrap = document.createElement("div");
    wrap.className = "sql-entry";

    const head = document.createElement("div");
    head.className = "sql-ehead";
    head.innerHTML = `
      <span class="sql-type st-${entry.type.toLowerCase()}">${entry.type}</span>
      <span class="sql-tname">${entry.table}</span>
      <span class="sql-rows">${entry.rows_affected} row${entry.rows_affected !== 1 ? "s" : ""}</span>`;

    const code = document.createElement("pre");
    code.className = "sql-code";
    code.innerHTML = this._highlightSQL(entry.sql);

    wrap.append(head, code);
    el.appendChild(wrap);
    el.scrollTop = el.scrollHeight;
  },

  _highlightSQL(sql) {
    return sql
      .replace(/\b(SELECT|FROM|WHERE|INSERT INTO|INSERT|VALUES|UPDATE|SET|ORDER BY|LIMIT|AND|OR|CASE|WHEN|THEN|ELSE|END|JOIN|LEFT|INNER|GROUP BY|HAVING|AS|NOT|IN|IS|NULL|DATE_SUB|NOW|INTERVAL|DAY|MONTH|YEAR|SUM|MAX|MIN|COUNT|TRUE|FALSE)\b/g,
        '<span class="kw">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="str">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>');
  },

  // ----------------------------------------------------------
  // Rendu du résultat
  // ----------------------------------------------------------
  renderResult(result) {
    const { analyse, contexte, options_scorees, decision, plan, semaine, raison, sources } = result;

    this.renderDecisionCard(decision, plan, analyse);
    this.renderWhy(raison, analyse, contexte, sources);
    this.renderOptions(options_scorees);
    this.renderPlan(plan);
    if (semaine) this.renderSemaine(semaine);

    // Afficher toutes les sections
    ["section-result","section-why","section-options","section-plan"].forEach(id => {
      document.getElementById(id)?.classList.remove("hidden");
    });
    if (semaine) document.getElementById("section-semaine")?.classList.remove("hidden");

    // Animer
    setTimeout(() => {
      this.animateScores(options_scorees);
      this.animateBars();
    }, 200);

    // Scroll doux
    setTimeout(() => document.getElementById("results-wrap")?.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
  },

  renderDecisionCard(decision, plan, analyse) {
    const rdv = plan.rendez_vous;
    const dateStr = new Date(rdv.date + "T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

    document.getElementById("decision-intention").textContent = this._labelIntention(analyse.intention);
    document.getElementById("decision-score").textContent = decision.score_final;
    document.getElementById("decision-titre").textContent = rdv.titre;
    document.getElementById("decision-date").textContent = dateStr;
    document.getElementById("decision-heure").textContent = `${rdv.heure} · ${rdv.duree_min} min`;
    document.getElementById("decision-lieu").textContent = rdv.lieu;
    document.getElementById("decision-cout").textContent = rdv.cout === 0 ? "Gratuit" : `${rdv.cout} €`;
    document.getElementById("decision-budget-apres").textContent = `${plan.budget_restant_apres} € restants`;

    const bt = document.getElementById("decision-budget-tag");
    bt.textContent = plan.budget_restant_apres >= 0 ? "✓ Budget OK" : "⚠ Budget tendu";
    bt.className = "budget-tag " + (plan.budget_restant_apres >= 0 ? "ok" : "warn");
  },

  _labelIntention(i) {
    const m = {
      sante_medicale:"🏥 Santé médicale", consultation_gyneco:"🩺 Gynécologie",
      soutien_mental:"🧠 Soutien mental", massage:"💆 Massage",
      organisation_semaine:"📅 Semaine équilibrée", repos:"🌿 Repos",
      repos_economique:"💚 Repos économique", recuperation:"⚡ Récupération",
      gestion_stress:"🌊 Gestion du stress", bien_etre_general:"✨ Bien-être"
    };
    return m[i] || i;
  },

  renderWhy(raison, analyse, contexte, sources) {
    document.getElementById("pourquoi-text").textContent = raison;

    // Signaux
    const actifs = Object.entries(analyse.signaux).filter(([,v]) => v).map(([k]) => k);
    const sl = document.getElementById("signaux-list");
    sl.innerHTML = actifs.map(s =>
      `<span class="signal-chip sc-${s}">${this._labelSignal(s)}</span>`
    ).join("") || "<em style='font-size:13px;color:var(--muted)'>Aucun signal spécifique</em>";

    // Barres (width set à 0 maintenant, animées après)
    document.getElementById("contexte-fatigue").dataset.target = Math.round(contexte.fatigue / 8 * 100);
    document.getElementById("contexte-stress").dataset.target   = Math.round(contexte.stress / 10 * 100);
    document.getElementById("contexte-budget").dataset.target   = Math.min(100, Math.round(contexte.budget_disponible / 40 * 100));
    document.getElementById("contexte-agenda").dataset.target   = Math.min(100, Math.round(contexte.charge_agenda / 10 * 100));
    document.getElementById("val-fatigue").textContent  = `${contexte.fatigue}/8`;
    document.getElementById("val-stress").textContent   = `${Math.round(contexte.stress)}/10`;
    document.getElementById("val-budget").textContent   = `${contexte.budget_disponible}€`;
    document.getElementById("val-agenda").textContent   = `${contexte.charge_agenda} evt`;

    // Sources
    document.getElementById("sources-list").innerHTML = sources.map(s =>
      `<div class="src-item"><span class="src-icon">${s.icone}</span><div><strong style="color:var(--ink-3);font-size:12px">${s.nom}</strong><div style="font-size:11px;color:var(--muted)">${s.action}</div></div></div>`
    ).join("");
  },

  animateBars() {
    ["contexte-fatigue","contexte-stress","contexte-budget","contexte-agenda"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.target) {
        requestAnimationFrame(() => { el.style.width = el.dataset.target + "%"; });
      }
    });
  },

  _labelSignal(s) {
    const m = { fatigue:"😴 Fatigue", stress:"😰 Stress", douleur:"🤕 Douleur",
      symptomes:"🌡 Symptômes", budget_serre:"💸 Budget serré", massage:"💆 Massage",
      gyneco:"🩺 Gynéco", psy:"🧠 Soutien psy", agenda:"📅 Agenda",
      repos:"🌿 Repos", urgence:"🚨 Urgence" };
    return m[s] || s;
  },

  renderOptions(options) {
    const container = document.getElementById("options-tbody");
    const maxScore = Math.max(...options.map(o => o.score_final));

    container.innerHTML = options.map((o, i) => {
      const isWinner = i === 0;
      const pct = Math.round(o.score_final / maxScore * 100);
      const coutHtml = o.option.cout === 0
        ? '<span class="cost-free">Gratuit</span>'
        : `<span class="opt-cost">${o.option.cout} €</span>`;
      return `
      <div class="opt-row ${isWinner ? "winner" : ""}">
        <div class="opt-rank">${i + 1}</div>
        <div class="opt-label">
          <div class="opt-name">${o.label}</div>
          <div class="opt-type">${o.option.type}${isWinner ? " · <strong style='color:var(--teal)'>Sélectionné</strong>" : ""}</div>
        </div>
        ${coutHtml}
        <div class="opt-score-wrap">
          <div class="opt-score-bar"><div class="opt-score-fill" data-target="${pct}"></div></div>
          <div class="opt-score-num" data-target="${o.score_final}">0</div>
        </div>
        <div class="opt-budget-ok">${o.budget_compatible ? "✅" : "❌"}</div>
      </div>`;
    }).join("");
  },

  animateScores(options) {
    document.querySelectorAll(".opt-score-fill").forEach(el => {
      const t = el.dataset.target;
      setTimeout(() => { el.style.width = t + "%"; }, 150);
    });
    document.querySelectorAll(".opt-score-num[data-target]").forEach(el => {
      const target = parseInt(el.dataset.target);
      let curr = 0;
      const step = Math.max(1, Math.ceil(target / 25));
      const iv = setInterval(() => {
        curr = Math.min(curr + step, target);
        el.textContent = curr;
        if (curr >= target) clearInterval(iv);
      }, 35);
    });
  },

  renderPlan(plan) {
    const rdv = plan.rendez_vous;
    const dateStr = new Date(rdv.date + "T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
    const coutStr = rdv.cout === 0 ? '<span class="pr-tag tag-free">Gratuit</span>' : `<span class="pr-tag tag-rdv">${rdv.cout} €</span>`;

    document.getElementById("plan-rdv").innerHTML = `
      <div class="plan-row pr-rdv">
        <span class="pr-icon">🗓</span>
        <div class="pr-text">
          <div class="pr-title">${rdv.titre}</div>
          <div class="pr-sub">${dateStr} à ${rdv.heure} · ${rdv.duree_min} min · ${rdv.lieu}</div>
        </div>
        ${coutStr}
      </div>`;

    document.getElementById("plan-repos").innerHTML = `
      <div class="plan-row pr-repos">
        <span class="pr-icon">🌙</span>
        <div class="pr-text">
          <div class="pr-title">${plan.repos.titre}</div>
          <div class="pr-sub">${dateStr} à ${plan.repos.heure} · ${plan.repos.duree_min} min · ${plan.repos.note}</div>
        </div>
        <span class="pr-tag tag-free">Gratuit</span>
      </div>`;

    document.getElementById("plan-tache").innerHTML = plan.tache_reportee
      ? `<div class="plan-row pr-report">
          <span class="pr-icon">📤</span>
          <div class="pr-text">
            <div class="pr-title">Tâche reportée : ${plan.tache_reportee.titre}</div>
            <div class="pr-sub">${plan.tache_reportee.raison}</div>
          </div>
          <span class="pr-tag tag-report">Reporté</span>
         </div>`
      : `<div class="plan-row pr-rdv">
          <span class="pr-icon">✅</span>
          <div class="pr-text"><div class="pr-title">Agenda optimal</div><div class="pr-sub">Aucune tâche à reporter</div></div>
         </div>`;

    document.getElementById("plan-gratuit").innerHTML = `
      <div class="plan-row pr-gratuit">
        <span class="pr-icon">💚</span>
        <div class="pr-text">
          <div class="pr-title">Action gratuite recommandée</div>
          <div class="pr-sub">${plan.action_gratuite}</div>
        </div>
        <span class="pr-tag tag-free">0 €</span>
      </div>`;

    document.getElementById("plan-budget").innerHTML = `
      <div class="budget-block">
        <div class="bb-row">
          <div class="bb-lbl">Budget bien-être</div>
          <div class="bb-val">${SESSION.user.budget_bienetre} €</div>
        </div>
        <div class="bb-row">
          <div class="bb-lbl">Impact décision</div>
          <div class="bb-val bb-neg">${rdv.cout > 0 ? "-" : ""}${rdv.cout} €</div>
        </div>
        <div class="bb-row bb-total">
          <div class="bb-lbl">Budget restant</div>
          <div class="bb-val">${plan.budget_restant_apres} €</div>
        </div>
        <div class="bb-row">
          <div class="bb-lbl">Charge mentale</div>
          <div class="bb-val">${plan.charge_mentale_estimee}/10</div>
        </div>
      </div>`;
  },

  renderSemaine(semaine) {
    document.getElementById("semaine-grid").innerHTML = semaine.map(jour => `
      <div class="jour-card">
        <div class="jour-header">${jour.jour}</div>
        ${jour.items.map(item => `
          <div class="jour-row jt-${item.type}">
            <span class="jr-icon">${item.icone}</span>
            <div class="jr-body">
              <span class="jr-time">${item.heure}</span>
              <span class="jr-text">${item.titre}</span>
            </div>
          </div>`).join("")}
      </div>`).join("");
  },

  // ----------------------------------------------------------
  // Export ICS
  // ----------------------------------------------------------
  exportICS() {
    const dec = SESSION.current_decision;
    if (!dec) { alert("Lance une simulation d'abord."); return; }
    const rdv = dec.plan.rendez_vous;
    const ds = rdv.date.replace(/-/g, "");
    const hs = rdv.heure.replace(":", "") + "00";
    const icsContent = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Rythme Agent//FR",
      "CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
      `UID:rythme-${Date.now()}@simulation.local`,
      `DTSTART:${ds}T${hs}`,
      `DTEND:${ds}T${this._addMin(rdv.heure, rdv.duree_min).replace(":","") + "00"}`,
      `SUMMARY:${rdv.titre}`,
      `DESCRIPTION:Planifié par Rythme Agent — Simulation académique.\\nScore: ${dec.decision.score_final}`,
      `LOCATION:${rdv.lieu}`,
      "BEGIN:VALARM","TRIGGER:-PT30M","ACTION:DISPLAY",
      `DESCRIPTION:Rappel : ${rdv.titre}`,"END:VALARM",
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    this._download(`rythme-${ds}.ics`, icsContent, "text/calendar");
  },

  _addMin(h, m) {
    const [hh, mm] = h.split(":").map(Number);
    const t = hh * 60 + mm + m;
    return `${String(Math.floor(t / 60)).padStart(2,"0")}:${String(t % 60).padStart(2,"0")}`;
  },

  // ----------------------------------------------------------
  // Export CSV
  // ----------------------------------------------------------
  exportCSV() {
    if (!SESSION.decisions_history.length) { alert("Aucune décision à exporter."); return; }
    const h = ["Date","Requête","Décision","Score","Coût","Intention","SQL INSERT"].join(",");
    const rows = SESSION.decisions_history.map(d => [
      d.date, `"${d.requete}"`, `"${d.decision}"`, d.score, d.cout + "€", d.intention,
      `"INSERT INTO agent_decisions VALUES ('${d.requete.replace(/'/g,"''")}','${d.decision}',${d.score},${d.cout})"`
    ].join(","));
    this._download("rythme-decisions.csv", [h, ...rows].join("\n"), "text/csv");
  },

  _download(name, content, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }
};

window.UI = UI;
