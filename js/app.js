// DOM Elements
const homeView = document.getElementById('home-view');
const libraryView = document.getElementById('library-view');
const projectView = document.getElementById('project-view');
const signupView = document.getElementById('signup-view');
const addProjectModal = document.getElementById('add-project-modal');
const editProjectModal = document.getElementById('edit-project-modal');
const contextMenu = document.getElementById('context-menu');
const projectsContainer = document.querySelector('.projects-container');
const libraryGrid = document.querySelector('.library-grid');
const startProjectContainer = document.querySelector('.start-project-container');
const addAudioBtn = document.querySelector('.add-audio-btn');
const addTracksBtn = document.querySelector('.add-tracks-btn');
const backButton = document.querySelector('.back-button');
const createBtn = document.querySelector('.create-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const saveEditBtn = document.querySelector('.save-edit-btn');
const cancelEditBtn = document.querySelector('.cancel-edit-btn');
const deleteProjectBtn = document.querySelector('.delete-project-btn');
const changeCoverBtn = document.querySelector('.change-cover-btn');
const editCoverBtn = document.querySelector('.edit-cover-btn');
const editProjectBtn = document.querySelector('.edit-project-btn');
const nextBtn = document.querySelector('.next-btn');
const playPauseBtn = document.querySelector('.play-pause-btn');
const playBtn = document.querySelector('.play-btn');
const miniPlayBtn = document.querySelector('.mini-play-btn');
const rewindBtn = document.querySelector('.rewind-btn');
const miniRewindBtn = document.querySelector('.mini-rewind-btn');
const forwardBtn = document.querySelector('.forward-btn');
const miniForwardBtn = document.querySelector('.mini-forward-btn');
const loopBtn = document.querySelector('.loop-btn');
const miniRepeatBtn = document.querySelector('.mini-repeat-btn');
const volumeBtn = document.querySelector('.volume-btn');
const tracksList = document.querySelector('.tracks-list');
const navTabs = document.querySelectorAll('.nav-tab');
const addTab = document.querySelector('.add-tab');
const pageTitle = document.querySelector('.page-title');
const playbackBar = document.querySelector('.playback-bar');
const playbackProject = document.querySelector('.playback-project');
const playbackProjectName = document.querySelector('.playback-project-name');
const playbackProjectStatus = document.querySelector('.playback-project-status');
const playbackTime = document.querySelector('.playback-time');
const playAllTracksOption = document.getElementById('play-all-tracks');
const editProjectOption = document.getElementById('edit-project');
const deleteProjectOption = document.getElementById('delete-project');

// Variables para el modal de acceso al directorio
const storageAccessModal = document.getElementById('storage-access-modal');
const grantStorageAccessBtn = document.querySelector('.grant-storage-access-btn');
const skipStorageAccessBtn = document.querySelector('.skip-storage-access-btn');

// State
let currentView = 'home';
let projects = [];
let currentProject = null;
let currentUser = null;
let isPlaying = false;
let currentTrack = null;
let audioContext = null;
let audioSources = {};
let isLooping = false;
let currentVolume = 1;
let currentTime = 0;
let duration = 0;
let selectedProjectForEdit = null;
let customCoverImage = null;
let newProjectCoverImage = null;

// Sistema de almacenamiento con File System Access API y caché local
let audioFileCache = {};
let audioDirectory = null;

// Función para solicitar acceso al directorio de audio
async function requestAudioDirectoryAccess() {
    try {
        // Solicitar acceso a un directorio
        audioDirectory = await window.showDirectoryPicker({
            id: 'musicLifeAudioDir',
            mode: 'readwrite',
            startIn: 'music'
        });
        
        console.log("Acceso al directorio de audio concedido");
        
        // Crear un subdirectorio para los archivos de audio si no existe
        try {
            await audioDirectory.getDirectoryHandle('audio_files', { create: true });
            console.log("Subdirectorio de audio verificado/creado");
        } catch (error) {
            console.error("Error al crear subdirectorio de audio:", error);
        }
        
        return true;
    } catch (error) {
        console.error("Error al solicitar acceso al directorio:", error);
        return false;
    }
}

// Función para guardar un archivo de audio en el sistema de archivos
async function saveAudioFileToFS(trackId, file) {
    try {
        if (!audioDirectory) {
            const granted = await requestAudioDirectoryAccess();
            if (!granted) {
                throw new Error("No se pudo acceder al directorio de audio");
            }
        }
        
        // Obtener el subdirectorio de audio
        const audioFilesDir = await audioDirectory.getDirectoryHandle('audio_files', { create: true });
        
        // Crear un archivo con el ID de la pista como nombre
        const fileHandle = await audioFilesDir.getFileHandle(`${trackId}.audio`, { create: true });
        
        // Obtener un stream de escritura
        const writable = await fileHandle.createWritable();
        
        // Escribir el contenido del archivo
        await writable.write(file);
        
        // Cerrar el stream
        await writable.close();
        
        console.log("Archivo de audio guardado en el sistema de archivos:", trackId);
        
        // Guardar en caché para acceso rápido
        const url = URL.createObjectURL(file);
        audioFileCache[trackId] = {
            url: url,
            file: file
        };
        
        return url;
    } catch (error) {
        console.error("Error al guardar archivo en el sistema de archivos:", error);
        
        // Plan B: Guardar en IndexedDB como respaldo
        try {
            await saveAudioFile(trackId, file);
            const url = URL.createObjectURL(file);
            audioFileCache[trackId] = {
                url: url,
                file: file
            };
            return url;
        } catch (dbError) {
            console.error("Error al guardar en IndexedDB:", dbError);
            throw error;
        }
    }
}

// Función para cargar un archivo de audio desde el sistema de archivos
async function loadAudioFileFromFS(trackId) {
    try {
        // Verificar si está en caché
        if (audioFileCache[trackId] && audioFileCache[trackId].url) {
            console.log("Archivo de audio encontrado en caché:", trackId);
            return audioFileCache[trackId].url;
        }
        
        if (!audioDirectory) {
            const granted = await requestAudioDirectoryAccess();
            if (!granted) {
                throw new Error("No se pudo acceder al directorio de audio");
            }
        }
        
        // Obtener el subdirectorio de audio
        const audioFilesDir = await audioDirectory.getDirectoryHandle('audio_files', { create: true });
        
        // Obtener el archivo
        const fileHandle = await audioFilesDir.getFileHandle(`${trackId}.audio`);
        
        // Leer el archivo
        const file = await fileHandle.getFile();
        
        // Crear URL para el archivo
        const url = URL.createObjectURL(file);
        
        // Guardar en caché
        audioFileCache[trackId] = {
            url: url,
            file: file
        };
        
        console.log("Archivo de audio cargado desde el sistema de archivos:", trackId);
        return url;
    } catch (error) {
        console.warn("Error al cargar archivo desde el sistema de archivos:", error);
        
        // Plan B: Intentar cargar desde IndexedDB
        try {
            const audioData = await getAudioFile(trackId);
            if (audioData && audioData.url) {
                audioFileCache[trackId] = {
                    url: audioData.url,
                    file: new Blob([audioData.file], { type: audioData.type })
                };
                return audioData.url;
            }
        } catch (dbError) {
            console.error("Error al cargar desde IndexedDB:", dbError);
        }
        
        return null;
    }
}

// Función para eliminar un archivo de audio del sistema de archivos
async function deleteAudioFileFromFS(trackId) {
    try {
        if (!audioDirectory) {
            const granted = await requestAudioDirectoryAccess();
            if (!granted) {
                throw new Error("No se pudo acceder al directorio de audio");
            }
        }
        
        // Obtener el subdirectorio de audio
        const audioFilesDir = await audioDirectory.getDirectoryHandle('audio_files', { create: true });
        
        // Eliminar el archivo
        await audioFilesDir.removeEntry(`${trackId}.audio`);
        
        // Eliminar de la caché
        if (audioFileCache[trackId]) {
            URL.revokeObjectURL(audioFileCache[trackId].url);
            delete audioFileCache[trackId];
        }
        
        console.log("Archivo de audio eliminado del sistema de archivos:", trackId);
        
        // También eliminar de IndexedDB como respaldo
        try {
            await deleteAudioFile(trackId);
        } catch (dbError) {
            console.error("Error al eliminar de IndexedDB:", dbError);
        }
        
        return true;
    } catch (error) {
        console.error("Error al eliminar archivo del sistema de archivos:", error);
        
        // Intentar eliminar solo de IndexedDB
        try {
            await deleteAudioFile(trackId);
            return true;
        } catch (dbError) {
            console.error("Error al eliminar de IndexedDB:", dbError);
            return false;
        }
    }
}

// Sistema de almacenamiento con IndexedDB
const dbName = 'musicLifeDB';
const dbVersion = 1;
let db;

// Inicializar la base de datos
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onerror = (event) => {
            console.error("Error al abrir la base de datos:", event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Base de datos inicializada correctamente");
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Crear almacén para los archivos de audio
            if (!db.objectStoreNames.contains('audioFiles')) {
                const audioStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
                console.log("Almacén de archivos de audio creado");
            }
        };
    });
}

// Guardar un archivo de audio en IndexedDB
function saveAudioFile(trackId, file) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Base de datos no inicializada"));
            return;
        }
        
        const transaction = db.transaction(['audioFiles'], 'readwrite');
        const audioStore = transaction.objectStore('audioFiles');
        
        // Convertir el archivo a un ArrayBuffer
        const reader = new FileReader();
        reader.onload = function(e) {
            const audioData = {
                id: trackId,
                file: e.target.result,
                name: file.name,
                type: file.type,
                size: file.size,
                dateAdded: new Date().toISOString()
            };
            
            const request = audioStore.put(audioData);
            
            request.onsuccess = () => {
                console.log("Archivo de audio guardado en IndexedDB:", trackId);
                resolve(trackId);
            };
            
            request.onerror = (event) => {
                console.error("Error al guardar archivo de audio:", event.target.error);
                reject(event.target.error);
            };
        };
        
        reader.onerror = (error) => {
            console.error("Error al leer el archivo:", error);
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Obtener un archivo de audio de IndexedDB
function getAudioFile(trackId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Base de datos no inicializada"));
            return;
        }
        
        const transaction = db.transaction(['audioFiles'], 'readonly');
        const audioStore = transaction.objectStore('audioFiles');
        const request = audioStore.get(trackId);
        
        request.onsuccess = (event) => {
            const audioData = event.target.result;
            if (audioData) {
                console.log("Archivo de audio recuperado de IndexedDB:", trackId);
                
                // Convertir ArrayBuffer a Blob
                const blob = new Blob([audioData.file], { type: audioData.type });
                
                // Crear URL para el blob
                const url = URL.createObjectURL(blob);
                
                resolve({
                    id: audioData.id,
                    url: url,
                    name: audioData.name,
                    type: audioData.type,
                    size: audioData.size,
                    dateAdded: audioData.dateAdded
                });
            } else {
                console.warn("Archivo de audio no encontrado en IndexedDB:", trackId);
                resolve(null);
            }
        };
        
        request.onerror = (event) => {
            console.error("Error al obtener archivo de audio:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Eliminar un archivo de audio de IndexedDB
function deleteAudioFile(trackId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Base de datos no inicializada"));
            return;
        }
        
        const transaction = db.transaction(['audioFiles'], 'readwrite');
        const audioStore = transaction.objectStore('audioFiles');
        const request = audioStore.delete(trackId);
        
        request.onsuccess = () => {
            console.log("Archivo de audio eliminado de IndexedDB:", trackId);
            resolve(true);
        };
        
        request.onerror = (event) => {
            console.error("Error al eliminar archivo de audio:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Initialize the application
initDatabase().then(() => {
    console.log("Inicializando la aplicación...");
    
    // Mostrar el modal de acceso al directorio si no tenemos acceso
    if (!audioDirectory) {
        showStorageAccessModal();
    }
    
    // Load projects from localStorage
    if (loadProjects()) {
        console.log("Proyectos cargados con éxito");
        
        // Render projects
        renderProjects();
    } else {
        console.log("No hay proyectos guardados o hubo un error al cargarlos");
        
        // Show start project container
        startProjectContainer.style.display = 'flex';
    }
    
    // Add event listeners
    addEventListeners();
    
    // Show home view by default
    showView('home');
    
    // Ocultar el reproductor circular por defecto
    hideAudioPlayer();
    
    // Inicializar el contexto de audio
    initAudioContext();
    
    console.log("Aplicación inicializada");
});

// Función para mostrar el modal de acceso al directorio
function showStorageAccessModal() {
    if (storageAccessModal) {
        storageAccessModal.style.display = 'block';
    }
}

// Función para ocultar el modal de acceso al directorio
function hideStorageAccessModal() {
    if (storageAccessModal) {
        storageAccessModal.style.display = 'none';
    }
}

// Event Listeners
function addEventListeners() {
    // Navigation
    backButton.addEventListener('click', handleBackButton);
    
    // Nav Tabs
    navTabs.forEach(tab => {
        if (!tab.classList.contains('add-tab')) {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                showView(view);
            });
        }
    });
    
    // Add Tab
    addTab.addEventListener('click', showAddProjectModal);
    
    // Home View
    addAudioBtn.addEventListener('click', showAddProjectModal);
    
    // Project View
    addTracksBtn.addEventListener('click', handleAddTrack);
    playPauseBtn.addEventListener('click', togglePlayPause);
    editProjectBtn.addEventListener('click', () => {
        if (currentProject) {
            showEditProjectModal(currentProject.id);
        }
    });
    
    // Modal de acceso al directorio
    if (grantStorageAccessBtn) {
        grantStorageAccessBtn.addEventListener('click', async () => {
            const granted = await requestAudioDirectoryAccess();
            if (granted) {
                hideStorageAccessModal();
                alert("¡Acceso concedido! Ahora tus archivos de audio se guardarán permanentemente.");
            } else {
                alert("No se pudo obtener acceso al directorio. Algunas funciones pueden no estar disponibles.");
            }
        });
    }
    
    if (skipStorageAccessBtn) {
        skipStorageAccessBtn.addEventListener('click', () => {
            hideStorageAccessModal();
            alert("Has omitido el acceso al directorio. Tus archivos de audio pueden perderse al actualizar la página.");
        });
    }
    
    // Nuevo reproductor de audio
    const newPlayerPlayBtn = document.querySelector('.player-controls .play-btn');
    const newPlayerRewindBtn = document.querySelector('.player-controls .rewind-btn');
    const newPlayerForwardBtn = document.querySelector('.player-controls .forward-btn');
    const newPlayerRepeatBtn = document.querySelector('.player-controls .repeat-btn');
    const newPlayerShareBtn = document.querySelector('.player-controls .share-btn');
    const closePlayerBtn = document.querySelector('.close-player-btn');
    const waveformContainer = document.querySelector('.waveform-container');
    
    if (newPlayerPlayBtn) {
        newPlayerPlayBtn.addEventListener('click', togglePlayPause);
    }
    
    if (newPlayerRewindBtn) {
        newPlayerRewindBtn.addEventListener('click', rewindTrack);
    }
    
    if (newPlayerForwardBtn) {
        newPlayerForwardBtn.addEventListener('click', forwardTrack);
    }
    
    if (newPlayerRepeatBtn) {
        newPlayerRepeatBtn.addEventListener('click', toggleLoop);
    }
    
    if (newPlayerShareBtn) {
        newPlayerShareBtn.addEventListener('click', () => {
            alert('Compartir canción: ' + (currentTrack ? currentTrack.name : 'No hay canción seleccionada'));
        });
    }
    
    if (closePlayerBtn) {
        closePlayerBtn.addEventListener('click', hideAudioPlayer);
    }
    
    // Permitir hacer clic en la visualización de onda para cambiar la posición de reproducción
    if (waveformContainer) {
        waveformContainer.addEventListener('click', (e) => {
            if (currentTrack && audioSources[currentTrack.id]) {
                const audio = audioSources[currentTrack.id];
                const rect = waveformContainer.getBoundingClientRect();
                const clickPosition = (e.clientX - rect.left) / rect.width;
                audio.currentTime = clickPosition * audio.duration;
                updateTimeDisplay();
                updateProgressIndicator();
            }
        });
    }
    
    // Playback Bar - Modificado para mostrar el reproductor circular al hacer clic
    playbackBar.addEventListener('click', () => {
        if (currentProject) {
            // Mostrar el reproductor circular
            showAudioPlayer();
        }
    });
    
    // Add Project Modal
    createBtn.addEventListener('click', createProject);
    cancelBtn.addEventListener('click', hideAddProjectModal);
    document.querySelector('.add-cover-btn').addEventListener('click', handleAddCover);
    
    // Edit Project Modal
    document.querySelector('.save-edit-btn').addEventListener('click', saveProjectEdit);
    document.querySelector('.cancel-edit-btn').addEventListener('click', hideEditProjectModal);
    document.querySelector('.delete-project-btn').addEventListener('click', deleteProject);
    document.querySelector('.change-cover-btn').addEventListener('click', handleChangeCover);
    
    // Context Menu
    playAllTracksOption.addEventListener('click', handlePlayAllTracks);
    editProjectOption.addEventListener('click', () => {
        if (selectedProjectForEdit) {
            showEditProjectModal(selectedProjectForEdit);
            hideContextMenu();
        }
    });
    deleteProjectOption.addEventListener('click', () => {
        if (selectedProjectForEdit) {
            deleteProjectById(selectedProjectForEdit);
            hideContextMenu();
        }
    });
    
    // Playback Controls
    playBtn.addEventListener('click', togglePlayPause);
    miniPlayBtn.addEventListener('click', togglePlayPause);
    rewindBtn.addEventListener('click', rewindTrack);
    miniRewindBtn.addEventListener('click', rewindTrack);
    forwardBtn.addEventListener('click', forwardTrack);
    miniForwardBtn.addEventListener('click', forwardTrack);
    loopBtn.addEventListener('click', toggleLoop);
    miniRepeatBtn.addEventListener('click', toggleLoop);
    volumeBtn.addEventListener('click', toggleMute);
    
    // Signup
    nextBtn.addEventListener('click', handleSignup);

    // Window events
    window.addEventListener('click', (e) => {
        if (e.target === addProjectModal) {
            hideAddProjectModal();
        }
        if (e.target === editProjectModal) {
            hideEditProjectModal();
        }
        hideContextMenu();
    });
    
    // Color Picker Functionality
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options in the same modal
            const modal = option.closest('.modal');
            modal.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            option.classList.add('selected');
        });
    });
}

// Función para mostrar el reproductor de audio circular
function showAudioPlayer() {
    const audioPlayerContainer = document.querySelector('.audio-player-container');
    if (audioPlayerContainer) {
        // Asegurarse de que el reproductor sea visible
        audioPlayerContainer.style.display = 'flex';
        
        // Forzar un reflow antes de añadir la clase para que la transición funcione
        void audioPlayerContainer.offsetWidth;
        
        // Añadir la clase visible para activar las animaciones
        audioPlayerContainer.classList.add('visible');
        
        console.log("Mostrando reproductor de audio");
    } else {
        console.error("No se encontró el contenedor del reproductor de audio");
    }
}

// Función para ocultar el reproductor de audio circular
function hideAudioPlayer() {
    const audioPlayerContainer = document.querySelector('.audio-player-container');
    if (audioPlayerContainer) {
        // Primero quitamos la clase visible para activar la animación de salida
        audioPlayerContainer.classList.remove('visible');
        
        // Esperamos a que termine la animación antes de ocultarlo
        setTimeout(() => {
            audioPlayerContainer.style.display = 'none';
        }, 300); // 300ms es la duración de la transición en CSS
        
        console.log("Ocultando reproductor de audio");
    } else {
        console.error("No se encontró el contenedor del reproductor de audio");
    }
}

function showEditProjectModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    selectedProjectForEdit = projectId;
    
    // Set form values
    document.getElementById('edit-project-name').value = project.name;
    
    // Set selected color
    document.querySelectorAll('#edit-project-modal .color-option').forEach(opt => {
        if (opt.dataset.color === project.color) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    
    // Set cover preview
    const coverPreview = document.querySelector('.current-cover-preview');
    if (project.coverImage) {
        coverPreview.innerHTML = `<img src="${project.coverImage}" alt="${project.name}">`;
        coverPreview.style = '';
    } else {
        const coverStyle = project.color ? 
            `background: ${getGradientByColor(project.color)};` : 
            'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
        coverPreview.innerHTML = '';
        coverPreview.style = coverStyle;
    }
    
    // Reset custom cover image
    customCoverImage = null;
    
    // Show modal
    editProjectModal.classList.add('active');
    
    // Re-attach event listeners to modal buttons
    document.querySelector('.save-edit-btn').onclick = saveProjectEdit;
    document.querySelector('.cancel-edit-btn').onclick = hideEditProjectModal;
    document.querySelector('.delete-project-btn').onclick = deleteProject;
    document.querySelector('.change-cover-btn').onclick = handleChangeCover;
}

function handleChangeCover() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                // Update preview
                const coverPreview = document.querySelector('.current-cover-preview');
                coverPreview.innerHTML = `<img src="${event.target.result}" alt="Cover">`;
                coverPreview.style = '';
                
                // Store cover image data
                customCoverImage = event.target.result;
                
                console.log("Cover image loaded successfully");
            };
            
            reader.readAsDataURL(file);
        }
        document.body.removeChild(fileInput);
    });
    
    fileInput.click();
}

function saveProjectEdit() {
    console.log("Save button clicked");
    
    if (!selectedProjectForEdit) {
        console.log("No project selected for edit");
        return;
    }
    
    const projectIndex = projects.findIndex(p => p.id === selectedProjectForEdit);
    if (projectIndex === -1) {
        console.log("Project not found:", selectedProjectForEdit);
        return;
    }
    
    const projectName = document.getElementById('edit-project-name').value.trim() || 'untitled project';
    const colorOptions = document.querySelectorAll('#edit-project-modal .color-option');
    let selectedColor = null;
    
    colorOptions.forEach(option => {
        if (option.classList.contains('selected')) {
            selectedColor = option.dataset.color;
        }
    });
    
    console.log("Saving project edit:", {
        name: projectName,
        color: selectedColor,
        coverImage: customCoverImage ? "Image data available" : "No image data"
    });
    
    // Update project
    projects[projectIndex].name = projectName;
    if (selectedColor) {
        projects[projectIndex].color = selectedColor;
    }
    
    // Update cover image if changed
    if (customCoverImage) {
        projects[projectIndex].coverImage = customCoverImage;
        console.log("Cover image saved to project");
    }
    
    // Save changes
    if (saveProjects()) {
        // Update current project if it's the one being edited
        if (currentProject && currentProject.id === selectedProjectForEdit) {
            currentProject = projects[projectIndex];
            updateProjectView();
        }
        
        // Hide modal
        hideEditProjectModal();
        
        // Alert to confirm changes were saved
        alert("Cambios guardados correctamente");
    }
}

function loadProjects() {
    const savedProjects = localStorage.getItem('musicLifeProjects');
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
        renderProjects();
        renderLibrary();
    }
    
    // Show or hide the start project container
    if (projects.length > 0) {
        startProjectContainer.style.display = 'none';
    } else {
        startProjectContainer.style.display = 'flex';
    }
}

function renderProjects() {
    projectsContainer.innerHTML = '';
    
    projects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.dataset.id = project.id;
        
        let coverContent = '';
        if (project.coverImage) {
            coverContent = `<img src="${project.coverImage}" alt="${project.name}">`;
        } else {
            const coverStyle = project.color ? 
                `background: ${getGradientByColor(project.color)};` : 
                'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
            coverContent = `<div style="${coverStyle}"></div>`;
        }
        
        projectCard.innerHTML = `
            <div class="project-card-cover">
                ${coverContent}
            </div>
            <div class="project-card-info">
                <h3 class="project-card-title">${project.name}</h3>
                <p class="project-card-details">${project.bpm || 0}bpm • track: ${project.tracks.length.toString().padStart(2, '0')}-</p>
            </div>
        `;
        
        projectCard.addEventListener('click', () => openProject(project.id));
        
        projectsContainer.appendChild(projectCard);
    });
}

function renderLibrary() {
    libraryGrid.innerHTML = '';
    
    projects.forEach(project => {
        const libraryItem = document.createElement('div');
        libraryItem.className = 'library-item';
        libraryItem.dataset.id = project.id;
        
        let coverContent = '';
        if (project.coverImage) {
            coverContent = `<img src="${project.coverImage}" alt="${project.name}">`;
        } else {
            const coverStyle = project.color ? 
                `background: ${getGradientByColor(project.color)};` : 
                'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
            coverContent = `<div style="${coverStyle}"></div>`;
        }
        
        libraryItem.innerHTML = `
            <div class="library-item-thumbnail">
                ${coverContent}
                <div class="library-item-menu">
                    <i class="fas fa-ellipsis-v"></i>
                </div>
            </div>
            <div class="library-item-name">${project.name}</div>
            <div class="library-item-count">${project.tracks.length} item${project.tracks.length !== 1 ? 's' : ''}</div>
        `;
        
        libraryItem.addEventListener('click', (e) => {
            if (e.target.closest('.library-item-menu')) {
                e.stopPropagation();
                showContextMenu(e, project.id);
            } else {
                openProject(project.id);
            }
        });
        
        libraryGrid.appendChild(libraryItem);
    });
}

function showAddProjectModal() {
    // Reset form
    document.getElementById('project-name').value = '';
    document.querySelectorAll('#add-project-modal .color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Reset cover preview
    const coverPreview = document.querySelector('.new-cover-preview');
    coverPreview.innerHTML = '';
    coverPreview.style = 'background-color: #f0f0f0;';
    
    // Reset cover image
    newProjectCoverImage = null;
    
    // Show modal
    addProjectModal.classList.add('active');
    
    // Re-attach event listeners
    document.querySelector('.add-cover-btn').onclick = handleAddCover;
}

function handleAddCover() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                // Update preview
                const coverPreview = document.querySelector('.new-cover-preview');
                coverPreview.innerHTML = `<img src="${event.target.result}" alt="Cover">`;
                coverPreview.style = '';
                
                // Store cover image data
                newProjectCoverImage = event.target.result;
                
                console.log("New project cover image loaded successfully");
            };
            
            reader.readAsDataURL(file);
        }
        document.body.removeChild(fileInput);
    });
    
    fileInput.click();
}

function hideAddProjectModal() {
    addProjectModal.classList.remove('active');
}

function showEditProjectModal(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    selectedProjectForEdit = projectId;
    
    // Set form values
    document.getElementById('edit-project-name').value = project.name;
    
    // Set selected color
    document.querySelectorAll('#edit-project-modal .color-option').forEach(opt => {
        if (opt.dataset.color === project.color) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    
    // Set cover preview
    const coverPreview = document.querySelector('.current-cover-preview');
    if (project.coverImage) {
        coverPreview.innerHTML = `<img src="${project.coverImage}" alt="${project.name}">`;
    } else {
        const coverStyle = project.color ? 
            `background: ${getGradientByColor(project.color)};` : 
            'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
        coverPreview.innerHTML = '';
        coverPreview.style = coverStyle;
    }
    
    // Reset custom cover image
    customCoverImage = null;
    
    // Show modal
    editProjectModal.classList.add('active');
    
    // Re-attach event listeners to modal buttons
    document.querySelector('.save-edit-btn').onclick = saveProjectEdit;
    document.querySelector('.cancel-edit-btn').onclick = hideEditProjectModal;
    document.querySelector('.delete-project-btn').onclick = deleteProject;
    document.querySelector('.change-cover-btn').onclick = handleChangeCover;
}

function hideEditProjectModal() {
    editProjectModal.classList.remove('active');
    selectedProjectForEdit = null;
    customCoverImage = null;
}

function showContextMenu(event, projectId) {
    selectedProjectForEdit = projectId;
    
    // Position the context menu
    const x = event.clientX;
    const y = event.clientY;
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    // Show the context menu
    contextMenu.classList.add('active');
    
    // Prevent default context menu
    event.preventDefault();
}

function hideContextMenu() {
    contextMenu.classList.remove('active');
}

function createProject() {
    const projectName = document.getElementById('project-name').value.trim() || 'untitled project';
    const colorOptions = document.querySelectorAll('#add-project-modal .color-option');
    let selectedColor = null;
    
    colorOptions.forEach(option => {
        if (option.classList.contains('selected')) {
            selectedColor = option.dataset.color;
        }
    });
    
    // If no color is selected, choose a random one
    if (!selectedColor) {
        const colors = ['pink', 'blue', 'green', 'orange', 'purple'];
        selectedColor = colors[Math.floor(Math.random() * colors.length)];
    }
    
    const newProject = {
        id: Date.now().toString(),
        name: projectName,
        color: selectedColor,
        bpm: 120,
        tracks: [],
        coverImage: newProjectCoverImage, // Usar la imagen de portada seleccionada
        createdAt: new Date().toISOString()
    };
    
    console.log("Creating new project:", {
        name: projectName,
        color: selectedColor,
        coverImage: newProjectCoverImage ? "Image data available" : "No image data"
    });
    
    projects.push(newProject);
    if (saveProjects()) {
        hideAddProjectModal();
        openProject(newProject.id);
        
        // Hide the start project container
        startProjectContainer.style.display = 'none';
    }
}

function saveProjectEdit() {
    if (!selectedProjectForEdit) {
        console.log("No project selected for edit");
        return;
    }
    
    const projectIndex = projects.findIndex(p => p.id === selectedProjectForEdit);
    if (projectIndex === -1) {
        console.log("Project not found:", selectedProjectForEdit);
        return;
    }
    
    const projectName = document.getElementById('edit-project-name').value.trim() || 'untitled project';
    const colorOptions = document.querySelectorAll('#edit-project-modal .color-option');
    let selectedColor = null;
    
    colorOptions.forEach(option => {
        if (option.classList.contains('selected')) {
            selectedColor = option.dataset.color;
        }
    });
    
    console.log("Saving project edit:", {
        name: projectName,
        color: selectedColor,
        coverImage: customCoverImage ? "Image data available" : "No image data"
    });
    
    // Update project
    projects[projectIndex].name = projectName;
    if (selectedColor) {
        projects[projectIndex].color = selectedColor;
    }
    
    // Update cover image if changed
    if (customCoverImage) {
        projects[projectIndex].coverImage = customCoverImage;
        console.log("Cover image saved to project");
    }
    
    // Save changes
    if (saveProjects()) {
        // Update current project if it's the one being edited
        if (currentProject && currentProject.id === selectedProjectForEdit) {
            currentProject = projects[projectIndex];
            updateProjectView();
        }
        
        // Hide modal
        hideEditProjectModal();
        
        // Alert to confirm changes were saved
        alert("Cambios guardados correctamente");
    }
}

function deleteProject() {
    if (!selectedProjectForEdit) return;
    
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        deleteProjectById(selectedProjectForEdit);
    }
}

function deleteProjectById(projectId) {
    // Remove project from projects array
    projects = projects.filter(p => p.id !== projectId);
    
    // Save changes
    if (saveProjects()) {
        // If current project is deleted, go back to home
        if (currentProject && currentProject.id === projectId) {
            currentProject = null;
            pauseAllAudio();
            showView('home');
        }
        
        // Hide modal
        hideEditProjectModal();
    }
}

function handleEditCover() {
    if (!currentProject) return;
    showEditProjectModal(currentProject.id);
}

function handleChangeCover() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                // Update preview
                const coverPreview = document.querySelector('.current-cover-preview');
                coverPreview.innerHTML = `<img src="${event.target.result}" alt="Cover">`;
                coverPreview.style = '';
                
                // Store cover image data
                customCoverImage = event.target.result;
                
                console.log("Cover image loaded successfully");
            };
            
            reader.readAsDataURL(file);
        }
        document.body.removeChild(fileInput);
    });
    
    fileInput.click();
}

function handlePlayAllTracks() {
    if (!selectedProjectForEdit) return;
    
    const project = projects.find(p => p.id === selectedProjectForEdit);
    if (!project || !project.tracks.length) return;
    
    // Set current project
    currentProject = project;
    
    // Play first track
    playTrack(project.tracks[0].id);
    
    // Hide context menu
    hideContextMenu();
}

function openProject(projectId) {
    currentProject = projects.find(p => p.id === projectId);
    
    if (currentProject) {
        updateProjectView();
        
        // Show project view
        showView('project');
    }
}

function updateProjectView() {
    // Update project view
    document.querySelector('.project-title').textContent = currentProject.name;
    document.querySelector('.project-details').textContent = 
        `${currentProject.bpm || 0}bpm • track: ${currentProject.tracks.length.toString().padStart(2, '0')}-`;
    
    // Set project cover
    const projectCover = document.querySelector('.project-cover');
    if (currentProject.coverImage) {
        projectCover.innerHTML = `
            <img src="${currentProject.coverImage}" alt="${currentProject.name}">
            <button class="edit-cover-btn"><i class="fas fa-camera"></i></button>
        `;
    } else {
        const coverStyle = currentProject.color ? 
            `background: ${getGradientByColor(currentProject.color)};` : 
            'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
        projectCover.innerHTML = `<button class="edit-cover-btn"><i class="fas fa-camera"></i></button>`;
        projectCover.setAttribute('style', coverStyle);
    }
    
    // Add event listener to edit cover button
    const editCoverBtn = document.querySelector('.edit-cover-btn');
    if (editCoverBtn) {
        editCoverBtn.addEventListener('click', handleEditCover);
    }
    
    // Update page title
    updatePageTitle('project');
    
    // Render tracks
    renderTracks();
}

function renderTracks() {
    console.log("Renderizando pistas...");
    
    // Verificar que el elemento tracksList exista
    if (!tracksList) {
        console.error("No se encontró el elemento tracksList");
        return;
    }
    
    // Limpiar la lista de pistas
    tracksList.innerHTML = '';
    
    // Verificar que haya un proyecto activo con pistas
    if (!currentProject) {
        console.error("No hay un proyecto activo");
        return;
    }
    
    if (!Array.isArray(currentProject.tracks) || currentProject.tracks.length === 0) {
        console.log("El proyecto no tiene pistas", currentProject);
        tracksList.innerHTML = '<div class="no-tracks">No hay pistas en este proyecto. Agrega algunas usando el botón "+".</div>';
        return;
    }
    
    console.log(`Renderizando ${currentProject.tracks.length} pistas para el proyecto ${currentProject.name}`);
    
    // Renderizar cada pista
    currentProject.tracks.forEach(track => {
        try {
            const trackElement = document.createElement('div');
            trackElement.className = 'track-item';
            trackElement.dataset.id = track.id;
            
            // Formatear el tamaño del archivo
            const sizeText = track.size ? formatFileSize(track.size) : '';
            
            trackElement.innerHTML = `
                <div class="track-info">
                    <h4 class="track-name">${track.name}</h4>
                    <p class="track-type">${formatTrackType(track.type)} ${sizeText}</p>
                </div>
                <div class="track-controls">
                    <button class="track-play-btn" data-id="${track.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="track-delete-btn" data-id="${track.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            tracksList.appendChild(trackElement);
            
            // Agregar event listeners
            const playBtn = trackElement.querySelector('.track-play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    console.log("Reproduciendo pista:", track.id);
                    playTrack(track.id);
                });
            }
            
            const deleteBtn = trackElement.querySelector('.track-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    console.log("Eliminando pista:", track.id);
                    deleteTrack(track.id);
                });
            }
        } catch (error) {
            console.error("Error al renderizar pista:", error, track);
        }
    });
    
    console.log("Renderizado de pistas completado");
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para formatear el tipo de archivo de audio
function formatTrackType(type) {
    if (type.includes('audio/mp3')) return 'MP3';
    if (type.includes('audio/wav')) return 'WAV';
    if (type.includes('audio/ogg')) return 'OGG';
    if (type.includes('audio/mpeg')) return 'MPEG';
    return 'Audio';
}

// View Management
function showView(view) {
    homeView.classList.remove('active');
    libraryView.classList.remove('active');
    projectView.classList.remove('active');
    signupView.classList.remove('active');
    
    // Update nav tabs
    navTabs.forEach(tab => {
        if (tab.dataset.view === view) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update page title
    updatePageTitle(view);
    
    switch (view) {
        case 'home':
            homeView.classList.add('active');
            break;
        case 'library':
            libraryView.classList.add('active');
            renderLibrary();
            break;
        case 'project':
            projectView.classList.add('active');
            break;
        case 'signup':
            signupView.classList.add('active');
            break;
    }
    
    currentView = view;
}

function updatePageTitle(view) {
    switch (view) {
        case 'home':
            pageTitle.textContent = 'Home';
            break;
        case 'library':
            pageTitle.textContent = 'Library';
            break;
        case 'project':
            pageTitle.textContent = currentProject ? currentProject.name : 'Project';
            break;
        case 'signup':
            pageTitle.textContent = 'Sign Up';
            break;
        default:
            pageTitle.textContent = '[untitled]';
    }
}

// Navigation
function handleBackButton() {
    if (currentView === 'project') {
        pauseAllAudio();
        showView('home');
    } else if (currentView === 'library') {
        showView('home');
    }
}

// Track Management
function handleAddTrack() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.multiple = true; // Permitir seleccionar múltiples archivos
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            // Procesar todos los archivos seleccionados
            Array.from(e.target.files).forEach(file => {
                addTrack(file);
            });
        }
        document.body.removeChild(fileInput);
    });
    
    fileInput.click();
}

function addTrack(file) {
    if (!currentProject) {
        console.error("No hay un proyecto activo para agregar pistas");
        alert("Por favor, selecciona o crea un proyecto primero");
        return;
    }

    // Verificar si el archivo es de audio
    if (!file.type.startsWith('audio/')) {
        console.error("El archivo no es de tipo audio:", file.type);
        alert("Por favor, selecciona un archivo de audio válido");
        return;
    }

    try {
        // Crear un blob URL para el archivo (esto no almacena el contenido completo)
        const blobUrl = URL.createObjectURL(file);
        
        // Guardar el archivo en una variable global para mantener la referencia
        if (!window.audioFiles) {
            window.audioFiles = {};
        }
        
        // Generar un ID único para la pista
        const trackId = generateId();
        
        // Guardar la referencia al archivo
        window.audioFiles[trackId] = file;
        
        // Crear un nuevo objeto de pista con solo los metadatos
        const newTrack = {
            id: trackId,
            name: file.name,
            url: blobUrl,
            size: file.size,
            type: file.type,
            dateAdded: new Date().toISOString()
        };

        // Añadir la pista al proyecto actual
        currentProject.tracks.push(newTrack);

        // Guardar los proyectos (solo metadatos)
        saveProjects();
        console.log("Pista añadida con éxito:", newTrack.name);
        
        // Renderizar las pistas
        renderTracks();
        
        // Guardar el archivo en el sistema de archivos
        saveAudioFileToFS(trackId, file);
    } catch (error) {
        console.error("Error al añadir la pista:", error);
        alert("Error al añadir la pista de audio: " + error.message);
    }
}

function deleteTrack(trackId) {
    if (!currentProject) return;
    
    // Stop playing if this track is currently playing
    if (currentTrack && currentTrack.id === trackId) {
        pauseAllAudio();
    }
    
    // Remove track from project
    currentProject.tracks = currentProject.tracks.filter(t => t.id !== trackId);
    if (saveProjects()) {
        renderTracks();
        
        // Update project details
        document.querySelector('.project-details').textContent = 
            `${currentProject.bpm || 0}bpm • track: ${currentProject.tracks.length.toString().padStart(2, '0')}-`;
        
        // Eliminar el archivo de audio del sistema de archivos
        deleteAudioFileFromFS(trackId);
    }
}

// Audio Playback
function getGradientByColor(color) {
    switch (color) {
        case 'pink':
            return 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)';
        case 'blue':
            return 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
        case 'green':
            return 'linear-gradient(135deg, #81FBB8 0%, #28C76F 100%)';
        case 'orange':
            return 'linear-gradient(135deg, #FCAF45 0%, #FD1D1D 100%)';
        case 'purple':
            return 'linear-gradient(135deg, #CE9FFC 0%, #7367F0 100%)';
        default:
            return 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
    }
}

function saveProjects() {
    try {
        console.log("Guardando proyectos...");
        
        // Crear una copia de los proyectos para almacenar
        const projectsToSave = JSON.parse(JSON.stringify(projects));
        
        // Almacenar los proyectos en localStorage
        localStorage.setItem('musicLifeProjects', JSON.stringify(projectsToSave));
        console.log("Proyectos guardados correctamente");
        
        // Actualizar la interfaz
        renderProjects();
        renderLibrary();
        
        return true; // Operación exitosa
    } catch (error) {
        console.error("Error al guardar proyectos:", error);
        
        if (error.name === 'QuotaExceededError' || error.toString().includes('quota')) {
            alert("No se pudieron guardar los cambios porque los archivos de audio son demasiado grandes. Intenta con archivos más pequeños o menos archivos.");
        } else {
            alert("Ocurrió un error al guardar los cambios. Verifica la consola para más detalles.");
        }
        
        return false; // Operación fallida
    }
}

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTrack(trackId) {
    // Find the project and track
    let trackProject = currentProject;
    let track = null;
    
    // If we're in a project view, use the current project
    if (trackProject) {
        track = trackProject.tracks.find(t => t.id === trackId);
    } 
    // Otherwise, search for the track in all projects
    else {
        for (const project of projects) {
            const foundTrack = project.tracks.find(t => t.id === trackId);
            if (foundTrack) {
                trackProject = project;
                track = foundTrack;
                break;
            }
        }
    }
    
    if (!track) {
        console.error("Track not found:", trackId);
        return;
    }
    
    // Verificar si tenemos el archivo en memoria
    if (!track.url && window.audioFiles && window.audioFiles[track.id]) {
        // Si tenemos el archivo pero no la URL, crear una nueva URL
        track.url = URL.createObjectURL(window.audioFiles[track.id]);
    }
    
    // Si aún no tenemos URL, obtener el archivo del sistema de archivos
    if (!track.url) {
        loadAudioFileFromFS(trackId).then((url) => {
            if (url) {
                track.url = url;
                playTrack(trackId);
            } else {
                console.error("No se puede reproducir la pista porque no se encuentra el archivo de audio");
                alert("No se puede reproducir la pista porque no se encuentra el archivo de audio. Intenta añadir la pista de nuevo.");
            }
        });
        return;
    }
    
    // Pause any currently playing audio
    pauseAllAudio();
    
    // Set current track and project
    currentTrack = track;
    currentProject = trackProject;
    
    // Create audio element if it doesn't exist
    if (!audioSources[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = currentVolume;
        audio.loop = isLooping;
        
        // Initialize audio context if needed
        initAudioContext();
        
        // Store audio element
        audioSources[track.id] = audio;
        
        // Add ended event listener to play next track if not looping
        audio.addEventListener('ended', () => {
            if (!isLooping) {
                // Find the index of the current track
                const currentIndex = trackProject.tracks.findIndex(t => t.id === trackId);
                
                // Get the next track index
                const nextIndex = (currentIndex + 1) % trackProject.tracks.length;
                
                // Play the next track
                playTrack(trackProject.tracks[nextIndex].id);
            } else {
                isPlaying = false;
                updatePlaybackUI();
            }
        });
        
        // Add timeupdate event listener to update progress
        audio.addEventListener('timeupdate', () => {
            updateTimeDisplay();
            updateProgressIndicator();
        });
        
        // Add loadedmetadata event listener to get duration
        audio.addEventListener('loadedmetadata', () => {
            duration = audio.duration;
            updateTimeDisplay();
        });
    }
    
    // Play audio
    const audioElement = audioSources[track.id];
    audioElement.play()
        .then(() => {
            isPlaying = true;
            updatePlaybackUI();
        })
        .catch(error => {
            console.error("Error playing audio:", error);
            isPlaying = false;
            updatePlaybackUI();
        });
    
    // Update playback bar and new player
    updatePlaybackBar();
    updateCircularPlayer();
    
    // Mostrar el reproductor circular
    showAudioPlayer();
}

function pauseAllAudio() {
    isPlaying = false;
    
    // Stop all audio sources
    Object.values(audioSources).forEach(audio => {
        if (audio && !audio.paused) {
            audio.pause();
        }
    });
    
    // Clear audio sources
    audioSources = {};
    
    // Update UI
    updatePlaybackUI();
}

function togglePlayPause() {
    if (isPlaying) {
        // Si está reproduciendo, pausar sin reiniciar
        if (currentTrack && audioSources[currentTrack.id]) {
            audioSources[currentTrack.id].pause();
            isPlaying = false;
            updatePlaybackUI();
        }
    } else {
        // Si está pausado, reanudar o iniciar reproducción
        if (currentTrack && audioSources[currentTrack.id]) {
            // Reanudar la reproducción desde donde se quedó
            audioSources[currentTrack.id].play()
                .then(() => {
                    isPlaying = true;
                    updatePlaybackUI();
                })
                .catch(error => {
                    console.error("Error resuming audio:", error);
                });
        } else if (currentProject && currentProject.tracks.length > 0) {
            // Si no hay pista actual, reproducir la primera pista
            playTrack(currentProject.tracks[0].id);
        }
    }
}

function rewindTrack() {
    if (!currentProject || !currentTrack) return;
    
    // Encontrar el índice de la pista actual
    const currentIndex = currentProject.tracks.findIndex(t => t.id === currentTrack.id);
    
    // Calcular el índice de la pista anterior
    const prevIndex = (currentIndex - 1 + currentProject.tracks.length) % currentProject.tracks.length;
    
    // Reproducir la pista anterior
    playTrack(currentProject.tracks[prevIndex].id);
}

function forwardTrack() {
    if (currentProject && currentProject.tracks.length > 0) {
        // Find the index of the current track
        const currentIndex = currentProject.tracks.findIndex(t => t.id === (currentTrack ? currentTrack.id : null));
        
        // Get the next track index
        const nextIndex = (currentIndex + 1) % currentProject.tracks.length;
        
        // Play the next track
        playTrack(currentProject.tracks[nextIndex].id);
    }
}

function toggleLoop() {
    isLooping = !isLooping;
    
    // Actualizar el estado de repetición en el audio actual
    if (currentTrack && audioSources[currentTrack.id]) {
        audioSources[currentTrack.id].loop = isLooping;
    }
    
    // Actualizar la interfaz de usuario
    const loopIcon = isLooping ? '<i class="fas fa-redo-alt"></i>' : '<i class="fas fa-redo"></i>';
    
    // Actualizar botones en la interfaz original
    if (loopBtn) loopBtn.innerHTML = loopIcon;
    if (miniRepeatBtn) miniRepeatBtn.innerHTML = loopIcon;
    
    // Actualizar botón en el nuevo reproductor
    const newPlayerRepeatBtn = document.querySelector('.player-controls .repeat-btn');
    if (newPlayerRepeatBtn) newPlayerRepeatBtn.innerHTML = loopIcon;
}

function toggleMute() {
    if (currentVolume > 0) {
        // Store the current volume and set to 0
        currentVolume = 0;
    } else {
        // Restore volume to 1
        currentVolume = 1;
    }
    
    // Update volume for current audio
    if (currentTrack && audioSources[currentTrack.id]) {
        audioSources[currentTrack.id].volume = currentVolume;
    }
    
    // Update UI
    volumeBtn.innerHTML = currentVolume > 0 ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
}

function updateTimeDisplay() {
    if (currentTrack && audioSources[currentTrack.id]) {
        const audio = audioSources[currentTrack.id];
        currentTime = audio.currentTime;
        duration = audio.duration || 0;
        
        // Actualizar el display de tiempo en la interfaz original
        const timeDisplay = document.querySelector('.time-display');
        if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }
        
        // Actualizar el display de tiempo en la barra de reproducción
        const playbackTime = document.querySelector('.playback-time');
        if (playbackTime) {
            playbackTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }
        
        // Actualizar el display de tiempo en el nuevo reproductor
        const currentTimeElement = document.querySelector('.current-time');
        const totalTimeElement = document.querySelector('.total-time');
        
        if (currentTimeElement) currentTimeElement.textContent = formatTime(currentTime);
        if (totalTimeElement) totalTimeElement.textContent = formatTime(duration);
    }
}

function updatePlaybackUI() {
    // Update play/pause buttons
    const playIcon = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    
    // Actualizar botones en la interfaz original
    if (playBtn) playBtn.innerHTML = playIcon;
    if (playPauseBtn) playPauseBtn.innerHTML = playIcon;
    if (miniPlayBtn) miniPlayBtn.innerHTML = playIcon;
    
    // Actualizar botón en el nuevo reproductor
    const newPlayerPlayBtn = document.querySelector('.player-controls .play-btn');
    if (newPlayerPlayBtn) newPlayerPlayBtn.innerHTML = playIcon;
    
    // Update track items
    const trackItems = document.querySelectorAll('.track-item');
    trackItems.forEach(item => {
        const playBtn = item.querySelector('.track-play-btn');
        
        if (currentTrack && item.dataset.id === currentTrack.id && isPlaying) {
            item.classList.add('playing');
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            item.classList.remove('playing');
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // Show/hide playback bar
    if (currentTrack) {
        playbackBar.style.display = 'flex';
    } else {
        playbackBar.style.display = 'none';
    }
}

function updateProgressIndicator() {
    if (currentTrack && audioSources[currentTrack.id]) {
        const audio = audioSources[currentTrack.id];
        const progressPercentage = (audio.currentTime / audio.duration) * 100;
        
        // Actualizar el indicador de progreso en la visualización de onda
        const progressIndicator = document.querySelector('.progress-indicator');
        if (progressIndicator) {
            progressIndicator.style.left = `${progressPercentage}%`;
        }
    }
}

function updateCircularPlayer() {
    if (!currentTrack || !currentProject) return;
    
    // Actualizar título y proyecto
    const trackTitle = document.querySelector('.current-track-title');
    const trackProject = document.querySelector('.current-track-project');
    
    if (trackTitle) trackTitle.textContent = currentTrack.name;
    if (trackProject) trackProject.textContent = currentProject.name;
    
    // Actualizar la portada circular
    const circularCover = document.querySelector('.circular-cover');
    if (circularCover) {
        if (currentProject.coverImage) {
            circularCover.style.backgroundImage = `url('${currentProject.coverImage}')`;
        } else {
            const coverStyle = currentProject.color ? 
                getGradientByColor(currentProject.color) : 
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
            circularCover.style.background = coverStyle;
        }
    }
}

function updatePlaybackBar() {
    if (currentTrack && currentProject) {
        playbackProjectName.textContent = currentTrack.name;
        playbackProjectStatus.textContent = currentProject.name;
        
        // Set project icon color or image
        const playbackIcon = document.querySelector('.playback-project-icon');
        if (currentProject.coverImage) {
            playbackIcon.innerHTML = `<img src="${currentProject.coverImage}" alt="${currentProject.name}">`;
            playbackIcon.style = '';
        } else {
            const iconStyle = currentProject.color ? 
                `background: ${getGradientByColor(currentProject.color)};` : 
                'background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);';
            playbackIcon.innerHTML = '';
            playbackIcon.setAttribute('style', iconStyle);
        }
    }
}

// User Management
function handleSignup() {
    const usernameInput = document.querySelector('.username-input');
    const username = usernameInput.value.trim();
    
    if (username) {
        currentUser = {
            username,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('musicLifeUser', JSON.stringify(currentUser));
        showView('home');
    }
}

// Función auxiliar para generar IDs únicos
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}
