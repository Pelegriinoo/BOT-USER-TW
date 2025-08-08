// Attack Bot Module
window.attackBot = {
    config: {
        interval: 30000,
        troops: { spear: 100, sword: 100, axe: 100 }
    },
    
    state: {
        running: false,
        targets: [],
        currentIndex: 0,
        stats: { attacks: 0, startTime: null }
    },
    
    init() {
        this.createInterface();
        this.loadTargets();
        TwCore.notify.success('Attack Bot carregado');
    },
    
    createInterface() {
        const panel = document.createElement('div');
        panel.id = 'attack-bot-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 80px; right: 20px; width: 320px; background: #2c1810; border: 2px solid #d32f2f; z-index: 99998; font-family: Arial; font-size: 12px; color: white;">
                <div style="background: #d32f2f; padding: 8px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>⚔️ Attack Bot</span>
                    <span style="cursor: pointer;" onclick="attackBot.destroy()">×</span>
                </div>
                
                <div style="padding: 15px;">
                    <div id="attack-status" style="background: #1a0f08; padding: 8px; margin-bottom: 10px; border-left: 3px solid #ff6b35;">
                        ⏸️ Bot parado
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #d4af37;">Tropas:</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                            <div>Lanças: <input type="number" id="attack-spear" value="100" min="0" style="width: 50px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Espadas: <input type="number" id="attack-sword" value="100" min="0" style="width: 50px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Machados: <input type="number" id="attack-axe" value="100" min="0" style="width: 50px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Cav. Leve: <input type="number" id="attack-light" value="0" min="0" style="width: 50px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Adicionar Alvo:</h4>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" id="attack-coord" placeholder="500|500" style="flex: 1; padding: 4px; background: #1a0f08; color: white; border: 1px solid #7d510f;">
                            <button onclick="attackBot.addTarget()" style="padding: 4px 8px; background: #d32f2f; color: white; border: none; cursor: pointer;">+</button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button id="attack-toggle" onclick="attackBot.toggle()" style="width: 48%; padding: 8px; background: #d32f2f; color: white; border: none; cursor: pointer; margin-right: 4%;">
                            ▶️ Iniciar
                        </button>
                        <button onclick="attackBot.clearTargets()" style="width: 48%; padding: 8px; background: #795548; color: white; border: none; cursor: pointer;">
                            🗑️ Limpar
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Alvos (<span id="attack-target-count">0</span>):</h4>
                        <div id="attack-target-list" style="max-height: 100px; overflow-y: auto; background: #1a0f08; padding: 5px; font-size: 10px;">
                            Adicione coordenadas
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Stats:</h4>
                        <div style="background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div>Ataques: <span id="attack-attacks">0</span></div>
                            <div>Tempo: <span id="attack-time">00:00:00</span></div>
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
        document.getElementById('attack-spear').onchange = (e) => this.config.troops.spear = parseInt(e.target.value);
        document.getElementById('attack-sword').onchange = (e) => this.config.troops.sword = parseInt(e.target.value);
        document.getElementById('attack-axe').onchange = (e) => this.config.troops.axe = parseInt(e.target.value);
        document.getElementById('attack-light').onchange = (e) => this.config.troops.light = parseInt(e.target.value);
        
        document.getElementById('attack-coord').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTarget();
        });
    },
    
    addTarget() {
        const input = document.getElementById('attack-coord');
        const coord = input.value.trim();
        
        if (!coord.match(/^\d+\|\d+$/)) {
            TwCore.notify.error('Use formato x|y');
            return;
        }
        
        const [x, y] = coord.split('|');
        this.state.targets.push({ x: parseInt(x), y: parseInt(y) });
        
        input.value = '';
        this.saveTargets();
        this.updateTargetList();
        TwCore.notify.success(`Alvo ${coord} adicionado`);
    },
    
    clearTargets() {
        this.state.targets = [];
        this.saveTargets();
        this.updateTargetList();
        TwCore.notify.info('Lista de alvos limpa');
    },
    
    saveTargets() {
        TwCore.storage.set('attack_targets', this.state.targets);
    },
    
    loadTargets() {
        this.state.targets = TwCore.storage.get('attack_targets', []);
        this.updateTargetList();
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
            TwCore.notify.error('Adicione alvos primeiro!');
            return;
        }
        
        this.state.running = true;
        this.state.stats.startTime = Date.now();
        
        document.getElementById('attack-toggle').innerHTML = '⏸️ Parar';
        document.getElementById('attack-status').innerHTML = '🟢 Atacando...';
        
        TwCore.notify.success('Attack Bot iniciado');
        this.attackLoop();
    },
    
    stop() {
        this.state.running = false;
        document.getElementById('attack-toggle').innerHTML = '▶️ Iniciar';
        document.getElementById('attack-status').innerHTML = '⏸️ Bot parado';
        TwCore.notify.info('Attack Bot parado');
    },
    
    async attackLoop() {
        if (!this.state.running) return;
        
        if (this.state.targets.length > 0) {
            const target = this.state.targets[this.state.currentIndex];
            
            const success = await TwCore.game.sendAttack(target.x, target.y, this.config.troops);
            
            if (success) {
                this.state.stats.attacks++;
                TwCore.log(`Ataque enviado para ${target.x}|${target.y}`);
            } else {
                TwCore.log(`Falha no ataque para ${target.x}|${target.y}`);
            }
            
            this.state.currentIndex = (this.state.currentIndex + 1) % this.state.targets.length;
        }
        
        this.updateInterface();
        
        const nextDelay = this.config.interval + TwCore.time.randomDelay();
        setTimeout(() => this.attackLoop(), nextDelay);
    },
    
    updateTargetList() {
        const listEl = document.getElementById('attack-target-list');
        const countEl = document.getElementById('attack-target-count');
        
        countEl.textContent = this.state.targets.length;
        
        if (this.state.targets.length === 0) {
            listEl.innerHTML = '<div style="color: #888;">Nenhum alvo</div>';
            return;
        }
        
        listEl.innerHTML = this.state.targets.map((target, index) => 
            `<div style="padding: 2px; display: flex; justify-content: space-between; ${index === this.state.currentIndex ? 'background: #d32f2f;' : ''}">
                <span>${target.x}|${target.y}</span>
                <span style="cursor: pointer;" onclick="attackBot.removeTarget(${index})">❌</span>
            </div>`
        ).join('');
    },
    
    removeTarget(index) {
        this.state.targets.splice(index, 1);
        this.saveTargets();
        this.updateTargetList();
    },
    
    updateInterface() {
        document.getElementById('attack-attacks').textContent = this.state.stats.attacks;
        
        if (this.state.stats.startTime) {
            const elapsed = Math.floor((Date.now() - this.state.stats.startTime) / 1000);
            document.getElementById('attack-time').textContent = TwCore.time.formatTime(elapsed);
        }
        
        this.updateTargetList();
    },
    
    destroy() {
        this.stop();
        const panel = document.getElementById('attack-bot-panel');
        if (panel) panel.remove();
        TwCore.notify.info('Attack Bot descarregado');
    }
};

// Auto-inicializar
attackBot.init();

// Atualizar interface
setInterval(() => {
    if (attackBot.state.running) {
        attackBot.updateInterface();
    }
}, 1000);