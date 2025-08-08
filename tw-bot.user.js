// ==UserScript==
// @name         TW Bot Hub
// @namespace    https://github.com/Pelegriinoo/BOT-USER-TW
// @version      1.0.0
// @description  Bot modular para Tribal Wars carregado do GitHub
// @author       Pelegrino
// @match        https://*.tribalwars.com.br/game.php*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Pelegriinoo/BOT-USER-TW/main/tw-bot.user.js
// @downloadURL  https://raw.githubusercontent.com/Pelegriinoo/BOT-USER-TW/main/tw-bot.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    const GITHUB_BASE = 'https://raw.githubusercontent.com/Pelegriinoo/BOT-USER-TW/main';
    const moduleCache = {};
    
    class TwBotHub {
        constructor() {
            this.loadedModules = new Set();
            this.init();
        }
        
        async init() {
            await this.loadCore();
            this.createInterface();
        }
        
        async loadCore() {
            try {
                const coreUrl = `${GITHUB_BASE}/src/core/core.js`;
                const coreCode = await this.fetchModule(coreUrl);
                eval(coreCode);
                console.log('✅ Core carregado');
            } catch (error) {
                console.error('❌ Erro ao carregar core:', error);
            }
        }
        
        async fetchModule(url) {
            if (moduleCache[url]) return moduleCache[url];
            
            const response = await fetch(url + '?t=' + Date.now());
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            const code = await response.text();
            moduleCache[url] = code;
            return code;
        }
        
        createInterface() {
            const existing = document.getElementById('tw-bot-hub');
            if (existing) existing.remove();
            
            const panel = document.createElement('div');
            panel.id = 'tw-bot-hub';
            panel.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; width: 350px; background: #2c1810; border: 2px solid #7d510f; z-index: 99999; font-family: Arial; font-size: 12px; color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                    <div style="background: #7d510f; padding: 12px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                        <span>🤖 TW Bot Hub v1.0</span>
                        <div>
                            <span id="connection-status" style="margin-right: 10px;">🔄</span>
                            <span style="cursor: pointer; font-size: 16px;" onclick="this.closest('#tw-bot-hub').style.display='none'">×</span>
                        </div>
                    </div>
                    
                    <div style="padding: 15px;">
                        <div id="hub-status" style="background: #1a0f08; padding: 8px; margin-bottom: 15px; border-left: 3px solid #d4af37; font-size: 11px;">
                            🟢 Hub online - Módulos: <span id="module-count">0</span>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #d4af37;">Módulos:</h4>
                            
                            <button id="farm-module" onclick="twBotHub.loadModule('farm')" style="width: 100%; padding: 10px; background: #388e3c; color: white; border: none; cursor: pointer; margin-bottom: 8px; border-radius: 3px;">
                                🌾 Farm Bot
                            </button>
                            
                            <button id="attack-module" onclick="twBotHub.loadModule('attack')" style="width: 100%; padding: 10px; background: #d32f2f; color: white; border: none; cursor: pointer; margin-bottom: 8px; border-radius: 3px;">
                                ⚔️ Attack Bot
                            </button>
                            
                            <button id="defense-module" onclick="twBotHub.loadModule('defense')" style="width: 100%; padding: 10px; background: #1976d2; color: white; border: none; cursor: pointer; margin-bottom: 8px; border-radius: 3px;">
                                🛡️ Defense Bot
                            </button>
                            
                            <button id="snipe-module" onclick="twBotHub.loadModule('snipe')" style="width: 100%; padding: 10px; background: #ff9800; color: white; border: none; cursor: pointer; margin-bottom: 8px; border-radius: 3px;">
                                🎯 Snipe Bot
                            </button>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 5px 0; color: #d4af37;">Ativos:</h4>
                            <div id="active-modules" style="background: #1a0f08; padding: 8px; min-height: 40px; font-size: 11px;">
                                <div style="color: #888;">Nenhum módulo ativo</div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button onclick="twBotHub.reloadModules()" style="padding: 8px; background: #795548; color: white; border: none; cursor: pointer; border-radius: 3px; font-size: 11px;">
                                🔄 Recarregar
                            </button>
                            <button onclick="twBotHub.showSettings()" style="padding: 8px; background: #607d8b; color: white; border: none; cursor: pointer; border-radius: 3px; font-size: 11px;">
                                ⚙️ Config
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(panel);
            this.updateConnectionStatus();
        }
        
        async loadModule(moduleName) {
            try {
                const button = document.getElementById(`${moduleName}-module`);
                button.innerHTML = `🔄 Carregando...`;
                button.disabled = true;
                
                const moduleUrl = `${GITHUB_BASE}/src/modules/${moduleName}.js`;
                const moduleCode = await this.fetchModule(moduleUrl);
                
                eval(moduleCode);
                
                this.loadedModules.add(moduleName);
                this.updateActiveModules();
                
                button.innerHTML = `✅ ${moduleName} Ativo`;
                button.style.background = '#4caf50';
                
                console.log(`✅ Módulo ${moduleName} carregado`);
                
            } catch (error) {
                console.error(`❌ Erro ao carregar ${moduleName}:`, error);
                
                const button = document.getElementById(`${moduleName}-module`);
                button.innerHTML = `❌ Erro`;
                button.style.background = '#f44336';
                button.disabled = false;
            }
        }
        
        updateActiveModules() {
            const container = document.getElementById('active-modules');
            const count = document.getElementById('module-count');
            
            count.textContent = this.loadedModules.size;
            
            if (this.loadedModules.size === 0) {
                container.innerHTML = '<div style="color: #888;">Nenhum módulo ativo</div>';
                return;
            }
            
            container.innerHTML = Array.from(this.loadedModules).map(module => 
                `<div style="padding: 3px; background: #7d510f; margin: 2px 0; border-radius: 2px;">
                    📦 ${module}
                    <span style="float: right; cursor: pointer;" onclick="twBotHub.unloadModule('${module}')">❌</span>
                </div>`
            ).join('');
        }
        
        unloadModule(moduleName) {
            if (window[`${moduleName}Bot`] && window[`${moduleName}Bot`].destroy) {
                window[`${moduleName}Bot`].destroy();
            }
            
            this.loadedModules.delete(moduleName);
            this.updateActiveModules();
            
            const button = document.getElementById(`${moduleName}-module`);
            button.innerHTML = `${this.getModuleIcon(moduleName)} ${moduleName} Bot`;
            button.style.background = this.getModuleColor(moduleName);
            button.disabled = false;
        }
        
        getModuleIcon(module) {
            const icons = { farm: '🌾', attack: '⚔️', defense: '🛡️', snipe: '🎯' };
            return icons[module] || '📦';
        }
        
        getModuleColor(module) {
            const colors = { farm: '#388e3c', attack: '#d32f2f', defense: '#1976d2', snipe: '#ff9800' };
            return colors[module] || '#607d8b';
        }
        
        async reloadModules() {
            Object.keys(moduleCache).forEach(key => delete moduleCache[key]);
            
            const activeModules = Array.from(this.loadedModules);
            activeModules.forEach(module => this.unloadModule(module));
            
            setTimeout(() => {
                activeModules.forEach(module => this.loadModule(module));
            }, 1000);
        }
        
        updateConnectionStatus() {
            const status = document.getElementById('connection-status');
            
            fetch(`${GITHUB_BASE}/README.md`, { method: 'HEAD' })
                .then(response => {
                    status.innerHTML = response.ok ? '🟢' : '🟡';
                    status.title = response.ok ? 'Conectado' : 'Instável';
                })
                .catch(() => {
                    status.innerHTML = '🔴';
                    status.title = 'Sem conexão';
                });
        }
        
        showSettings() {
            alert('⚙️ Em desenvolvimento...');
        }
    }
    
    window.twBotHub = new TwBotHub();
    
    setInterval(() => {
        if (window.twBotHub) {
            window.twBotHub.updateConnectionStatus();
        }
    }, 30000);
    
})();