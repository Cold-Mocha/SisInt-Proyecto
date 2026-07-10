# El Clasificador — Aprendizaje por Refuerzo para la detección de correo anómalo

**➜ Ver la app publicada: <https://cold-mocha.github.io/SisInt-Proyecto/>**

Novela gráfica interactiva **no jugable** que enseña Aprendizaje por Refuerzo (RL)
aplicado a un problema de detección de anomalías: separar correo legítimo de
correo anómalo (spam y **suplantación / phishing**). El usuario no clasifica
correos: **observa** a un agente —un clasificador recién instalado en una sala de
correo— fracasar, aprender y terminar superando a las reglas obvias.

> Asignatura: Sistemas Inteligentes · Universidad de La Frontera (UFRO).

## ¿Qué es, técnicamente?

- Un agente de **Q-learning tabular** que aprende una política sobre un espacio
  de **72 estados × 2 acciones** (`aceptar` / `descartar`).
- La recompensa **es la matriz de confusión**, con un costo **asimétrico**:
  romper una carta legítima cuesta `−20`; dejar pasar spam, solo `−2`. De ahí
  que la política aprendida sea **conservadora**.
- El sitio (`index.html`) es la novela gráfica: explica el modelo con ejemplos
  estáticos y, en el Capítulo 3, entrena al agente **en vivo, en el navegador**
  (`js/simulacion.js` corre `CRL.Entorno` y `CRL.AgenteQ` directamente). El
  modelo (`js/rl.js`) está escrito en formato UMD: el mismo archivo que carga
  la página también se puede ejecutar y verificar por consola con Node, sin
  navegador — ver
  [Verificación del modelo](#verificación-del-modelo-opcional-requiere-node).

## Cómo verlo

La forma más simple es abrir el link publicado de arriba. Si prefieres correrlo
local, descarga o clona el repositorio y **abre `index.html` con doble clic**:
funciona tal cual desde el sistema de archivos (`file://`), sin servidor ni
build (la única dependencia opcional son las tipografías de Google Fonts; sin
conexión, la página usa fuentes del sistema).

## Estructura del proyecto

```
clasificador-rl/
├─ index.html              # La aplicación (prólogo, cap. 1, "armando el agente" en 4 piezas, 2 anexos)
├─ .nojekyll               # Sirve los archivos sin procesar en GitHub Pages
├─ css/
│  ├─ tokens.css           # Sistema de diseño «Nocturno de Colmena» (única fuente de verdad)
│  ├─ style.css            # Layout, tipografía, componentes
│  └─ sobre-visualizador.css # Detalle visual del capítulo 1 (círculos de reputación)
├─ js/
│  ├─ rl.js                # NÚCLEO RL — generador, entorno (MDP), agente Q-learning, baselines.
│  │                        Formato UMD: lo carga el navegador (Cap. 3) y también corre en Node.
│  ├─ envelope.js          # Dibuja un sobre SVG a partir de un estado
│  ├─ scroll.js            # Scrollytelling (paginación por capítulo, teclado)
│  ├─ simulacion.js        # Cap. 3 — entrena CRL.AgenteQ en vivo en el navegador, con controles
│  └─ app.js               # Orquestador: pinta los sobres de ejemplo y arranca el scroll
├─ scripts/
│  └─ verify.cjs           # Verificación en terminal de js/rl.js (no forma parte de la app)
└─ docs/
   ├─ informe.md           # Informe breve (2–4 páginas)
   └─ informe.html         # Mismo informe, formateado para imprimir/exportar a PDF
```

El núcleo `js/rl.js` **no depende de la interfaz**: el modelo no sabe que existe
una pantalla. Por eso el mismo archivo sirve para dos cosas — el navegador lo
carga para entrenar en vivo en el Capítulo 3, y por separado se puede ejecutar
y verificar por completo desde la terminal con Node, sin abrir la página (ver
más abajo).

## Verificación del modelo (opcional, requiere Node)

`js/rl.js` está escrito en formato UMD, así que también corre en Node. El script
`scripts/verify.cjs` comprueba, en la terminal, las dos propiedades que sostienen
todo el proyecto:

```bash
node scripts/verify.cjs
```

Comprueba que:

1. **La curva de recompensa sube** con el entrenamiento (el agente aprende).
2. **La política aprendida le gana a la regla de reputación**, sobre todo
   atrapando la suplantación del remitente comprometido (anticipa en vez de
   reaccionar). Si esto fallara, el generador de datos estaría mal.

## El caso de detección de anomalías

El agente enfrenta cuatro poblaciones de correo (ver **Anexo B** en la app):
legítimo cotidiano (45 %), legítimo nuevo (15 %), spam burdo (30 %) y
**suplantación** (10 %). Tres de los 15 remitentes son **comprometidos**: empiezan
enviando correo legítimo y, a mitad de la jornada, pasan a la suplantación. Ese
giro es lo que impide al agente memorizar «confío en el remitente X» y lo obliga
a leer la *combinación* de señales.

## Accesibilidad

- Respeta `prefers-reduced-motion` (sin animaciones de cinta ni temblor).
- Nada depende solo del color: el sello tiene forma, el sobre rasgado una
  diagonal, la cinta de urgencia una forma.
- Cada sobre y control tiene descripción textual (`aria-label`) legible por
  lector de pantalla, y foco visible con teclado.

## Referencias

1. Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2.ª ed.). MIT Press.
2. Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. *Machine Learning*, 8(3–4), 279–292.
3. Pang, G., Shen, C., Cao, L., & van den Hengel, A. (2021). Deep learning for anomaly detection: A review. *ACM Computing Surveys*, 54(2).
4. Sahami, M., Dumais, S., Heckerman, D., & Horvitz, E. (1998). A Bayesian approach to filtering junk e-mail. *AAAI Workshop on Learning for Text Categorization*.
5. Cormack, G. V. (2008). Email spam filtering: A systematic review. *Foundations and Trends in Information Retrieval*, 1(4), 335–455.

## Licencia

MIT. Uso educativo.
