# El Clasificador: Aprendizaje por Refuerzo para la detección de correo anómalo

> Asignatura: Sistemas Inteligentes · Universidad de La Frontera (UFRO).

Aplicación web que enseña Aprendizaje por Refuerzo (RL) aplicado a detección
de anomalías. Un agente aprende a clasificar cartas (correo legítimo o
anómalo: spam y suplantación / phishing) por ensayo y error, hasta superar a
un conjunto de reglas simples.

## ¿De que se trata el proyecto?

- Agente de Q-learning tabular sobre 72 estados y 2 acciones
  (`aceptar` / `descartar`).
- La recompensa es la matriz de confusión, con costo asimétrico: romper una
  carta legítima cuesta `−20`, dejar pasar spam cuesta solo `−2`. Por eso la
  política aprendida es conservadora.
- `index.html` explica el modelo con ejemplos estáticos y, en el Capítulo 3,
  entrena al agente en vivo, en el navegador.

## Cómo verlo

**Ver la app publicada:** <https://cold-mocha.github.io/SisInt-Proyecto/>

También puedes clonar el repositorio y abrir `index.html` con doble clic.
Funciona directo desde el sistema de archivos, sin servidor ni build.

## Informe

El informe breve de la tarea es
[`Sistemas Inteligentes Informe.pdf`](Sistemas%20Inteligentes%20Informe.pdf)
(3 páginas). La app misma también cierra con una sección de
["Conclusiones y limitaciones"](https://cold-mocha.github.io/SisInt-Proyecto/#conclusion)
con el mismo contenido, para no depender solo del PDF.

## Estructura del proyecto

```
clasificador-rl/
├─ index.html              # La aplicación (prólogo, cap. 1, "armando el agente" en 4 piezas, cap. 3, 2 anexos, conclusiones)
├─ .nojekyll               # Sirve los archivos sin procesar en GitHub Pages
├─ Sistemas Inteligentes Informe.pdf  # Informe breve de la tarea (2 a 4 páginas)
├─ css/
│  ├─ tokens.css           # Sistema de diseño
│  ├─ style.css            # Layout, tipografía, componentes
│  └─ sobre-visualizador.css # Detalle visual del capítulo 1
├─ js/
│  ├─ rl.js                # Núcleo RL: generador, entorno (MDP), agente Q-learning, baselines
│  ├─ envelope.js          # Dibuja un sobre SVG a partir de un estado
│  ├─ scroll.js            # Navegación por capítulo (paginación, teclado)
│  ├─ simulacion.js        # Cap. 3: entrena al agente en vivo en el navegador
│  └─ app.js               # Orquestador: arma los ejemplos y arranca la navegación
└─ scripts/
   └─ verify.cjs           # Verificación en terminal de js/rl.js
```

## El caso de detección de anomalías

El agente enfrenta cuatro poblaciones de correo (ver Anexo B en la app):
legítimo cotidiano (45 %), legítimo nuevo (15 %), spam burdo (30 %) y
suplantación (10 %). Tres de los 15 remitentes son comprometidos: empiezan
enviando correo legítimo y a mitad de camino pasan a la suplantación. Por eso
el agente no puede memorizar "confío en el remitente X", tiene que leer la
combinación de señales.

## Accesibilidad

- Respeta `prefers-reduced-motion`.
- Nada depende solo del color: el sello tiene forma, el sobre rasgado tiene
  una diagonal, la cinta de urgencia tiene forma propia.
- Cada sobre y control tiene descripción textual (`aria-label`) para lector
  de pantalla, y foco visible con teclado.

## Referencias

1. Sutton, R. S., & Barto, A. G. (2018). Reinforcement Learning: An Introduction (2.ª ed.). MIT Press.
2. Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. Machine Learning, 8(3-4), 279-292.
3. Pang, G., Shen, C., Cao, L., & van den Hengel, A. (2021). Deep learning for anomaly detection: A review. ACM Computing Surveys, 54(2).
4. Sahami, M., Dumais, S., Heckerman, D., & Horvitz, E. (1998). A Bayesian approach to filtering junk e-mail. AAAI Workshop on Learning for Text Categorization.
5. Cormack, G. V. (2008). Email spam filtering: A systematic review. Foundations and Trends in Information Retrieval, 1(4), 335-455.
