// =========================================
// 1. CONFIGURACIÓN E IMPORTACIONES
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, setDoc, addDoc, query, where, getDocs, deleteDoc, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDnHnAMHf0e0o_6aSbpvr6dZzl7v0fTeJk",
    authDomain: "la-gran-rankeada.firebaseapp.com",
    projectId: "la-gran-rankeada",
    storageBucket:  "la-gran-rankeada.firebasestorage.app",
    messagingSenderId: "386174297537",
    appId: "1:386174297537:web:f32ee708c809615b3c3b40"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =========================================
// SISTEMA DE SONIDOS ARCADE (BIEN ARRIBA)
// =========================================
const sfxBotones = new Audio('sonidos/botones.mp3');
const sfxInicio = new Audio('sonidos/inicio.mp3');
const sfxVotado = new Audio('sonidos/votado.mp3');
const sfxGordito = new Audio('sonidos/votogordito.mp3');

function playSound(audio) {
    audio.currentTime = 0;
    audio.play();
}

// VARIABLES GLOBALES
let usuarioLogueado = null;
const categoriasHamburguesa = [
    "Carne", "Pan", "Armado y Presentación", "Papas Fritas / Guarnición",
    "Tamaño", "Variedad", "Precio", "Velocidad de atención", "Lugar y Ambiente"
];

// =========================================
// 2. LOGIN Y SESIÓN
// =========================================
async function intentarLogin() {
    const pin = document.getElementById('pin-input').value;
    const errorMsg = document.getElementById('login-error');

    if (pin.length < 4) return;

    try {
        const docRef = doc(db, "usuarios", pin);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            usuarioLogueado = docSnap.data();
            usuarioLogueado.pin = pin; 
            localStorage.setItem('user_rankeada', JSON.stringify(usuarioLogueado));
            entrarALaApp();
        } else {
            errorMsg.style.display = 'block';
        }
    } catch (e) {
        console.error("Error al loguear: ", e);
    }
}

function entrarALaApp() {
    playSound(sfxInicio); 
    
    const vistaLogin = document.getElementById('vista-login');
    const vistaPrincipal = document.getElementById('vista-principal');

    if (vistaLogin && vistaPrincipal) {
        vistaLogin.style.display = 'none';
        vistaPrincipal.style.display = 'block';
    }
    
    const cartelSaludo = document.getElementById('user-greeting');
    if (cartelSaludo && usuarioLogueado) {
        cartelSaludo.innerText = `¡Bienvenido, ${usuarioLogueado.nombre}!`;
        cartelSaludo.style.display = 'inline-block'; 
    }

    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin && usuarioLogueado.rol === 'admin') {
        btnAdmin.style.display = 'block';
    }
}

window.onload = () => {
    const session = localStorage.getItem('user_rankeada');
    if (session) {
        usuarioLogueado = JSON.parse(session);
        entrarALaApp();
    }
    if (document.getElementById('restaurantes-container')) {
        cargarRestaurantes();
    }
    const originalOnload = window.onload;
    if (document.getElementById('podio-vacio')) {
        cargarRanking();
    }
};

// =========================================
// 3. TABLERO DE RESTAURANTES (NUBE)
// =========================================
async function cargarRestaurantes() {
    const contenedor = document.getElementById('restaurantes-container');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="text-align:center; font-weight:bold; color: var(--texto-secundario);">Cargando locales desde la nube...</p>';

    try {
        const consulta = query(collection(db, "restaurantes"), orderBy("fechaCreacion", "desc"));
        const querySnapshot = await getDocs(consulta);
        let html = '';
        
        if (querySnapshot.empty) {
            contenedor.innerHTML = '<p style="text-align:center; font-weight:bold;">No hay locales cargados. ¡Usá el panel admin!</p>';
            return;
        }

        let index = 0;

        querySnapshot.forEach((doc) => {
            const rest = doc.data();
            const idDoc = doc.id; 

           // MAGIA ANTI-BUGS: Limpiamos comillas simples y dobles para que no rompan el click
            const nombreSeguro = rest.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            let htmlMascotaNuevo = (index === 0) ? `<img src="fotos/mascota-nuevo.png" alt="Local Nuevo" class="mascota-nuevo-sello">` : '';

            // LOS DOS BOTONES JUNTOS EN LA MISMA VARIABLE
            let botonesAdmin = '';
            if (usuarioLogueado && usuarioLogueado.rol === 'admin') {
                botonesAdmin = `
                    <div class="admin-actions">
                        <button class="btn-edit-local" onclick="event.stopPropagation(); abrirPanelAdmin('${idDoc}', '${nombreSeguro}')" title="Editar local">✏️</button>
                        <button class="btn-borrar-local" onclick="event.stopPropagation(); borrarLocal('${idDoc}', '${nombreSeguro}')" title="Borrar local">🗑️</button>
                    </div>
                `;
            }
            // ACÁ INYECTAMOS LA VARIABLE CORRECTA (${botonesAdmin})
            // ACÁ INYECTAMOS LA VARIABLE CORRECTA (${botonesAdmin})
            html += `
            <div class="restaurante-card-moderna" style="position: relative; cursor: pointer;" onclick="abrirVotacion('${idDoc}', '${nombreSeguro}')">
                ${botonesAdmin}
                ${htmlMascotaNuevo}
                <div class="card-logo-container">
                    <img src="${rest.imagen}" alt="Logo ${rest.nombre}" onerror="this.onerror=null; this.src='fotos/logo-rankeada.png';">
                </div>
                <h3>${rest.nombre}</h3>
                
                <div class="card-tail">
                    <a href="javascript:void(0)" class="tail-action" title="Ver foto de la banda" onclick="event.stopPropagation(); abrirModalFotoBanda('${rest.fotoBanda || ''}', '${nombreSeguro}')">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6h3.2l1.6-2h6.4l1.6 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm8 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0-2a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                        </svg>
                    </a>
                    
                    <div class="tail-divider"></div>
                    
                    <a href="javascript:void(0)" class="tail-action" title="Ver votos" onclick="event.stopPropagation(); abrirModalVotos('${idDoc}', '${nombreSeguro}')">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                    </a>
                    
                    <div class="tail-divider"></div>
                    
                    <a href="javascript:void(0)" class="tail-action" title="Ir a votar" onclick="event.stopPropagation(); abrirVotacion('${idDoc}', '${nombreSeguro}')">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13h11.17l-4.88 4.88c-.39.39-.39 1.03 0 1.42.39.39 1.02.39 1.41 0l6.59-6.59a.996.996 0 0 0 0-1.41l-6.58-6.6a.996.996 0 1 0-1.41 1.41L16.17 11H5c-.55 0-1 .45-1 1s.45 1 1 1z"/>
                        </svg>
                    </a>
                </div>
            </div>
            `;
            index++;
        });
        contenedor.innerHTML = html;
    } catch (error) {
        console.error("Error al cargar locales:", error);
    }
}

// =========================================
// 4. PANEL ADMIN (CREAR Y BORRAR LOCALES)
// =========================================
function abrirPanelAdmin(id = null, nombre = '', fotoActual = '') {
    const titulo = document.getElementById('admin-modal-titulo');
    const inputNombre = document.getElementById('admin-nombre-local');
    const inputId = document.getElementById('admin-id-local');
    const btn = document.getElementById('btn-guardar-local');
    const btnSpan = btn.querySelector('span'); // <--- Esto es vital
    
    // Inputs de las DOS fotos y el checkbox
    const inputArchivo = document.getElementById('admin-foto-local');
    const inputArchivoBanda = document.getElementById('admin-foto-banda');
    const checkboxBorrar = document.getElementById('admin-borrar-foto-banda');
    const containerBorrar = document.getElementById('container-borrar-foto-banda');
    
    // Limpiamos siempre los inputs por si quedó algo de antes
    if (inputArchivo) inputArchivo.value = '';
    if (inputArchivoBanda) inputArchivoBanda.value = '';
    if (checkboxBorrar) checkboxBorrar.checked = false;

    const msgFoto = document.getElementById('msg-foto-opcional');
    const msgFotoBanda = document.getElementById('msg-foto-banda-opcional');

    if (id) {
        // MODO EDICIÓN
        titulo.innerText = "EDITAR LOCAL";
        inputId.value = id;
        inputNombre.value = nombre;
        if (btnSpan) btnSpan.innerText = "GUARDAR CAMBIOS";
        if (msgFoto) msgFoto.style.display = 'block';
        if (msgFotoBanda) msgFotoBanda.style.display = 'block';
        if (containerBorrar) containerBorrar.style.display = 'flex'; // Mostramos el checkbox para borrar
    } else {
        // MODO NUEVO
        titulo.innerText = "NUEVO LOCAL";
        inputId.value = "";
        inputNombre.value = "";
        if (btnSpan) btnSpan.innerText = "CARGAR A LA NUBE";
        if (msgFoto) msgFoto.style.display = 'none';
        if (msgFotoBanda) msgFotoBanda.style.display = 'none';
        if (containerBorrar) containerBorrar.style.display = 'none'; // Ocultamos el checkbox
    }

    document.getElementById('modal-admin').style.display = 'flex';
}

function cerrarPanelAdmin() {
    document.getElementById('modal-admin').style.display = 'none';
}

async function guardarLocalBD() {
    const nombre = document.getElementById('admin-nombre-local').value;
    const idEdicion = document.getElementById('admin-id-local').value;
    
    // Agarramos los inputs
    const inputArchivo = document.getElementById('admin-foto-local');
    const inputArchivoBanda = document.getElementById('admin-foto-banda');
    const checkboxBorrar = document.getElementById('admin-borrar-foto-banda');
    
    const btn = document.getElementById('btn-guardar-local');
    const btnSpan = btn.querySelector('span');

    if (!nombre) {
        mostrarAviso("Poné un nombre, Lucas.");
        return;
    }

    try {
        if (btnSpan) btnSpan.innerText = "PROCESANDO...";
        btn.disabled = true;
        
        let urlFotoFinal = null;
        let urlFotoBandaFinal = null;

        // 1. SUBIR EL LOGO A CLOUDINARY
        if (inputArchivo && inputArchivo.files.length > 0) {
            const formData = new FormData();
            formData.append("file", inputArchivo.files[0]);
            formData.append("upload_preset", "rankeada_preset");
            
            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/dvuurf2sb/image/upload`, {
                method: "POST",
                body: formData
            });
            const dataCloud = await resCloud.json();
            
            if (!dataCloud.secure_url) {
                mostrarAviso("Error al subir el logo.");
                if (btnSpan) btnSpan.innerText = "REINTENTAR";
                btn.disabled = false;
                return;
            }
            urlFotoFinal = dataCloud.secure_url;
        }

        // 2. SUBIR LA FOTO DE LA BANDA A CLOUDINARY
        if (inputArchivoBanda && inputArchivoBanda.files.length > 0) {
            if (btnSpan) btnSpan.innerText = "SUBIENDO FOTO GRUPAL...";
            const formDataBanda = new FormData();
            formDataBanda.append("file", inputArchivoBanda.files[0]);
            formDataBanda.append("upload_preset", "rankeada_preset"); 
            
            const resCloudBanda = await fetch(`https://api.cloudinary.com/v1_1/dvuurf2sb/image/upload`, {
                method: "POST",
                body: formDataBanda
            });
            const dataCloudBanda = await resCloudBanda.json();
            
            if (dataCloudBanda.secure_url) urlFotoBandaFinal = dataCloudBanda.secure_url;
        }

        // 3. GUARDAR TODO EN FIREBASE
        if (idEdicion) {
            // MODO EDICIÓN
            const docRef = doc(db, "restaurantes", idEdicion);
            const datosUpdate = { nombre: nombre };
            
            if (urlFotoFinal) datosUpdate.imagen = urlFotoFinal;
            
            // LA MAGIA DE BORRAR O ACTUALIZAR LA FOTO
            if (urlFotoBandaFinal) {
                datosUpdate.fotoBanda = urlFotoBandaFinal; // Si subió una nueva, la ponemos
            } else if (checkboxBorrar && checkboxBorrar.checked) {
                datosUpdate.fotoBanda = ""; // Si no subió nada y marcó borrar, vaciamos el campo
            }
            
            await updateDoc(docRef, datosUpdate);
            mostrarAviso("¡Local actualizado!");
        } else {
            // MODO CREAR NUEVO
            if (!urlFotoFinal) {
                mostrarAviso("Subí una foto para el logo del local.");
                if (btnSpan) btnSpan.innerText = "CARGAR A LA NUBE";
                btn.disabled = false;
                return;
            }
            
            const nuevoDoc = {
                nombre: nombre,
                imagen: urlFotoFinal,
                fechaCreacion: new Date().toISOString()
            };
            
            if (urlFotoBandaFinal) nuevoDoc.fotoBanda = urlFotoBandaFinal;
            
            await addDoc(collection(db, "restaurantes"), nuevoDoc);
            mostrarAviso("¡Local creado!");
        }

        cerrarPanelAdmin();
        cargarRestaurantes();
        
        btn.disabled = false;
        if (btnSpan) btnSpan.innerText = idEdicion ? "GUARDAR CAMBIOS" : "CARGAR A LA NUBE";

    } catch (error) {
        console.error(error);
        mostrarAviso("Error al guardar.");
        btn.disabled = false;
        if (btnSpan) btnSpan.innerText = "REINTENTAR";
    }
}

// =========================================
// FUNCIÓN PARA BORRAR (A prueba de iPhones)
// =========================================
function borrarLocal(idDoc, nombreRestaurante) {
    // 1. Creamos un modal de confirmación personalizado
    let modal = document.getElementById('modal-confirm-borrar');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirm-borrar';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '999999'; // Arriba de todo
        document.body.appendChild(modal);
    }

    // 2. Le inyectamos el diseño retro
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 320px; text-align: center;">
            <h2 style="color: #FA4D56; font-family: 'Titan One'; margin-bottom: 10px; -webkit-text-stroke: 1.5px var(--marron-oscuro);">¡CUIDADO!</h2>
            <p style="font-family: 'Nunito'; font-size: 18px; font-weight: bold; margin-bottom: 20px;">¿Seguro que querés borrar "${nombreRestaurante}" para siempre?</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="document.getElementById('modal-confirm-borrar').style.display='none'" style="flex: 1; background: #E0E0E0; border: 3px solid var(--marron-oscuro); border-radius: 12px; font-family: 'Fredoka', sans-serif; font-weight: 900; font-size: 16px; color: var(--marron-oscuro); padding: 12px; cursor: pointer; box-shadow: 2px 2px 0 var(--marron-oscuro);">CANCELAR</button>
                <button id="btn-confirmar-borrar" style="flex: 1; background: #FA4D56; border: 3px solid var(--marron-oscuro); border-radius: 12px; font-family: 'Fredoka', sans-serif; font-weight: 900; font-size: 16px; color: white; padding: 12px; cursor: pointer; box-shadow: 2px 2px 0 var(--marron-oscuro);">BORRAR</button>
            </div>
        </div>
    `;
    
    // 3. Lo mostramos
    modal.style.display = 'flex';

    // 4. Si toca BORRAR, ejecutamos la eliminación
    document.getElementById('btn-confirmar-borrar').onclick = async function() {
        modal.style.display = 'none'; // Ocultamos el modal
        try {
            await deleteDoc(doc(db, "restaurantes", idDoc));
            mostrarAviso(`¡El local "${nombreRestaurante}" fue eliminado!`);
            cargarRestaurantes();
        } catch (error) {
            console.error("Error al borrar:", error);
            mostrarAviso("Hubo un error al borrar el local.");
        }
    };
}

// =========================================
// 5. NAVEGACIÓN Y VISTAS
// =========================================
function toggleMenu() {
    playSound(sfxBotones); 
    
    const btn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('dropdown-menu');
    if(btn && menu) {
        btn.classList.toggle('active');
        menu.classList.toggle('active');
    }
}

document.addEventListener('click', function(event) {
    const container = document.querySelector('.hamburger-container');
    const btn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('dropdown-menu');
    if (container && menu && !container.contains(event.target) && menu.classList.contains('active')) {
        btn.classList.remove('active');
        menu.classList.remove('active');
    }
});

function abrirVotacion(idRestaurante, nombreRestaurante) {
    playSound(sfxBotones); 
    
    const tablero = document.getElementById('restaurantes-tablero');
    const formulario = document.getElementById('formulario-votacion');
    const tituloVotacion = document.getElementById('hamburgueseria-votar');
    const greeting = document.getElementById('user-greeting'); // <--- NUEVO
    
    if (!tablero || !formulario) return;

    localStorage.setItem('voto_en_curso_id', idRestaurante);
    localStorage.setItem('voto_en_curso_nombre', nombreRestaurante);

    if (tituloVotacion) tituloVotacion.innerText = nombreRestaurante;
    
    // OCULTAR SALUDO PARA DAR ESPACIO
    if (greeting) greeting.style.display = 'none';

    tablero.classList.add('hidden');
    tablero.classList.remove('active');
    
    formulario.classList.remove('hidden');
    formulario.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderizarCategorias();
}

function volverAlTablero() {
    try { playSound(sfxBotones); } catch(e) {}
    
    const greeting = document.getElementById('user-greeting'); 
    
    try {
        const tablero = document.getElementById('restaurantes-tablero');
        const formulario = document.getElementById('formulario-votacion');
        
        if (greeting && usuarioLogueado) greeting.style.display = 'inline-block';

        if(formulario) {
            formulario.classList.add('hidden');
            formulario.classList.remove('active');
        }
        if(tablero) {
            tablero.classList.remove('hidden');
            tablero.classList.add('active');
        }

        // LIMPIEZA EXTREMA: Destruimos la memoria del local anterior por las dudas
        localStorage.removeItem('voto_en_curso_id');
        localStorage.removeItem('voto_en_curso_nombre');
        
        // Limpiamos el comentario por si había quedado escrito
        const textarea = document.getElementById('input-destacado');
        if (textarea) textarea.value = "";

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error("Error al volver al tablero:", error);
    }
}

// =========================================
// 6. GORDITOS JORDAN (VOTACIÓN)
// =========================================
function renderizarCategorias() {
    const contenedor = document.getElementById('categorias-voting-container');
    if (!contenedor) return;

    let html = '';
    categoriasHamburguesa.forEach((cat, index) => {
        html += `
        <div class="rating-gordito-container">
            <span class="label-texto">${cat}</span>
            <div class="rating-gordito">
        `;
        
        for (let i = 10; i >= 1; i--) {
            let isHalf = (i % 2 !== 0); 
            let classHalf = isHalf ? "half" : "full";
            let valorDecimal = (i / 2).toFixed(1);

            html += `
                <input type="radio" id="cat_${index}_val_${i}" name="categoria_${index}" value="${valorDecimal}" onchange="actualizarValorGorditos(${index}, '${valorDecimal}')">
                <label for="cat_${index}_val_${i}" class="${classHalf}" title="${valorDecimal}"></label>
            `;
        }

        html += `
                <input type="radio" id="cat_${index}_val_0" name="categoria_${index}" value="0.0" onchange="actualizarValorGorditos(${index}, '0.0')">
                <label for="cat_${index}_val_0" class="btn-cero" title="Cero absoluto">0</label>
            </div>
            <span class="valor-voto" id="valor-cat-${index}">--</span>
        </div>
        `;
    });
    
    contenedor.innerHTML = html;
    
    const displayPromedio = document.getElementById('puntaje-promedio');
    if(displayPromedio) displayPromedio.innerText = "0.0";
}

function actualizarValorGorditos(indexCategoria, valorSeleccionado) {
    playSound(sfxGordito); 
    document.getElementById(`valor-cat-${indexCategoria}`).innerText = valorSeleccionado;
    calcularPromedioDinamico();
}

function calcularPromedioDinamico() {
    const seleccionados = document.querySelectorAll('.rating-gordito input[type="radio"]:checked');
    const displayPromedio = document.getElementById('puntaje-promedio');
    
    if (seleccionados.length === 0) return;

    let suma = 0;
    seleccionados.forEach(radio => suma += parseFloat(radio.value));

    const promedio = suma / seleccionados.length;
    if(displayPromedio) displayPromedio.innerText = promedio.toFixed(1);
}

// =========================================
// 7. GUARDAR VOTO EN FIREBASE
// =========================================
// =========================================
// 7. GUARDAR VOTO EN FIREBASE
// =========================================
async function guardarVoto() {
    const totalCategorias = categoriasHamburguesa.length;
    const seleccionados = document.querySelectorAll('.rating-gordito input[type="radio"]:checked');

    if (seleccionados.length < totalCategorias) {
        mostrarAviso("¡Epa! Te faltó votar algo. Si fue un desastre, clavale un 0.");
        return;
    }

    const promedioFinal = parseFloat(document.getElementById('puntaje-promedio').innerText);
    const comentario = document.getElementById('input-destacado').value;
    const idLocal = localStorage.getItem('voto_en_curso_id');
    const nombreLocal = localStorage.getItem('voto_en_curso_nombre');

    const detallesVoto = {};
    seleccionados.forEach(radio => {
        const indexCat = radio.name.split('_')[1]; 
        const nombreCat = categoriasHamburguesa[indexCat];
        detallesVoto[nombreCat] = parseFloat(radio.value);
    });

    const paqueteVoto = {
        usuario: usuarioLogueado.nombre,
        idRestaurante: idLocal, 
        nombreRestaurante: nombreLocal,
        puntajeFinal: promedioFinal,
        detalles: detallesVoto,
        destacado: comentario,
        fecha: new Date().toISOString()
    };

    try {
        const btnSubmit = document.querySelector('.btn-submit');
        btnSubmit.innerText = "ACTUALIZANDO...";
        btnSubmit.disabled = true;

        const idVotoUnico = `${usuarioLogueado.nombre.toLowerCase().replace(/\s/g, "")}_${idLocal}`;

        // Acá estaba duplicado, ahora guarda 1 sola vez
        await setDoc(doc(db, "votos", idVotoUnico), paqueteVoto);
        
        playSound(sfxVotado); 
        mostrarAviso("¡Veredicto guardado! La Gran Rankeada se actualizó.");
        
        setTimeout(() => {
            volverAlTablero();
            btnSubmit.innerText = "GUARDAR RANKEADA";
            btnSubmit.disabled = false;
        }, 2000); 

    } catch (error) {
        console.error("Error: ", error);
        mostrarAviso("Fallo de conexión. Intentá de nuevo.");
        const btnSubmit = document.querySelector('.btn-submit');
        btnSubmit.innerText = "GUARDAR RANKEADA";
        btnSubmit.disabled = false;
    }
}

// =========================================
// 8. UTILIDADES Y MODAL DE VOTOS
// =========================================
let avisoTimeout = null;

function mostrarAviso(mensaje) {
    let aviso = document.getElementById('aviso-flotante');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'aviso-flotante';
        aviso.className = 'aviso-rankeada';
        document.body.appendChild(aviso);
    }
    aviso.innerHTML = `<span>🍔</span> ${mensaje}`;
    aviso.classList.add('visible');
    
    // Si había otro cartel antes, lo frena y arranca a contar 3 seg de nuevo
    if (avisoTimeout) clearTimeout(avisoTimeout);
    avisoTimeout = setTimeout(() => aviso.classList.remove('visible'), 3000);
}

async function abrirModalVotos(idRestaurante, nombreRestaurante) {
    let modal = document.getElementById('modal-votos');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-votos';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <button class="cerrar-modal" onclick="cerrarModalVotos()">X</button>
            <h2>Votos en ${nombreRestaurante}</h2>
            <div id="lista-votos-banda" class="lista-votos-banda">
                <p style="text-align:center; font-weight:bold;">Cargando condimentos...</p>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    document.body.classList.add('modal-abierto');

    try {
        const consulta = query(collection(db, "votos"), where("idRestaurante", "==", idRestaurante));
        const resultados = await getDocs(consulta);
        
        const contenedorLista = document.getElementById('lista-votos-banda');
        
        if (resultados.empty) {
            contenedorLista.innerHTML = '<p class="sin-votos">Nadie de la banda votó acá todavía. ¡Sé el primero!</p>';
            return;
        }

        let htmlVotos = '';
        resultados.forEach((doc) => {
            const voto = doc.data();
            let detallesHtml = '';
            if (voto.detalles) {
                for (const [categoria, puntaje] of Object.entries(voto.detalles)) {
                    detallesHtml += `<div class="detalle-fila"><span>${categoria}</span> <strong>${puntaje}</strong></div>`;
                }
            }

            htmlVotos += `
            <div class="voto-card" onclick="this.classList.toggle('expandido')">
                <div class="voto-resumen">
                    <span class="voto-autor"> ${voto.usuario}</span>
                    <span class="voto-puntaje">${voto.puntajeFinal.toFixed(1)} / 5</span>
                </div>
                <div class="voto-detalles">
                    ${voto.destacado ? `<p class="voto-comentario">"${voto.destacado}"</p>` : ''}
                    <div class="voto-grilla">${detallesHtml}</div>
                </div>
            </div>`;
        });
        
        contenedorLista.innerHTML = htmlVotos;
    } catch (error) {
        console.error("Error al traer votos:", error);
        document.getElementById('lista-votos-banda').innerHTML = '<p style="color:red; text-align:center;">Hubo un error.</p>';
    }
}

function cerrarModalVotos() {
    const modal = document.getElementById('modal-votos');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('modal-abierto');
}

// =========================================
// LÓGICA DE RANKING (CÁLCULOS NAVE ESPACIAL)
// =========================================
async function cargarRanking(categoriaFiltro = 'General') {
    const podioContainer = document.getElementById('podio-vacio');
    const listaResto = document.getElementById('lista-resto');
    if (!podioContainer) return;

    podioContainer.innerHTML = "<p>Calculando promedios...</p>";
    listaResto.innerHTML = "";

    try {
        const localesSnap = await getDocs(collection(db, "restaurantes"));
        const votosSnap = await getDocs(collection(db, "votos"));

        const locales = [];
        localesSnap.forEach(d => locales.push({ id: d.id, ...d.data() }));

        const votos = [];
        votosSnap.forEach(d => votos.push(d.data()));

        const rankingData = locales.map(local => {
            const votosDelLocal = votos.filter(v => v.idRestaurante === local.id);
            
            let suma = 0;
            votosDelLocal.forEach(v => {
                if (categoriaFiltro === 'General') {
                    suma += v.puntajeFinal;
                } else {
                    suma += (v.detalles && v.detalles[categoriaFiltro]) ? v.detalles[categoriaFiltro] : 0;
                }
            });

            const promedio = votosDelLocal.length > 0 ? (suma / votosDelLocal.length) : 0;
            return { ...local, promedio: promedio };
        });

        rankingData.sort((a, b) => b.promedio - a.promedio);

        const top3 = rankingData.slice(0, 3);
        const resto = rankingData.slice(3);

        podioContainer.innerHTML = `
            <div class="podium-item top-2">
                <img src="fotos/top2-pj.png" class="podium-pj">
                <div class="pedestal">
                    <h3>${top3[1] ? top3[1].nombre : '---'}</h3>
                    <span class="nota">${top3[1] ? top3[1].promedio.toFixed(1) : '0.0'}</span>
                </div>
            </div>
            <div class="podium-item top-1">
                <img src="fotos/top1-pj.png" class="podium-pj">
                <div class="pedestal">
                    <h3>${top3[0] ? top3[0].nombre : '---'}</h3>
                    <span class="nota">${top3[0] ? top3[0].promedio.toFixed(1) : '0.0'}</span>
                </div>
            </div>
            <div class="podium-item top-3">
                <img src="fotos/top3-pj.png" class="podium-pj">
                <div class="pedestal">
                    <h3>${top3[2] ? top3[2].nombre : '---'}</h3>
                    <span class="nota">${top3[2] ? top3[2].promedio.toFixed(1) : '0.0'}</span>
                </div>
            </div>
        `;

        let restoHtml = "";
        resto.forEach((local, i) => {
            restoHtml += `
                <div class="ranking-list-item">
                    <span class="rank-number">#${i + 4}</span>
                    <span class="rank-name">${local.nombre}</span>
                    <span class="rank-score">${local.promedio.toFixed(1)}</span>
                </div>
            `;
        });
        listaResto.innerHTML = restoHtml;

    } catch (error) {
        console.error("Error en ranking:", error);
    }
}

// =========================================
// MENÚ DESPLEGABLE PERSONALIZADO (RANKING)
// =========================================
function toggleRetroDropdown() {
    const list = document.getElementById('retro-dropdown-list');
    if (list) {
        list.classList.toggle('show');
    }
}

function seleccionarFiltro(categoria, texto) {
    document.getElementById('dropdown-btn-text').innerHTML = `${texto} <span>▼</span>`;
    document.getElementById('retro-dropdown-list').classList.remove('show');
    cargarRanking(categoria);
}

document.addEventListener('click', function(e) {
    const container = document.querySelector('.retro-dropdown-container');
    const list = document.getElementById('retro-dropdown-list');
    if (container && list && !container.contains(e.target)) {
        list.classList.remove('show');
    }
});
// =========================================
// VENTANA EMERGENTE: FOTO DE LA BANDA
// =========================================
function abrirModalFotoBanda(urlFoto, nombreLocal) {
    playSound(sfxBotones);
    let modal = document.getElementById('modal-foto-banda');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-foto-banda';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '3000'; // Bien arriba
        document.body.appendChild(modal);
    }

    let contenidoHTML = '';

    // Si HAY FOTO: Mostramos la foto gigante con el recuadro naranja
    if (urlFoto && urlFoto !== 'undefined' && urlFoto !== '') {
        contenidoHTML = `
            <div style="background: var(--mostaza); padding: 15px; border-radius: 20px; border: 4px solid var(--marron-oscuro); box-shadow: 6px 6px 0px var(--marron-oscuro);">
                <img src="${urlFoto}" style="width: 100%; max-height: 60vh; object-fit: contain; border-radius: 10px; border: 3px solid var(--marron-oscuro);" alt="La banda en ${nombreLocal}">
            </div>
        `;
    } else {
        // SI NO HAY FOTO: Mostramos el mensaje copado
        contenidoHTML = `
            <div style="background: var(--mostaza); padding: 40px 20px; border-radius: 20px; border: 4px solid var(--marron-oscuro); box-shadow: 6px 6px 0px var(--marron-oscuro); text-align: center;">
                <span style="font-size: 60px;">📸🤔</span>
                <h3 style="font-family: 'Titan One'; color: var(--marron-oscuro); margin-top: 15px; font-size: 26px;">¡FALTA LA FOTO!</h3>
                <p style="font-family: 'Fredoka', sans-serif; font-weight: 700; color: var(--marron-oscuro); margin-top: 10px; font-size: 18px; opacity: 0.8;">Todavía no subieron la foto de la banda en ${nombreLocal}. ¡Avisale a Lucas que la suba!</p>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px; background: var(--bg-crema); padding: 30px; position: relative;">
            <button class="cerrar-modal" onclick="document.getElementById('modal-foto-banda').style.display='none'">X</button>
            <h2 style="font-family: 'Titan One'; color: var(--marron-oscuro); text-align: center; margin-bottom: 20px;">La Banda en ${nombreLocal}</h2>
            ${contenidoHTML}
        </div>
    `;

    modal.style.display = 'flex';
}
// =========================================
// 10. EFECTOS VISUALES EXTRA
// =========================================
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.top-nav');
    if (nav) {
        if (window.scrollY > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
});

// =========================================
// 9. EXPORTAR FUNCIONES AL HTML
// =========================================
window.intentarLogin = intentarLogin;
window.toggleMenu = toggleMenu; 
window.volverAlTablero = volverAlTablero; 
window.guardarVoto = guardarVoto;
window.abrirVotacion = abrirVotacion;
window.actualizarValorGorditos = actualizarValorGorditos;
window.abrirModalVotos = abrirModalVotos;
window.cerrarModalVotos = cerrarModalVotos;
window.mostrarAviso = mostrarAviso;
window.abrirPanelAdmin = abrirPanelAdmin;
window.cerrarPanelAdmin = cerrarPanelAdmin;
window.guardarLocalBD = guardarLocalBD; /* <--- ACÁ ESTABA EL ERROR, AHORA ESTÁ CONECTADO */
window.borrarLocal = borrarLocal;
window.toggleRetroDropdown = toggleRetroDropdown;
window.seleccionarFiltro = seleccionarFiltro;
window.sonarBotones = () => playSound(sfxBotones);
window.abrirModalFotoBanda = abrirModalFotoBanda;