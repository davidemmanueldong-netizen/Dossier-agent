// ============================================================
// ui.js — Gestion de l'interface Rythme
// ============================================================

const UI = {
  isRunning: false,

  init() {
    document.getElementById("btn-organiser").addEventListener("click", () => this.handleSubmit());
    document.getElementById("requete-input").addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.handleSubmit(); }
    });
    document.getElementById("btn-export-ics").addEventListener("click", () => this.exportICS());
    document.getElementById("btn-export-csv").addEventListener("click", () => this.exportCSV());

    // Suggestions de chips
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.getElementById("requete-input").value = chip.dataset.query;
        document.getElementById("requete-input").focus();
      });
    });
  },

  async handleSubmit() {
    if (this.isRunning) return;
    const input = document.getElementById("requete-input");
    const requete = input.value.trim();
    if (!requete) { this.shake(input); return; }

    this.isRunning = true;
    this.reset();
    this.showLoading(true);
    this.scrollToSection("section-result");

    try {
      const result = await Agent.executer(requete);
      this.renderResult(result);
    } catch(e) {
      console.error(e);
      this.appendConsoleLog("ERREUR", "Une erreur est survenue : " + e.message);
    } finally {
      this.isRunning = false;
      this.showLoading(false);
    }
  },

  reset() {
    document.getElementById("console-log").innerHTML = "";
    document.getElementById("sql-panel").innerHTML = "";
    document.getElementById("section-result").classList.add("hidden");
    document.getElementById("section-options").classList.add("hidden");
    document.getElementById("section-plan").classList.add("hidden");
    document.getElementById("section-semaine").classList.add("hidden");
  },

  showLoading(show) {
    document.getElementById("loading-overlay").classList.toggle("active", show);
    document.getElementById("btn-organiser").disabled = show;
  },

  // ----------------------------------------------------------
  // Console logs (panneau latéral)
  // ----------------------------------------------------------
  appendConsoleLog(etape, msg) {
    const el = document.getElementById("console-log");
    const div = document.createElement("div");
    div.className = `log-entry log-${etape.toLowerCase()}`;

    const badge = document.createElement("span");
    badge.className = "log-badge";
    badge.textContent = etape;

    const text = document.createElement("span");
    text.className = "log-text";
    text.textContent = msg;

    const ts = document.createElement("span");
    ts.className = "log-ts";
    ts.textContent = new Date().toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit",second:"2-digit"});

    div.append(badge, text, ts);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  // ----------------------------------------------------------
  // Panneau SQL
  // ----------------------------------------------------------
  appendSQLLog(entry) {
    const el = document.getElementById("sql-panel");
    const div = document.createElement("div");
    div.className = `sql-entry sql-${entry.type.toLowerCase()}`;
    div.style.animationDelay = `${el.children.length * 80}ms`;

    const header = document.createElement("div");
    header.className = "sql-header";
    header.innerHTML = `<span class="sql-type sql-type-${entry.type.toLowerCase()}">${entry.type}</span>
      <span class="sql-table">${entry.table}</span>
      <span class="sql-rows">${entry.rows_affected} row${entry.rows_affected > 1 ? 's':''}`;

    const code = document.createElement("pre");
    code.className = "sql-code";
    code.innerHTML = this._highlightSQL(entry.sql);

    div.append(header, code);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  },

  _highlightSQL(sql) {
    return sql
      .replace(/\b(SELECT|FROM|WHERE|INSERT INTO|VALUES|UPDATE|SET|ORDER BY|LIMIT|AND|OR|CASE|WHEN|THEN|ELSE|END|JOIN|LEFT|INNER|GROUP BY|HAVING|AS|NOT|IN|IS|NULL|DATE_SUB|NOW|INTERVAL|DAY|MONTH|YEAR|SUM|MAX|MIN|COUNT|TRUE|FALSE)\b/g,
        '<span class="kw">$1</span>')
      .replace(/('.*?')/g, '<span class="str">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  },

  // ----------------------------------------------------------
  // Rendu du résultat complet
  // ----------------------------------------------------------
  renderResult(result) {
    const { analyse, contexte, options_scorees, decision, options_ecartees, plan, semaine, raison, sources } = result;

    // --- Carte décision principale ---
    this.renderDecision(decision, plan, analyse);

    // --- Pourquoi cette décision ---
    document.getElementById("pourquoi-text").textContent = raison;

    // --- Sources consultées ---
    this.renderSources(sources);

    // --- Signaux extraits ---
    this.renderSignaux(analyse, contexte);

    // --- Options comparées ---
    this.renderOptions(options_scorees);

    // --- Plan d'action ---
    this.renderPlan(plan);

    // --- Semaine (si applicable) ---
    if (semaine) this.renderSemaine(semaine);

    // Afficher les sections
    document.getElementById("section-result").classList.remove("hidden");
    document.getElementById("section-options").classList.remove("hidden");
    document.getElementById("section-plan").classList.remove("hidden");
    if (semaine) document.getElementById("section-semaine").classList.remove("hidden");

    // Animer les scores
    setTimeout(() => this.animateScores(options_scorees), 300);
  },

  renderDecision(decision, plan, analyse) {
    const rdv = plan.rendez_vous;
    const opt = decision.option;
    const dateFormatted = new Date(rdv.date + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday:"long", day:"numeric", month:"long", year:"numeric"
    });

    document.getElementById("decision-titre").textContent = rdv.titre;
    document.getElementById("decision-date").textContent = dateFormatted;
    document.getElementById("decision-heure").textContent = `${rdv.heure} — durée ${rdv.duree_min} min`;
    document.getElementById("decision-lieu").textContent = rdv.lieu;
    document.getElementById("decision-cout").textContent = rdv.cout === 0 ? "Gratuit" : `${rdv.cout}€`;
    document.getElementById("decision-budget-apres").textContent = `${plan.budget_restant_apres}€ restants`;
    document.getElementById("decision-score").textContent = decision.score_final;
    document.getElementById("decision-intention").textContent = this._labelIntention(analyse.intention);

    const budgetEl = document.getElementById("decision-budget-tag");
    budgetEl.textContent = plan.budget_restant_apres >= 0 ? "Budget OK" : "Budget tendu";
    budgetEl.className = "budget-tag " + (plan.budget_restant_apres >= 0 ? "ok" : "warn");
  },

  _labelIntention(i) {
    const labels = {
      sante_medicale: "🏥 Santé médicale",
      consultation_gyneco: "🩺 Gynécologie",
      soutien_mental: "🧠 Soutien mental",
      massage: "💆 Massage",
      organisation_semaine: "📅 Organisation semaine",
      repos: "🌿 Repos",
      repos_economique: "💚 Repos économique",
      recuperation: "⚡ Récupération",
      gestion_stress: "🌊 Gestion du stress",
      bien_etre_general: "✨ Bien-être général"
    };
    return labels[i] || i;
  },

  renderSources(sources) {
    const el = document.getElementById("sources-list");
    el.innerHTML = sources.map(s =>
      `<li class="source-item"><span class="source-icone">${s.icone}</span>
       <div><strong>${s.nom}</strong><br><small>${s.action}</small></div></li>`
    ).join("");
  },

  renderSignaux(analyse, contexte) {
    const actifs = Object.entries(analyse.signaux)
      .filter(([k,v]) => v)
      .map(([k]) => k);

    document.getElementById("signaux-list").innerHTML = actifs.map(s =>
      `<span class="signal-chip signal-${s}">${this._labelSignal(s)}</span>`
    ).join("") || "<em>Aucun signal spécifique détecté</em>";

    document.getElementById("contexte-fatigue").style.width   = `${Math.round(contexte.fatigue / 8 * 100)}%`;
    document.getElementById("contexte-stress").style.width    = `${Math.round(contexte.stress / 10 * 100)}%`;
    document.getElementById("contexte-budget").style.width    = `${Math.min(100, Math.round(contexte.budget_disponible / 40 * 100))}%`;
    document.getElementById("contexte-agenda").style.width    = `${Math.min(100, Math.round(contexte.charge_agenda / 10 * 100))}%`;
    document.getElementById("val-fatigue").textContent  = `${contexte.fatigue}/8`;
    document.getElementById("val-stress").textContent   = `${Math.round(contexte.stress)}/10`;
    document.getElementById("val-budget").textContent   = `${contexte.budget_disponible}€`;
    document.getElementById("val-agenda").textContent   = `${contexte.charge_agenda} events`;
  },

  _labelSignal(s) {
    const m = { fatigue:"😴 Fatigue", stress:"😰 Stress", douleur:"🤕 Douleur", symptomes:"🌡 Symptômes",
      budget_serre:"💸 Budget serré", massage:"💆 Massage", gyneco:"🩺 Gynéco", psy:"🧠 Psy",
      agenda:"📅 Agenda", repos:"🌿 Repos", urgence:"🚨 Urgence" };
    return m[s] || s;
  },

  renderOptions(options) {
    const tbody = document.getElementById("options-tbody");
    const maxScore = Math.max(...options.map(o => o.score_final));

    tbody.innerHTML = options.map((o, i) => {
      const isTop = i === 0;
      const pct = Math.round(o.score_final / maxScore * 100);
      return `
      <tr class="${isTop ? 'option-winner' : ''}">
        <td><span class="option-rank">${i+1}</span> ${isTop ? '<span class="winner-badge">✓ Choix</span>' : ''}</td>
        <td><strong>${o.label}</strong><br><small class="option-type">${o.option.type}</small></td>
        <td>${o.option.cout === 0 ? '<span class="free-tag">Gratuit</span>' : o.option.cout+'€'}</td>
        <td>
          <div class="score-bar-wrap">
            <div class="score-bar" data-target="${pct}" style="width:0%"></div>
          </div>
          <span class="score-val" data-target="${o.score_final}">0</span>
        </td>
        <td>${o.budget_compatible ? '<span class="ok-dot">●</span>' : '<span class="ko-dot">●</span>'}</td>
      </tr>`;
    }).join("");
  },

  animateScores(options) {
    const bars = document.querySelectorAll(".score-bar");
    const vals = document.querySelectorAll(".score-val");
    bars.forEach(b => {
      const target = parseInt(b.dataset.target);
      setTimeout(() => { b.style.width = target + "%"; }, 100);
    });
    vals.forEach(v => {
      const target = parseInt(v.dataset.target);
      let curr = 0;
      const step = Math.max(1, Math.round(target / 30));
      const iv = setInterval(() => {
        curr = Math.min(curr + step, target);
        v.textContent = curr;
        if (curr >= target) clearInterval(iv);
      }, 30);
    });
  },

  renderPlan(plan) {
    const rdv = plan.rendez_vous;
    const dateFormatted = new Date(rdv.date + "T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    document.getElementById("plan-rdv").innerHTML = `
      <div class="plan-item plan-rdv-item">
        <div class="plan-icon">🗓</div>
        <div>
          <strong>${rdv.titre}</strong><br>
          <small>${dateFormatted} à ${rdv.heure} · ${rdv.duree_min} min · ${rdv.lieu}</small>
        </div>
        <span class="plan-tag">${rdv.cout === 0 ? 'Gratuit' : rdv.cout + '€'}</span>
      </div>`;

    document.getElementById("plan-repos").innerHTML = `
      <div class="plan-item plan-repos-item">
        <div class="plan-icon">🌙</div>
        <div>
          <strong>${plan.repos.titre}</strong><br>
          <small>${dateFormatted} à ${plan.repos.heure} · ${plan.repos.duree_min} min · ${plan.repos.note}</small>
        </div>
        <span class="plan-tag gratuit">Gratuit</span>
      </div>`;

    document.getElementById("plan-tache").innerHTML = plan.tache_reportee
      ? `<div class="plan-item plan-report-item">
          <div class="plan-icon">📤</div>
          <div><strong>Tâche reportée : ${plan.tache_reportee.titre}</strong><br>
          <small>Raison : ${plan.tache_reportee.raison}</small></div>
          <span class="plan-tag report">Reporté</span>
         </div>`
      : `<div class="plan-item plan-ok-item"><div class="plan-icon">✅</div><div><strong>Agenda optimal</strong><br><small>Aucune tâche à reporter</small></div></div>`;

    document.getElementById("plan-gratuit").innerHTML = `
      <div class="plan-item plan-gratuit-item">
        <div class="plan-icon">💚</div>
        <div><strong>Action gratuite recommandée</strong><br><small>${plan.action_gratuite}</small></div>
        <span class="plan-tag gratuit">0€</span>
      </div>`;

    document.getElementById("plan-budget").innerHTML = `
      <div class="budget-impact">
        <div class="bi-row"><span>Budget bien-être disponible</span><strong>${SESSION.user.budget_bienetre}€</strong></div>
        <div class="bi-row"><span>Impact décision</span><strong class="${rdv.cout > 0 ? 'neg':''}">${rdv.cout > 0 ? '-' : ''}${rdv.cout}€</strong></div>
        <div class="bi-row bi-total"><span>Restant après</span><strong>${plan.budget_restant_apres}€</strong></div>
        <div class="bi-row"><span>Charge mentale estimée</span><strong>${plan.charge_mentale_estimee}/10</strong></div>
      </div>`;
  },

  renderSemaine(semaine) {
    const el = document.getElementById("semaine-grid");
    el.innerHTML = semaine.map(jour => `
      <div class="jour-card">
        <div class="jour-header">${jour.jour}</div>
        ${jour.items.map(item => `
          <div class="jour-item jour-${item.type}">
            <span class="jour-icone">${item.icone}</span>
            <div class="jour-content">
              <span class="jour-heure">${item.heure}</span>
              <span class="jour-titre">${item.titre}</span>
            </div>
          </div>`).join("")}
      </div>`).join("");
  },

  // ----------------------------------------------------------
  // Export ICS
  // ----------------------------------------------------------
  exportICS() {
    const dec = SESSION.current_decision;
    if (!dec) return;
    const rdv = dec.plan.rendez_vous;
    const dateStr = rdv.date.replace(/-/g,"");
    const heureStr = rdv.heure.replace(":","") + "00";
    const uid = `rythme-${Date.now()}@simulation.local`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rythme Agent//Simulation//FR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${dateStr}T${heureStr}`,
      `DTEND:${dateStr}T${this._addMinutes(rdv.heure, rdv.duree_min).replace(":","") + "00"}`,
      `SUMMARY:${rdv.titre}`,
      `DESCRIPTION:Planifié par Rythme Agent — Simulation académique.\\nScore: ${dec.decision.score_final}\\n${dec.raison}`,
      `LOCATION:${rdv.lieu}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:Rappel : ${rdv.titre}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    this._download(`rythme-rdv-${dateStr}.ics`, ics, "text/calendar");
  },

  _addMinutes(heure, mins) {
    const [h, m] = heure.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
  },

  // ----------------------------------------------------------
  // Export CSV
  // ----------------------------------------------------------
  exportCSV() {
    const history = SESSION.decisions_history;
    if (!history.length) { alert("Aucune décision à exporter."); return; }

    const headers = ["Date","Requête","Décision","Score","Coût","Intention","Requête SQL INSERT"];
    const rows = history.map(d => {
      const sqlInsert = `INSERT INTO agent_decisions (requete, option_choisie, score_final, cout) VALUES ('${d.requete.replace(/'/g,"\\'")}', '${d.decision}', ${d.score}, ${d.cout})`;
      return [
        d.date, `"${d.requete}"`, `"${d.decision}"`,
        d.score, d.cout + "€", d.intention,
        `"${sqlInsert}"`
      ].join(",");
    });

    this._download("rythme-decisions.csv", [headers.join(","), ...rows].join("\n"), "text/csv");
  },

  _download(filename, content, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) setTimeout(() => el.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
  },

  shake(el) {
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  }
};

window.UI = UI;
