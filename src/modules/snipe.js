// Snipe Bot Module
window.snipeBot = {
    config: {
        troops: { light: 1 },
        precision: 100 // ms de precisão
    },
    
    state: {
        scheduledAttacks: [],
        timers: new Map()
    },
    
    init() {
        this.createInterface();
        this.loadScheduledAttacks();
        TwCore.notify.success('Snipe Bot carregado');
    },
    
    createInterface() {
        const panel = document.createElement('div');
        panel.id = 'snipe-bot-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 80px; right: 20px; width: 320px; background: #2c1810; border: 2px solid #ff9800; z-index: 99998; font-family: Arial; font-size: 12px; color: white;">
                <div style="background: #ff9800; padding: 8px; font-weight: bold; display: flex; justify-content: space-between;">
                    <span>🎯 Snipe Bot</span>
                    <span style="cursor: pointer;" onclick="snipeBot.destroy()">×</span>
                </div>
                
                <div style="padding: 15px;">
                    <div id="snipe-status" style="background: #1a0f08; padding: 8px; margin-bottom: 10px; border-left: 3px solid #ff9800;">
                        ⏸️ Aguardando comandos
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #d4af37;">Agendar Snipe:</h4>
                        <div style="margin-bottom: 8px;">
                            <input type="text" id="snipe-coord" placeholder="500|500" style="width: 100%; padding: 4px; background: #1a0f08; color: white; border: 1px solid #7d510f; margin-bottom: 5px;">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px;">
                            <input type="date" id="snipe-date" style="padding: 4px; background: #1a0f08; color: white; border: 1px solid #7d510f;">
                            <input type="time" id="snipe-time" step="1" style="padding: 4px; background: #1a0f08; color: white; border: 1px solid #7d510f;">
                        </div>
                        <button onclick="snipeBot.scheduleAttack()" style="width: 100%; padding: 8px; background: #ff9800; color: white; border: none; cursor: pointer;">
                            ⏰ Agendar Snipe
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #d4af37;">Tropas para Snipe:</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                            <div>Cav. Leve: <input type="number" id="snipe-light" value="1" min="0" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                            <div>Espiões: <input type="number" id="snipe-spy" value="0" min="0" style="width: 40px; background: #1a0f08; color: white; border: 1px solid #7d510f; padding: 2px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button onclick="snipeBot.clearAll()" style="width: 100%; padding: 8px; background: #795548; color: white; border: none; cursor: pointer;">
                            🗑️ Limpar Agendamentos
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Agendados (<span id="snipe-count">0</span>):</h4>
                        <div id="snipe-list" style="max-height: 120px; overflow-y: auto; background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div style="color: #888;">Nenhum snipe agendado</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #d4af37;">Info:</h4>
                        <div style="background: #1a0f08; padding: 5px; font-size: 10px;">
                            <div>Tempo atual: <span id="snipe-current-time">-</span></div>
                            <div>Próximo snipe: <span id="snipe-next">-</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.setupEvents();
        this.updateInterface();
        this.startTimeUpdater();
    },
    
    setupEvents() {
        document.getElementById('snipe-light').onchange = (e) => this.config.troops.light = parseInt(e.target.value);
        document.getElementById('snipe-spy').onchange = (e) => this.config.troops.spy = parseInt(e.target.value);
        
        // Definir data/hora padrão para hoje + 1 hora
        const now = new Date();
        now.setHours(now.getHours() + 1);
        
        document.getElementById('snipe-date').value = now.toISOString().split('T')[0];
        document.getElementById('snipe-time').value = now.toTimeString().slice(0, 8);
    },
    
    scheduleAttack() {
        const coord = document.getElementById('snipe-coord').value.trim();
        const date = document.getElementById('snipe-date').value;
        const time = document.getElementById('snipe-time').value;
        
        if (!coord.match(/^\d+\|\d+$/)) {
            TwCore.notify.error('Use formato x|y');
            return;
        }
        
        if (!date || !time) {
            TwCore.notify.error('Defina data e hora');
            return;
        }
        
        const [x, y] = coord.split('|');
        const targetTime = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (targetTime <= now) {
            TwCore.notify.error('Hora deve ser no futuro');
            return;
        }
        
        const attack = {
            id: Date.now(),
            x: parseInt(x),
            y: parseInt(y),
            targetTime: targetTime.getTime(),
            troops: { ...this.config.troops },
            status: 'agendado'
        };
        
        this.state.scheduledAttacks.push(attack);
        this.saveScheduledAttacks();
        this.scheduleTimer(attack);
        this.updateInterface();
        
        // Limpar campos
        document.getElementById('snipe-coord').value = '';
        
        TwCore.notify.success(`Snipe agendado para ${coord} às ${time}`);
    },
    
    scheduleTimer(attack) {
        const now = Date.now();
        const timeUntilAttack = attack.targetTime - now;
        
        if (timeUntilAttack <= 0) return;
        
        const timerId = setTimeout(() => {
            this.executeSnipe(attack);
        }, timeUntilAttack - this.config.precision);
        
        this.state.timers.set(attack.id, timerId);
    },
    
    async executeSnipe(attack) {
        try {
            attack.status = 'executando';
            this.updateInterface();
            
            const success = await TwCore.game.sendAttack(attack.x, attack.y, attack.troops);
            
            if (success) {
                attack.status = 'enviado';
                TwCore.notify.success(`✅ Snipe enviado para ${attack.x}|${attack.y}`);
            } else {
                attack.status = 'falhou';
                TwCore.notify.error(`❌ Snipe falhou para ${attack.x}|${attack.y}`);
            }
            
            this.state.timers.delete(attack.id);
            this.saveScheduledAttacks();
            this.updateInterface();
            
        } catch (error) {
            attack.status = 'erro';
            TwCore.log('Erro no snipe:', error);
            TwCore.notify.error('Erro ao executar snipe');
        }
    },
    
    cancelAttack(attackId) {
        const timerId = this.state.timers.get(attackId);
        if (timerId) {
            clearTimeout(timerId);
            this.state.timers.delete(attackId);
        }
        
        this.state.scheduledAttacks = this.state.scheduledAttacks.filter(a => a.id !== attackId);
        this.saveScheduledAttacks();
        this.updateInterface();
        TwCore.notify.info('Snipe cancelado');
    },
    
    clearAll() {
        this.state.timers.forEach(timerId => clearTimeout(timerId));
        this.state.timers.clear();
        this.state.scheduledAttacks = [];
        this.saveScheduledAttacks();
        this.updateInterface();
        TwCore.notify.info('Todos os snipes cancelados');
    },
    
    saveScheduledAttacks() {
        TwCore.storage.set('snipe_attacks', this.state.scheduledAttacks);
    },
    
    loadScheduledAttacks() {
        this.state.scheduledAttacks = TwCore.storage.get('snipe_attacks', []);
        
        // Reagendar timers ativos
        const now = Date.now();
        this.state.scheduledAttacks.forEach(attack => {
            if (attack.status === 'agendado' && attack.targetTime > now) {
                this.scheduleTimer(attack);
            }
        });
        
        this.updateInterface();
    },
    
    startTimeUpdater() {
        setInterval(() => {
            const now = new Date();
            document.getElementById('snipe-current-time').textContent = now.toLocaleTimeString();
            
            const nextAttack = this.state.scheduledAttacks
                .filter(a => a.status === 'agendado' && a.targetTime > now.getTime())
                .sort((a, b) => a.targetTime - b.targetTime)[0];
            
            if (nextAttack) {
                const timeUntil = nextAttack.targetTime - now.getTime();
                const minutes = Math.floor(timeUntil / 60000);
                const seconds = Math.floor((timeUntil % 60000) / 1000);
                document.getElementById('snipe-next').textContent = `${minutes}m ${seconds}s`;
            } else {
                document.getElementById('snipe-next').textContent = '-';
            }
        }, 1000);
    },
    
    updateInterface() {
        const listEl = document.getElementById('snipe-list');
        const countEl = document.getElementById('snipe-count');
        
        countEl.textContent = this.state.scheduledAttacks.length;
        
        if (this.state.scheduledAttacks.length === 0) {
            listEl.innerHTML = '<div style="color: #888;">Nenhum snipe agendado</div>';
            return;
        }
        
        listEl.innerHTML = this.state.scheduledAttacks.map(attack => {
            const targetDate = new Date(attack.targetTime);
            const statusColors = {
                agendado: '#ff9800',
                executando: '#2196f3',
                enviado: '#4caf50',
                falhou: '#f44336',
                erro: '#9c27b0'
            };
            
            return `<div style="padding: 3px; background: ${statusColors[attack.status]}; margin: 2px 0; border-radius: 2px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div>${attack.x}|${attack.y}</div>
                    <div style="font-size: 9px;">${targetDate.toLocaleString()}</div>
                    <div style="font-size: 9px;">Status: ${attack.status}</div>
                </div>
                ${attack.status === 'agendado' ? `<span style="cursor: pointer;" onclick="snipeBot.cancelAttack(${attack.id})">❌</span>` : ''}
            </div>`;
        }).join('');
    },
    
    destroy() {
        this.state.timers.forEach(timerId => clearTimeout(timerId));
        this.state.timers.clear();
        
        const panel = document.getElementById('snipe-bot-panel');
        if (panel) panel.remove();
        TwCore.notify.info('Snipe Bot descarregado');
    }
};

// Auto-inicializar
snipeBot.init();