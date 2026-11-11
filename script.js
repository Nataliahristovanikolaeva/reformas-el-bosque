// ===== Menú del móvil: abrir y cerrar =====
const botonMenu = document.querySelector('.menu-boton');
const menu = document.querySelector('.menu');

function cerrarMenu() {
  menu.classList.remove('abierto');
  botonMenu.setAttribute('aria-expanded', 'false');
  botonMenu.setAttribute('aria-label', 'Abrir menú');
}

botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  botonMenu.setAttribute('aria-expanded', abierto);
  botonMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});

// Cierra el menú al pulsar un enlace
menu.querySelectorAll('a').forEach((enlace) => {
  enlace.addEventListener('click', cerrarMenu);
});

// Cierra el menú al pulsar fuera de él
document.addEventListener('click', (evento) => {
  if (!menu.contains(evento.target) && !botonMenu.contains(evento.target)) cerrarMenu();
});

// ===== Sombra en la cabecera al bajar =====
const cabecera = document.querySelector('.cabecera');
const actualizarCabecera = () => cabecera.classList.toggle('con-sombra', window.scrollY > 10);
window.addEventListener('scroll', actualizarCabecera, { passive: true });
actualizarCabecera();

// ===== Formulario: envía la solicitud por WhatsApp =====
const NUMERO_WHATSAPP = '34607884179'; // ✏️ 34 + móvil, sin espacios ni "+"
const formulario = document.getElementById('formulario');
const aviso = document.getElementById('aviso');

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault(); // evita que la página se recargue

  // Quita espacios sobrantes (un campo con solo espacios cuenta como vacío)
  formulario.querySelectorAll('input, textarea').forEach((campo) => {
    campo.value = campo.value.trim();
  });

  // Si falta algún campo obligatorio, el navegador lo señala y paramos
  if (!formulario.reportValidity()) return;

  const datos = new FormData(formulario);
  const lineas = [
    'Hola, Reformas El Bosque. Quiero pedir presupuesto.',
    '',
    `*Nombre:* ${datos.get('nombre')}`,
    `*Contacto:* ${datos.get('contacto')}`,
    `*Reforma:* ${datos.get('tipo')}`
  ];
  if (datos.get('mensaje')) lineas.push(`*Mensaje:* ${datos.get('mensaje')}`);

  const enlace = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(lineas.join('\n'))}`;

  // Móvil: abre la app. Ordenador: abre WhatsApp Web en otra pestaña.
  const ventana = window.open(enlace, '_blank');
  if (ventana) {
    ventana.opener = null;
  } else {
    window.location.href = enlace; // si el navegador bloquea la pestaña nueva
  }

  aviso.hidden = false;
  formulario.reset();
});

// Oculta el aviso de "¡Listo!" si empiezan a rellenar otra solicitud
formulario.addEventListener('input', () => { aviso.hidden = true; });

// ===== Año actual en el pie de página =====
document.getElementById('anio').textContent = new Date().getFullYear();
