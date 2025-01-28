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

class TikTokModalEmbed {
  constructor(options = {}) {
    this.version = "1.0.0";
    this._options = {
      selector: ".my-tiktok-embed",
      modalAnimation: true,
      autoplayOnOpen: true,
      ...options
    };
    this._instances = [];
    this._init();
  }

  _init() {
    this._addGlobalStyles();

    const elements = document.querySelectorAll(this._options.selector);
    elements.forEach((element) => this._createInstance(element));
  }

  _addGlobalStyles() {
    if (document.getElementById("tiktok-embed-styles")) return; // Vérifier si les styles sont déjà présents

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
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); /* Ombre plus douce */
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
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2); /* Ombre plus marquée au survol */
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
    opacity: 0.8; /* Opacité réduite pour un look plus léger */
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
    max-width: 90vw;
    min-height: 300px; 
    opacity: 0; 
  }

  .tiktok-modal.active .tiktok-modal-content {
    transform: scale(1); /* Restaure à la taille normale */
    opacity: 1; /* Restaure l'opacité */
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
    animation: popin 0.5s ease-out forwards; /* Application de l'animation */
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
  }

  .tiktok-close-button:hover {
    transform: rotate(90deg);
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

    // Créer une section vide requise par TikTok
    const section = document.createElement("section");
    embed.appendChild(section);

    container.innerHTML = "";
    container.appendChild(embed);

    loadTikTokAPI()
      .then(() => {
        // console.log("TikTok script loaded successfully.");
        // Après avoir chargé le script, appeler la méthode TikTok pour rendre l'élément
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
