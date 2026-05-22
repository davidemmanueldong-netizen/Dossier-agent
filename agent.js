// ============================================================
// agent.js — Moteur de décision autonome Rythme
// Simulation académique — aucune action réelle n'est exécutée.
// ============================================================

const Agent = {

  // ----------------------------------------------------------
  // ÉTAPE 1 : Analyser l'intention utilisateur
  // ----------------------------------------------------------
  analyserIntention(requete) {
    const r = requete.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
    const signaux = {
      fatigue:      /(fatigu|epuise|plus d.energie|dormi|dors mal|sommeil|nuit|crevee|videe)/.test(r),
      stress:       /(stress|anxieux|anxiete|tendu|pression|debord|surmenage|angoiss)/.test(r),
      douleur:      /(mal|douleur|souffr|bobo|tete|dos|ventre|dent)/.test(r),
      symptomes:    /(me sens mal|malade|fievre|sympto|depuis quelques jours|depuis des jours)/.test(r),
      budget_serre: /(pas beaucoup d.argent|peu d.argent|pas de budget|serree|budget|cher|gratuit|payant)/.test(r),
      massage:      /(massage|detente|relaxation|kine|corps)/.test(r),
      gyneco:       /(gyneco|gynecologue|contraception|regles|gynecologique)/.test(r),
      psy:          /(psy|psychologue|psychiatre|moral|soutien mental|mental)/.test(r),
      agenda:       /(semaine|organise|planning|agenda|trop de choses|surchargee|schedule)/.test(r),
      repos:        /(repos|pause|calme|souffler|rien faire|recuper)/.test(r),
      urgence:      /(urgent|vite|immediatement|aujourd.hui|maintenant|rapidement)/.test(r)
    };

    // Déduire l'intention principale
    let intention = "bien_etre_general";
    let type_besoin = "confort";

    if (signaux.symptomes || signaux.douleur) { intention = "sante_medicale"; type_besoin = "medical"; }
    else if (signaux.gyneco)                   { intention = "consultation_gyneco"; type_besoin = "medical"; }
    else if (signaux.psy || (signaux.stress && !signaux.massage)) { intention = "soutien_mental"; type_besoin = "medical"; }
    else if (signaux.massage)                  { intention = "massage"; type_besoin = "bienetre"; }
    else if (signaux.agenda)                   { intention = "organisation_semaine"; type_besoin = "organisation"; }
    else if (signaux.repos)                    { intention = "repos"; type_besoin = "gratuit"; }
    else if (signaux.fatigue && signaux.budget_serre) { intention = "repos_economique"; type_besoin = "gratuit"; }
    else if (signaux.fatigue)                  { intention = "recuperation"; type_besoin = "bienetre"; }
    else if (signaux.stress)                   { intention = "gestion_stress"; type_besoin = "bienetre"; }

    return {
      texte_original: requete,
      intention,
      type_besoin,
      signaux,
      urgence: signaux.urgence ? 8 : (signaux.symptomes || signaux.douleur ? 7 : 4)
    };
  },

  // ----------------------------------------------------------
  // ÉTAPE 2 : Extraire les signaux du contexte utilisateur
  // ----------------------------------------------------------
  extraireContexte(user) {
    const sante = DB.health_signals.filter(s => s.user_id === user.id);
    const humeurs = DB.mood_logs.filter(m => m.user_id === user.id);
    const budgetDepense = DB.budget_transactions
      .filter(t => t.user_id === user.id && t.categorie === "bienetre" && t.montant < 0)
      .reduce((sum, t) => sum + Math.abs(t.montant), 0);

    const fatigue_moy = humeurs.length
      ? Math.round(humeurs.reduce((s, m) => s + (8 - m.energie), 0) / humeurs.length * 10) / 10
      : 5;
    const stress_moy = sante.filter(s => s.signal === "stress").reduce((s, h) => s + h.intensite, 0)
      / (sante.filter(s => s.signal === "stress").length || 1);
    const nb_symptomes_recents = sante.filter(s => {
      const d = new Date(s.date);
      const now = new Date("2026-05-22");
      return (now - d) / 86400000 <= 5;
    }).length;

    const budget_bienetre_restant = user.budget_bienetre - budgetDepense;
    const evenements_semaine = DB.calendar_events.filter(e => {
      const d = new Date(e.date);
      return d >= new Date("2026-05-25") && d <= new Date("2026-05-31");
    });
    const charge_agenda = evenements_semaine.length;

    return {
      fatigue: Math.round(fatigue_moy),
      stress: Math.round(stress_moy),
      nb_symptomes_recents,
      budget_disponible: budget_bienetre_restant,
      charge_agenda,
      niveau_energie: humeurs.length ? humeurs[0].energie : user.niveau_energie_base,
      sante_alerte: nb_symptomes_recents >= 2 || sante.some(s => s.intensite >= 7)
    };
  },

  // ----------------------------------------------------------
  // ÉTAPE 3 : Scorer les options
  // Formule :
  //   urgence_santé×3 + pertinence×3 + impact_bienetre×2
  //   + compat_agenda×2 + compat_budget×2 - coût×2
  //   - charge_mentale - fatigue_demandée
  // ----------------------------------------------------------
  scorerOption(option, analyse, contexte) {
    const user = SESSION.user;
    const budget_ok = option.cout <= contexte.budget_disponible;

    // Pertinence avec requête
    const pertinence = this._pertinence(option, analyse);

    // Compatibilité budget (0-10)
    const compat_budget = option.cout === 0 ? 10
      : (budget_ok ? Math.max(0, 10 - Math.round((option.cout / contexte.budget_disponible) * 5)) : 0);

    // Compatibilité agenda (0-10)
    const compat_agenda = contexte.charge_agenda >= 7 ? 4
      : (contexte.charge_agenda >= 4 ? 7 : 10);

    // Urgence santé (utilisée depuis l'option)
    const urgence_sante = option.urgence_sante_score;

    // Impact bien-être
    const impact_bienetre = option.impact_bienetre;

    // Charge mentale et fatigue demandée
    const charge_mentale = Math.max(0, option.charge_mentale);
    const fatigue_demandee = option.fatigue_demandee;

    // Coût normalisé sur 10
    const cout_normalise = Math.min(10, option.cout / 10);

    const score_final = Math.round(
      urgence_sante * 3
      + pertinence * 3
      + impact_bienetre * 2
      + compat_agenda * 2
      + compat_budget * 2
      - cout_normalise * 2
      - charge_mentale
      - fatigue_demandee
    );

    return {
      option_id: option.id,
      label: option.label,
      score_final,
      details: {
        urgence_sante: { valeur: urgence_sante, poids: 3, contribution: urgence_sante * 3 },
        pertinence:    { valeur: pertinence,    poids: 3, contribution: pertinence * 3 },
        impact_bienetre: { valeur: impact_bienetre, poids: 2, contribution: impact_bienetre * 2 },
        compat_agenda: { valeur: compat_agenda, poids: 2, contribution: compat_agenda * 2 },
        compat_budget: { valeur: compat_budget, poids: 2, contribution: compat_budget * 2 },
        cout_normalise: { valeur: cout_normalise, poids: -2, contribution: -cout_normalise * 2 },
        charge_mentale: { valeur: charge_mentale, poids: -1, contribution: -charge_mentale },
        fatigue_demandee: { valeur: fatigue_demandee, poids: -1, contribution: -fatigue_demandee }
      },
      budget_compatible: budget_ok,
      option
    };
  },

  _pertinence(option, analyse) {
    const intentionMap = {
      "sante_medicale":       { consult_medecin: 10, soutien_psy: 4, repos_protege: 5, report_taches: 2, gyneco: 5, massage_recuperation: 3, yoga_doux: 2, massage_dos: 3 },
      "consultation_gyneco":  { gyneco: 10, consult_medecin: 6, soutien_psy: 3, repos_protege: 3, report_taches: 2, massage_recuperation: 2, yoga_doux: 2, massage_dos: 2 },
      "soutien_mental":       { soutien_psy: 10, consult_medecin: 5, repos_protege: 7, report_taches: 6, yoga_doux: 5, massage_recuperation: 4, gyneco: 1, massage_dos: 3 },
      "massage":              { massage_recuperation: 10, massage_dos: 9, yoga_doux: 5, repos_protege: 4, consult_medecin: 2, soutien_psy: 1, gyneco: 1, report_taches: 1 },
      "organisation_semaine": { report_taches: 10, repos_protege: 8, yoga_doux: 5, soutien_psy: 3, consult_medecin: 3, massage_recuperation: 3, gyneco: 2, massage_dos: 2 },
      "repos":                { repos_protege: 10, report_taches: 8, yoga_doux: 7, massage_recuperation: 5, soutien_psy: 4, consult_medecin: 3, gyneco: 1, massage_dos: 4 },
      "repos_economique":     { repos_protege: 10, yoga_doux: 9, report_taches: 8, soutien_psy: 6, consult_medecin: 4, massage_recuperation: 1, gyneco: 2, massage_dos: 1 },
      "recuperation":         { repos_protege: 8, massage_recuperation: 7, massage_dos: 7, yoga_doux: 7, soutien_psy: 4, consult_medecin: 5, gyneco: 1, report_taches: 5 },
      "gestion_stress":       { soutien_psy: 9, repos_protege: 8, yoga_doux: 7, report_taches: 7, massage_recuperation: 6, consult_medecin: 4, gyneco: 1, massage_dos: 5 },
      "bien_etre_general":    { repos_protege: 7, yoga_doux: 7, massage_recuperation: 6, soutien_psy: 5, consult_medecin: 5, report_taches: 5, gyneco: 3, massage_dos: 5 }
    };
    const map = intentionMap[analyse.intention] || intentionMap["bien_etre_general"];
    return map[option.id] || 3;
  },

  // ----------------------------------------------------------
  // ÉTAPE 4 : Sélectionner les 5 meilleures options à comparer
  // ----------------------------------------------------------
  selectionnerOptions(analyse, contexte) {
    const catalogue = DB.options_catalogue;

    // Forcer médecin si symptômes durables
    let pool = [...catalogue];

    // Si budget trop serré, favoriser options gratuites
    if (contexte.budget_disponible < 20) {
      pool = pool.map(o => ({
        ...o,
        urgence_sante_score: o.cout > 25 ? Math.max(0, o.urgence_sante_score - 4) : o.urgence_sante_score
      }));
    }

    const scores = pool.map(o => this.scorerOption(o, analyse, contexte));
    scores.sort((a, b) => b.score_final - a.score_final);
    return scores.slice(0, 5);
  },

  // ----------------------------------------------------------
  // ÉTAPE 5 : Générer le plan d'action
  // ----------------------------------------------------------
  genererPlanAction(decisionScore, analyse, contexte) {
    const opt = decisionScore.option;
    const user = SESSION.user;

    // Date du rendez-vous
    const dateFuture = this._prochaineDisponibilite(opt, analyse);
    const heure = this._prochaineHeure(opt, analyse);

    // Tâche à reporter
    const tache_reportable = DB.tasks.find(t => t.user_id === user.id && t.reportable && t.urgence <= 2);
    const event_reportable = DB.calendar_events.find(e => e.user_id === user.id && e.reportable && e.urgence <= 2);

    const plan = {
      rendez_vous: {
        titre: opt.label,
        date: dateFuture,
        heure,
        duree_min: opt.duree_min,
        lieu: opt.lieu,
        cout: opt.cout,
        type: opt.type
      },
      repos: {
        titre: "Créneau repos protégé",
        date: dateFuture,
        heure: "20:00",
        duree_min: 90,
        note: "Aucune tâche — temps de récupération"
      },
      tache_reportee: tache_reportable ? {
        titre: tache_reportable.titre,
        nouveau_statut: "reporté",
        raison: "Priorité bien-être"
      } : null,
      event_deplace: event_reportable ? {
        titre: event_reportable.titre,
        date_initiale: event_reportable.date,
        raison: "Créneau libéré pour le rendez-vous"
      } : null,
      action_gratuite: "10 min de respiration guidée ce soir (appli Respirelax)",
      impact_budget: -opt.cout,
      budget_restant_apres: contexte.budget_disponible - opt.cout,
      charge_mentale_estimee: Math.max(1, contexte.charge_agenda - 1)
    };

    return plan;
  },

  _prochaineDisponibilite(opt, analyse) {
    const base = new Date("2026-05-22");
    const offset = opt.disponibilite.includes("demain") ? 1
      : opt.disponibilite.includes("après-demain") ? 2
      : opt.disponibilite.includes("semaine prochaine") ? 8
      : opt.disponibilite.includes("immédiat") ? 0
      : 2;
    base.setDate(base.getDate() + offset);
    return base.toISOString().slice(0, 10);
  },

  _prochaineHeure(opt, analyse) {
    if (opt.disponibilite.includes("14h")) return "14:00";
    if (opt.disponibilite.includes("16h")) return "16:00";
    if (opt.disponibilite.includes("9h"))  return "09:00";
    if (opt.disponibilite.includes("11h")) return "11:00";
    return "10:00";
  },

  // ----------------------------------------------------------
  // MOTEUR PRINCIPAL — exécuter l'agent
  // ----------------------------------------------------------
  async executer(requete) {
    SQLEngine.reset();
    const user = SESSION.user;
    const steps = [];

    const push = (etape, msg) => {
      steps.push({ etape, msg });
      if (window.UI) window.UI.appendConsoleLog(etape, msg);
    };

    push("INIT", "Agent Rythme démarré — simulation autonome");

    // --- Requêtes SQL initiales ---
    await this._delay(300);
    push("SQL", "Chargement du profil utilisateur...");
    SQLEngine.selectUser(user.id);

    await this._delay(300);
    push("SQL", "Lecture de l'agenda semaine en cours...");
    SQLEngine.selectCalendarEvents(user.id, "2026-05-22", "2026-05-31");

    await this._delay(300);
    push("SQL", "Analyse des signaux de santé récents...");
    SQLEngine.selectHealthSignals(user.id);

    await this._delay(300);
    push("SQL", "Lecture de l'humeur et de l'énergie...");
    SQLEngine.selectMoodLogs(user.id);

    await this._delay(300);
    push("SQL", "Vérification du budget bien-être...");
    SQLEngine.selectBudget(user.id);

    await this._delay(300);
    push("SQL", "Chargement des tâches en attente...");
    SQLEngine.selectTasks(user.id);

    // --- Analyse intention ---
    await this._delay(400);
    push("ANALYSE", "Analyse de l'intention utilisateur...");
    const analyse = this.analyserIntention(requete);
    push("ANALYSE", `Intention détectée : ${analyse.intention} | Urgence : ${analyse.urgence}/10`);

    // --- Extraction contexte ---
    await this._delay(400);
    push("CONTEXTE", "Extraction du contexte personnel...");
    const contexte = this.extraireContexte(user);
    push("CONTEXTE", `Fatigue : ${contexte.fatigue}/8 | Stress : ${Math.round(contexte.stress)}/10 | Budget dispo : ${contexte.budget_disponible}€`);
    push("CONTEXTE", `Charge agenda : ${contexte.charge_agenda} événements | Alerte santé : ${contexte.sante_alerte ? "OUI" : "non"}`);

    // --- Scoring des options ---
    await this._delay(500);
    push("SCORING", "Calcul des scores pour chaque option...");
    const options_scorees = this.selectionnerOptions(analyse, contexte);
    options_scorees.forEach((s, i) => {
      push("SCORING", `#${i+1} ${s.label} → score : ${s.score_final}`);
    });

    // --- Décision ---
    await this._delay(500);
    const decision = options_scorees[0];
    const options_ecartees = options_scorees.slice(1);
    push("DECISION", `Option choisie : ${decision.label} (score ${decision.score_final})`);

    // --- Vérification budget ---
    if (!decision.budget_compatible) {
      push("DECISION", `⚠ Budget insuffisant (${contexte.budget_disponible}€ < ${decision.option.cout}€) — option gratuite sélectionnée`);
    }

    // --- Plan d'action ---
    await this._delay(400);
    push("PLAN", "Génération du plan d'action...");
    const plan = this.genererPlanAction(decision, analyse, contexte);
    push("PLAN", `Rendez-vous planifié : ${plan.rendez_vous.date} à ${plan.rendez_vous.heure}`);
    if (plan.tache_reportee) push("PLAN", `Tâche reportée : ${plan.tache_reportee.titre}`);
    if (plan.event_deplace)  push("PLAN", `Événement déplacé : ${plan.event_deplace.titre}`);
    push("PLAN", `Impact budget : -${plan.rendez_vous.cout}€ | Restant : ${plan.budget_restant_apres}€`);

    // --- Simulation semaine (si pertinent) ---
    let semaine = null;
    if (analyse.intention === "organisation_semaine") {
      semaine = this.genererSemaine(contexte);
      push("SEMAINE", "Plan de semaine équilibrée généré");
    }

    // --- Sauvegarde SQL ---
    await this._delay(400);
    push("SQL", "Sauvegarde de la décision en base...");
    SQLEngine.insertAgentDecision({
      user_id: user.id,
      requete,
      intention: analyse.intention,
      option_choisie: decision.label,
      score_final: decision.score_final,
      raison: decision.option.description,
      cout: decision.option.cout,
      impact_budget: -decision.option.cout
    });

    if (plan.rendez_vous.cout > 0) {
      push("SQL", "Mise à jour des transactions budget...");
      SQLEngine.updateBudget(user.id, plan.rendez_vous.cout, plan.rendez_vous.type);
    }

    push("SQL", "Insertion du rendez-vous...");
    SQLEngine.insertAppointment({
      user_id: user.id,
      titre: plan.rendez_vous.titre,
      date: plan.rendez_vous.date,
      heure: plan.rendez_vous.heure,
      type: plan.rendez_vous.type,
      cout: plan.rendez_vous.cout,
      lieu: plan.rendez_vous.lieu
    });

    if (plan.event_deplace) {
      const ev = DB.calendar_events.find(e => e.titre === plan.event_deplace.titre);
      if (ev) {
        push("SQL", `Report de l'événement "${ev.titre}"...`);
        SQLEngine.updateCalendarEventReport(ev.id, "2026-05-29", "18:00");
      }
    }

    push("SQL", "Log de l'action agent...");
    SQLEngine.insertAgentLog({
      user_id: user.id,
      etape: "decision_finale",
      message: `Agent a choisi : ${decision.label}`
    });

    await this._delay(300);
    push("FIN", "Simulation terminée — décision exécutée.");

    // Construire le résultat
    const resultat = {
      analyse,
      contexte,
      options_scorees,
      decision,
      options_ecartees,
      plan,
      semaine,
      sql_queries: SQLEngine.queries,
      raison: this._genererRaison(decision, analyse, contexte),
      sources: this._sources(analyse)
    };

    SESSION.current_decision = resultat;
    SESSION.decisions_history.push({
      date: new Date().toISOString(),
      requete,
      decision: decision.label,
      score: decision.score_final,
      cout: decision.option.cout,
      intention: analyse.intention
    });

    return resultat;
  },

  _genererRaison(decision, analyse, contexte) {
    const opt = decision.option;
    const parts = [];

    if (contexte.sante_alerte && opt.type === "medical") {
      parts.push(`Tes signaux de santé des 5 derniers jours (${contexte.nb_symptomes_recents} alertes) indiquent une situation qui nécessite un suivi médical.`);
    }
    if (contexte.fatigue >= 6) {
      parts.push(`Ton niveau de fatigue élevé (${contexte.fatigue}/8) a été pris en compte pour éviter les options trop exigeantes.`);
    }
    if (!decision.budget_compatible) {
      parts.push(`Ton budget bien-être restant (${contexte.budget_disponible}€) ne permet pas les options payantes — une alternative gratuite a été choisie.`);
    } else if (opt.cout > 0) {
      parts.push(`Cette option (${opt.cout}€) reste dans ton budget bien-être disponible (${contexte.budget_disponible}€).`);
    }
    parts.push(`Score final de ${decision.score_final} points, le meilleur parmi les ${5} options comparées.`);
    parts.push(opt.description);

    return parts.join(" ");
  },

  _sources(analyse) {
    return [
      { nom: "Base santé", action: "Lecture des signaux des 7 derniers jours", icone: "🏥" },
      { nom: "Agenda", action: "Analyse des disponibilités semaine", icone: "📅" },
      { nom: "Budget", action: "Vérification du budget bien-être", icone: "💶" },
      { nom: "Humeur", action: "Lecture des logs d'énergie et d'humeur", icone: "💭" },
      { nom: "Tâches", action: "Identification des tâches reportables", icone: "✅" },
      { nom: "Catalogue options", action: "Scoring de 8 options disponibles", icone: "⚖️" }
    ];
  },

  // ----------------------------------------------------------
  // Génération d'une semaine équilibrée
  // ----------------------------------------------------------
  genererSemaine(contexte) {
    return [
      { jour: "Lundi 25 mai",   items: [
        { heure: "09:00", titre: "Travail", type: "travail", icone: "💼" },
        { heure: "12:30", titre: "Pause déjeuner — repas fait maison", type: "bien_etre", icone: "🥗" },
        { heure: "19:00", titre: "Repos — pas de tâches ce soir", type: "repos", icone: "🌙" }
      ]},
      { jour: "Mardi 26 mai",   items: [
        { heure: "09:00", titre: "Travail", type: "travail", icone: "💼" },
        { heure: "17:30", titre: "Yoga doux 30 min", type: "sport", icone: "🧘" },
        { heure: "20:00", titre: "Temps libre — lecture", type: "repos", icone: "📖" }
      ]},
      { jour: "Mercredi 27 mai", items: [
        { heure: "09:00", titre: "Travail", type: "travail", icone: "💼" },
        { heure: "10:00", titre: "Rendez-vous santé planifié", type: "sante", icone: "🏥" },
        { heure: "18:30", titre: "Courses rapides — liste économique", type: "quotidien", icone: "🛒" }
      ]},
      { jour: "Jeudi 28 mai",   items: [
        { heure: "09:00", titre: "Travail", type: "travail", icone: "💼" },
        { heure: "17:00", titre: "Créneau calme — aucune tâche", type: "repos", icone: "🌿" },
        { heure: "20:00", titre: "Respiration guidée 10 min", type: "bien_etre", icone: "💨" }
      ]},
      { jour: "Vendredi 29 mai", items: [
        { heure: "09:00", titre: "Travail", type: "travail", icone: "💼" },
        { heure: "12:00", titre: "Déjeuner tranquille", type: "bien_etre", icone: "☀️" },
        { heure: "19:00", titre: "Film ou sortie légère", type: "social", icone: "🎬" }
      ]},
      { jour: "Samedi 30 mai",  items: [
        { heure: "10:00", titre: "Grasse matinée protégée", type: "repos", icone: "😴" },
        { heure: "14:00", titre: "Marche 45 min au parc", type: "sport", icone: "🌳" },
        { heure: "17:00", titre: "Temps personnel libre", type: "repos", icone: "🌸" }
      ]},
      { jour: "Dimanche 31 mai", items: [
        { heure: "10:00", titre: "Brunch maison", type: "bien_etre", icone: "🥞" },
        { heure: "15:00", titre: "Tâche légère : déclaration impôts (1h max)", type: "tache", icone: "📝" },
        { heure: "19:00", titre: "Préparation semaine — 15 min", type: "organisation", icone: "📋" },
        { heure: "21:00", titre: "Routine calme — coucher tôt", type: "repos", icone: "🌙" }
      ]}
    ];
  },

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

window.Agent = Agent;
