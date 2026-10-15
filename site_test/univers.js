const canvas = document.getElementById('etoiles');
const ctx = canvas.getContext('2d');
let w, h, etoiles = [], filantes = [];
let sourisX = 0, sourisY = 0;

function redimensionner() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  etoiles = [];
  const nombre = Math.floor((w * h) / 6000);
  for (let i = 0; i < nombre; i++) {
    const profondeur = Math.random(); // 0 = loin, 1 = proche
    etoiles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + profondeur * 1.6,
      p: profondeur,
      phase: Math.random() * Math.PI * 2,
      vitesse: 0.01 + Math.random() * 0.03
    });
  }
}

window.addEventListener('resize', redimensionner);
window.addEventListener('mousemove', function (e) {
  sourisX = (e.clientX / w - 0.5);
  sourisY = (e.clientY / h - 0.5);
});

function nouvelleFilante() {
  filantes.push({
    x: Math.random() * w,
    y: Math.random() * h * 0.5,
    vx: 6 + Math.random() * 6,
    vy: 3 + Math.random() * 3,
    vie: 1
  });
}
setInterval(function () {
  if (Math.random() < 0.6) nouvelleFilante();
}, 3500);

function dessiner() {
  ctx.clearRect(0, 0, w, h);

  etoiles.forEach(function (e) {
    e.phase += e.vitesse;
    e.y += e.p * 0.15;                 // dérive lente
    if (e.y > h) { e.y = 0; e.x = Math.random() * w; }

    const decalX = sourisX * e.p * 40;  // effet de profondeur
    const decalY = sourisY * e.p * 40;
    const lueur = 0.4 + 0.6 * Math.abs(Math.sin(e.phase));

    ctx.beginPath();
    ctx.arc(e.x + decalX, e.y + decalY, e.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + lueur + ')';
    ctx.fill();
  });

  filantes.forEach(function (f, i) {
    const queueX = f.x - f.vx * 8;
    const queueY = f.y - f.vy * 8;
    const degrade = ctx.createLinearGradient(f.x, f.y, queueX, queueY);
    degrade.addColorStop(0, 'rgba(255,255,255,' + f.vie + ')');
    degrade.addColorStop(1, 'rgba(79,195,247,0)');
    ctx.strokeStyle = degrade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(queueX, queueY);
    ctx.stroke();

    f.x += f.vx;
    f.y += f.vy;
    f.vie -= 0.015;
    if (f.vie <= 0) filantes.splice(i, 1);
  });

  requestAnimationFrame(dessiner);
}

redimensionner();
dessiner();