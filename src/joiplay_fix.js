/*
 * joiplay_fix.js - correcoes e diagnostico para rodar jogos RPG Maker MV no Joy Play.
 * Carregado por UMA linha no index.html (antes de js/main.js). Para desligar: remova a linha.
 *
 * Modulos (nesta ordem):
 *   1. LOGGER     - captura erros, grava em log_debug.txt (reescrevendo o arquivo) e no localStorage
 *   2. ANIM PATCH - frame indefinido nas animacoes + garante que sons/flash disparem
 *   3. GUARD      - impede que erro no efeito de encontro trave o jogo
 *   4. LOADWATCH  - registra falhas de carregamento de imagem/audio
 *   5. ANIMTRACE  - rastreia animacoes (desligue com JOIFIX.TRACE = false)
 *   (1b. DUMP     - copia o JoiMV.js do Joy Play para analise)
 */
var JOIFIX = {
    SHOW_PANEL: false, // true = mostra o painel verde na tela
    TRACE: false,      // true = rastreia cada animacao no log (so para diagnostico; gera muitas linhas)
    DUMP: false,       // true = salva joimv_dump.js e registra as funcoes ativas (diagnostico)
    STOCK_ANIM: true   // true = troca o updateFrame do JoiMV (Joy Play) pelo original do MV
};

// ===== 1. DEBUG: painel de erros + log proprio (log_debug.txt na pasta www e localStorage). Toque no painel para limpar. =====
        (function () {
            var box, KEY = 'dbg_log', MAX = 200, last = '', dups = 0;
            var fs = null, file = null, fileFailed = false;
            function ts() {
                var d = new Date();
                return d.toTimeString().slice(0, 8) + '.' + ('00' + d.getMilliseconds()).slice(-3);
            }
            function getFile() {
                if (file || fileFailed) return file;
                try {
                    if (typeof require !== 'function') return null;
                    fs = require('fs');
                    var path = require('path');
                    var dir = (typeof process !== 'undefined' && process.mainModule && process.mainModule.filename)
                        ? path.dirname(process.mainModule.filename)
                        : process.cwd();
                    file = path.join(dir, 'log_debug.txt');
                } catch (e) { fs = null; file = null; }
                return file;
            }
            // O appendFileSync do Joy Play sobrescreve o arquivo: guardamos tudo em memoria e reescrevemos o arquivo inteiro.
            var fileErrs = 0, errShown = false;
            var buf = [], MAXF = 3000, timer = null, base = '', baseLoaded = false;
            function flush() {
                timer = null;
                try {
                    var f = getFile();
                    if (!f) return;
                    if (!baseLoaded) {
                        baseLoaded = true;
                        try {
                            if (fs.existsSync(f)) {
                                base = String(fs.readFileSync(f, 'utf8')).split('\n').slice(-1000).join('\n');
                            }
                        } catch (e0) {}
                    }
                    fs.writeFileSync(f, (base ? base + '\n' : '') + buf.join('\n') + '\n');
                    fileErrs = 0;
                } catch (e) {
                    fileErrs++;
                    if (!errShown) {
                        errShown = true;
                        var m = 'DBG falha ao gravar arquivo: ' + (e && e.message ? e.message : e);
                        toStore(m);
                        try { ensureBox().textContent += m + '\n\n'; } catch (x) {}
                    }
                    if (fileErrs > 50) { fileFailed = true; file = null; }
                }
            }
            function toFile(line) {
                buf.push(line);
                if (buf.length > MAXF) buf.shift();
                if (!timer) timer = setTimeout(flush, 150);
            }
            function readStore() {
                try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
            }
            function toStore(line) {
                try {
                    var a = readStore();
                    a.push(line);
                    if (a.length > MAX) a = a.slice(-MAX);
                    localStorage.setItem(KEY, JSON.stringify(a));
                } catch (e) {}
            }
            // true = mostra o painel verde na tela; false = so grava no arquivo (log_debug.txt)
            var SHOW_PANEL = JOIFIX.SHOW_PANEL;
            var NOBOX = { get textContent() { return ''; }, set textContent(v) {} };
            function ensureBox() {
                if (!SHOW_PANEL) return NOBOX;
                if (box) return box;
                box = document.createElement('pre');
                box.style.cssText = 'position:fixed;left:0;top:0;width:100vw;max-height:60%;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,0.9);color:#0f0;font:12px monospace;white-space:pre-wrap;word-break:break-all;z-index:2147483647;transform:translateZ(0)';
                box.onclick = function () {
                    box.textContent = '';
                    try { localStorage.removeItem(KEY); } catch (e) {}
                };
                (document.body || document.documentElement).appendChild(box);
                return box;
            }
            function show(t) {
                try {
                    if (t.length > 3000) t = t.slice(0, 3000) + '...';
                    if (t.indexOf("Unexpected identifier 'Object'") !== -1) return; // ruido injetado pelo Joy Play
                    if (t === last) { dups++; return; }
                    if (dups) {
                        var d = '(+' + dups + ' repeticoes da anterior)';
                        toFile(d); toStore(d);
                        ensureBox().textContent += d + '\n';
                        dups = 0;
                    }
                    last = t;
                    var line = '[' + ts() + '] ' + t;
                    toFile(line);
                    toStore(line);
                    ensureBox().textContent += line + '\n\n';
                } catch (e) {}
            }
            // sessao anterior: mostra as ultimas entradas guardadas
            try {
                var prev = readStore();
                if (prev.length) {
                    ensureBox().textContent += '=== SESSAO ANTERIOR (ultimas ' + Math.min(15, prev.length) + ') ===\n' +
                        prev.slice(-15).join('\n') + '\n=== FIM (toque para limpar) ===\n\n';
                }
                toStore('--- NOVA SESSAO ' + new Date().toLocaleString() + ' ---');
            } catch (e) {}
            window.addEventListener('load', function () {
                setTimeout(function () {
                    toFile('--- NOVA SESSAO ' + new Date().toLocaleString() + ' ---');
                    var modo = (getFile() && !fileFailed) ? 'arquivo ' + file : 'so localStorage (sem acesso a arquivo)';
                    show('DBG modo de log: ' + modo);
                }, 0);
            });
            var oe = console.error;
            console.error = function () {
                show([].slice.call(arguments).join(' '));
                if (oe) oe.apply(console, arguments);
            };
            window.addEventListener('error', function (e) {
                show('ERR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno);
            });
            window.addEventListener('unhandledrejection', function (e) {
                show('PROMISE: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
            });
        })();
        

// ===== 1b. DUMP: copia o JoiMV.js (plugin injetado pelo Joy Play) e registra as funcoes ativas =====
(function () {
    if (!JOIFIX.DUMP) return;
    window.addEventListener('load', function () {
        setTimeout(function () {
            function log(t) { try { console.error(t); } catch (e) {} }
            try { log('DUMP Sprite_Animation.updateFrame ativo:\n' + String(Sprite_Animation.prototype.updateFrame).slice(0, 2500)); } catch (e) {}
            try { log('DUMP Sprite_Animation.currentFrameIndex ativo:\n' + String(Sprite_Animation.prototype.currentFrameIndex).slice(0, 1200)); } catch (e) {}
            try { log('DUMP Scene_Map.updateEncounterEffect ativo:\n' + String(Scene_Map.prototype.updateEncounterEffect).slice(0, 2500)); } catch (e) {}
            try {
                fetch('js/plugins/JoiMV.js').then(function (r) {
                    return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status));
                }).then(function (t) {
                    log('DUMP JoiMV.js obtido: ' + t.length + ' bytes');
                    try {
                        var seen = {}, list = [], re = /([A-Za-z_]\w*)\.prototype\.(\w+)\s*=/g, mm;
                        while ((mm = re.exec(t))) { var k = mm[1] + '.' + mm[2]; if (!seen[k]) { seen[k] = 1; list.push(k); } }
                        log('DUMP JoiMV sobrescreve ' + list.length + ' metodos: ' + list.join(', '));
                    } catch (e) {}
                    try {
                        var fs = require('fs'), path = require('path');
                        var dir = path.dirname(process.mainModule.filename);
                        fs.writeFileSync(path.join(dir, 'joimv_dump.js'), t);
                        log('DUMP salvo em ' + path.join(dir, 'joimv_dump.js'));
                    } catch (e) { log('DUMP nao salvou o arquivo: ' + (e && e.message)); }
                }).catch(function (e) { log('DUMP falha ao buscar JoiMV.js: ' + (e && e.message)); });
            } catch (e) {}
        }, 0);
    });
})();

// ===== 2. PATCH: frame indefinido -> calcula pelo progresso, desenha E dispara os timings (som/flash) que o motor perdeu =====
        window.addEventListener('load', function () { setTimeout(function wait() {
            if (typeof Sprite_Animation === 'undefined') {
                return setTimeout(wait, 50);
            }
            var P = Sprite_Animation.prototype;
            var origCells = P.updateAllCellSprites;
            var origTiming = P.processTimingData;
            var origSetup = P.setupDuration;
            var seen = {};

            // cada timing (som/flash) dispara no maximo 1 vez por animacao
            P.processTimingData = function (timing) {
                if (!this._firedTimings) this._firedTimings = [];
                if (this._firedTimings.indexOf(timing) !== -1) return;
                this._firedTimings.push(timing);
                return origTiming.apply(this, arguments);
            };

            if (origSetup) {
                P.setupDuration = function () {
                    this._firedTimings = [];
                    this._fixTotal = undefined;
                    return origSetup.apply(this, arguments);
                };
            }

            // O JoiMV (injetado pelo Joy Play) troca o updateFrame por uma versao que: nao dispara sons/flash,
            // decrementa _duration por conta propria, passa os sprites no lugar do frame e usa _screenSprites (inexistente no MV).
            // Aqui restauramos o updateFrame original do MV.
            if (JOIFIX.STOCK_ANIM && /shouldUpdateVisuals|_screenSprites/.test(String(P.updateFrame))) {
                console.error('PATCH updateFrame do JoiMV detectado: restaurando o original do MV');
                P.updateFrame = function () {
                    if (this._duration > 0) {
                        var frameIndex = this.currentFrameIndex();
                        this.updateAllCellSprites(this._animation.frames[frameIndex]);
                        this._animation.timings.forEach(function (timing) {
                            if (timing.frame === frameIndex) {
                                this.processTimingData(timing);
                            }
                        }, this);
                    }
                };
            }

            P.updateAllCellSprites = function (frame) {
                var a = this._animation;
                if (this._fixTotal === undefined) {
                    this._fixTotal = this._duration + 1;
                }
                if (!frame && a && a.frames && a.frames.length) {
                    var p = 1 - this._duration / this._fixTotal;
                    var i = Math.floor(p * a.frames.length);
                    i = Math.max(0, Math.min(a.frames.length - 1, i));
                    frame = a.frames[i];
                    // dispara os timings ate este frame que o motor nao disparou
                    if (a.timings) {
                        for (var k = 0; k < a.timings.length; k++) {
                            if (a.timings[k].frame <= i) this.processTimingData(a.timings[k]);
                        }
                    }
                    if (!seen[a.id]) {
                        seen[a.id] = true;
                        var vi = '?';
                        try { vi = this.currentFrameIndex(); } catch (e) {}
                        console.error('ANIM CORRIGIDA id=' + a.id + ' ' + a.name +
                            ' frames=' + a.frames.length +
                            ' dur=' + this._duration +
                            ' rate=' + this._rate +
                            ' idxMotor=' + vi +
                            ' idxCorrigido=' + i +
                            ' timings=' + (a.timings ? a.timings.length : 0));
                    }
                }
                if (!frame) return;
                return origCells.call(this, frame);
            };
        }, 0); });
        

// ===== 3. GUARD: evita que erro no efeito de encontro (JoiMV/FluidTimestep) trave o jogo e perca progresso =====
        (function () {
            var lastT = 0, fires = 0;
            function install() {
                if (typeof Scene_Map === 'undefined' || typeof SceneManager === 'undefined') {
                    return setTimeout(install, 50);
                }
                var P = Scene_Map.prototype;
                var orig = P.updateEncounterEffect;
                if (!orig || orig._guarded) return;
                P.updateEncounterEffect = function () {
                    var now = performance.now();
                    var dt = lastT ? Math.round(now - lastT) : 0;
                    lastT = now;
                    // o JoiMV assume que _fadeSprite existe, mas ele so e criado depois de um fade
                    if (!this._fadeSprite && typeof this.createFadeSprite === 'function') {
                        try {
                            this.createFadeSprite(false);
                            if (fires < 3) console.error('GUARD criou o _fadeSprite que faltava no encontro');
                        } catch (e0) {}
                    }
                    try {
                        return orig.apply(this, arguments);
                    } catch (e) {
                        fires++;
                        try {
                            console.error('GUARD encontro #' + fires + ': ' + e.message +
                                ' | dur=' + this._encounterEffectDuration +
                                ' | spriteset=' + !!this._spriteset +
                                ' | fadeSprite=' + !!this._fadeSprite +
                                ' | dt=' + dt + 'ms' +
                                ' | nextScene=' + (SceneManager._nextScene ? SceneManager._nextScene.constructor.name : 'null'));
                        } catch (e2) {}
                        this._encounterEffectDuration = 0;
                    }
                };
                P.updateEncounterEffect._guarded = true;
            }
            window.addEventListener('load', function () { setTimeout(install, 0); });
        })();
        

// ===== 4. LOADWATCH: registra falhas de carregamento (imagem/audio) que o motor so mostra na tela, sem console =====
        (function () {
            function log(t) { try { console.error(t); } catch (e) {} }
            function stamp() { return '[' + Math.round(performance.now()) + 'ms] '; }
            function install() {
                if (typeof Graphics === 'undefined' || typeof Bitmap === 'undefined') {
                    return setTimeout(install, 50);
                }
                var scene = function () {
                    try { return (SceneManager._scene && SceneManager._scene.constructor.name) || '?'; } catch (e) { return '?'; }
                };
                if (Graphics.printLoadingError && !Graphics.printLoadingError._w) {
                    var o1 = Graphics.printLoadingError;
                    Graphics.printLoadingError = function (url) {
                        log(stamp() + 'LOADWATCH falha de carga: ' + url + ' | cena=' + scene());
                        return o1.apply(this, arguments);
                    };
                    Graphics.printLoadingError._w = true;
                }
                if (Graphics.printError && !Graphics.printError._w) {
                    var o2 = Graphics.printError;
                    Graphics.printError = function (name, message) {
                        log(stamp() + 'LOADWATCH tela de erro: ' + name + ' - ' + message + ' | cena=' + scene());
                        return o2.apply(this, arguments);
                    };
                    Graphics.printError._w = true;
                }
                if (Bitmap.prototype._onError && !Bitmap.prototype._onError._w) {
                    var o3 = Bitmap.prototype._onError;
                    Bitmap.prototype._onError = function () {
                        log(stamp() + 'LOADWATCH imagem falhou: ' + (this._url || '?') + ' | cena=' + scene());
                        return o3.apply(this, arguments);
                    };
                    Bitmap.prototype._onError._w = true;
                }
            }
            window.addEventListener('load', function () { setTimeout(install, 0); });
        })();
        

// ===== 5. ANIMTRACE: rastreia cada animacao (pedido, inicio, fim) para achar as que nunca tocam =====
        if (JOIFIX.TRACE) window.addEventListener('load', function () { setTimeout(function wait() {
            if (typeof Sprite_Animation === 'undefined' || typeof Window_BattleLog === 'undefined') {
                return setTimeout(wait, 50);
            }
            var P = Sprite_Animation.prototype, BL = Window_BattleLog.prototype;
            function log(t) { try { console.error(t); } catch (e) {} }
            function nm(a) { return a ? (a.id + ' ' + a.name) : '?'; }
            function dummy(a) {
                return !a || ((!a.frames || a.frames.length <= 1) && (!a.timings || !a.timings.length));
            }

            if (typeof Game_Battler !== 'undefined' && Game_Battler.prototype.startAnimation) {
                var ogb = Game_Battler.prototype.startAnimation;
                Game_Battler.prototype.startAnimation = function (animationId, mirror, delay) {
                    try {
                        var a = $dataAnimations[animationId];
                        log('ANIMTRACE alvo ' + (this.name ? this.name() : '?') + ' pede anim ' + animationId +
                            (a ? ' ' + a.name : ' NAO EXISTE') + ' delay=' + delay);
                    } catch (e) {}
                    return ogb.apply(this, arguments);
                };
            }
            log('ANIMTRACE ganchos instalados apos os plugins');
            if (BL.showAnimation) {
                var oa = BL.showAnimation;
                BL.showAnimation = function (subject, targets, animationId) {
                    try {
                        log('ANIMTRACE acao animId=' + animationId + ' autor=' + (subject && subject.name ? subject.name() : '?'));
                    } catch (e) {}
                    return oa.apply(this, arguments);
                };
            }
            if (BL.showNormalAnimation) {
                var on = BL.showNormalAnimation;
                BL.showNormalAnimation = function (targets, animationId, mirror) {
                    try {
                        var a = $dataAnimations[animationId];
                        log('ANIMTRACE pedido id=' + animationId + (a ? ' ' + a.name : ' NAO EXISTE') +
                            ' alvos=' + (targets ? targets.length : 0));
                    } catch (e) {}
                    return on.apply(this, arguments);
                };
            }
            if (P.setup) {
                var os = P.setup;
                P.setup = function (target, animation) {
                    this._tr = { t0: performance.now(), ticks: 0, done: false, setupDone: false };
                    if (!dummy(animation)) {
                        log('ANIMTRACE inicio ' + nm(animation) + ' frames=' + (animation && animation.frames ? animation.frames.length : 0));
                    }
                    var r = os.apply(this, arguments);
                    // o motor chama remove() dentro do setup; so conta o fim depois dele
                    this._tr.setupDone = true;
                    this._tr.t0 = performance.now();
                    return r;
                };
            }
            var om = P.updateMain;
            P.updateMain = function () {
                try {
                    if (this._tr && this.isPlaying() && this.isReady() && !(this._delay > 0)) this._tr.ticks++;
                } catch (e) {}
                return om.apply(this, arguments);
            };
            if (P.updateFrame) {
                var ouf = P.updateFrame;
                P.updateFrame = function () {
                    var idx = null;
                    try { if (this._duration > 0) idx = this.currentFrameIndex(); } catch (e0) {}
                    var r = ouf.apply(this, arguments);
                    try {
                        if (this._tr && idx !== null) {
                            if (!this._tr.vis) this._tr.vis = [];
                            if (this._tr.vis.indexOf(idx) === -1) this._tr.vis.push(idx);
                        }
                        // garante som/flash: dispara o que ja passou do frame e nao foi disparado
                        var an = this._animation;
                        if (idx !== null && idx >= 0 && an && an.timings) {
                            for (var k = 0; k < an.timings.length; k++) {
                                if (an.timings[k].frame <= idx) this.processTimingData(an.timings[k]);
                            }
                        }
                    } catch (e1) {}
                    return r;
                };
            }
            if (P.remove) {
                var or = P.remove;
                P.remove = function () {
                    try {
                        if (this._tr && this._tr.setupDone && !this._tr.done) {
                            this._tr.done = true;
                            var a = this._animation;
                            if (!dummy(a)) log('ANIMTRACE fim ' + nm(a) + ' ticks=' + this._tr.ticks +
                                ' frames=' + (a && a.frames ? a.frames.length : 0) +
                                ' sons+flash=' + (this._firedTimings ? this._firedTimings.length : 0) + '/' + (a && a.timings ? a.timings.length : 0) +
                                ' vis=' + (this._tr.vis ? this._tr.vis.length : 0) + '/' + (a && a.frames ? a.frames.length : 0) +
                                ' rate=' + this._rate +
                                ' tf=' + (a && a.timings ? JSON.stringify(a.timings.map(function (t) { return t.frame; })).slice(0, 50) : '[]') +
                                ' ms=' + Math.round(performance.now() - this._tr.t0) +
                                (this._tr.ticks === 0 ? ' <<< NUNCA TOCOU' : ''));
                        }
                    } catch (e) {}
                    return or.apply(this, arguments);
                };
            }
        }, 0); });
        

