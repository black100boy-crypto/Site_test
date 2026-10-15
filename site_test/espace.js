const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ===== Réglages de Nova (IA optionnelle) ===== */
// mode : 'ollama' (IA locale sur ton PC), 'serveur' (ton propre serveur), 'aucun' (désactivée)
const NOVA = { mode: 'ollama', url: 'http://localhost:11434/api/chat', model: 'llama3.2' };
const SYS = {
  apprenant: "Tu es Nova, l'assistante IA de la plateforme E-school (Cameroun). Tu es une tutrice expérimentée et autonome. Réponds en français clair, adapté au niveau de l'élève. Guide plutôt que de donner la réponse toute faite : explique la méthode étape par étape, donne un exemple, puis propose un mini-exercice. Vérifie ton raisonnement, dis honnêtement quand tu n'es pas sûre, et ne pose une question que si elle est indispensable.",
  enseignant: "Tu es Nova, l'assistante IA de la plateforme E-school (Cameroun), experte en pédagogie. Tu aides les enseignants à préparer des cours, des plans de séance, des exercices avec corrigés et des grilles d'évaluation. Prends des initiatives : propose une structure complète, des variantes selon le niveau et les points de vigilance. Réponds en français, de façon claire et professionnelle."
};
const PUCES = {
  apprenant: ['Explique-moi ce chapitre', 'Donne-moi un exercice', 'Corrige mon travail', 'Fais-moi un résumé'],
  enseignant: ['Prépare un plan de cours', 'Crée un quiz avec corrigé', "Propose une grille d'évaluation", "Idées d'activités"]
};
const BIENVENUE = {
  apprenant: "Salut, je suis Nova 🚀 Ton assistante d'étude. Pose-moi une question ou choisis une suggestion ci-dessous.",
  enseignant: "Bonjour, je suis Nova 🚀 Je peux t'aider à préparer cours, exercices et évaluations."
};

/* ===== Services ===== */
const SERVICES = {
  cours: { nom: 'Cours en ligne', ic: '📚', onglets: [['programmes', '📚 Mes programmes'], ['atelier', '🛠 Atelier']] },
  soutien: { nom: 'Soutien scolaire individuel', ic: '🧑‍🏫', onglets: [['seance', '🗓 Ma séance'], ['suivi', '📈 Mon suivi'], ['atelier', '🛠 Atelier']] },
  direct: { nom: 'Tutorat en direct', ic: '🎥', onglets: [['planning', '📅 Planning'], ['replays', '⏺ Replays'], ['atelier', '🛠 Atelier']] },
  formation: { nom: 'Formation avec certificat', ic: '🏅', onglets: [['parcours', '🧭 Mon parcours'], ['certificat', '🏅 Certificat'], ['atelier', '🛠 Atelier']] }
};
const DESC = {
  cours: 'Accède à tes programmes et avance à ton rythme.',
  soutien: 'Un accompagnement individuel pour combler tes lacunes.',
  direct: 'Réserve tes sessions en direct avec les enseignants.',
  formation: 'Suis ton parcours complet et décroche ton certificat.'
};

/* ===== Contenus (à remplacer par les tiens) ===== */
const COURS = [
  { id: 'maths', ic: '➗', nom: 'Mathématiques', ch: ['Nombres et fractions', 'Équations', 'Géométrie', 'Statistiques'] },
  { id: 'fr', ic: '📖', nom: 'Français', ch: ['Grammaire', 'Conjugaison', 'Expression écrite', 'Analyse de texte'] },
  { id: 'en', ic: '🌍', nom: 'Anglais', ch: ['Basic grammar', 'Vocabulary', 'Reading', 'Speaking'] },
  { id: 'info', ic: '💻', nom: 'Informatique', ch: ['Bases du numérique', 'Réseaux', 'Maintenance', 'Programmation'] },
  { id: 'sci', ic: '🔬', nom: 'Sciences', ch: ['Matière et énergie', 'Le vivant', 'Électricité', 'Environnement'] }
];
const FORMATION = ['Module 1 — Fondamentaux', 'Module 2 — Pratique guidée', 'Module 3 — Approfondissement', 'Module 4 — Projet', 'Module 5 — Évaluation finale'];
const SESSIONS = [
  { id: 's1', titre: 'Mathématiques — Équations', quand: 'Lundi 18h00', lien: '' },
  { id: 's2', titre: 'Français — Expression écrite', quand: 'Mercredi 17h00', lien: '' },
  { id: 's3', titre: 'Anglais — Speaking', quand: 'Vendredi 18h30', lien: '' }
];
const REPLAYS = [{ titre: 'Géométrie — séance 1', lien: '' }, { titre: 'Grammaire — révision', lien: '' }];

/* ===== État ===== */
let E = {};
try { E = JSON.parse(localStorage.getItem('eschool') || '{}'); } catch (e) {}
E.fait = E.fait || {}; E.notes = E.notes || {}; E.sess = E.sess || {}; E.dem = E.dem || []; E.suivi = E.suivi || '';
const save = () => { try { localStorage.setItem('eschool', JSON.stringify(E)); } catch (e) {} };
let service = null;
try { service = localStorage.getItem('eschool_service'); } catch (e) {}
if (!SERVICES[service]) service = null;
const cur = { c: COURS[0], i: 0 };
let page = 'accueil';
let fb = null;

const pct = c => Math.round(100 * c.ch.filter((_, i) => E.fait[c.id + ':' + i]).length / c.ch.length);
const chF = () => COURS.reduce((n, c) => n + c.ch.filter((_, i) => E.fait[c.id + ':' + i]).length, 0);
const chT = () => COURS.reduce((n, c) => n + c.ch.length, 0);
const fm = () => FORMATION.filter((_, i) => E.fait['f:' + i]).length;
const nbSess = () => Object.values(E.sess).filter(Boolean).length;

const STATS = {
  cours: () => [['Programmes', COURS.length], ['Chapitres terminés', chF() + '/' + chT()], ['Progression', Math.round(100 * chF() / chT()) + '%']],
  soutien: () => [['Demandes envoyées', E.dem.length], ['Matières entamées', COURS.filter(c => pct(c) > 0).length], ['Progression', Math.round(100 * chF() / chT()) + '%']],
  direct: () => [['Sessions réservées', nbSess()], ['Sessions à venir', SESSIONS.length], ['Replays', REPLAYS.length]],
  formation: () => [['Modules terminés', fm() + '/' + FORMATION.length], ['Progression', Math.round(100 * fm() / FORMATION.length) + '%'], ['Certificat', fm() === FORMATION.length ? 'Débloqué 🏅' : 'À débloquer']]
};

const carteCours = c => `<div class="carte"><div class="ic">${c.ic}</div><h3>${c.nom}</h3>
  <div class="barre"><i style="width:${pct(c)}%"></i></div><small>${pct(c)}% terminé</small><br>
  <button class="btn" data-ouvrir="${c.id}">Ouvrir l'atelier</button></div>`;

/* ===== Pages ===== */
const PAGES = {
  choix: () => `<p class="sous">Choisis le service que tu veux suivre :</p><div class="grille">` +
    Object.entries(SERVICES).map(([k, s]) => `<div class="carte"><div class="ic">${s.ic}</div><h3>${s.nom}</h3><button class="btn" data-service="${k}">Choisir</button></div>`).join('') + `</div>`,

  accueil: () => {
    const s = SERVICES[service];
    return `<div class="carte hero"><div><span class="badge">${s.ic} ${s.nom}</span><h2>Bonjour ${esc($('#nom').textContent)} 👋</h2><p>${DESC[service]}</p></div>
      <button class="btn" data-vue="${s.onglets[0][0]}">Continuer 🚀</button></div>
      <div class="stats">${STATS[service]().map(([a, b]) => `<div class="carte"><small>${a}</small><div class="gros">${b}</div></div>`).join('')}</div>`;
  },

  programmes: () => `<div class="grille">${COURS.map(carteCours).join('')}</div>`,

  atelier: () => {
    const { c, i } = cur;
    return `<div class="atelier"><div class="carte"><div class="form"><select id="mat">${COURS.map(x => `<option value="${x.id}" ${x === c ? 'selected' : ''}>${x.ic} ${x.nom}</option>`).join('')}</select></div><br>` +
      c.ch.map((t, k) => `<label class="ch ${k === i ? 'sel' : ''}"><input type="checkbox" data-k="${k}" ${E.fait[c.id + ':' + k] ? 'checked' : ''}><span data-sel="${k}">${t}</span></label>`).join('') +
      `</div><div class="carte"><h3>${c.nom} — ${c.ch[i]}</h3>
      <textarea id="notes" placeholder="Ton espace de travail : notes, exercices, brouillons...">${esc(E.notes[c.id + ':' + i] || '')}</textarea>
      <div class="actions"><button class="btn" data-act="aide">🤖 Aide de Nova</button><button class="btn sec" data-act="exo">📝 Générer un exercice</button></div></div></div>`;
  },

  seance: () => `<div class="carte"><h3>Demander une séance individuelle</h3><div class="form">
    <label>Matière<select id="d-mat">${COURS.map(c => `<option>${c.nom}</option>`).join('')}</select></label>
    <label>Ce qui me pose problème<textarea id="d-txt" rows="4"></textarea></label>
    <label>Créneau souhaité<input id="d-cre" placeholder="Ex : samedi matin"></label>
    <button class="btn" data-act="demande">Envoyer ma demande 📲</button></div></div><h3 style="margin-top:22px">Mes demandes</h3>` +
    (E.dem.length ? E.dem.map(d => `<div class="carte ligne"><b>${esc(d.mat)}</b><small>${esc(d.date)} — ${esc(d.cre || 'créneau libre')}</small></div>`).join('') : '<p class="sous">Aucune demande pour le moment.</p>'),

  suivi: () => `<div class="grille">${COURS.map(c => `<div class="carte"><h3>${c.ic} ${c.nom}</h3><div class="barre"><i style="width:${pct(c)}%"></i></div><small>${pct(c)}% terminé</small></div>`).join('')}</div>
    <div class="carte"><h3>Mes objectifs et points à améliorer</h3><div class="form"><textarea id="suivi" rows="5" placeholder="Écris tes objectifs...">${esc(E.suivi)}</textarea></div></div>`,

  planning: () => `<p class="sous">Réserve ta place pour les prochaines sessions.</p>` + SESSIONS.map(s => `<div class="carte ligne"><div><b>${s.titre}</b><br><small>${s.quand}</small></div>
    <div class="actions"><button class="btn ${E.sess[s.id] ? '' : 'sec'}" data-sess="${s.id}">${E.sess[s.id] ? '✅ Réservé' : 'Réserver'}</button>
    ${s.lien ? `<a class="btn" href="${s.lien}" target="_blank" rel="noopener">Rejoindre</a>` : '<small>Lien bientôt</small>'}</div></div>`).join(''),

  replays: () => REPLAYS.map(r => `<div class="carte ligne"><b>${r.titre}</b>${r.lien ? `<a class="btn" href="${r.lien}" target="_blank" rel="noopener">▶ Voir</a>` : '<small>Bientôt disponible</small>'}</div>`).join(''),

  parcours: () => `<div class="carte"><h3>Ma progression : ${Math.round(100 * fm() / FORMATION.length)}%</h3><div class="barre"><i style="width:${100 * fm() / FORMATION.length}%"></i></div><br>` +
    FORMATION.map((m, k) => `<label class="ch"><input type="checkbox" data-m="${k}" ${E.fait['f:' + k] ? 'checked' : ''}><span>${m}</span></label>`).join('') + `</div>`,

  certificat: () => fm() === FORMATION.length
    ? `<div class="cert" id="cert"><small>E-school</small><h2>Certificat de réussite</h2><p>décerné à</p><h1>${esc($('#nom').textContent)}</h1><p>pour avoir terminé avec succès la formation</p><h3>Parcours certifiant E-school</h3><small>${new Date().toLocaleDateString('fr-FR')}</small></div>
       <button class="btn" data-act="imprimer">🖨 Imprimer / PDF</button>`
    : `<div class="carte verrou"><div class="ic">🔒</div><h3>Certificat verrouillé</h3><p class="sous">Termine tous les modules pour le débloquer (${FORMATION.length - fm()} restant(s)).</p><button class="btn" data-vue="parcours">Voir mon parcours</button></div>`
};

const TITRES = { choix: 'Choisir mon service', accueil: 'Centre de mission', programmes: 'Mes programmes', atelier: 'Atelier', seance: 'Ma séance de soutien', suivi: 'Mon suivi', planning: 'Planning des sessions', replays: 'Replays', parcours: 'Mon parcours', certificat: 'Mon certificat', nova: 'Nova — Assistante IA' };

function menu() {
  const base = service ? [['accueil', '🏠 Centre de mission'], ...SERVICES[service].onglets] : [];
  $('#nav').innerHTML = base.map(([k, l]) => `<button class="nav" data-vue="${k}">${l}</button>`).join('') +
    `<button class="nav" data-vue="nova">🤖 Nova (IA)</button><a class="nav" href="contact.html">💬 Support</a>` +
    (service ? `<button class="nav" data-vue="choix">🔄 Changer de service</button>` : '') +
    `<a class="nav sortie" href="index.html" id="deconnexion">⏻ Déconnexion</a>`;
}

function vue(n) {
  if (!service && n !== 'nova') n = 'choix';
  page = n;
  const nova = n === 'nova';
  $('#vue-nova').classList.toggle('cache', !nova);
  $('#vue-page').classList.toggle('cache', nova);
  if (!nova) $('#vue-page').innerHTML = PAGES[n]();
  document.querySelectorAll('.nav[data-vue]').forEach(b => b.classList.toggle('actif', b.dataset.vue === n));
  $('#titre').textContent = TITRES[n];
}

/* ===== Événements ===== */
function demande() {
  const mat = $('#d-mat').value, txt = $('#d-txt').value.trim(), cre = $('#d-cre').value.trim();
  if (!txt) { alert('Décris ce qui te pose problème.'); return; }
  E.dem.unshift({ mat, cre, date: new Date().toLocaleDateString('fr-FR') }); save();
  const t = 'Bonjour E-school, je souhaite une séance de soutien individuel.\nNom : ' + $('#nom').textContent + '\nMatière : ' + mat + '\nProblème : ' + txt + '\nCréneau : ' + (cre || 'à définir');
  window.open('https://wa.me/237690276957?text=' + encodeURIComponent(t), '_blank');
  vue('seance');
}

document.addEventListener('click', e => {
  const d = e.target.dataset;
  if (d.vue) vue(d.vue);
  if (d.service) { service = d.service; try { localStorage.setItem('eschool_service', service); } catch (x) {} menu(); vue('accueil'); }
  if (d.ouvrir) { cur.c = COURS.find(x => x.id === d.ouvrir); cur.i = 0; vue('atelier'); }
  if (d.sel) { e.preventDefault(); cur.i = +d.sel; vue('atelier'); }
  if (d.sess) { E.sess[d.sess] = !E.sess[d.sess]; save(); vue('planning'); }
  if (d.p) envoyer(d.p.startsWith('Corrige') ? contexte(d.p) : d.p);
  if (d.act === 'aide') envoyer('Je travaille sur « ' + cur.c.ch[cur.i] + ' » en ' + cur.c.nom + '. Explique-moi ce chapitre simplement, puis donne-moi un petit exercice.');
  if (d.act === 'exo') envoyer('Génère un exercice sur « ' + cur.c.ch[cur.i] + ' » en ' + cur.c.nom + ', sans donner la correction tout de suite.');
  if (d.act === 'demande') demande();
  if (d.act === 'imprimer') window.print();
  if (e.target.id === 'deconnexion' && fb) { e.preventDefault(); fb.m.signOut(fb.auth).then(() => { location.href = 'index.html'; }); }
});

document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.k !== undefined) { E.fait[cur.c.id + ':' + d.k] = e.target.checked; save(); vue(page); }
  if (d.m !== undefined) { E.fait['f:' + d.m] = e.target.checked; save(); vue(page); }
  if (e.target.id === 'mat') { cur.c = COURS.find(x => x.id === e.target.value); cur.i = 0; vue('atelier'); }
});

document.addEventListener('input', e => {
  if (e.target.id === 'notes') { E.notes[cur.c.id + ':' + cur.i] = e.target.value; save(); }
  if (e.target.id === 'suivi') { E.suivi = e.target.value; save(); }
});

/* ===== Nova ===== */
let histo = [];
const contexte = t => {
  const n = (E.notes[cur.c.id + ':' + cur.i] || '').trim();
  return n ? t + ' Voici mon travail sur « ' + cur.c.ch[cur.i] + ' » :\n' + n.slice(0, 1500) : t + " (Je n'ai encore rien écrit dans mon atelier.)";
};

function msg(qui, t) {
  const d = document.createElement('div');
  d.className = 'm ' + qui; d.textContent = t;
  $('#msgs').append(d); $('#msgs').scrollTop = 1e9;
  return d;
}

function initNova() {
  const r = $('#role').value;
  histo = []; $('#msgs').innerHTML = ''; msg('nova', BIENVENUE[r]);
  $('#puces').innerHTML = PUCES[r].map(p => `<button type="button" data-p="${p}">${p}</button>`).join('');
}
$('#role').addEventListener('change', initNova);

async function envoyer(t) {
  t = t.trim(); if (!t) return;
  vue('nova');
  msg('moi', t); histo.push({ role: 'user', content: t });
  const bulle = msg('nova', '…');
  try {
    if (NOVA.mode === 'aucun') throw new Error('desactivee');
    const sys = SYS[$('#role').value] + (service ? " L'utilisateur suit le service « " + SERVICES[service].nom + " »." : '');
    const messages = [{ role: 'system', content: sys }, ...histo.slice(-12)];
    const corps = NOVA.mode === 'ollama' ? { model: NOVA.model, messages, stream: false } : { messages };
    const r = await fetch(NOVA.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    if (r.status === 404) throw new Error('modele');
    if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json();
    const rep = NOVA.mode === 'ollama' ? d.message.content : d.reponse;
    bulle.textContent = rep; histo.push({ role: 'assistant', content: rep });
  } catch (err) {
    histo.pop();
    bulle.textContent = NOVA.mode === 'aucun' ? "Je ne suis pas encore connectée à un modèle d'IA."
      : err.message === 'modele' ? "Ollama répond, mais le modèle n'est pas installé. Tape dans un terminal : ollama pull " + NOVA.model
      : "Je n'arrive pas à joindre Ollama. Installe-le (ollama.com), lance-le, puis ouvre http://localhost:11434 : tu dois voir « Ollama is running ».";
  }
  $('#msgs').scrollTop = 1e9;
}
$('#form').addEventListener('submit', e => { e.preventDefault(); const q = $('#q'); const t = q.value; q.value = ''; envoyer(t); });

/* ===== Connexion Firebase (si configuré) ===== */
(async () => {
  try {
    const { auth } = await import('./firebase-config.js');
    const m = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    fb = { auth, m };
    m.onAuthStateChanged(auth, u => {
      if (!u) { location.href = 'connexion.html'; return; }
      $('#nom').textContent = u.displayName || 'Explorateur';
      if (page !== 'nova') vue(page);
    });
  } catch (e) { console.info('Mode démo : Firebase pas encore configuré.'); }
})();

