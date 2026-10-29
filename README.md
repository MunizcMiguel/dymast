# Web DyMaSt

Web estática (HTML + CSS + JS, sin dependencias ni compilación) del grupo de investigación
DyMaSt — Dynamics, Materials and Structures (Universidad de Oviedo).

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `servicios.html`, `equipamiento.html`, `casos.html`, `investigacion.html`, `equipo.html`, `unete.html`, `contacto.html` | Una página por entrada del menú. **Se generan** con `python tools/build_pages.py` a partir de `tools/sections.html`: para cambiar un texto, edítalo en `sections.html` y vuelve a ejecutar el script |
| `miembro.html?id=<id>` | Ficha de cada miembro (se genera a partir de `data/members.js`) |
| `publicaciones.html` | Listado global de publicaciones con filtros |
| `data/members.js` | Datos de los miembros: cargo, biografía, líneas, tesis, identificadores (Scopus, ORCID…) |
| `data/publications.json` | **Base de datos de publicaciones extraída de Scopus** |
| `data/publications.js` | La misma base, envuelta para que la web funcione también abriendo el HTML sin servidor |
| `tools/scopus_fetch.py` | Script que regenera la base de datos desde la API de Scopus |
| `assets/` | CSS, JS e imágenes optimizadas |

## Actualizar las publicaciones (Scopus)

1. Guardar la clave de la API de Elsevier en `../.scopus_key` (fuera de la carpeta `web/`,
   para que no se publique), con el formato `ELSEVIER_API_KEY='…'` o solo la clave.
2. Ejecutar desde la carpeta `web/`:

   ```bash
   python tools/scopus_fetch.py
   ```

El script consulta, para cada miembro, todos sus Scopus Author ID **y** su ORCID
(Scopus tiene perfiles fragmentados en algunos casos). Para los colaboradores
(`"group": "col"`) solo recoge las publicaciones en coautoría con miembros del grupo.

Notas sobre Scopus: con la clave estándar fuera de la red de la Universidad la API solo
devuelve el primer autor de cada documento (por eso las fichas muestran «Primer autor … et al.»).

## Añadir o modificar un miembro

Editar `data/members.js`. Campos principales: `id` (usado en la URL), `name`, `role`,
`group` (`pdi`, `inv` o `col`), `photo` (ruta a `assets/img/team/…`; si es `null` se muestra un
avatar con iniciales), `email`, `scopus` (lista de Author ID), `orcid`, `topics`, `bio`, `theses`.
Después, volver a ejecutar `tools/scopus_fetch.py`.

Para poner una foto: copiar un JPG cuadrado (~480 px) en `assets/img/team/<id>.jpg` y poner esa ruta en `photo`.

## Ver la web en local

```bash
python -m http.server 8765 --directory web
```

y abrir http://localhost:8765/. Para publicarla basta con subir el contenido de la carpeta `web/`
a cualquier servidor estático.

## Fuentes de los contenidos

- Documentación interna del grupo (carpeta `Informacion/`): líneas de investigación, equipamiento,
  presentaciones a empresas, panel de la Semana de la Transferencia 2025, tesis.
- Portal de la Investigación de la Universidad de Oviedo (miembros, cargos, financiación, tesis, colaboraciones).
- Scopus (publicaciones y citas).
