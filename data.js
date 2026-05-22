// ============================================================
// data.js — Données simulées pour la démo Rythme
// Toutes les données sont fictives. Aucune action réelle.
// ============================================================

const DB = {

  users: [
    {
      id: 1,
      prenom: "Lola",
      nom: "Martin",
      email: "lola.martin@exemple.fr",
      revenu_mensuel: 1500,
      loyer: 900,
      charges_fixes: 350,
      budget_restant: 250,
      budget_bienetre: 40,
      horaires_travail: { debut: "09:00", fin: "17:00", jours: ["lundi","mardi","mercredi","jeudi","vendredi"] },
      trajet_moyen_min: 35,
      niveau_energie_base: 6,
      profil_sante: "fatigue chronique légère, stress professionnel",
      ville: "Paris"
    }
  ],

  calendar_events: [
    { id: 1, user_id: 1, titre: "Réunion équipe projet", date: "2026-05-25", heure_debut: "10:00", heure_fin: "11:30", type: "travail", urgence: 4, reportable: false },
    { id: 2, user_id: 1, titre: "Déjeuner avec Marie", date: "2026-05-25", heure_debut: "12:30", heure_fin: "14:00", type: "social", urgence: 2, reportable: true },
    { id: 3, user_id: 1, titre: "Sport (yoga)", date: "2026-05-26", heure_debut: "07:30", heure_fin: "08:30", type: "sante", urgence: 2, reportable: true },
    { id: 4, user_id: 1, titre: "Présentation client", date: "2026-05-26", heure_debut: "14:00", heure_fin: "16:00", type: "travail", urgence: 5, reportable: false },
    { id: 5, user_id: 1, titre: "Courses supermarché", date: "2026-05-27", heure_debut: "18:30", heure_fin: "19:30", type: "quotidien", urgence: 3, reportable: true },
    { id: 6, user_id: 1, titre: "Appel maman", date: "2026-05-27", heure_debut: "20:00", heure_fin: "20:30", type: "social", urgence: 1, reportable: true },
    { id: 7, user_id: 1, titre: "Rapport mensuel", date: "2026-05-28", heure_debut: "09:00", heure_fin: "12:00", type: "travail", urgence: 4, reportable: false },
    { id: 8, user_id: 1, titre: "Ménage appartement", date: "2026-05-29", heure_debut: "10:00", heure_fin: "12:00", type: "quotidien", urgence: 2, reportable: true },
    { id: 9, user_id: 1, titre: "Film avec Camille", date: "2026-05-30", heure_debut: "20:00", heure_fin: "22:30", type: "social", urgence: 1, reportable: true },
    { id: 10, user_id: 1, titre: "Commande courses en ligne", date: "2026-05-31", heure_debut: "09:00", heure_fin: "09:30", type: "quotidien", urgence: 3, reportable: true }
  ],

  health_signals: [
    { id: 1, user_id: 1, date: "2026-05-20", signal: "fatigue", intensite: 7, note: "Difficile de sortir du lit" },
    { id: 2, user_id: 1, date: "2026-05-21", signal: "stress", intensite: 6, note: "Réunion difficile au travail" },
    { id: 3, user_id: 1, date: "2026-05-22", signal: "fatigue", intensite: 8, note: "Mal dormi 3 nuits consécutives" },
    { id: 4, user_id: 1, date: "2026-05-22", signal: "douleur_tete", intensite: 5, note: "Maux de tête depuis hier soir" },
    { id: 5, user_id: 1, date: "2026-05-19", signal: "anxiete", intensite: 6, note: "Pensées intrusives le soir" },
    { id: 6, user_id: 1, date: "2026-05-18", signal: "fatigue", intensite: 5, note: "Semaine chargée" }
  ],

  mood_logs: [
    { id: 1, user_id: 1, date: "2026-05-22", heure: "08:15", humeur: 4, energie: 3, note: "Cafard ce matin, manque d'énergie" },
    { id: 2, user_id: 1, date: "2026-05-21", heure: "09:00", humeur: 5, energie: 4, note: "Mieux mais toujours fatiguée" },
    { id: 3, user_id: 1, date: "2026-05-20", heure: "08:30", humeur: 3, energie: 3, note: "Vraiment épuisée" },
    { id: 4, user_id: 1, date: "2026-05-19", heure: "08:00", humeur: 6, energie: 5, note: "Légèrement mieux" }
  ],

  budget_transactions: [
    { id: 1, user_id: 1, date: "2026-05-01", categorie: "loyer", montant: -900, description: "Loyer mai 2026" },
    { id: 2, user_id: 1, date: "2026-05-02", categorie: "charges", montant: -350, description: "EDF + internet + assurance" },
    { id: 3, user_id: 1, date: "2026-05-05", categorie: "alimentation", montant: -95, description: "Courses Lidl" },
    { id: 4, user_id: 1, date: "2026-05-10", categorie: "transport", montant: -38, description: "Navigo semaine" },
    { id: 5, user_id: 1, date: "2026-05-12", categorie: "restaurant", montant: -22, description: "Déjeuner avec collègues" },
    { id: 6, user_id: 1, date: "2026-05-15", categorie: "bienetre", montant: -18, description: "Application méditation" },
    { id: 7, user_id: 1, date: "2026-05-18", categorie: "alimentation", montant: -67, description: "Courses Carrefour" },
    { id: 8, user_id: 1, date: "2026-05-01", categorie: "salaire", montant: 1500, description: "Virement salaire mai" }
  ],

  appointments: [
    { id: 1, user_id: 1, titre: "Dermatologue Dr Dubois", date: "2026-04-10", heure: "16:00", type: "medecin", cout: 25, lieu: "Cabinet médical Paris 11e", statut: "passé" },
    { id: 2, user_id: 1, titre: "Séance kiné épaule", date: "2026-04-28", heure: "11:00", type: "paramedical", cout: 16, lieu: "Cabinet kiné Paris 11e", statut: "passé" }
  ],

  tasks: [
    { id: 1, user_id: 1, titre: "Préparer déclaration impôts", priorite: 4, urgence: 3, echeance: "2026-05-31", duree_min: 120, reportable: true, statut: "en_attente" },
    { id: 2, user_id: 1, titre: "Envoyer CV pour poste Lyon", priorite: 3, urgence: 2, echeance: "2026-06-15", duree_min: 45, reportable: true, statut: "en_attente" },
    { id: 3, user_id: 1, titre: "Renouveler ordonnance", priorite: 5, urgence: 5, echeance: "2026-05-28", duree_min: 30, reportable: false, statut: "en_attente" },
    { id: 4, user_id: 1, titre: "Appeler mutuelle", priorite: 3, urgence: 2, echeance: "2026-06-01", duree_min: 20, reportable: true, statut: "en_attente" },
    { id: 5, user_id: 1, titre: "Ranger bureau", priorite: 2, urgence: 1, echeance: null, duree_min: 60, reportable: true, statut: "en_attente" }
  ],

  agent_decisions: [],

  agent_logs: [],

  // Catalogue des options possibles que l'agent peut choisir
  options_catalogue: [
    {
      id: "consult_medecin",
      label: "Consultation médecin généraliste",
      type: "medical",
      cout: 25,
      duree_min: 60,
      lieu: "Cabinet médical Dr Fontaine, Paris 11e",
      disponibilite: "demain 9h-18h",
      urgence_sante_score: 9,
      impact_bienetre: 8,
      charge_mentale: 4,
      fatigue_demandee: 3,
      description: "Consultation avec un médecin généraliste pour évaluation complète",
      tags: ["sante", "douleur", "fatigue", "symptomes"]
    },
    {
      id: "massage_recuperation",
      label: "Massage récupération corps",
      type: "bienetre",
      cout: 60,
      duree_min: 60,
      lieu: "Institut Sérénité, Paris 10e",
      disponibilite: "après-demain 14h ou 16h",
      urgence_sante_score: 3,
      impact_bienetre: 9,
      charge_mentale: 1,
      fatigue_demandee: 1,
      description: "Massage relaxant pour la récupération musculaire et le bien-être",
      tags: ["massage", "detente", "bienetre", "corps"]
    },
    {
      id: "repos_protege",
      label: "Repos protégé — créneau calme",
      type: "gratuit",
      cout: 0,
      duree_min: 120,
      lieu: "Domicile",
      disponibilite: "aujourd'hui ou demain",
      urgence_sante_score: 5,
      impact_bienetre: 7,
      charge_mentale: 1,
      fatigue_demandee: 0,
      description: "Bloc de temps libre protégé, sans tâches, pour récupérer",
      tags: ["repos", "fatigue", "gratuit", "energie"]
    },
    {
      id: "soutien_psy",
      label: "Consultation soutien psychologique",
      type: "medical",
      cout: 0,
      duree_min: 50,
      lieu: "MonPsy (remboursé sécu), en ligne ou présentiel",
      disponibilite: "cette semaine",
      urgence_sante_score: 7,
      impact_bienetre: 9,
      charge_mentale: 3,
      fatigue_demandee: 2,
      description: "Soutien psy via dispositif MonPsy, remboursé par l'Assurance Maladie",
      tags: ["stress", "anxiete", "psy", "mental", "gratuit"]
    },
    {
      id: "gyneco",
      label: "Consultation gynécologique",
      type: "medical",
      cout: 25,
      duree_min: 45,
      lieu: "Dr Renard, gynécologue Paris 12e",
      disponibilite: "semaine prochaine",
      urgence_sante_score: 7,
      impact_bienetre: 7,
      charge_mentale: 3,
      fatigue_demandee: 2,
      description: "Consultation gynécologique de suivi ou à la demande",
      tags: ["gyneco", "sante", "femme", "suivi"]
    },
    {
      id: "report_taches",
      label: "Report des tâches non urgentes",
      type: "organisation",
      cout: 0,
      duree_min: 10,
      lieu: "Application agenda",
      disponibilite: "immédiat",
      urgence_sante_score: 0,
      impact_bienetre: 6,
      charge_mentale: -3,
      fatigue_demandee: 0,
      description: "Dégager mentalement en repoussant les tâches non critiques",
      tags: ["organisation", "agenda", "charge_mentale", "gratuit"]
    },
    {
      id: "yoga_doux",
      label: "Séance yoga doux (vidéo gratuite)",
      type: "bienetre",
      cout: 0,
      duree_min: 30,
      lieu: "Domicile — YouTube",
      disponibilite: "immédiat",
      urgence_sante_score: 2,
      impact_bienetre: 7,
      charge_mentale: 1,
      fatigue_demandee: 2,
      description: "Yoga doux guidé en ligne, idéal pour fatigue légère et stress",
      tags: ["sport_doux", "gratuit", "detente", "energie"]
    },
    {
      id: "massage_dos",
      label: "Massage thérapeutique dos",
      type: "bienetre",
      cout: 45,
      duree_min: 45,
      lieu: "Cabinet paramédical Bien-être, Paris 9e",
      disponibilite: "demain 15h",
      urgence_sante_score: 4,
      impact_bienetre: 8,
      charge_mentale: 1,
      fatigue_demandee: 1,
      description: "Massage ciblé dos et nuque pour tensions et douleurs",
      tags: ["massage", "douleur", "dos", "corps"]
    }
  ]
};

// Données de session courante (sera peuplé par l'agent)
const SESSION = {
  user: DB.users[0],
  decisions_history: [],
  current_decision: null
};

// Export global
window.DB = DB;
window.SESSION = SESSION;
