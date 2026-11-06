"""Compila una demo HTML portátil con CSS, comportamiento y assets SVG integrados."""
from pathlib import Path
import base64, re, zipfile
root = Path(__file__).resolve().parent
html = (root/'index.html').read_text()
css = (root/'styles.css').read_text()
app = (root/'app.js').read_text()
motion = (root/'motion.js').read_text()

# Las ilustraciones se integran en HTML y en el catálogo creado dinámicamente.
for svg_file in (root/'assets').glob('*.svg'):
    relative = 'assets/' + svg_file.name
    data_uri = 'data:image/svg+xml;base64,' + base64.b64encode(svg_file.read_bytes()).decode('ascii')
    html = html.replace('./' + relative, data_uri)
    app = app.replace(relative, data_uri)

html = html.replace('<link rel="stylesheet" href="./styles.css">', '<style>\n' + css + '\n</style>')
# Dado que las bibliotecas externas llegan como scripts deferidos, el DOMContentLoaded
# garantiza que primero se han intentado cargar GSAP y ScrollTrigger.
html = html.replace('  <script src="./app.js" defer></script>', '')
html = html.replace('  <script src="./motion.js" defer></script>', '')
html = html.replace('</body>', '''<script>
document.addEventListener('DOMContentLoaded', () => {
''' + app + '''
});
</script>
<script>
document.addEventListener('DOMContentLoaded', () => {
''' + motion + '''
});
</script>
</body>''')
output = root.parent/'ASIRI_tienda_naturista_GSAP.html'
output.write_text(html)
zip_path = root.parent/'ASIRI_frontend_GSAP_codigo_fuente.zip'
include = [root/f for f in ['index.html', 'styles.css', 'app.js', 'motion.js', 'README.md', 'build_demo.py']] + list((root/'assets').glob('*.svg'))
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for p in include:
        z.write(p, 'asiri-frontend/' + str(p.relative_to(root)))
print(output, output.stat().st_size)
print(zip_path, zip_path.stat().st_size)
