# joiplay-mv-fix

Conserto para **animações de batalha** e o **efeito de encontro** de jogos feitos em **RPG Maker MV** que rodam no **Joy Play** (Android).

> Projeto da comunidade. Não é afiliado ao Joy Play nem aos desenvolvedores dos jogos. Este repositório **não contém arquivos dos jogos**, apenas o `index.html` padrão do carregador de cada um, com uma correção embutida.

## O que ele corrige

O Joy Play injeta um plugin próprio (`JoiMV.js`) em jogos MV. Dois trechos dele causam problemas:

1. **Animações de batalha** (`Sprite_Animation.updateFrame`)
   - sons e flashes das animações não tocam;
   - as animações duram cerca de 25% menos (o contador de duração é decrementado duas vezes);
   - animações de tela (por exemplo, a moeda de *Fear & Hunger*) podem travar o jogo com
     `TypeError: Cannot read properties of undefined (reading 'length')`;
   - o plugin passa os sprites no lugar dos dados do frame, o que, pelo motor padrão do MV, deixa as células escondidas.
2. **Efeito de encontro** (`Scene_Map.updateEncounterEffect`)
   - pode travar o jogo no início de uma batalha com
     `TypeError: Cannot set properties of null (setting 'opacity')`, porque o plugin assume que um sprite de fade já existe.

O conserto restaura o `updateFrame` original do MV (somente se detectar a versão do Joy Play) e cria o sprite de fade que falta. Se o Joy Play corrigir isso no futuro, o conserto simplesmente não faz nada.

## Jogos prontos

| Jogo | Arquivo |
|---|---|
| Fear & Hunger | `games/fear-and-hunger/index.html` |
| Fear & Hunger 2: Termina | `games/fear-and-hunger-2-termina/index.html` |

## Instalação (jogos prontos)

1. Abra a pasta do jogo e entre em **`www`**.
2. **Faça backup** do `index.html` que já está lá (renomeie para `index.original.html`, por exemplo).
3. Copie para a pasta `www` o `index.html` do seu jogo (tabela acima).
4. Abra o jogo no Joy Play normalmente.

Para desinstalar, apague o `index.html` novo e devolva o seu backup.

## Como saber se funcionou

Depois de jogar, abra o arquivo **`log_debug.txt`** (ele aparece dentro de `www`) e procure:

| Linha | Significa |
|---|---|
| `PATCH updateFrame do JoiMV detectado: restaurando o original do MV` | o conserto está ativo |
| `GUARD criou o _fadeSprite que faltava no encontro` | um encontro que quebraria foi protegido |

No Termux, por exemplo: `grep "PATCH\|GUARD" log_debug.txt`.

## Outros jogos de RPG Maker MV (avançado)

1. Copie `src/joiplay_fix.js` para `www/js/`.
2. No `www/index.html`, adicione esta linha **logo antes** da linha do `js/main.js`:

```html
<script type="text/javascript" src="js/joiplay_fix.js"></script>
<script type="text/javascript" src="js/main.js"></script>
```

Não testado em jogos de **RPG Maker MZ** (o motor é diferente).

## Configuração

No topo de `joiplay_fix.js` (ou do bloco inline do `index.html`):

```js
var JOIFIX = {
    SHOW_PANEL: false, // true = mostra um painel verde com os erros na tela
    TRACE: false,      // true = registra cada animação no log (diagnóstico; gera muitas linhas)
    DUMP: false,       // true = salva uma cópia do JoiMV.js do seu Joy Play (joimv_dump.js)
    STOCK_ANIM: true   // true = restaura o updateFrame original do MV
};
```

## O que mais ele faz

- Grava erros no `log_debug.txt` (o log do Joy Play costuma ficar poluído e cortado).
- Registra falhas de carregamento de imagem e áudio, que o motor só mostra na tela.

## Testado em

*Fear & Hunger* e *Fear & Hunger 2: Termina v1.9.1*, no Joy Play para Android. Se você testar em outro jogo ou versão, abra uma *issue* contando o resultado e anexando o trecho do `log_debug.txt`.

## Para desenvolvedores

O código fica em `src/joiplay_fix.js`. Os `index.html` prontos são gerados por:

```bash
python3 build.py
```

que junta `src/joiplay_fix.js` com cada `games/<jogo>/index.original.html`. Para adicionar um jogo, crie `games/<nome>/index.original.html` (o `index.html` original do jogo) e rode o script.

Não publique o `joimv_dump.js` nem o `log_debug.txt` (já estão no `.gitignore`): o primeiro é código do Joy Play.
