// =========================================================
// CASA 3D · diseño conceptual (no es una obra real)
// Three.js solo se descarga cuando la sección se acerca a la pantalla,
// así la web carga igual de rápido que antes.
// =========================================================
(function () {
  'use strict';

  const visor = document.getElementById('casa3d-visor');
  if (!visor) return;

  // ✏️ Textos de cada punto (puedes cambiarlos aquí)
  const ZONAS = {
    cocina: {
      titulo: 'Cocina',
      texto: 'Cocinas abiertas al salón, con isla, encimeras resistentes y electrodomésticos integrados. Diseñamos la distribución y la montamos de principio a fin.',
      pos: [-4.5, 1.9, 1.6],
      mira: [0, 0, 1]   // se ve cuando la fachada delantera mira a la cámara
    },
    bano: {
      titulo: 'Baño',
      texto: 'Platos de ducha a ras de suelo, mamparas de cristal, muebles suspendidos y alicatado de gran formato. Un baño de hotel en tu casa.',
      pos: [3.6, 5.3, 1],
      mira: [0, 0, 1]
    },
    salon: {
      titulo: 'Salón',
      texto: 'Quitamos tabiques, ampliamos huecos y renovamos suelos, pintura e iluminación para ganar espacio y luz natural.',
      pos: [1.8, 1.9, 1.6],
      mira: [0, 0, 1]
    },
    exterior: {
      titulo: 'Exterior',
      texto: 'Terrazas, fachadas, tarimas y zonas exteriores pensadas para disfrutar de tu casa también al aire libre.',
      pos: [4.5, 1.1, 7.8]
    }
  };

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esMovil = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;

  // ---- Carga diferida: espera a que la sección esté cerca ----
  const observadorCarga = new IntersectionObserver((entradas) => {
    if (entradas[0].isIntersecting) {
      observadorCarga.disconnect();
      cargar();
    }
  }, { rootMargin: '400px 0px' });
  observadorCarga.observe(visor);

  function hayWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }

  function mostrarError(mensaje) {
    const carga = visor.querySelector('.casa3d__carga');
    carga.classList.add('casa3d__carga--error');
    carga.textContent = mensaje;
  }

  async function cargar() {
    if (!hayWebGL()) {
      mostrarError('Tu navegador no puede mostrar el modelo 3D.');
      return;
    }
    try {
      const [THREE, controles, entorno] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/environments/RoomEnvironment.js')
      ]);
      montar(THREE, controles.OrbitControls, entorno.RoomEnvironment);
    } catch (error) {
      console.error(error);
      mostrarError('No se ha podido cargar el modelo 3D. Comprueba tu conexión.');
    }
  }

  // =========================================================
  function montar(THREE, OrbitControls, RoomEnvironment) {
    // ---- Motor de dibujo ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, esMovil ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    visor.prepend(renderer.domElement);

    const escena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    escena.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();

    // ---- Materiales ----
    const M = (color, opc = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, envMapIntensity: 0.35 }, opc));
    const mat = {
      blanco: M(0xf4f0e8),
      piedra: M(0xe2dace),
      madera: M(0x8f5f3a, { roughness: 0.7 }),
      maderaClara: M(0xc29467, { roughness: 0.75 }),
      oscuro: M(0x262b2d, { roughness: 0.45, metalness: 0.4 }),
      vidrio: new THREE.MeshStandardMaterial({
        color: 0xa8d0d8, transparent: true, opacity: 0.3, roughness: 0.05,
        metalness: 0.3, envMapIntensity: 1.2, depthWrite: false
      }),
      interior: M(0xffe2b5, { emissive: 0xffb15c, emissiveIntensity: 0.5 }),
      agua: new THREE.MeshStandardMaterial({
        color: 0x38b3c6, roughness: 0.05, metalness: 0.1, envMapIntensity: 1,
        emissive: 0x0b5a68, emissiveIntensity: 0.35
      }),
      cesped: M(0x67a83a, { roughness: 1, envMapIntensity: 0.2 }),
      base: M(0x1f3a2e, { roughness: 0.9 }),
      sofa: M(0x3f4d46),
      hojaOscura: M(0x1e6b2a, { flatShading: true }),
      hoja: M(0x2f8a35, { flatShading: true }),
      hojaLima: M(0x7cc242, { flatShading: true }),
      tronco: M(0x5a3d2b)
    };

    const geoCaja = new THREE.BoxGeometry(1, 1, 1);
    const casa = new THREE.Group();
    const jardin = new THREE.Group();
    escena.add(casa, jardin);

    // Crea una caja: posición [x, y de la base, z] y tamaño [ancho, alto, fondo]
    function caja(m, [x, y, z], [w, h, d], opc = {}) {
      const malla = new THREE.Mesh(geoCaja, m);
      malla.scale.set(w, h, d);
      malla.position.set(x, y + h / 2, z);
      malla.castShadow = opc.sombra !== false;
      malla.receiveShadow = true;
      if (opc.transparente) malla.userData.transparente = true;
      (opc.grupo || casa).add(malla);
      return malla;
    }
    const cristal = (pos, tam) => caja(mat.vidrio, pos, tam, { sombra: false, transparente: true });

    const G = 0.1; // altura del césped

    // ---- Base tipo maqueta y césped ----
    const base = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.4, 0.9, 72), mat.base);
    base.position.y = -0.45 + G - 0.1;
    base.receiveShadow = true;
    jardin.add(base);
    const cesped = new THREE.Mesh(new THREE.CylinderGeometry(14.7, 14.7, 0.1, 72), mat.cesped);
    cesped.position.y = G - 0.05;
    cesped.receiveShadow = true;
    jardin.add(cesped);

    // ---- Planta baja ----
    const F0 = G + 0.3;
    caja(mat.piedra, [-1, G, -0.5], [12.4, 0.3, 7.4]);                // suelo
    caja(mat.blanco, [-1, F0, -3.85], [12, 3, 0.3]);                  // pared trasera
    caja(mat.blanco, [-6.85, F0, -0.5], [0.3, 3, 7]);                 // pared izquierda
    caja(mat.madera, [4.85, F0, -0.5], [0.3, 3, 7]);                  // pared derecha (madera)
    caja(mat.interior, [-1, F0 + 0.15, -3.66], [11.3, 2.7, 0.05], { sombra: false }); // luz cálida interior
    cristal([-1, F0, 2.9], [11.4, 3, 0.06]);                          // gran ventanal
    for (const x of [-6.6, -4.3, -2, 0.3, 2.6, 4.6]) caja(mat.oscuro, [x, F0, 2.9], [0.08, 3, 0.12]);
    caja(mat.oscuro, [-1, F0, 2.9], [11.6, 0.08, 0.14]);
    caja(mat.oscuro, [-1, F0 + 2.92, 2.9], [11.6, 0.08, 0.14]);
    caja(mat.blanco, [-1, F0 + 3, -0.5], [13, 0.4, 8.2]);             // forjado con vuelo

    // Muebles que se ven a través del cristal
    caja(mat.madera, [-4.6, F0, -3.35], [3.6, 2.4, 0.6]);             // columnas de cocina
    caja(mat.blanco, [-4.6, F0, 0], [2.6, 0.9, 1]);                   // isla
    caja(mat.oscuro, [-4.6, F0 + 0.9, 0], [2.7, 0.06, 1.1]);
    caja(mat.sofa, [1.8, F0, -0.6], [3, 0.45, 1.1]);                  // sofá
    caja(mat.sofa, [1.8, F0, -1.15], [3, 0.95, 0.3]);
    caja(mat.maderaClara, [1.8, F0, 0.6], [1.4, 0.35, 0.7]);          // mesa baja

    // ---- Planta alta (en voladizo) ----
    const U0 = F0 + 3.4;
    caja(mat.blanco, [6.75, F0 + 3, -0.6], [2.5, 0.4, 6]);            // forjado del voladizo
    caja(mat.blanco, [3, U0, -3.35], [10, 3, 0.3]);                   // pared trasera
    caja(mat.blanco, [-1.85, U0, -0.65], [0.3, 3, 5.7]);              // pared izquierda
    caja(mat.madera, [7.85, U0, -0.65], [0.3, 3, 5.7]);               // pared derecha (madera)
    caja(mat.blanco, [3, U0, 2.05], [10, 0.6, 0.3]);                  // antepecho
    caja(mat.interior, [3, U0 + 0.6, -3.16], [9.4, 2.2, 0.05], { sombra: false });
    cristal([2.9, U0 + 0.6, 2.05], [9.4, 2.4, 0.06]);
    for (const x of [-1.6, 0.8, 3.2, 5.5]) caja(mat.oscuro, [x, U0 + 0.6, 2.05], [0.08, 2.4, 0.12]);
    for (let x = 5.7; x <= 7.6; x += 0.27) caja(mat.madera, [x, U0 + 0.6, 2.32], [0.08, 2.4, 0.14]); // lamas de madera
    caja(mat.blanco, [3, U0 + 3, -0.65], [10.8, 0.3, 6.6]);           // cubierta

    caja(mat.blanco, [1, U0, -1.6], [2, 0.5, 2.2]);                   // cama
    caja(mat.madera, [1, U0, -2.85], [2.2, 1.1, 0.15]);
    caja(mat.blanco, [3.6, U0, -1.2], [1.7, 0.6, 0.85]);              // bañera exenta

    // ---- Terraza sobre la planta baja ----
    caja(mat.maderaClara, [-4.6, F0 + 3.4, -0.5], [4.9, 0.06, 7.6]);
    cristal([-4.6, F0 + 3.46, 3.55], [5.2, 1, 0.04]);
    cristal([-7.45, F0 + 3.46, -0.5], [0.04, 1, 8.1]);
    caja(mat.oscuro, [-4.6, F0 + 4.46, 3.55], [5.2, 0.05, 0.06]);
    caja(mat.oscuro, [-7.45, F0 + 4.46, -0.5], [0.06, 0.05, 8.1]);
    caja(mat.blanco, [-5.6, F0 + 3.46, 0.6], [0.7, 0.3, 1.8]);        // tumbonas
    caja(mat.blanco, [-4.4, F0 + 3.46, 0.6], [0.7, 0.3, 1.8]);
    caja(mat.oscuro, [-6.6, F0 + 3.46, -3.5], [0.8, 0.6, 0.8]);       // jardinera

    // ---- Porche, piscina y tarima ----
    caja(mat.piedra, [-1, G, 4.4], [12.4, 0.3, 2.8], { grupo: jardin });
    caja(mat.maderaClara, [4.5, G, 6.0], [10, 0.3, 0.4], { grupo: jardin });
    caja(mat.maderaClara, [4.5, G, 9.9], [10, 0.3, 1], { grupo: jardin });
    caja(mat.maderaClara, [0, G, 7.8], [1, 0.3, 3.4], { grupo: jardin });
    caja(mat.maderaClara, [9, G, 7.8], [1, 0.3, 3.4], { grupo: jardin });
    const agua = caja(mat.agua, [4.5, G, 7.8], [8, 0.24, 3.4], { sombra: false, grupo: jardin });
    caja(mat.blanco, [2.2, G + 0.3, 9.9], [1.8, 0.22, 0.6], { grupo: jardin }); // tumbonas
    caja(mat.blanco, [4.5, G + 0.3, 9.9], [1.8, 0.22, 0.6], { grupo: jardin });

    // Sombrilla
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mat.oscuro);
    palo.position.set(7.2, G + 1.5, 9.9);
    const tela = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 8), mat.blanco);
    tela.position.set(7.2, G + 2.75, 9.9);
    palo.castShadow = tela.castShadow = true;
    jardin.add(palo, tela);

    // Camino de piedras
    for (let z = 6.6; z <= 12.4; z += 1.15) caja(mat.piedra, [-4.6, G, z], [1.4, 0.06, 0.75], { grupo: jardin, sombra: false });

    // ---- Vegetación ----
    const geoTronco = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6);
    const geoCopa = new THREE.IcosahedronGeometry(1.3, 0);
    const geoCipres = new THREE.ConeGeometry(0.75, 3.6, 7);

    function arbol(x, z, s, tipo) {
      const tronco = new THREE.Mesh(geoTronco, mat.tronco);
      tronco.scale.setScalar(s);
      tronco.position.set(x, G + 0.8 * s, z);
      tronco.castShadow = true;
      jardin.add(tronco);
      if (tipo === 'cipres') {
        const copa = new THREE.Mesh(geoCipres, mat.hojaOscura);
        copa.scale.setScalar(s);
        copa.position.set(x, G + 2.9 * s, z);
        copa.castShadow = true;
        jardin.add(copa);
      } else {
        const copa = new THREE.Mesh(geoCopa, tipo === 'lima' ? mat.hojaLima : mat.hoja);
        copa.scale.set(s, s * 1.1, s);
        copa.position.set(x, G + 2.6 * s, z);
        copa.rotation.y = x;
        copa.castShadow = true;
        jardin.add(copa);
      }
    }
    arbol(-11, -3, 1.2, 'normal');
    arbol(-10.5, 3.5, 1, 'lima');
    arbol(-11, 7, 0.9, 'cipres');
    arbol(11, -3.5, 1.15, 'normal');
    arbol(12, 2.5, 0.95, 'cipres');
    arbol(11.5, 6.5, 0.85, 'lima');
    arbol(-4, -8.5, 1.1, 'lima');
    arbol(5, -9, 1.2, 'normal');
    arbol(9, -7.5, 1, 'cipres');

    caja(mat.hojaOscura, [-1, G, -6.4], [14, 1.1, 1], { grupo: jardin }); // seto trasero
    const geoArbusto = new THREE.IcosahedronGeometry(0.55, 0);
    for (const [x, z] of [[-8.4, -2.5], [-8.6, -0.8], [-8.4, 1], [-8.5, 2.7], [-6.6, -3.5]]) {
      const arbusto = new THREE.Mesh(geoArbusto, mat.hojaLima);
      const enTerraza = x === -6.6 && z < 0;
      arbusto.position.set(x, enTerraza ? F0 + 4.3 : G + 0.45, z);
      arbusto.castShadow = true;
      (enTerraza ? casa : jardin).add(arbusto);
    }

    // ---- Luces ----
    escena.add(new THREE.HemisphereLight(0xfff4e0, 0x3d5a2e, 0.7));
    const sol = new THREE.DirectionalLight(0xffe2b8, 2.4);
    sol.position.set(-14, 24, 16);
    sol.castShadow = true;
    sol.shadow.mapSize.set(esMovil ? 1024 : 2048, esMovil ? 1024 : 2048);
    Object.assign(sol.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 80 });
    sol.shadow.bias = -0.0005;
    sol.shadow.normalBias = 0.03;
    escena.add(sol);
    for (const [x, y, z] of [[-3, F0 + 2.5, 0.5], [2.5, F0 + 2.5, 0.5], [3, U0 + 2.4, -0.5]]) {
      const luz = new THREE.PointLight(0xffb867, 14, 9, 2);
      luz.position.set(x, y, z);
      escena.add(luz);
    }

    // ---- Cámara y control con ratón / dedo ----
    const camara = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
    const controles = new OrbitControls(camara, renderer.domElement);
    controles.target.set(0.5, 2.4, 2);
    camara.position.set(0.5 + 30, 2.4 + 20, 2 + 36);
    controles.enablePan = false;
    controles.enableZoom = false;          // la rueda sigue moviendo la página
    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    controles.rotateSpeed = 0.6;
    controles.minPolarAngle = 0.8;
    controles.maxPolarAngle = 1.3;         // nunca por debajo del suelo
    controles.autoRotate = !reducirMovimiento;
    controles.autoRotateSpeed = 0.6;
    // En el móvil: deslizar en horizontal gira la casa, en vertical mueve la página
    renderer.domElement.style.touchAction = 'pan-y';

    // ---- Tamaño y encuadre ----
    let ancho = 1, alto = 1;
    function ajustarTamano() {
      ancho = visor.clientWidth;
      alto = visor.clientHeight;
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      const distancia = camara.aspect < 1.1 ? 47 : 45;
      const dir = camara.position.clone().sub(controles.target).normalize();
      camara.position.copy(controles.target).addScaledVector(dir, distancia);
    }
    ajustarTamano();
    new ResizeObserver(ajustarTamano).observe(visor);

    // ---- Puntos sobre el modelo ----
    // Un punto interior solo se muestra cuando su fachada mira hacia la cámara
    const v = new THREE.Vector3();
    const puntos = [...visor.querySelectorAll('.punto')].map((btn) => {
      const zona = ZONAS[btn.dataset.zona];
      return {
        btn,
        zona: btn.dataset.zona,
        pos: new THREE.Vector3(...zona.pos),
        mira: zona.mira ? new THREE.Vector3(...zona.mira) : null,
        oculto: null
      };
    });

    function actualizarPuntos() {
      for (const p of puntos) {
        v.copy(p.pos).project(camara);
        const x = (v.x * 0.5 + 0.5) * ancho;
        const y = (-v.y * 0.5 + 0.5) * alto;
        p.btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        let oculto = false;
        if (p.mira) {
          v.copy(camara.position).sub(p.pos).normalize();
          oculto = v.dot(p.mira) < 0.2;
        }
        if (oculto !== p.oculto) {
          p.oculto = oculto;
          p.btn.classList.toggle('oculto', oculto);
        }
      }
    }

    // ---- Tarjeta de información ----
    const info = visor.querySelector('.casa3d__info');
    const pista = visor.querySelector('.casa3d__pista');
    let temporizador;

    function reanudarGiro() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (info.hidden) controles.autoRotate = !reducirMovimiento;
      }, 4000);
    }
    function pausarGiro() {
      clearTimeout(temporizador);
      controles.autoRotate = false;
      pista.classList.add('oculta');
    }
    function abrir(zona) {
      info.querySelector('h3').textContent = ZONAS[zona].titulo;
      info.querySelector('p').textContent = ZONAS[zona].texto;
      info.hidden = false;
      puntos.forEach((p) => p.btn.classList.toggle('activo', p.zona === zona));
      pausarGiro();
    }
    function cerrar() {
      info.hidden = true;
      puntos.forEach((p) => p.btn.classList.remove('activo'));
      reanudarGiro();
    }
    puntos.forEach((p) => p.btn.addEventListener('click', () => abrir(p.zona)));
    info.querySelector('.casa3d__cerrar').addEventListener('click', cerrar);
    controles.addEventListener('start', pausarGiro);
    controles.addEventListener('end', () => { if (info.hidden) reanudarGiro(); });

    // ---- Animación: solo cuando la sección se ve ----
    const reloj = new THREE.Clock();
    let animando = false;
    let seVe = true;

    function bucle() {
      if (!animando) return;
      requestAnimationFrame(bucle);
      mat.agua.emissiveIntensity = 0.32 + Math.sin(reloj.getElapsedTime() * 1.5) * 0.05;
      controles.update();
      renderer.render(escena, camara);
      actualizarPuntos();
    }
    function comprobar() {
      const debe = seVe && !document.hidden;
      if (debe && !animando) { animando = true; bucle(); }
      if (!debe) animando = false;
    }
    new IntersectionObserver((e) => { seVe = e[0].isIntersecting; comprobar(); }).observe(visor);
    document.addEventListener('visibilitychange', comprobar);

    // Primer dibujo y mostrar los controles
    controles.update();
    renderer.render(escena, camara);
    actualizarPuntos();
    visor.querySelector('.casa3d__carga').remove();
    visor.classList.add('casa3d__visor--listo');
    pista.classList.remove('oculta');
    comprobar();
  }
})();
