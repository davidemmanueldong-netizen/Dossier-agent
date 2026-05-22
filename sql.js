// ============================================================
// sql.js — Générateur de requêtes SQL simulées pour Rythme
// ============================================================

const SQLEngine = {
  queries: [],

  reset() {
    this.queries = [];
  },

  log(sql, table, type) {
    const entry = {
      id: this.queries.length + 1,
      sql: sql.trim(),
      table,
      type,
      timestamp: new Date().toISOString(),
      rows_affected: type === "SELECT" ? Math.floor(Math.random() * 8) + 1 : 1
    };
    this.queries.push(entry);
    if (window.UI) window.UI.appendSQLLog(entry);
    return entry;
  },

  // --- SELECTS ---

  selectUser(userId) {
    return this.log(
      `SELECT u.id, u.prenom, u.revenu_mensuel, u.budget_restant,\n       u.budget_bienetre, u.horaires_travail, u.niveau_energie_base\nFROM users u\nWHERE u.id = ${userId};`,
      "users", "SELECT"
    );
  },

  selectCalendarEvents(userId, dateDebut, dateFin) {
    return this.log(
      `SELECT ce.id, ce.titre, ce.date, ce.heure_debut, ce.heure_fin,\n       ce.type, ce.urgence, ce.reportable\nFROM calendar_events ce\nWHERE ce.user_id = ${userId}\n  AND ce.date BETWEEN '${dateDebut}' AND '${dateFin}'\nORDER BY ce.date ASC, ce.heure_debut ASC;`,
      "calendar_events", "SELECT"
    );
  },

  selectHealthSignals(userId) {
    return this.log(
      `SELECT hs.signal, hs.intensite, hs.date, hs.note\nFROM health_signals hs\nWHERE hs.user_id = ${userId}\n  AND hs.date >= DATE_SUB(NOW(), INTERVAL 7 DAY)\nORDER BY hs.date DESC\nLIMIT 10;`,
      "health_signals", "SELECT"
    );
  },

  selectMoodLogs(userId) {
    return this.log(
      `SELECT ml.date, ml.humeur, ml.energie, ml.note\nFROM mood_logs ml\nWHERE ml.user_id = ${userId}\nORDER BY ml.date DESC\nLIMIT 5;`,
      "mood_logs", "SELECT"
    );
  },

  selectBudget(userId) {
    return this.log(
      `SELECT SUM(bt.montant) AS solde_courant,\n       SUM(CASE WHEN bt.categorie = 'bienetre' THEN bt.montant ELSE 0 END) AS depenses_bienetre\nFROM budget_transactions bt\nWHERE bt.user_id = ${userId}\n  AND MONTH(bt.date) = MONTH(NOW())\n  AND YEAR(bt.date) = YEAR(NOW());`,
      "budget_transactions", "SELECT"
    );
  },

  selectTasks(userId) {
    return this.log(
      `SELECT t.id, t.titre, t.priorite, t.urgence, t.echeance,\n       t.duree_min, t.reportable\nFROM tasks t\nWHERE t.user_id = ${userId}\n  AND t.statut = 'en_attente'\nORDER BY t.urgence DESC, t.priorite DESC;`,
      "tasks", "SELECT"
    );
  },

  selectAppointments(userId) {
    return this.log(
      `SELECT a.titre, a.date, a.heure, a.type, a.cout\nFROM appointments a\nWHERE a.user_id = ${userId}\n  AND a.statut != 'annule'\nORDER BY a.date DESC\nLIMIT 5;`,
      "appointments", "SELECT"
    );
  },

  // --- INSERTS ---

  insertAppointment(appt) {
    return this.log(
      `INSERT INTO appointments\n  (user_id, titre, date, heure, type, cout, lieu, statut, source)\nVALUES\n  (${appt.user_id}, '${appt.titre}', '${appt.date}', '${appt.heure}',\n   '${appt.type}', ${appt.cout}, '${appt.lieu}', 'confirme', 'rythme_agent');`,
      "appointments", "INSERT"
    );
  },

  insertAgentDecision(decision) {
    return this.log(
      `INSERT INTO agent_decisions\n  (user_id, requete, intention, option_choisie, score_final,\n   raison, cout, impact_budget, created_at)\nVALUES\n  (${decision.user_id}, '${decision.requete.replace(/'/g,"\\'")}',\n   '${decision.intention}', '${decision.option_choisie}',\n   ${decision.score_final}, '${decision.raison.replace(/'/g,"\\'")}',\n   ${decision.cout}, ${decision.impact_budget},\n   NOW());`,
      "agent_decisions", "INSERT"
    );
  },

  insertAgentLog(log) {
    return this.log(
      `INSERT INTO agent_logs\n  (user_id, etape, message, timestamp)\nVALUES\n  (${log.user_id}, '${log.etape}', '${log.message.replace(/'/g,"\\'")}', NOW());`,
      "agent_logs", "INSERT"
    );
  },

  // --- UPDATES ---

  updateCalendarEventReport(eventId, newDate, newHeure) {
    return this.log(
      `UPDATE calendar_events\nSET date = '${newDate}',\n    heure_debut = '${newHeure}',\n    updated_at = NOW()\nWHERE id = ${eventId}\n  AND reportable = TRUE;`,
      "calendar_events", "UPDATE"
    );
  },

  updateBudget(userId, montant, categorie) {
    return this.log(
      `INSERT INTO budget_transactions\n  (user_id, date, categorie, montant, description)\nVALUES\n  (${userId}, NOW(), '${categorie}', ${-montant},\n   'Dépense agent Rythme — simulation');`,
      "budget_transactions", "INSERT"
    );
  },

  updateTaskStatus(taskId, statut) {
    return this.log(
      `UPDATE tasks\nSET statut = '${statut}',\n    updated_at = NOW()\nWHERE id = ${taskId};`,
      "tasks", "UPDATE"
    );
  },

  // Exporter l'historique SQL en CSV
  exportCSV() {
    const headers = ["#","Type","Table","SQL","Rows","Timestamp"];
    const rows = this.queries.map(q => [
      q.id, q.type, q.table,
      `"${q.sql.replace(/\n/g,' ').replace(/"/g,'""')}"`,
      q.rows_affected,
      q.timestamp
    ]);
    return [headers, ...rows].map(r => r.join(",")).join("\n");
  }
};

window.SQLEngine = SQLEngine;
