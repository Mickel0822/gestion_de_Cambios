# 🧪 Guía de pruebas en vivo — flujo completo commit → PR → producción

Dos pruebas reales para demostrar el pipeline de punta a punta:

- **Prueba 1 (multi-servicio):** cambio en **Java + Python** (no toca frontend) → PR → merge → aprobación → producción → verificación **visual**.
- **Prueba 2 (simple/visual):** cambio **solo de Frontend** (un texto) → mismo flujo.

> **Concepto clave:** en un **PR** solo corren **CI + Staging** (validación, NO publica ni despliega). El **despliegue a producción** ocurre al hacer **merge a `main`**, y ahí espera tu **aprobación manual**.

---

## 🔗 Recursos (tenlos abiertos)

```env
ACTIONS=https://github.com/Mickel0822/gestion_de_Cambios/actions
FRONTEND=https://analyticore-frontend-nfuf.onrender.com
PYTHON_API=https://analyticore-python-6z9t.onrender.com
JAVA=https://analyticore-java-dobc.onrender.com
```

**Pre-flight (2 min antes):** despierta los servicios (plan free los suspende):
```powershell
irm https://analyticore-python-6z9t.onrender.com/health
irm https://analyticore-java-dobc.onrender.com/health
Start-Process https://analyticore-frontend-nfuf.onrender.com/
```

---

# 🧪 PRUEBA 1 — Cambio en Java + Python (multi-servicio)

### Paso 0 — Estado ANTES (para comparar)
Abre el frontend, analiza este texto y cuenta las palabras clave (verás **5**):
> `Servicio excelente, atencion rapida, experiencia maravillosa, producto increible, entrega puntual, calidad fantastica`

Abre también **PYTHON_API/** (raíz): verás `{"service":"...","status":"running"}` **sin** campo `version`.

### Paso 1 — Crear la rama
```powershell
cd C:\proyectos\gestion_de_cambios
git checkout main
git pull
git checkout -b demo/java-python
```

### Paso 2 — Hacer los 2 cambios

**A) Java** — mostrar 6 palabras clave en vez de 5:
- Archivo: `java-service/src/main/java/com/analyticore/application/usecases/ProcessJobUseCase.java`
- Busca la línea (dentro de `extractKeywords`):
  ```java
              .limit(5)
  ```
- Cámbiala por:
  ```java
              .limit(6)
  ```

**B) Python** — agregar un campo visible en el endpoint raíz:
- Archivo: `python-service/app.py`
- Busca:
  ```python
      @app.get('/')
      def home():
          return jsonify({'service': 'AnalytiCore Submission Service', 'status': 'running'})
  ```
- Cámbiala por:
  ```python
      @app.get('/')
      def home():
          return jsonify({'service': 'AnalytiCore Submission Service', 'status': 'running', 'version': 'demo-v2'})
  ```

### Paso 3 — Commit y push
```powershell
git add java-service/src/main/java/com/analyticore/application/usecases/ProcessJobUseCase.java python-service/app.py
git commit -m "demo: 6 keywords en Java y version en Python"
git push -u origin demo/java-python
```

### Paso 4 — Abrir el PR y ver el CI + Staging
```powershell
# opción rápida con gh (o hazlo desde la web con el link que imprime el push)
gh pr create --repo Mickel0822/gestion_de_Cambios --base main --head demo/java-python --title "Demo Java + Python" --body "Prueba en vivo"
```
- Abre el PR en GitHub → pestaña **Checks / Actions**.
- **Observa (esto demuestra autonomía):**
  - ✅ **CI Java** corre · ✅ **CI Python** corre · ⏭️ **CI Frontend = skipped** (no cambió).
  - ✅ **Staging** levanta el stack completo y corre los smoke tests.
- **NO** se publica ni despliega todavía (es un PR). Muestra los checks en verde.

### Paso 5 — Merge a main (dispara el despliegue con aprobación)
```powershell
gh pr merge --repo Mickel0822/gestion_de_Cambios demo/java-python --merge --delete-branch
```
- Ve a **ACTIONS** → abre el run nuevo (evento `push` a `main`).
- Recorre los carriles: Gitleaks → CI Java/Python → Staging → **Aprobación y despliegue**.
- El job **"Aprobación y despliegue a produccion"** queda en **amarillo / Waiting**.

### Paso 6 — Aprobar el despliegue (control humano del BPMN)
- En el run, aparece **"Review deployments"** (banner amarillo).
- Clic → marca la casilla **production** → **Approve and deploy**.
- *Frase:* "Aquí está el control humano: aunque el pipeline esté verde, una persona autoriza producción."

### Paso 7 — Ver el despliegue (solo servicios cambiados)
En el job de despliegue, observa que corre `render-deploy.sh` para **Java** y **Python** (Frontend = skipped porque no cambió):
- Despliega el tag inmutable `sha-<commit>` a cada servicio.
- Hace **health check** post-deploy; si fallara, **rollback** automático.

### Paso 8 — Verificación VISUAL (¡el cambio reflejado!)
1. **Python:** abre **PYTHON_API/** (raíz) → ahora muestra `"version":"demo-v2"`. ✅
   ```powershell
   irm https://analyticore-python-6z9t.onrender.com/
   ```
2. **Java:** en el frontend, analiza **el mismo texto del Paso 0**. Ahora verás **6 palabras clave** en vez de 5. ✅
   > *(Si tarda, es arranque en frío del plan free; reintenta en ~30s.)*

**Cierre de la prueba:** *"Un cambio en dos servicios recorrió commit → PR → validación → aprobación → producción, y se desplegaron solo esos dos servicios, reflejándose en vivo."*

---

# 🎨 PRUEBA 2 — Cambio solo de Frontend (simple y visual)

### Paso 1 — Rama
```powershell
git checkout main
git pull
git checkout -b demo/frontend-texto
```

### Paso 2 — Cambiar el titular (texto muy visible)
- Archivo: `frontend/src/App.jsx`
- Busca:
  ```jsx
          <h1>Descubre el tono<br /><em>detrás de las palabras.</em></h1>
  ```
- Cámbiala por (ejemplo, pon lo que quieras):
  ```jsx
          <h1>Analiza el sentimiento<br /><em>detrás de cada mensaje.</em></h1>
  ```

### Paso 3 — Commit, push y PR
```powershell
git add frontend/src/App.jsx
git commit -m "demo: nuevo titular del frontend"
git push -u origin demo/frontend-texto
gh pr create --repo Mickel0822/gestion_de_Cambios --base main --head demo/frontend-texto --title "Demo Frontend" --body "Cambio visual"
```
- En el PR observa: ✅ **CI Frontend** corre · ⏭️ **CI Java y CI Python = skipped** (autonomía a la inversa).

### Paso 4 — Merge, aprobar, ver
```powershell
gh pr merge --repo Mickel0822/gestion_de_Cambios demo/frontend-texto --merge --delete-branch
```
- ACTIONS → run nuevo → aprueba en **"Review deployments"** (igual que antes).
- Solo se despliega **Frontend**.

### Paso 5 — Verificación VISUAL
- Recarga **FRONTEND** (Ctrl+F5 para saltar caché). El titular ahora dice **"Analiza el sentimiento detrás de cada mensaje."** ✅

---

## ⏱️ Tiempos y tips

- Cada run tarda ~5–8 min (CI + staging). El despliegue en Render, +2–4 min (pull de imagen + health).
- **Arranque en frío:** la 1ª petición tras inactividad tarda 30–60s. Despierta los servicios antes (pre-flight).
- **Aprobación:** si no ves "Review deployments", entra al job `Aprobación y despliegue a produccion` dentro del run.
- **Caché del navegador:** para ver el cambio del frontend usa **Ctrl+F5**.

## 🧯 Si algo falla

- **CI rojo:** abre el job en rojo → step con ❌. Los cambios de esta guía son seguros; si editaste de más, revisa la sintaxis.
- **Deploy no despliega un servicio:** revisa que `detect-changes` lo marcó `true` (solo despliega lo que cambió).
- **Frontend no refleja el cambio:** Ctrl+F5; confirma que el deploy del frontend terminó `live` en Render.

## 🔄 (Opcional) Revertir los cambios de demo
```powershell
git checkout main
git pull
git revert <hash-del-merge>   # o edita de vuelta los archivos y repite el flujo
```

---

**Qué demuestra cada prueba (para el profesor):**
- Prueba 1 → despliegue **independiente** de varios servicios + aprobación humana + reflejo real.
- Prueba 2 → autonomía a la inversa (solo un servicio) + cambio **visual** inmediato.
- Ambas → el flujo **commit → PR → CI/seguridad → staging → aprobación → producción** del BPMN, funcionando de verdad.
