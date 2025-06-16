export class QuotaDashboardManager {
    constructor(dashboardId = 'quota-dashboard', innerId = 'quota-dashboard-inner') {
        this.dashboard = document.getElementById(dashboardId);
        this.inner = document.getElementById(innerId);
        this.minBtn = document.getElementById('quota-minimize-btn');
        this.usage = { used: 0, total: 10000, percentage: 0, resetTime: '', cacheStats: {} };
        this.isMinimized = false;
        this.disableDrag = false;
        this.init();
    }

    init() {
        this.checkDailyReset();
        this.displayQuotaStatus();
        this.injectCSS();
        
        // Check if dashboard should start minimized
        const isMinimized = localStorage.getItem('quota_dashboard_minimized') === 'true';
        if (isMinimized) {
            console.log('🎯 [QUOTA] Starting in minimized state');
        }
        
        this.addQuotaDashboard();
    }

    checkDailyReset() {
        const lastReset = localStorage.getItem('quota_last_reset');
        const now = new Date();
        const today = now.toDateString();
        
        if (!lastReset || lastReset !== today) {
            localStorage.setItem('quota_used', '0');
            localStorage.setItem('quota_last_reset', today);
            console.log('🎯 [QUOTA] Daily quota reset');
        }
    }

    getCurrentUsage() {
        const used = parseInt(localStorage.getItem('quota_used') || '0');
        const total = this.usage.total;
        const percentage = Math.round((used / total) * 100);
        return { used, total, percentage };
    }

    incrementUsage() {
        const current = parseInt(localStorage.getItem('quota_used') || '0');
        const newCount = current + 1;
        localStorage.setItem('quota_used', newCount.toString());
        this.updateQuotaDashboard();
        return this.getCurrentUsage();
    }

    checkThresholds(currentCount) {
        const percentage = currentCount / this.usage.total;
        if (percentage >= this.warningThresholds.red) return 'red';
        if (percentage >= this.warningThresholds.orange) return 'orange';
        if (percentage >= this.warningThresholds.yellow) return 'yellow';
        return 'green';
    }

    showWarning(remaining) {
        this.showToast(`⚠️ ${remaining} units remaining`, 'warning');
    }

    showCautionWarning(remaining) {
        this.showToast(`⚠️ CAUTION: ${remaining} units remaining`, 'warning');
    }

    showCriticalWarning(remaining) {
        this.showToast(`🚨 CRITICAL: ${remaining} units remaining`, 'error');
    }

    enableCacheOnlyMode() {
        localStorage.setItem('cache_only_mode', 'true');
        this.updateQuotaDashboard();
    }

    disableCacheOnlyMode() {
        localStorage.removeItem('cache_only_mode');
        this.updateQuotaDashboard();
    }

    isCacheOnlyMode() {
        return localStorage.getItem('cache_only_mode') === 'true';
    }

    displayQuotaStatus() {
        const usage = this.getCurrentUsage();
        console.log('🎯 [QUOTA] Current usage:', usage);
        return usage;
    }

    addQuotaDashboard() {
        // Check if dashboard already exists
        if (document.getElementById('quota-dashboard')) return;
        
        const dashboard = document.createElement('div');
        dashboard.id = 'quota-dashboard';
        dashboard.className = 'quota-dashboard';
        dashboard.innerHTML = this.getQuotaDashboardHTML();
        
        // Apply state-specific class
        this.applyDashboardClass(dashboard);
        
        document.body.appendChild(dashboard);
        this.attachDashboardEvents(dashboard);
        this.makeDraggable(dashboard);
    }

    applyDashboardClass(dashboard) {
        const isMinimized = localStorage.getItem('quota_dashboard_minimized') === 'true';
        
        // Remove existing state classes
        dashboard.classList.remove('minimized-dashboard', 'restored-dashboard');
        
        // Add appropriate state class
        if (isMinimized) {
            dashboard.classList.add('minimized-dashboard');
        } else {
            dashboard.classList.add('restored-dashboard');
        }
    }

    getQuotaDashboardHTML() {
        const usage = this.getCurrentUsage();
        const color = this.getProgressColor(usage.percentage);
        
        return `
            <div class="quota-drag-handle">⋮⋮</div>
            <button class="quota-minimize-restore-btn ${this.isMinimized ? 'quota-restore-btn' : 'quota-minimize-btn'}" id="quota-minimize-restore-btn">
                ${this.isMinimized ? '+' : '–'}
            </button>
            <div class="quota-content-${this.isMinimized ? 'minimized' : 'restored'}">
                <div class="quota-title">YouTube API Quota</div>
                <div class="quota-stats">
                    Used: ${usage.used.toLocaleString()} / ${usage.total.toLocaleString()} (${usage.percentage}%)
                </div>
                <div class="quota-progress-bar-bg">
                    <div class="quota-progress-bar" style="width: ${usage.percentage}%; background: ${color};"></div>
                </div>
                <div class="quota-actions">
                    <button class="quota-toggle-cache-btn ${this.isCacheOnlyMode() ? 'cache-on' : 'cache-off'}" id="quota-toggle-cache-mode">
                        ${this.isCacheOnlyMode() ? 'Cache Only' : 'Live Mode'}
                    </button>
                </div>
            </div>
        `;
    }

    getProgressColor(percentage) {
        if (percentage >= 95) return '#f44336'; // Red
        if (percentage >= 85) return '#ff9800'; // Orange  
        if (percentage >= 70) return '#ffeb3b'; // Yellow
        return '#4caf50'; // Green
    }

    updateQuotaDashboard() {
        const dashboard = document.getElementById('quota-dashboard');
        if (dashboard) {
            // Don't update if currently being dragged
            if (dashboard.classList.contains('dragging')) {
                console.log('🎯 [QUOTA] Skipping update - dashboard is being dragged');
                return;
            }
            
            const wasMinimized = dashboard.classList.contains('minimized-dashboard');
            const isMinimized = localStorage.getItem('quota_dashboard_minimized') === 'true';
            
            // Save current position before updating
            const currentLeft = dashboard.style.left;
            const currentTop = dashboard.style.top;
            const currentBottom = dashboard.style.bottom;
            const currentRight = dashboard.style.right;
            
            // Get the new content
            const newContent = this.getQuotaDashboardHTML();
            
            // Update the entire content safely
            dashboard.innerHTML = newContent;
            
            // Apply appropriate CSS class for current state
            this.applyDashboardClass(dashboard);
            
            // Handle position restoration based on state change
            if (wasMinimized !== isMinimized) {
                this.restoreDashboardPosition(dashboard);
            } else {
                // Restore previous position
                if (currentLeft) dashboard.style.left = currentLeft;
                if (currentTop) dashboard.style.top = currentTop;
                if (currentBottom) dashboard.style.bottom = currentBottom;
                if (currentRight) dashboard.style.right = currentRight;
            }
            
            // Reattach event handlers
            this.attachDashboardEvents(dashboard);
            this.makeDraggable(dashboard);
        }
    }

    attachDashboardEvents(dashboard) {
        const toggleBtn = dashboard.querySelector('#quota-toggle-cache-mode');
        const minimizeBtn = dashboard.querySelector('#quota-minimize-restore-btn');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.isCacheOnlyMode()) {
                    this.disableCacheOnlyMode();
                } else {
                    this.enableCacheOnlyMode();
                }
            });
        }
        
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.isMinimized = !this.isMinimized;
                localStorage.setItem('quota_dashboard_minimized', this.isMinimized.toString());
                this.updateQuotaDashboard();
            });
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        if (window.showToast) {
            window.showToast(message, type, duration);
        }
    }

    shouldBlockAPICall() {
        const usage = this.getCurrentUsage();
        const remaining = usage.total - usage.used;
        
        if (remaining <= 0) {
            this.showCriticalWarning(0);
            return true;
        }
        
        if (remaining <= 100) {
            this.showCriticalWarning(remaining);
            return true;
        }
        
        if (remaining <= 500) {
            this.showCautionWarning(remaining);
        } else if (remaining <= 1000) {
            this.showWarning(remaining);
        }
        
        return false;
    }

    makeDraggable(dashboard) {
        const handle = dashboard.querySelector('.quota-drag-handle');
        if (!handle) return;
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        handle.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === handle) {
                isDragging = true;
                dashboard.classList.add('dragging');
            }
        }
        
        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                setTranslate(currentX, currentY, dashboard);
            }
        };
        
        const dragEnd = (e) => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            dashboard.classList.remove('dragging');
            
            // Save position
            localStorage.setItem('quota_dashboard_x', currentX);
            localStorage.setItem('quota_dashboard_y', currentY);
        };
        
        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    }

    restoreDashboardPosition(dashboard) {
        const isMinimized = localStorage.getItem('quota_dashboard_minimized') === 'true';
        
        if (isMinimized) {
            // Minimized dashboard stays in footer - no position restoration needed
            console.log('🎯 [QUOTA] Minimized dashboard positioned in footer');
            return;
        }
        
        // Only restore position for restored dashboard
        const savedX = localStorage.getItem('quota_dashboard_x');
        const savedY = localStorage.getItem('quota_dashboard_y');
        
        if (savedX !== null && savedY !== null) {
            const x = parseInt(savedX);
            const y = parseInt(savedY);
            
            // Ensure position is still within viewport (window might have resized)
            const maxX = window.innerWidth - dashboard.offsetWidth;
            const maxY = window.innerHeight - dashboard.offsetHeight;
            
            const constrainedX = Math.min(Math.max(0, x), maxX);
            const constrainedY = Math.min(Math.max(0, y), maxY);
            
            // Apply custom position
            dashboard.style.left = constrainedX + 'px';
            dashboard.style.top = constrainedY + 'px';
            dashboard.style.right = 'auto';
            dashboard.style.bottom = 'auto';
            dashboard.classList.add('custom-position');
            
            console.log('🎯 [QUOTA] Restored dashboard position:', constrainedX, constrainedY);
        } else {
            // No saved position - use CSS default (top-right)
            console.log('🎯 [QUOTA] Using default position for restored dashboard');
        }
    }

    injectCSS() {
        if (document.getElementById('quota-dashboard-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'quota-dashboard-styles';
        style.textContent = `
            .quota-dashboard {
                position: fixed;
                background: rgba(0,0,0,0.9);
                color: white;
                width: 15vw;
                padding-bottom: 3px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                cursor: move;
                user-select: none;
                border: 2px solid rgba(255,255,255,0.1);
                transition: box-shadow 0.2s ease, transform 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                will-change: transform;
            }

            .quota-toggle-cache-mode-btn {
                background: rgb(27, 156, 20);
                width: 100%;
                font-size: 12px;
            }

            .quota-reset-counter-btn {
                background: #2196f3;
                width: 100%;
                font-size: 12px;
            }

            .quota-dashboard.dragging {
                cursor: grabbing !important;
                transition: none !important;
                will-change: transform, left, top;
            }
            
            .quota-dashboard:hover {
                box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            }
            
            .quota-dashboard:active {
                cursor: grabbing;
            }
            
            .minimized-dashboard {
                height: 5px;
                width: 15px;
                padding: 2px 0px 10px 2px;
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-width: 150px;
                max-width: 150px;
                cursor: default;
                bottom: 1px;
            }
            
            .minimized-dashboard:not(.custom-position) {
                bottom: 1px;
                left: 45%;
                transform: translateX(-50%);
            }
            
            .restored-dashboard {
                height: 150px;
                width: 240px;
                padding: 12px;
                min-width: 240px;
                max-width: 240px;
                cursor: grab;
            }
            
            .restored-dashboard:active {
                cursor: grabbing;
            }
            
            .restored-dashboard:not(.custom-position) {
                top: 10px;
                right: 10px;
            }
            
            .restored-dashboard.custom-position {
                top: auto;
                right: auto;
                bottom: auto;
                left: auto;
                transform: none;
            }
            
            .minimized-dashboard.custom-position {
                bottom: auto;
                left: auto;
                transform: none;
            }
            
            .quota-minimize-restore-btn {
                position: absolute;
                top: 1px;
                right: 4px;
                padding: 2px 0 1px 0;
                border: none;
                border-radius: 3px;
                font-size: 10px;
                cursor: pointer;
                color: white;
                line-height: 1;
                font-weight: bold;
                z-index: 1;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .quota-minimize-btn {
                background: #ff9800;
            }
            
            .quota-restore-btn {
                background: #2196f3;
            }
            
            .quota-minimize-restore-btn:hover {
                opacity: 0.8;
                transform: scale(1.05);
            }
            
            .quota-content-minimized {
                display: flex;
                align-items: center;
                gap: 8px;
                line-height: 14px;
                padding-right: 35px;
            }
            
            .quota-content-restored {
                height: 116px;
                padding-right: 35px;
                padding-top: 14px;
                cursor: grab;
                width: 20vw;
            }
            
            .quota-content-restored:active {
                cursor: grabbing;
            }
            
            .quota-drag-handle {
                position: absolute;
                top: 2px;
                left: 2px;
                color: rgba(255,255,255,0.5);
                font-size: 10px;
                line-height: 8px;
                cursor: grab;
                padding: 2px;
                pointer-events: auto;
                transition: color 0.2s ease;
            }
            
            .quota-drag-handle:hover {
                color: rgba(255,255,255,0.8);
            }
            
            .quota-drag-handle:active {
                cursor: grabbing;
            }
            
            .quota-title {
                font-weight: bold;
                margin-bottom: 8px;
            }
            
            .quota-stats {
                margin-bottom: 8px;
                line-height: 1.3;
            }
            
            .quota-progress-bar-bg {
                background: #333;
                height: 6px;
                border-radius: 3px;
                margin: 8px 0;
                overflow: hidden;
            }
            
            .quota-progress-bar {
                height: 100%;
                transition: width 0.3s;
            }
            
            .quota-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }
            
            .quota-toggle-cache-btn {
                padding: 4px 12px;
                border: none;
                border-radius: 4px;
                background: #f5f5f5;
                color: #333;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .quota-toggle-cache-btn.cache-on {
                background: #4caf50;
                color: #fff;
            }
            
            .quota-toggle-cache-btn.cache-off {
                background: #2196f3;
                color: #fff;
            }
        `;
        
        document.head.appendChild(style);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Toggle logic
    const restored = document.getElementById('quota-dashboard-restored');
    const minimized = document.getElementById('quota-dashboard-minimized');
    const minimizeBtn = document.getElementById('quota-restore-btn');
    const restoreBtn = document.getElementById('quota-minimize-btn');

    minimizeBtn.onclick = () => {
        restored.style.display = 'none';
        minimized.style.display = 'flex';
    };
    restoreBtn.onclick = () => {
        minimized.style.display = 'none';
        restored.style.display = 'block';
    };

    // Drag logic for restored only
    const dragHandle = restored.querySelector('.quota-drag-handle');
    let isDragging = false, offsetX = 0, offsetY = 0;

    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        const rect = restored.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        restored.style.right = 'auto';
        restored.style.bottom = 'auto';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        restored.style.left = (e.clientX - offsetX) + 'px';
        restored.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
});

window.QuotaDashboardManager = QuotaDashboardManager; 