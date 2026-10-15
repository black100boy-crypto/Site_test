/* Configuration E-school Jeux — à modifier avant la mise en ligne */
window.EC_CONFIG = {
  devMode: true,            // METTRE false en production (désactive les outils de test)
  blockDevtools: false,
  secret: "CHANGE-MOI-par-une-longue-phrase-secrete-eschool-2026",  // CHANGE cette phrase avant de publier
  whatsapp: "237690276957",
  premiumInfo: "Le Premium débloque les modes avancés. Contacte-nous sur WhatsApp pour obtenir ton code.",
  premiumKey: null,         // clé publique Premium (générée par l'outil générateur de codes)
  premiumGames: { arene_br: true, arene_clash: true, village: true, course_legend: true, reflexion_expert: true },
  firebase: null            // optionnel : colle ici la config Firebase pour le classement mondial
};
