// Farm Bot Module
window.farmBot = {
    config: {
        interval: 60000,
        maxDistance: 15,
        minPoints: 26,
        maxPoints: 500,
        troops: { light: 50, axe: 30 }
    },
    
    state: {
        running: false,
        targets: [],
        currentIndex: 0,
        stats: { attacks: 0, startTime: null }
    },
    
    init() {
        this.createInterface();
        TwCore.notify.success('Farm Bot carregado');
    },
    
    createInterface() {
        const panel = document.createElement('div');
        panel.id = 'farm-bot-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 80px; right: 20px; width: 320px; background: #2c1810; border: 2px solid #388e3c; z-index: 99998; font-family: Arial; font-size: 12px; color: white;">
                <div style="background: #388e3c; padding: 8px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>🌾 Farm Bot</span>
                    <span style="cursor: pointer;" onclick="farmBot.destroy()">×</span>
                </div>
                
                <div style="padding: 15px;">
                    <div id="farm-status" style="background: #1a0f08; padding: 8px; margin-bottom: 10px; border-left: 3px solid #ff6b35;">
                        ⏸️ Bot parado
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #d4af37;">Config:</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                            <div>Intervalo (s): <input type="number" id="farm-interval" value="60" min="30" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Distância: <input type="number" id="farm-distance" value="15" min="5" max="50" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Cav. Leve: <input type="number" id="farm-light" value="50" min="0" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Machados: <input type="number" id="farm-axe" value="30" min="0" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button id="farm-scan" onclick="farmBot.scanTargets()" style="width: 48%; padding: 8px; background: #1565c0; color: white; border: none; cursor: pointer; margin-right: 4%;">
                            🔍 Escanear
                        </button>
                        <button id="farm-toggle" onclick="farmBot.toggle()" style="width: 48%; padding: 8px; background: #388e3c; color: white; border: none; cursor: pointer;">
                            ▶️ Iniciar
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Alvos (<span id="farm-target-count">0</span>):</h4>
                        <div id="farm-target-list" style="max-height: 100px; overflow-y: auto; background: #1a0f08; padding: 5px; font-size: 10px;">
                            Clique em "Escanear"
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Stats:</h4>
                        <div style="background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div>Ataques: <span id="farm-attacks">0</span></div>
                            <div>Tempo: <span id="farm-time">00:00:00</span></div>
                            <div>Próximo: <span id="farm-next">-</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.setupEvents();
        this.updateInterface();
    },
    
    setupEvents() {
        document.getElementById('farm-interval').onchange = (e) => this.config.interval = e.target.value * 1000;
        document.getElementById('farm-distance').onchange = (e) => this.config.maxDistance = parseInt(e.target.value);
        document.getElementById('farm-light').onchange = (e) => this.config.troops.light = parseInt(e.target.value);
        document.getElementById('farm-axe').onchange = (e) => this.config.troops.axe = parseInt(e.target.value);
    },
    
    async scanTargets() {
        const statusEl = document.getElementById('farm-status');
        statusEl.innerHTML = '🔍 Escaneando...';
        
        try {
            const village = TwCore.game.getCurrentVillage();
            const myCoords = await TwCore.game.getVillageCoords(village);
            
            if (!myCoords) throw new Error('Coordenadas não encontradas');
            
            const targets = [];
            const scanRadius = this.config.maxDistance;
            
            for (let x = myCoords.x - scanRadius; x <= myCoords.x + scanRadius; x++) {
                for (let y = myCoords.y - scanRadius; y <= myCoords.y + scanRadius; y++) {
                    if (x === myCoords.x && y === myCoords.y) continue;
                    
                    const villageInfo = await TwCore.game.checkVillage(x, y);
                    
                    if (villageInfo && villageInfo.isBarbarian && 
                        villageInfo.points >= this.config.minPoints && 
                        villageInfo.points <= this.config.maxPoints) {
                        
                        const distance = TwCore.math.distance(myCoords.x, myCoords.y, x, y);
                        
                        targets.push({
                            x, y,
                            points: villageInfo.points,
                            distance: distance.toFixed(1)
                        });
                    }
                    
                    await TwCore.time.wait(100); // Anti-spam
                }
            }
            
            targets.sort((a, b) => a.distance - b.distance);
            this.state.targets = targets;
            this.updateTargetList();
            
            statusEl.innerHTML = `✅ ${targets.length} alvos encontrados`;
            TwCore.notify.success(`${targets.length} alvos escaneados`);
            
        } catch (error) {
            statusEl.innerHTML = '❌ Erro no scan';
            TwCore.notify.error('Erro ao escanear alvos');
            TwCore.log('Erro no scan:', error);
        }
    },
    
    toggle() {
        if (this.state.running) {
            this.stop();
        } else {
            this.start();
        }
    },
    
    start() {
        if (this.state.targets.length === 0) {
            TwCore.notify.error('Escaneie alvos primeiro!');
            return;
        }
        
        this.state.running = true;
        this.state.stats.startTime = Date.now();
        
        document.getElementById('farm-toggle').innerHTML = '⏸️ Parar';
        document.getElementById('farm-status').innerHTML = '🟢 Farmando...';
        
        TwCore.notify.success('Farm Bot iniciado');
        this.farmLoop();
    },
    
    stop() {
        this.state.running = false;
        document.getElementById('farm-toggle').innerHTML = '▶️ Iniciar';
        document.getElementById('farm-status').innerHTML = '⏸️ Bot parado';
        TwCore.notify.info('Farm Bot parado');
    },
    
    async farmLoop() {
        if (!this.state.running) return;
        
        if (this.state.targets.length > 0) {
            const target = this.state.targets[this.state.currentIndex];
            
            const success = await TwCore.game.sendAttack(target.x, target.y, this.config.troops);
            
            if (success) {
                this.state.stats.attacks++;
                TwCore.log(`Farm enviado para ${target.x}|${target.y}`);
            } else {
                TwCore.log(`Falha no farm para ${target.x}|${target.y}`);
            }
            
            this.state.currentIndex = (this.state.currentIndex + 1) % this.state.targets.length;
        }
        
        this.updateInterface();
        
        const nextDelay = this.config.interval + TwCore.time.randomDelay(-5000, 5000);
        setTimeout(() => this.farmLoop(), nextDelay);
    },
    
    updateTargetList() {
        const listEl = document.getElementById('farm-target-list');
        const countEl = document.getElementById('farm-target-count');
        
        countEl.textContent = this.state.targets.length;
        
        if (this.state.targets.length === 0) {
            listEl.innerHTML = '<div style="color: #888;">Nenhum alvo</div>';
            return;
        }
        
        listEl.innerHTML = this.state.targets.slice(0, 8).map((target, index) => 
            `<div style="padding: 2px; ${index === this.state.currentIndex ? 'background: #388e3c;' : ''}">
                ${target.x}|${target.y} (${target.points}pts, ${target.distance} campos)
            </div>`
        ).join('');
    },
    
    updateInterface() {
        document.getElementById('farm-attacks').textContent = this.state.stats.attacks;
        
        if (this.state.stats.startTime) {
            const elapsed = Math.floor((Date.now() - this.state.stats.startTime) / 1000);
            document.getElementById('farm-time').textContent = TwCore.time.formatTime(elapsed);
        }
        
        this.updateTargetList();
    },
    
    destroy() {
        this.stop();
        const panel = document.getElementById('farm-bot-panel');
        if (panel) panel.remove();
        TwCore.notify.info('Farm Bot descarregado');
    }
};

// Auto-inicializar
farmBot.init();

// Atualizar interface a cada segundo
setInterval(() => {
    if (farmBot.state.running) {
        farmBot.updateInterface();
    }
}, 1000);