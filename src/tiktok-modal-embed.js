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

class TikTokEmbed {
  constructor(options = {}) {
    this.version = "1.0.5";
    this._options = {
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
`;
    document.head.appendChild(style);
  }

  // Le reste du code reste identique...
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
