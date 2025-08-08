// Defense Bot Module
window.defenseBot = {
    config: {
        checkInterval: 10000,
        alertSound: true,
        autoCall: false
    },
    
    state: {
        running: false,
        incomingAttacks: [],
        lastCheck: null
    },
    
    init() {
        this.createInterface();
        TwCore.notify.success('Defense Bot carregado');
    },
    
    createInterface() {
        const panel = document.createElement('div');
        panel.id = 'defense-bot-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 80px; right: 20px; width: 320px; background: #2c1810; border: 2px solid #1976d2; z-index: 99998; font-family: Arial; font-size: 12px; color: white;">
                <div style="background: #1976d2; padding: 8px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>🛡️ Defense Bot</span>
                    <span style="cursor: pointer;" onclick="defenseBot.destroy()">×</span>
                </div>
                
                <div style="padding: 15px;">
                    <div id="defense-status" style="background: #1a0f08; padding: 8px; margin-bottom: 10px; border-left: 3px solid #4caf50;">
                        ⏸️ Monitor parado
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #d4af37;">Configurações:</h4>
                        <div style="font-size: 11px;">
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="defense-sound" checked> Som de alerta
                            </label>
                            <label style="display: block; margin-bottom: 5px;">
                                <input type="checkbox" id="defense-auto"> Chamar apoio automático
                            </label>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button id="defense-toggle" onclick="defenseBot.toggle()" style="width: 48%; padding: 8px; background: #1976d2; color: white; border: none; cursor: pointer; margin-right: 4%;">
                            ▶️ Iniciar
                        </button>
                        <button onclick="defenseBot.checkNow()" style="width: 48%; padding: 8px; background: #ff9800; color: white; border: none; cursor: pointer;">
                            🔍 Verificar
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Ataques Recebidos:</h4>
                        <div id="defense-attacks" style="max-height: 120px; overflow-y: auto; background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div style="color: #888;">Nenhum ataque detectado</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Info:</h4>
                        <div style="background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div>Última verificação: <span id="defense-last-check">-</span></div>
                            <div>Status: <span id="defense-village-status">Segura</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.setupEvents();
    },
    
    setupEvents() {
        document.getElementById('defense-sound').onchange = (e) => this.config.alertSound = e.target.checked;
        document.getElementById('defense-auto').onchange = (e) => this.config.autoCall = e.target.checked;
    },
    
    toggle() {
        if (this.state.running) {
            this.stop();
        } else {
            this.start();
        }
    },
    
    start() {
        this.state.running = true;
        document.getElementById('defense-toggle').innerHTML = '⏸️ Parar';
        document.getElementById('defense-status').innerHTML = '🟢 Monitorando...';
        
        TwCore.notify.success('Defense Bot iniciado');
        this.monitorLoop();
    },
    
    stop() {
        this.state.running = false;
        document.getElementById('defense-toggle').innerHTML = '▶️ Iniciar';
        document.getElementById('defense-status').innerHTML = '⏸️ Monitor parado';
        TwCore.notify.info('Defense Bot parado');
    },
    
    async checkNow() {
        await this.checkIncomingAttacks();
    },
    
    async monitorLoop() {
        if (!this.state.running) return;
        
        await this.checkIncomingAttacks();
        
        setTimeout(() => this.monitorLoop(), this.config.checkInterval);
    },
    
    async checkIncomingAttacks() {
        try {
            const village = TwCore.game.getCurrentVillage();
            const response = await fetch(`/game.php?village=${village}&screen=overview`);
            const html = await response.text();
            
            this.state.lastCheck = new Date().toLocaleTimeString();
            document.getElementById('defense-last-check').textContent = this.state.lastCheck;
            
            // Buscar ataques na página
            const attackMatches = html.match(/class="attack"[^>]*>[\s\S]*?<\/tr>/g) || [];
            const newAttacks = [];
            
            attackMatches.forEach(attackHtml => {
                const coordMatch = attackHtml.match(/(\d+\|\d+)/);
                const timeMatch = attackHtml.match(/(\d{2}:\d{2}:\d{2})/);
                
                if (coordMatch && timeMatch) {
                    const attackId = coordMatch[1] + timeMatch[1];
                    
                    if (!this.state.incomingAttacks.find(a => a.id === attackId)) {
                        newAttacks.push({
                            id: attackId,
                            origin: coordMatch[1],
                            arrivalTime: timeMatch[1],
                            detected: new Date().toLocaleTimeString()
                        });
                    }
                }
            });
            
            // Processar novos ataques
            if (newAttacks.length > 0) {
                this.state.incomingAttacks.push(...newAttacks);
                this.handleNewAttacks(newAttacks);
            }
            
            this.updateAttacksList();
            this.updateStatus();
            
        } catch (error) {
            TwCore.log('Erro ao verificar ataques:', error);
        }
    },
    
    handleNewAttacks(attacks) {
        attacks.forEach(attack => {
            TwCore.notify.error(`🚨 ATAQUE DE ${attack.origin} - CHEGA ${attack.arrivalTime}`);
            
            if (this.config.alertSound) {
                this.playAlertSound();
            }
            
            if (this.config.autoCall) {
                this.callSupport(attack);
            }
        });
    },
    
    playAlertSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvWYdBjeJ0/LNfC4GIXbE8Nqwm6I');
            audio.play();
        } catch (error) {
            // Fallback para beep
            console.log('🔊 ALERTA DE ATAQUE!');
        }
    },
    
    async callSupport(attack) {
        // Implementar chamada automática de apoio
        TwCore.log(`Chamando apoio para ataque de ${attack.origin}`);
    },
    
    updateAttacksList() {
        const listEl = document.getElementById('defense-attacks');
        
        if (this.state.incomingAttacks.length === 0) {
            listEl.innerHTML = '<div style="color: #888;">Nenhum ataque detectado</div>';
            return;
        }
        
        listEl.innerHTML = this.state.incomingAttacks.slice(-10).map(attack => 
            `<div style="padding: 3px; background: #d32f2f; margin: 2px 0; border-radius: 2px;">
                🚨 ${attack.origin} → ${attack.arrivalTime}
                <div style="font-size: 9px; color: #ccc;">Detectado: ${attack.detected}</div>
            </div>`
        ).join('');
    },
    
    updateStatus() {
        const statusEl = document.getElementById('defense-village-status');
        
        if (this.state.incomingAttacks.length === 0) {
            statusEl.textContent = 'Segura';
            statusEl.style.color = '#4caf50';
        } else {
            statusEl.textContent = `${this.state.incomingAttacks.length} ataques!`;
            statusEl.style.color = '#f44336';
        }
    },
    
    destroy() {
        this.stop();
        const panel = document.getElementById('defense-bot-panel');
        if (panel) panel.remove();
        TwCore.notify.info('Defense Bot descarregado');
    }
};

// Auto-inicializar
defenseBot.init();