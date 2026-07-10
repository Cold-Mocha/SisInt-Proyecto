# El Clasificador
### Aprendizaje por Refuerzo para la detección de correo anómalo

**Sistemas Inteligentes · Universidad de La Frontera**
Informe breve · Aplicación web: *El Clasificador*

---

## Resumen

Este trabajo presenta una aplicación web educativa que enseña **Aprendizaje por
Refuerzo (RL)** a través de un caso de **detección de anomalías**: separar correo
legítimo de correo anómalo (spam y suplantación / *phishing*). En lugar de un
tutorial abstracto, la app muestra a un agente de Q-learning (un clasificador
recién instalado en una sala de correo) fracasar, aprender y finalmente
superar a un conjunto de reglas razonables. Cada concepto formal (estado,
acción, recompensa, política) aparece primero como un hecho físico y solo
después como una ecuación. Todo el modelo se entrena **en el navegador**, sin
backend ni dependencias.

---

## 1. El problema, y por qué es Aprendizaje por Refuerzo

Clasificar correo es tomar, miles de veces al día, una decisión bajo
incertidumbre: `aceptar` (al buzón) o `descartar` (a la papelera), sin conocer
con certeza el contenido. Los errores no son simétricos: dejar pasar spam es
una molestia. **Descartar una carta legítima es un daño irreversible**. Esa
asimetría de costos, sumada a la naturaleza secuencial del flujo (la
reputación de un remitente evoluciona con lo que ha enviado antes), es
exactamente la clase de problema que el RL modela de forma natural: un agente
que aprende una **política** por interacción con un **entorno**, guiado solo
por una señal de **recompensa** [1].

A diferencia del aprendizaje supervisado, aquí no hay un maestro que entregue
la etiqueta correcta de cada correo antes de decidir. Hay un número, la
recompensa, que llega *después* de actuar, cuando se revela la verdad, y que
empuja al agente a mejorar. El costo asimétrico, además, no hay que
codificarlo como una regla: vive dentro de la función de recompensa, y la
política conservadora **emerge**.

**¿Por qué esto es detección de anomalías?** La detección de anomalías
identifica eventos poco frecuentes que se desvían de un patrón esperado,
mayormente «normal» [3]. El correo anómalo de este trabajo encaja ahí: spam y
suplantación son minoría (30 % y 10 % del tráfico, ver §4) frente al correo
legítimo, y se definen precisamente por desviarse de las señales típicas de un
remitente de confianza: contacto nuevo o reputación en caída, urgencia
inusual, enlaces sin patrón previo, horario atípico. La suplantación es el
caso límite: no es una categoría aparte con reglas propias, es la *cola* de la
distribución, camuflada dentro de lo que parece normal (buena reputación,
remitente conocido). Detectarla exige aprender la combinación de señales, no
una sola regla. Es exactamente lo que el agente hace.

---

## 2. El modelo: un proceso de decisión (MDP)

Formalizamos la sala de correo como una tupla `(S, A, R, T, γ)`.

**Estado (`S`).** Cada correo se describe con cinco variables observables,
dibujadas sobre el sobre:

| Variable | Valores | Representación visual |
|---|---|---|
| remitente | conocido / desconocido | sello relleno o hueco |
| reputación | buena / neutra / mala | color del sello (ámbar / gris / negro) |
| enlaces | 0 / 1 / varios | marcas de anzuelo |
| urgencia | baja / alta | cinta roja |
| hora | laboral / madrugada | matasellos (sol / luna) |

Cardinalidad: `2 × 3 × 3 × 2 × 2 = 72` estados. La discretización se eligió
**para ser legible, no óptima**: permite representar toda la tabla Q como un
archivador de 72 sobres que el usuario puede leer de un vistazo.

**Acciones (`A`).** `{ aceptar, descartar }`.

**Recompensa (`R`).** Es literalmente la matriz de confusión, con costo
asimétrico:

| | era legítimo | era spam |
|---|---:|---:|
| **aceptar** | +5 | −2 |
| **descartar** | **−20** | +3 |

Descartar una carta real cuesta **diez veces** más que dejar pasar spam. Ese
`−20` es el corazón del modelo.

**Transición (`T`).** Tras cada decisión se revela la etiqueta verdadera y el
entorno actualiza la **reputación** del remitente: sube un nivel con correo
legítimo (lentamente: dos aciertos por nivel), baja con spam (un envío por
nivel). Así el estado de un remitente evoluciona con la trayectoria.

**Descuento (`γ = 0.9`).**

---

## 3. El algoritmo: Q-learning tabular

El agente estima `Q(s, a)`, el valor a largo plazo de tomar la acción `a` en
el estado `s`, y lo corrige tras cada transición `(s, a, r, s′)` [1, 2]:

```
Q(s,a) ← Q(s,a) + α · [ r + γ · maxₐ′ Q(s′,a′) − Q(s,a) ]
```

La actualización es **off-policy**: el objetivo usa `maxₐ′ Q(s′,a′)`, la
mejor acción futura, aunque el agente aún esté explorando. Hiperparámetros:
`α = 0.1`, `γ = 0.9`, y una política **ε-greedy** con `ε: 1.0 → 0.05`
(decaimiento exponencial sobre 5 000 episodios). No se usa una red neuronal
(DQN): el estado es diminuto, y una tabla, a diferencia de una red, **se
puede visualizar**, que es el punto de la app.

---

## 4. Los datos: un entorno con trampas

El correo es sintético y se muestrea de cuatro poblaciones con características
**estocásticas** (por eso ninguna señal aislada clasifica perfecto): legítimo
cotidiano (45 %), legítimo nuevo (15 %), spam burdo (30 %) y suplantación
(10 %). Un episodio es una jornada de 50 sobres de 15 remitentes fijos. El
entorno tiene tres trampas deliberadas:

- **El legítimo nuevo** castiga la regla «descartar si el remitente es
  desconocido»: rompe cartas reales de clientes nuevos.
- **La suplantación** castiga la regla «confiar en el remitente conocido»:
  llega desde una dirección conocida y de buena reputación. Solo la delatan
  los enlaces.
- **El remitente comprometido** (3 de los 15) empieza enviando correo
  legítimo y, a mitad de la jornada, pasa a la suplantación. Impide memorizar
  «confío en X».

---

## 5. Resultados

Se evaluaron cinco estrategias sobre 500 episodios (25 000 sobres) del
**mismo** flujo (el entorno es determinista dado su semilla, y su flujo no
depende de la acción, lo que hace la comparación exacta):

| Estrategia | R/ep | Cartas rotas | Suplant. atrapada | Aciertos |
|---|---:|---:|---:|---:|
| Aceptar todo | 108.9 | 0 | 0 % | 60 % |
| Descartar todo | −536.2 | 14 918 | 100 % | 40 % |
| Regla: descartar si desconocido | −114.6 | 4 927 | 19 % | 49 % |
| Regla: descartar si mala reputación | 176.2 | 0 | 13 % | 87 % |
| **Política aprendida (RL)** | **193.0** | 53 | **40 %** | **94 %** |

La política aprendida obtiene la **mayor recompensa** y **atrapa tres veces
más suplantación** que la regla de reputación (40 % vs. 13 %), rompiendo muy
pocas cartas reales. La clave: la regla de reputación **reacciona** (solo
descarta después de que el daño bajó la reputación, y no ve venir al
remitente comprometido, cuya reputación aún es buena al atacar), mientras que
la política aprendida **anticipa**, desconfiando de la *combinación* de
señales (sello ámbar + varios anzuelos + urgencia) antes que del historial.

**La parte honesta.** La política aprendida acepta *más* spam que la regla
dura, porque le enseñamos a temerle al `−20`. No es un defecto: es la función
de recompensa haciendo exactamente lo que le pedimos. La app lo declara en
lugar de esconderlo.

---

## 6. Exploración vs. explotación

La app permite forzar `ε = 0` desde el primer episodio. El agente resultante
**explota su primera corazonada de inmediato**: su curva de recompensa
arranca alta (no paga el precio de equivocarse al azar) pero **se estanca**.
Atrapa solo un ~23 % de la suplantación (contra ~40 % del agente que exploró)
y deja pasar más spam, porque nunca probó descartar los sobres ambiguos que
parecían legítimos. El agente que explora paga caro al inicio (su curva se
hunde en negativo) y *por eso* descubre después lo que la primera corazonada
no vio. Es el dilema exploración-explotación, mostrado en una sola curva.

---

## 7. Limitaciones

- **Datos sintéticos.** El agente aprendió sobre un mundo diseñado por
  nosotros: proporciones, señales y la recompensa `−20` son elecciones.
  Ningún resultado aquí prueba algo sobre correo real.
- **¿MDP o bandit contextual?** En este entorno la reputación se actualiza
  según la etiqueta verdadera, no según la acción del agente. Estrictamente,
  la acción no cambia el estado siguiente, por lo que el problema se acerca
  más a un *bandit contextual con contexto no estacionario*. El interés
  secuencial reside en que el estado de un remitente evoluciona con la
  trayectoria (el remitente comprometido). Preferimos señalarlo a exagerar el
  rol de `γ`.
- **Alternativas.** Un filtro bayesiano o supervisado, con un buen corpus
  etiquetado, probablemente superaría a RL en exactitud pura [3, 4, 5]. Su
  debilidad es justamente el costo asimétrico y el desbalance de clases, que
  hay que inyectar a mano. Este trabajo no afirma que RL sea la mejor
  solución: muestra **cómo se piensa** el problema en términos de RL.

---

## 8. Conclusiones

*El Clasificador* logra el objetivo del enunciado: explica los fundamentos
del Aprendizaje por Refuerzo (agente, entorno, estado, acción, recompensa,
política), el proceso de aprendizaje por recompensas y el algoritmo de
Q-learning, anclando cada concepto a un caso concreto y realista de detección
de anomalías. La visualización (la compuerta que se inclina, el archivador de
72 sobres que se colorea, la papelera que conserva sus cicatrices) convierte
conceptos abstractos en objetos observables. Y, sobre todo, el trabajo es
**honesto** acerca de sus límites, lo que a nuestro juicio demuestra más
comprensión que reportar una cifra de exactitud sin contexto.

---

## Referencias

1. Sutton, R. S., & Barto, A. G. (2018). *Reinforcement Learning: An Introduction* (2.ª ed.). MIT Press.
2. Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. *Machine Learning*, 8(3-4), 279-292.
3. Pang, G., Shen, C., Cao, L., & van den Hengel, A. (2021). Deep learning for anomaly detection: A review. *ACM Computing Surveys*, 54(2).
4. Sahami, M., Dumais, S., Heckerman, D., & Horvitz, E. (1998). A Bayesian approach to filtering junk e-mail. *AAAI Workshop on Learning for Text Categorization* (Tech. Report WS-98-05).
5. Cormack, G. V. (2008). Email spam filtering: A systematic review. *Foundations and Trends in Information Retrieval*, 1(4), 335-455.
