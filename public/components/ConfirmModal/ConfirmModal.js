// ConfirmModal.js - Modular confirmation modal component
class ConfirmModal {
    constructor() {
        this.isInitialized = false;
        this.htmlTemplate = null;
        this.containerElement = null;
        this.confirmCallback = null;
        this.cancelCallback = null;
        this.init = this.init.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleEvent = this.handleEvent.bind(this);
        this.setMessage = this.setMessage.bind(this);
        this.open = this.open.bind(this);
    }

    async init() {
        if (this.isInitialized) return;
        await Promise.all([
            this.loadCSS(),
            this.loadHTML()
        ]);
        this.createFromTemplate();
        this.setupElements();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="ConfirmModal.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/ConfirmModal/ConfirmModal.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/ConfirmModal/ConfirmModal.html');
                if (!response.ok) throw new Error('Failed to fetch HTML template');
                this.htmlTemplate = await response.text();
                resolve();
            } catch (e) { reject(e); }
        });
    }

    createFromTemplate() {
        const existing = document.getElementById('confirm-modal-container');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
    }

    setupElements() {
        this.containerElement = document.getElementById('confirm-modal-container');
        this.messageElement = document.getElementById('confirm-modal-message');
        this.confirmBtn = document.getElementById('confirm-modal-confirm-btn');
        this.cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    }

    setupEventListeners() {
        if (this.confirmBtn) this.confirmBtn.addEventListener('click', () => {
            this.hide();
            if (typeof this.confirmCallback === 'function') this.confirmCallback();
        });
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => {
            this.hide();
            if (typeof this.cancelCallback === 'function') this.cancelCallback();
        });
        if (this.containerElement) this.containerElement.addEventListener('click', (e) => {
            if (e.target === this.containerElement) this.hide();
        });
    }

    setMessage(msg) {
        if (this.messageElement) this.messageElement.textContent = msg;
    }

    open({ message, onConfirm, onCancel }) {
        this.setMessage(message);
        this.confirmCallback = onConfirm;
        this.cancelCallback = onCancel;
        this.show();
    }

    show() {
        if (this.containerElement) this.containerElement.style.display = 'flex';
    }

    hide() {
        if (this.containerElement) this.containerElement.style.display = 'none';
    }
}

window.ConfirmModal = new ConfirmModal(); 