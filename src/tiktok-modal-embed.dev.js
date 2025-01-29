function loadTikTokAPI() {
  return new Promise((resolve, reject) => {
    if (window.Tiktok && window.Tiktok.Player) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.tiktok.com/embed.js";
    script.onload = () => waitForTikTokAPI(resolve, reject);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

function waitForTikTokAPI(resolve, reject) {
  const checkInterval = setInterval(() => {
    if (window.Tiktok && window.Tiktok.Player) {
      clearInterval(checkInterval);
      resolve();
    }
  }, 100);
}

function detectMobileAndZoom() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const viewportWidth = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  const zoom = Math.round((window.outerWidth / viewportWidth) * 100);
  return { isMobile, viewportWidth, zoom };
}

class TikTokEmbed {
  constructor(options = {}) {
    this.version = "1.0.5";
    this._options = {
      modalAnimation: true,
      autoplayOnOpen: true,
      ...options
    };
    this._instances = [];
    this._deviceInfo = detectMobileAndZoom();
    this._init();
    this._setupResizeListener();
  }

  _init() {
    this._addGlobalStyles();

    const elements = document.querySelectorAll(this._options.selector);
    elements.forEach((element) => this._createInstance(element));
  }

  _setupResizeListener() {
    window.addEventListener("resize", () => {
      this._deviceInfo = detectMobileAndZoom();
      this._updateModalStyles();
    });
  }

  _updateModalStyles() {
    const { isMobile, viewportWidth, zoom } = this._deviceInfo;

    this._instances.forEach((instance) => {
      const modalContent = instance.modal.querySelector(
        ".tiktok-modal-content"
      );

      if (isMobile || viewportWidth <= 1100) {
        modalContent.style.width = "95vw";
        modalContent.style.maxWidth = "95vw";
        modalContent.style.height = "80vh";
        modalContent.style.margin = "10px";

        // Ajustement spécifique pour le zoom à 110%
        if (zoom >= 110) {
          modalContent.style.transform = "scale(0.9)";
        }
      } else {
        modalContent.style.width = "450px";
        modalContent.style.maxWidth = "500px";
        modalContent.style.height = "auto";
        modalContent.style.margin = "auto";
        modalContent.style.transform = "scale(1)";
      }
    });
  }

  _addGlobalStyles() {
    if (document.getElementById("tiktok-embed-styles")) return;

    const style = document.createElement("style");
    style.id = "tiktok-embed-styles";
    style.innerHTML = `
 /* Styles du conteneur principal */
.tiktok-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

/* Styles pour le plugin TikTok */
.tiktok-embed-wrapper {
  display: inline-block;
  position: relative;
  width: 100%;
}

/* Styles du bouton de prévisualisation */
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
  width: 100%;
  max-width: 320px;

  @media screen and (max-width: 1100px) {
    max-width: 100%;
    padding: 14px 24px;
  }
}

.tiktok-preview-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
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

/* Styles des icônes et texte du bouton */
.tiktok-button-icon {
  font-size: 24px;
  flex-shrink: 0;

  @media screen and (max-width: 1100px) {
    font-size: 20px;
  }
}

.tiktok-button-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 1;
}

.tiktok-button-subtitle {
  font-size: 14px;
  opacity: 0.8;
  font-weight: normal;

  @media screen and (max-width: 1100px) {
    font-size: 12px;
  }
}

/* Styles de la modal */
.tiktok-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}

.tiktok-modal.active {
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 1;
}

/* Styles du contenu de la modal */
.tiktok-modal-content {
  background: white;
  padding: 20px;
  border-radius: 16px;
  position: relative;
  transition: all 0.3s ease;
  opacity: 0;
  width: 450px;
  max-width: 500px;
  min-height: 300px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);

  /* Styles pour viewport 1100 et mobile */
  @media screen and (max-width: 1100px) {
    width: 95vw !important;
    max-width: 95vw !important;
    height: 80vh !important;
    margin: 10px !important;
    padding: 15px;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
  }

  /* Ajustement pour le zoom à 110% */
  @media screen and (max-width: 1100px) and (min-resolution: 110dpi) {
    transform: scale(0.9) !important;
    margin-top: 5vh !important;
  }
}

/* Container pour l'embed TikTok */
.tiktok-embed-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  @media screen and (max-width: 1100px) {
    flex: 1;
    align-items: flex-start;
  }
}

/* Styles spécifiques pour l'embed TikTok */
.tiktok-embed-container .tiktok-embed {
  margin: 0 auto !important;
  width: 100% !important;
  max-width: none !important;
  
  @media screen and (max-width: 1100px) {
    transform-origin: top center;
    height: 100% !important;
  }
}

/* Bouton de fermeture */
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
  transition: all 0.2s ease;
  z-index: 1001;
  
  @media screen and (max-width: 1100px) {
    top: -40px;
    right: 10px;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.tiktok-close-button:hover {
  transform: rotate(90deg);
  background: #f5f5f5;
}

/* Animation d'entrée de la modal */
@keyframes popin {
  0% {
    transform: scale(0.7);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.tiktok-modal.active .tiktok-modal-content {
  animation: popin 0.5s ease-out forwards;

  @media screen and (max-width: 1100px) {
    animation: none;
    opacity: 1;
  }
}

/* Styles pour le chargement */
.tiktok-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.tiktok-loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
    `;
    document.head.appendChild(style);
  }

  _createInstance(element) {
    const videoUrl = element.dataset.videoUrl;
    const title = element.dataset.title;
    const subtitle = element.dataset.subtitle;
    const videoId = this._getVideoId(videoUrl);

    if (!videoId) return;

    const instance = {
      element,
      videoUrl,
      videoId,
      modal: null
    };

    this._createPreviewButton(instance, title, subtitle);
    this._createModal(instance);
    this._instances.push(instance);
  }

  _createPreviewButton(instance, title, subtitle) {
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

    button.addEventListener("click", () => this._openModal(instance));
    instance.element.appendChild(button);
  }

  _createModal(instance) {
    const modal = document.createElement("div");
    modal.className = "tiktok-modal";
    modal.innerHTML = `
                <div class="tiktok-modal-content">
                    <button class="tiktok-close-button">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="tiktok-embed-container"></div>
                </div>
            `;

    modal
      .querySelector(".tiktok-close-button")
      .addEventListener("click", () => {
        this._closeModal(instance);
      });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this._closeModal(instance);
      }
    });

    instance.modal = modal;
    document.body.appendChild(modal);
  }

  _openModal(instance) {
    instance.modal.classList.add("active");
    this.loadTikTok(instance);
    document.body.style.overflow = "hidden";
  }

  _closeModal(instance) {
    instance.modal.classList.remove("active");
    const container = instance.modal.querySelector(".tiktok-embed-container");
    container.innerHTML = "";
    document.body.style.overflow = "";
  }

  _getVideoId(url) {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  loadTikTok(instance) {
    const container = instance.modal.querySelector(".tiktok-embed-container");
    const embed = document.createElement("blockquote");
    embed.className = "tiktok-embed";
    embed.setAttribute("cite", instance.videoUrl);
    embed.setAttribute("data-video-id", instance.videoId);
    embed.style.maxWidth = "325px";
    embed.style.minWidth = "325px";

    const section = document.createElement("section");
    embed.appendChild(section);

    container.innerHTML = "";
    container.appendChild(embed);

    loadTikTokAPI()
      .then(() => {
        window.Tiktok.Embed.embedTikTokElements();
      })
      .catch((error) =>
        console.error(
          "An error occurred while loading the TikTok script:",
          error
        )
      );
  }
}
