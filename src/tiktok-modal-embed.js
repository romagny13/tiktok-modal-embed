class TikTokAPIService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
  }

  load() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.Tiktok && window.Tiktok.Player) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.onload = () => this._waitForTikTokAPI(resolve);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });

    return this.loadPromise;
  }

  _waitForTikTokAPI(resolve) {
    const checkInterval = setInterval(() => {
      if (window.Tiktok && window.Tiktok.Player) {
        clearInterval(checkInterval);
        this.isLoaded = true;
        resolve();
      }
    }, 100);

    // Timeout de sécurité après 5 secondes
    setTimeout(() => {
      if (!this.isLoaded) {
        clearInterval(checkInterval);
        console.warn("TikTok API loading timeout");
        resolve(); // On résout quand même pour éviter de bloquer l'application
      }
    }, 5000);
  }
}

class TikTokPlayerService {
  constructor(apiService) {
    this.apiService = apiService;
    this.activePlayer = null;
    this.activeTarget = null;
    this.activeVideoId = null;
  }

  createPlayer(videoUrl, targetElement, options = {}) {
    const videoId = this._getVideoId(videoUrl);
    if (!videoId) {
      return Promise.reject(new Error("ID vidéo TikTok invalide"));
    }

    // Nettoyer la cible si demandé
    if (options.clearTarget) {
      this.clearTarget(targetElement);
    }

    // Mettre à jour les références actives
    this.activeTarget = targetElement;
    this.activeVideoId = videoId;

    // Créer l'élément embed TikTok
    const embed = document.createElement("blockquote");
    embed.className = "tiktok-embed";
    embed.setAttribute("cite", videoUrl);
    embed.setAttribute("data-video-id", videoId);

    // Appliquer les dimensions (par défaut ou personnalisées)
    const width = options.width || "325px";
    const minWidth = options.minWidth || "325px";
    embed.style.maxWidth = width;
    embed.style.minWidth = minWidth;

    const section = document.createElement("section");
    embed.appendChild(section);

    // Ajouter au DOM
    targetElement.appendChild(embed);
    this.activePlayer = embed;

    // Charger l'API et initialiser le player
    return this.apiService
      .load()
      .then(() => {
        if (
          window.Tiktok &&
          window.Tiktok.Embed &&
          typeof window.Tiktok.Embed.embedTikTokElements === "function"
        ) {
          window.Tiktok.Embed.embedTikTokElements();
        } else {
          // Réessayer si la méthode n'est pas immédiatement disponible
          this._retryEmbedTikTok();
        }
        return embed;
      })
      .catch((error) => {
        console.error("Erreur lors du chargement de l'API TikTok:", error);
        throw error;
      });
  }

  _retryEmbedTikTok(maxRetries = 5, delay = 500) {
    let attempt = 0;

    const tryEmbed = () => {
      if (
        window.Tiktok &&
        window.Tiktok.Embed &&
        typeof window.Tiktok.Embed.embedTikTokElements === "function"
      ) {
        window.Tiktok.Embed.embedTikTokElements();
        return true;
      }
      return false;
    };

    const attemptWithTimeout = () => {
      if (attempt >= maxRetries) return;

      if (!tryEmbed()) {
        attempt++;
        setTimeout(attemptWithTimeout, delay);
      }
    };

    attemptWithTimeout();
  }

  clearTarget(targetElement) {
    if (!targetElement) return;

    while (targetElement.firstChild) {
      targetElement.removeChild(targetElement.firstChild);
    }

    if (this.activeTarget === targetElement) {
      this.activePlayer = null;
      this.activeVideoId = null;
    }
  }

  _getVideoId(url) {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  getActivePlayerInfo() {
    return {
      player: this.activePlayer,
      target: this.activeTarget,
      videoId: this.activeVideoId,
    };
  }
}

class ModalService {
  constructor(playerService) {
    this.playerService = playerService;
    this.activeModal = null;
    this.modalContainer = null;
    this._ensureModalStyles();
  }

  createModal(options = {}) {
    const modal = document.createElement("div");
    modal.className = "tiktok-modal";

    const content = document.createElement("div");
    content.className = "tiktok-modal-content";

    const closeButton = document.createElement("button");
    closeButton.className = "tiktok-close-button";
    closeButton.innerHTML = '<i class="fas fa-times"></i>';

    const container = document.createElement("div");
    container.className = "tiktok-embed-container";

    content.appendChild(closeButton);
    content.appendChild(container);
    modal.appendChild(content);

    // Configuration des événements
    closeButton.addEventListener("click", () => this.closeModal(modal));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });

    // Ajouter au DOM
    document.body.appendChild(modal);

    return modal;
  }

  openModal(videoUrl, modal, options = {}) {
    if (!modal) {
      modal = this.createModal(options);
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    this.activeModal = modal;
    const container = modal.querySelector(".tiktok-embed-container");

    // Créer le player dans le conteneur de la modale
    return this.playerService.createPlayer(videoUrl, container, {
      clearTarget: true,
      ...options,
    });
  }

  closeModal(modal) {
    if (!modal) {
      if (this.activeModal) {
        modal = this.activeModal;
      } else {
        return;
      }
    }

    modal.classList.remove("active");
    document.body.style.overflow = "";

    const container = modal.querySelector(".tiktok-embed-container");
    this.playerService.clearTarget(container);

    if (this.activeModal === modal) {
      this.activeModal = null;
    }
  }

  _ensureModalStyles() {
    if (document.getElementById("tiktok-embed-styles")) return;

    const style = document.createElement("style");
    style.id = "tiktok-embed-styles";
    style.innerHTML = `
/* Styles du conteneur principal */
.tiktok-wrapper {
max-width: 1200px;
margin: 0 auto;
}

/* Styles pour le plugin TikTok */
.tiktok-embed-wrapper {
display: inline-block;
position: relative;
}

.tiktok-preview-button {
display: inline-flex;
align-items: center;
gap: 12px;
padding: 16px 28px;
background: linear-gradient(45deg, #f8bbd0, #bbdefb);
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
color: white;
border-radius: 12px;
cursor: pointer;
border: none;
font-size: 16px;
font-weight: 600;
box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
transition: all 0.3s ease;
position: relative;
overflow: hidden;
}

.tiktok-preview-button::before {
content: "";
position: absolute;
top: 0;
left: -100%;
width: 100%;
height: 100%;
background: linear-gradient(
  120deg,
  transparent,
  rgba(255, 255, 255, 0.3),
  transparent
);
transition: 0.5s;
}

.tiktok-preview-button:hover::before {
left: 100%;
}

.tiktok-preview-button:hover {
transform: translateY(-2px);
box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.tiktok-preview-button:active {
transform: scale(0.98);
}

.tiktok-button-icon {
font-size: 24px;
}

.tiktok-button-text {
display: flex;
flex-direction: column;
align-items: flex-start;
gap: 4px;
}

.tiktok-button-subtitle {
font-size: 14px;
opacity: 0.8;
font-weight: normal;
}

/* Modal styles */
.tiktok-modal {
display: none;
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(0, 0, 0, 0.8);
z-index: 1000;
opacity: 0;
transition: opacity 0.3s ease;
}

.tiktok-modal.active {
display: flex;
justify-content: center;
align-items: center;
opacity: 1;
}

.tiktok-modal-content {
background: white;
padding: 20px;
border-radius: 12px;
position: relative;
transform: scale(0.7);
transition: transform 0.3s ease;
opacity: 0;
width: 90vw; /* Utilise 90% de la largeur du viewport */
max-width: 500px; /* Limite la largeur maximale */
min-height: 300px;

/* Ajustement pour le viewport à 1100px */
@media screen and (min-width: 1100px) {
  width: 450px; /* Taille fixe pour les grands écrans */
}

/* Ajustement pour les très petits écrans */
@media screen and (max-width: 480px) {
  width: 95vw;
  padding: 15px;
}
}

/* Ajustement de la taille du conteneur TikTok embed */
.tiktok-embed-container {
width: 100%;
display: flex;
justify-content: center;
}

.tiktok-embed-container .tiktok-embed {
margin: 0 auto !important;
width: 100% !important;
max-width: none !important;
}

.tiktok-modal.active .tiktok-modal-content {
transform: scale(1);
opacity: 1;
}

@keyframes popin {
0% {
  transform: scale(0.7);
  opacity: 0;
}
50% {
  transform: scale(1.05);
  opacity: 1;
}
100% {
  transform: scale(1);
  opacity: 1;
}
}

.tiktok-modal.active .tiktok-modal-content {
animation: popin 0.5s ease-out forwards;
}

.tiktok-close-button {
position: absolute;
top: -40px;
right: -40px;
width: 36px;
height: 36px;
background: white;
border: none;
border-radius: 50%;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px;
color: #333;
transition: transform 0.2s ease;

/* Ajustement pour mobile */
@media screen and (max-width: 480px) {
  top: -50px;
  right: 50%;
  transform: translateX(50%);
}
}

.tiktok-close-button:hover {
transform: rotate(90deg);

/* Ajustement pour mobile */
@media screen and (max-width: 480px) {
  transform: translateX(50%) rotate(90deg);
}
}

/* Styles pour les conteneurs de players TikTok */
.tiktok-player-container {
width: 100%;
display: flex;
justify-content: center;
min-height: 300px;
}
`;
    document.head.appendChild(style);
  }
}

class TriggerService {
  constructor(playerService, modalService) {
    this.playerService = playerService;
    this.modalService = modalService;
    this.triggers = [];
  }

  initFromSelector(selector, options = {}) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      this.addTrigger(element, options);
    });
  }

  addTrigger(element, options = {}) {
    const videoUrl = element.dataset.videoUrl;
    const targetSelector = element.dataset.target;
    const useModal = element.dataset.useModal === "true" || options.useModal;
    const title = element.dataset.title || options.title || "Voir la vidéo";
    const subtitle =
      element.dataset.subtitle || options.subtitle || "Sur TikTok";

    if (!videoUrl) {
      console.warn("Trigger sans URL vidéo spécifiée", element);
      return;
    }

    // Créer le bouton de prévisualisation si nécessaire
    if (options.createButton !== false) {
      const button = this._createPreviewButton(title, subtitle);
      element.appendChild(button);
    }

    // Configurer l'événement
    element.addEventListener("click", (event) => {
      event.preventDefault();

      if (useModal) {
        // Afficher dans une modale
        const modal = this.modalService.createModal();
        this.modalService.openModal(videoUrl, modal, options.playerOptions);
      } else if (targetSelector) {
        // Afficher dans une cible spécifique
        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
          this.playerService.createPlayer(videoUrl, targetElement, {
            clearTarget: options.clearTarget !== false,
            ...options.playerOptions,
          });
        } else {
          console.warn(`Élément cible non trouvé: ${targetSelector}`);
        }
      } else {
        console.warn("Aucune cible spécifiée pour le trigger", element);
      }
    });

    this.triggers.push({
      element,
      videoUrl,
      targetSelector,
      useModal,
    });
  }

  _createPreviewButton(title, subtitle) {
    const button = document.createElement("button");
    button.className = "tiktok-preview-button";
    button.innerHTML = `
<span class="tiktok-button-icon">
  <i class="fab fa-tiktok"></i>
</span>
<span class="tiktok-button-text">
  <span>${title}</span>
  <span class="tiktok-button-subtitle">${subtitle}</span>
</span>
`;
    return button;
  }
}

class TikTokEmbed {
  constructor(options = {}) {
    this.version = "2.0.0";
    this._options = {
      selector: ".tiktok-embed-trigger",
      modalAnimation: true,
      autoplayOnOpen: true,
      useModalByDefault: true,
      autoInit: true,
      ...options,
    };

    // Initialiser les services
    this.apiService = new TikTokAPIService();
    this.playerService = new TikTokPlayerService(this.apiService);
    this.modalService = new ModalService(this.playerService);
    this.triggerService = new TriggerService(
      this.playerService,
      this.modalService
    );

    // Initialiser automatiquement si activé
    if (options.autoInit !== false) {
      this.init();
    }
  }

  init() {
    // Initialiser les déclencheurs à partir du sélecteur configuré
    this.triggerService.initFromSelector(this._options.selector, {
      useModal: this._options.useModalByDefault,
      clearTarget: this._options.clearTargetByDefault,
      playerOptions: {
        width: this._options.playerWidth,
        minWidth: this._options.playerMinWidth,
      },
    });
  }

  createPlayer(videoUrl, target, options = {}) {
    const targetElement =
      typeof target === "string" ? document.querySelector(target) : target;

    if (!targetElement) {
      return Promise.reject(new Error("Élément cible non trouvé"));
    }

    return this.playerService.createPlayer(videoUrl, targetElement, options);
  }

  openInModal(videoUrl, options = {}) {
    const modal = this.modalService.createModal(options);
    return this.modalService
      .openModal(videoUrl, modal, options)
      .then(() => modal);
  }

  clearTarget(target) {
    const targetElement =
      typeof target === "string" ? document.querySelector(target) : target;

    if (targetElement) {
      this.playerService.clearTarget(targetElement);
    }
  }

  addTrigger(element, options = {}) {
    this.triggerService.addTrigger(element, options);
  }

  getActivePlayerInfo() {
    return this.playerService.getActivePlayerInfo();
  }
}
