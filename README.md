# Simulador de Asignación Presupuestaria mediante Gradientes Conjugados Precondicionado (GCP)
### Universidad Mayor de San Andrés (UMSA) — Facultad de Ciencias Puras y Naturales
**Carrera:** Informática  
**Mención:** Desarrollo de Sistemas  
**Materia / Área:** Métodos Numéricos & Optimización Cuadrática  
**Algoritmo Base:** Gradiente Conjugado (GC) y Gradiente Conjugado Precondicionado Jacobi (GCP) — Suñagua (2020)  

---

## 📌 1. Descripción del Proyecto

Este proyecto es una aplicación web interactiva de grado industrial y rigor académico que modela y resuelve el problema de **asignación óptima de recursos presupuestarios** en una empresa agroindustrial/comercializadora que gestiona capital de trabajo en **miles de Bolivianos (kBs)**.

La asignación se formula como la minimización de la función cuadrática convexa de costo:
$$\varphi(x) = \frac{1}{2} x^T A x - b^T x$$

Cuya condición necesaria y suficiente de primer orden conduce al sistema lineal:
$$\nabla \varphi(x) = A x - b = 0 \iff A x = b$$

Donde $A \in \mathbb{R}^{4 \times 4}$ es simétrica y definida positiva (SPD) y $b \in \mathbb{R}^4$ es el vector de demandas operativas.

### Variables del Modelo (kBs)
- **$x_1$ — Adquisición de stock:** Compras de granos básicos e insumos agrícolas de alta rotación.
- **$x_2$ — Logística y transporte:** Fletes interdepartamentales, combustible y distribución a silos de acopio.
- **$x_3$ — Conservación y mantenimiento:** Climatización, control de humedad de silos y mantenimiento de montacargas.
- **$x_4$ — Embalaje y merma:** Sacos reforzados, pallets de madera, etiquetado normativo y seguros contra siniestros.

---

## 🚀 2. Demostración y Enlaces

- **Despliegue en Vivo:** [https://gcp-finanzas-umsa.vercel.app](https://gcp-finanzas-umsa.vercel.app) *(o tu URL generada en Vercel)*
- **Repositorio GitHub:** [https://github.com/tu-usuario/gcp-finanzas-umsa](https://github.com/tu-usuario/gcp-finanzas-umsa)

---

## 🛠️ 3. Arquitectura del Proyecto

```
gcp-finanzas/
├── src/
│   ├── core_math/
│   │   └── engine.tsx           # Motor numérico blindado: Cholesky, Jacobi, GC, GCP, Sylvester
│   ├── data/
│   │   └── scenarios.tsx        # Definición de los 3 escenarios exactos y QA Suite (7 casos)
│   ├── App.tsx                  # UI con los 10 módulos, tabla comparativa dinámica y gráficos
│   ├── main.tsx                 # Montaje en el DOM de React 18
│   └── index.css                # Directivas Tailwind CSS, Glassmorphism y Dark Theme
├── index.html                   # HTML5 semántico con fuentes Inter y JetBrains Mono
├── package.json                 # Dependencias (React 18, Vite 6, Tailwind 3, Recharts, Lucide)
├── tailwind.config.js           # Configuración de diseño y paleta cromática
├── postcss.config.js            # Pipeline PostCSS
├── tsconfig.json                # Configuración estricta de TypeScript
├── vite.config.ts               # Bundler de alta velocidad Vite
└── README.md                    # Documentación completa y guía de despliegue
```

---

## 📊 4. Los Tres Escenarios de Evaluación Numérica

### 1. Escenario 1: Ideal (Balanceado)
- $\det(A_1) = 4400$; menores de Sylvester: $10, 86, 647, 4400$.
- $\kappa(A_1) = 2.0452$; $\kappa(M^{-1}A_1) = 2.0413$.
- $x_{\text{ref}} = [12.6659, 7.7568, 7.8273, 9.2023]^T$ kBs.
- GC: 4 iteraciones; GCP: 4 iteraciones.

### 2. Escenario 2: Bajo Estrés Financiero (Shock Inflacionario)
- $\det(A_2) = 13703$; menores de Sylvester: $14, 166, 1614, 13703$.
- $\kappa(A_2) = 2.4519$; $\kappa(M^{-1}A_2) = 2.3627$.
- $x_{\text{ref}} = [12.2761, 6.9255, 3.1260, 4.1801]^T$ kBs.
- GC: 4 iteraciones; GCP: 4 iteraciones.

### 3. Escenario 3: Mal Condicionado (Disparidad de Escalas)
- $\det(A_3) = 31\,835\,972.25$; menores: $20000, 7999900, 63909400, 31835972.25$.
- $\kappa(A_3) = 42\,724.1368$; $\kappa(M^{-1}A_3) = 1.3362$ (**¡Reducción de más de 30 000 veces!**).
- $x_{\text{ref}} = [4.9912, 9.7943, 14.3400, 7.3554]^T$ kBs.
- **GC: 4 iteraciones; GCP: 3 iteraciones** (demostrando la aceleración y estabilidad del precondicionador Jacobi).

---

## 🧪 5. Batería de Pruebas Automatizadas QA (100% Aprobadas)

| ID | Caso de Prueba | Entrada | Esperado | Estado |
|---|---|---|---|:---:|
| **QA-01** | Carga y residual de referencia | Escenarios 1, 2 y 3 | Válidos, convergen, $\|Ax_{\text{ref}} - b\|_2 < 10^{-10}$ | ✅ APROBADO |
| **QA-02** | Detección Matriz No Simétrica | $A_1$ con $a_{12}=99 \neq a_{21}=2$ | Error controlado `NON_SYMMETRIC` | ✅ APROBADO |
| **QA-03** | Detección Matriz No SPD | $A_1$ con $a_{11}=-5$ (pivote negativo) | Error controlado `NON_SPD` en Cholesky | ✅ APROBADO |
| **QA-04** | Edición Dinámica del Vector $b$ | $b_1: 150 \to 300$ en Escenario 1 | $x_{\text{ref}} = [28.4500, 4.4500, 6.6000, 9.8500]^T$ | ✅ APROBADO |
| **QA-05** | Eficacia de Precondicionamiento | Escenario 3 | $\kappa(M^{-1}A) \ll \kappa(A)$ y $K_{\text{GCP}} \le K_{\text{GC}}$ | ✅ APROBADO |
| **QA-06** | Prevención de División por Cero | Matriz diagonal con $b = [20, 0, 30, 40]^T$ | $E_{r,2} =$ "No definido" sin colapso | ✅ APROBADO |
| **QA-07** | Incompatibilidad Dimensional | Matriz $4 \times 4$ con vector $b$ de longitud 3 | Error controlado `DIMENSION` | ✅ APROBADO |

---

## 💻 6. Instalación y Ejecución Local

### Prerrequisitos
- **Node.js** (v18.0 o superior, probado en Node v22)
- **npm** (v9 o superior)

### Pasos
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/gcp-finanzas-umsa.git
   cd gcp-finanzas-umsa
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador: `http://localhost:3000`

4. Compilar para producción (Typecheck + Minificación Vite):
   ```bash
   npm run build
   ```

---

## ☁️ 7. Guía de Despliegue en Vercel

1. **Subir a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: Simulador GCP Finanzas UMSA (Versión Blindada)"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/gcp-finanzas-umsa.git
   git push -u origin main
   ```

2. **Conectar en Vercel:**
   - Inicia sesión en [Vercel](https://vercel.com).
   - Haz clic en **"Add New"** → **"Project"**.
   - Importa tu repositorio de GitHub `gcp-finanzas-umsa`.
   - Vercel detectará automáticamente **Vite**:
     - **Framework Preset:** `Vite`
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
     - **Install Command:** `npm install`
   - Haz clic en **Deploy**. En menos de 60 segundos tendrás tu URL pública HTTPS lista para compartir.

---

## 📚 8. Referencias Académicas

- **Suñagua, P. (2020).** *Métodos Numéricos y Algoritmos de Optimización Cuadrática*. Universidad Mayor de San Andrés (UMSA), La Paz, Bolivia.
- **Golub, G. H., & Van Loan, C. F. (2013).** *Matrix Computations* (4th ed.). Johns Hopkins University Press, Baltimore, MD.
- **Saad, Y. (2003).** *Iterative Methods for Sparse Linear Systems* (2nd ed.). Society for Industrial and Applied Mathematics (SIAM), Philadelphia, PA.
- **Burden, R. L., & Faires, J. D. (2011).** *Análisis Numérico* (9na ed.). Cengage Learning, México D.F.
