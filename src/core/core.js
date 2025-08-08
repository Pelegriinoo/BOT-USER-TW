// Core utilities for TW Bot
window.TwCore = {
    // Configurações globais
    config: {
        debug: true,
        maxRetries: 3,
        defaultDelay: 1000
    },
    
    // Utilidades de tempo
    time: {
        wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        randomDelay: (min = 500, max = 2000) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
        formatTime: (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    },
    
    // Funções do jogo
    game: {
        getCurrentVillage: () => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('village');
        },
        
        getToken: () => {
            const input = document.querySelector('input[name="h"]');
            return input ? input.value : null;
        },
        
        getVillageCoords: async (villageId) => {
            try {
                const response = await fetch(`/game.php?village=${villageId}&screen=overview`);
                const html = await response.text();
                const coordMatch = html.match(/\((\d+)\|(\d+)\)/);
                
                return coordMatch ? { 
                    x: parseInt(coordMatch[1]), 
                    y: parseInt(coordMatch[2]) 
                } : null;
            } catch (error) {
                TwCore.log('Erro ao obter coordenadas:', error);
                return null;
            }
        },
        
        checkVillage: async (x, y) => {
            try {
                const village = TwCore.game.getCurrentVillage();
                const response = await fetch(`/game.php?village=${village}&screen=info_village&ajax=info&x=${x}&y=${y}`);
                const html = await response.text();
                
                const isBarbarian = html.includes('Bárbaro') || html.includes('barbarian');
                const pointsMatch = html.match(/(\d+)\s*pontos/);
                const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;
                
                const nameMatch = html.match(/<h2[^>]*>([^<]+)</);
                const name = nameMatch ? nameMatch[1].trim() : 'Desconhecida';
                
                return {
                    x, y,
                    name,
                    points,
                    isBarbarian,
                    exists: !html.includes('não encontrada')
                };
            } catch (error) {
                return null;
            }
        },
        
        sendAttack: async (x, y, troops) => {
            try {
                const village = TwCore.game.getCurrentVillage();
                const h = TwCore.game.getToken();
                
                if (!h) throw new Error('Token não encontrado');
                
                // Preparar ataque
                const formData = new FormData();
                formData.append('x', x);
                formData.append('y', y);
                formData.append('target_type', 'coord');
                formData.append('h', h);
                formData.append('attack', 'Atacar');
                
                // Adicionar tropas
                Object.entries(troops).forEach(([unit, count]) => {
                    if (count > 0) formData.append(unit, count);
                });
                
                // Confirmar
                const confirmResponse = await fetch(`game.php?village=${village}&screen=place&try=confirm`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!confirmResponse.ok) return false;
                
                const confirmHtml = await confirmResponse.text();
                
                if (confirmHtml.includes('error_box') || confirmHtml.includes('Erro')) {
                    return false;
                }
                
                // Enviar final
                const finalData = new FormData();
                finalData.append('h', h);
                
                const hiddenInputs = confirmHtml.match(/<input[^>]*type="hidden"[^>]*>/g) || [];
                hiddenInputs.forEach(input => {
                    const nameMatch = input.match(/name="([^"]+)"/);
                    const valueMatch = input.match(/value="([^"]*)"/);
                    if (nameMatch && valueMatch) {
                        finalData.append(nameMatch[1], valueMatch[1]);
                    }
                });
                
                const finalResponse = await fetch(`game.php?village=${village}&screen=place&action=command&h=${h}`, {
                    method: 'POST',
                    body: finalData
                });
                
                return finalResponse.ok;
                
            } catch (error) {
                TwCore.log('Erro no ataque:', error);
                return false;
            }
        }
    },
    
    // Sistema de storage
    storage: {
        set: (key, value) => {
            localStorage.setItem(`twbot_${key}`, JSON.stringify(value));
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(`twbot_${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        
        remove: (key) => {
            localStorage.removeItem(`twbot_${key}`);
        }
    },
    
    // Sistema de logs
    log: (...args) => {
        if (TwCore.config.debug) {
            console.log('[TwBot]', ...args);
        }
    },
    
    // Notificações
    notify: {
        success: (message) => {
            TwCore.notify.show(message, 'success');
        },
        
        error: (message) => {
            TwCore.notify.show(message, 'error');
        },
        
        info: (message) => {
            TwCore.notify.show(message, 'info');
        },
        
        show: (message, type = 'info') => {
            const colors = {
                success: '#4caf50',
                error: '#f44336',
                info: '#2196f3'
            };
            
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${colors[type]};
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                z-index: 999999;
                font-family: Arial;
                font-size: 12px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    },
    
    // Utilitários matemáticos
    math: {
        distance: (x1, y1, x2, y2) => {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        },
        
        random: (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
};

TwCore.log('✅ Core carregado');