/* ASIRI: frontend de demostración. Reemplaza datos en PRODUCTS y configura tu sistema de pedidos antes de publicar. */
const PRODUCTS = [
  {id:'maca',name:'Maca Andina',category:'Superalimentos',size:'Bolsa de 250 g',price:39.90,image:'assets/maca.svg',badge:'Selección natural',description:'Maca en presentación de 250 g, una opción práctica para sumar a tus preparaciones diarias.'},
  {id:'miel',name:'Miel de abeja',category:'Aceites y mieles',size:'Frasco de 500 g',price:34.90,image:'assets/miel.svg',badge:'Favorito',description:'Miel de abeja en frasco de 500 g. Un toque dulce para bebidas, recetas y desayunos.'},
  {id:'infusion',name:'Infusión botánica',category:'Infusiones',size:'Caja de 20 filtrantes',price:19.90,image:'assets/infusion.svg',badge:'Momento pausa',description:'Infusión de ejemplo en presentación de 20 filtrantes, ideal para disfrutar una pausa en tu rutina.'},
  {id:'aceite',name:'Aceite de coco',category:'Aceites y mieles',size:'Frasco de 250 ml',price:28.90,image:'assets/aceite.svg',badge:'Versátil',description:'Aceite de coco en frasco de 250 ml para distintos usos, según las indicaciones del producto real.'},
  {id:'cacao',name:'Cacao natural',category:'Superalimentos',size:'Bolsa de 250 g',price:27.90,image:'assets/cacao.svg',badge:'De la tierra',description:'Cacao natural en polvo de muestra, para bebidas y recetas con sabor intenso.'},
  {id:'chia',name:'Semillas de chía',category:'Superalimentos',size:'Bolsa de 500 g',price:24.90,image:'assets/chia.svg',badge:'Básico natural',description:'Semillas de chía en bolsa de 500 g, para combinar con yogures, bebidas y preparaciones.'},
  {id:'calendula',name:'Crema de caléndula',category:'Cuidado personal',size:'Envase de 120 ml',price:36.90,image:'assets/calendula.svg',badge:'Cuidado diario',description:'Crema cosmética de muestra con caléndula. Consulta siempre la etiqueta e ingredientes reales.'},
  {id:'sacha',name:'Aceite de sacha inchi',category:'Aceites y mieles',size:'Botella de 250 ml',price:29.90,image:'assets/sacha.svg',badge:'Origen vegetal',description:'Aceite vegetal de muestra en presentación de 250 ml. Verifica características del producto real.'}
];
const $ = (q,root=document) => root.querySelector(q);
const $$ = (q,root=document) => [...root.querySelectorAll(q)];
const money = n => 'S/ ' + n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const STORAGE_KEY = 'asiri-demo-cart-v1';
function loadCart(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(!data || typeof data !== 'object' || Array.isArray(data)) return {}; return Object.fromEntries(Object.entries(data).filter(([id,n])=>PRODUCTS.some(p=>p.id===id)&&Number.isInteger(n)&&n>0&&n<=99));}catch{return {};}}
let cart=loadCart();
let currentFilter='Todos'; let currentSearch=''; let currentSort='featured'; let activeDialog=null; let toastTimer;

function setFilter(next){currentFilter=next;$$('.filter-chip').forEach(btn=>{const selected=btn.dataset.filter===next;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));});renderProducts();}
function renderProducts(){let items=PRODUCTS.filter(p=>(currentFilter==='Todos'||p.category===currentFilter) && (`${p.name} ${p.category} ${p.size}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(currentSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())));
  if(currentSort==='low')items.sort((a,b)=>a.price-b.price);else if(currentSort==='high')items.sort((a,b)=>b.price-a.price);else if(currentSort==='name')items.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  $('#productsGrid').innerHTML=items.length?items.map(p=>`<article class="product-card"><button class="product-photo" type="button" data-detail="${p.id}" aria-label="Ver detalles de ${p.name}"><img src="${p.image}" alt="Ilustración del producto ${p.name}" loading="lazy"><span class="product-badge">${p.badge}</span></button><div class="product-details"><span class="product-category">${p.category}</span><button type="button" class="product-title" data-detail="${p.id}">${p.name}</button><span class="product-size">${p.size}</span><div class="product-bottom"><span class="price">${money(p.price)}</span><button type="button" class="add-button" data-add="${p.id}" aria-label="Agregar ${p.name} al carrito">+</button></div></div></article>`).join(''):'<div class="empty-results"><h3>No encontramos resultados</h3><p>Prueba otra búsqueda o selecciona una categoría distinta.</p></div>';
  $('#resultsCount').textContent=`Mostrando ${items.length} de ${PRODUCTS.length} productos de ejemplo`;
  $('#resetFilters').hidden=currentFilter==='Todos'&&!currentSearch;
}
function saveCart(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch{}updateCart();}
function addProduct(id){const p=PRODUCTS.find(p=>p.id===id);if(!p)return;cart[id]=Math.min(99,(cart[id]||0)+1);saveCart();showToast(`${p.name} agregado al carrito`);}
function changeQuantity(id,diff){cart[id]=Math.min(99,Math.max(0,(cart[id]||0)+diff));if(!cart[id])delete cart[id];saveCart();}
function renderCart(){let entries=PRODUCTS.filter(p=>cart[p.id]);let total=entries.reduce((sum,p)=>sum+p.price*cart[p.id],0);let qty=entries.reduce((sum,p)=>sum+cart[p.id],0);
  $('#cartCount').textContent=qty;$('#drawerCartCount').textContent=`(${qty})`;$('#cartTotal').textContent=money(total);$('#checkoutButton').disabled=qty===0;
  $('#cartItems').innerHTML=entries.length?entries.map(p=>`<div class="cart-line"><img src="${p.image}" alt="" loading="lazy"><div class="cart-line-info"><strong>${p.name}</strong><span>${p.size} · ${money(p.price)}</span><div class="line-controls"><div class="quantity-controls"><button type="button" data-qty="-1" data-id="${p.id}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${cart[p.id]}</span><button type="button" data-qty="1" data-id="${p.id}" aria-label="Agregar una unidad de ${p.name}">+</button></div><button type="button" class="line-remove" data-remove="${p.id}">Eliminar</button></div></div></div>`).join(''):'<div class="cart-empty"><span class="big-leaf">🌿</span><strong>Tu carrito está vacío</strong><p>Explora nuestros productos y guarda tus favoritos aquí.</p></div>';
}
function updateCart(){renderCart();}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function openDialog(dialog){if(activeDialog)closeDialog();activeDialog=dialog;$('#overlay').hidden=false;requestAnimationFrame(()=>{$('#overlay').classList.add('visible');dialog.classList.add('visible');});dialog.setAttribute('aria-hidden','false');document.body.classList.add('locked');setTimeout(()=>{const focusable=dialog.querySelector('button:not(:disabled),[href],input,select');focusable?.focus();},100);}
function closeDialog(){if(!activeDialog)return;const dialog=activeDialog;activeDialog=null;dialog.classList.remove('visible');dialog.setAttribute('aria-hidden','true');$('#overlay').classList.remove('visible');document.body.classList.remove('locked');setTimeout(()=>{if(!activeDialog)$('#overlay').hidden=true;},230);}
function openDetails(id){const p=PRODUCTS.find(p=>p.id===id);if(!p)return;$('#modalContent').innerHTML=`<img src="${p.image}" alt="Ilustración de ${p.name}"><div class="modal-info"><span class="section-kicker">${p.category}</span><h2 id="modalTitle">${p.name}</h2><span class="product-size">${p.size}</span><div class="modal-price">${money(p.price)}</div><p>${p.description}<br><br><em>Producto ilustrativo para la versión demo.</em></p><button class="btn btn-primary" type="button" data-modal-add="${p.id}">Agregar al carrito <span>+</span></button></div>`;openDialog($('#productModal'));}
function copyOrder(){const entries=PRODUCTS.filter(p=>cart[p.id]);if(!entries.length)return;const lines=['Hola, ASIRI. Quisiera consultar por estos productos:',...entries.map(p=>`• ${cart[p.id]} × ${p.name} (${p.size}) — ${money(cart[p.id]*p.price)}`),'',`Subtotal referencial: ${money(entries.reduce((sum,p)=>sum+p.price*cart[p.id],0))}`,'Precios sujetos a confirmación.'];const text=lines.join('\n');
  const fallback=()=>{const textarea=document.createElement('textarea');textarea.value=text;textarea.style.position='fixed';textarea.style.top='-9999px';document.body.appendChild(textarea);textarea.select();let success=false;try{success=document.execCommand('copy')}catch{}textarea.remove();return success;};
  if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(text).then(()=>showToast('¡Resumen copiado! Puedes pegarlo en tu conversación.'),()=>showToast(fallback()?'¡Resumen copiado!':'No se pudo copiar. Revisa los permisos del navegador.'));}else{showToast(fallback()?'¡Resumen copiado! Puedes pegarlo en tu conversación.':'No se pudo copiar. Revisa los permisos del navegador.');}
}

$('#productsGrid').addEventListener('click',e=>{const add=e.target.closest('[data-add]');if(add)return addProduct(add.dataset.add);const detail=e.target.closest('[data-detail]');if(detail)return openDetails(detail.dataset.detail);});
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
$$('.category-card').forEach(b=>b.addEventListener('click',()=>{setFilter(b.dataset.category);$('#productos').scrollIntoView({behavior:'smooth'});}));
$('#sortSelect').addEventListener('change',e=>{currentSort=e.target.value;renderProducts();});
$('#searchInput').addEventListener('input',e=>{currentSearch=e.target.value.trim();renderProducts();});
$('#headerSearch').addEventListener('submit',e=>{e.preventDefault();$('#productos').scrollIntoView({behavior:'smooth'});});
$('#resetFilters').addEventListener('click',()=>{currentSearch='';$('#searchInput').value='';setFilter('Todos');});
$('#cartTrigger').addEventListener('click',()=>openDialog($('#cartDrawer')));
$('#closeCart').addEventListener('click',closeDialog);
$('#closeModal').addEventListener('click',closeDialog);
$('#closeFaq').addEventListener('click',closeDialog);
$('#overlay').addEventListener('click',closeDialog);
$('#cartItems').addEventListener('click',e=>{const qty=e.target.closest('[data-qty]');if(qty)return changeQuantity(qty.dataset.id,Number(qty.dataset.qty));const remove=e.target.closest('[data-remove]');if(remove){delete cart[remove.dataset.remove];saveCart();}});
$('#modalContent').addEventListener('click',e=>{const b=e.target.closest('[data-modal-add]');if(b){addProduct(b.dataset.modalAdd);closeDialog();}});
$('#checkoutButton').addEventListener('click',copyOrder);
$('#faqButton').addEventListener('click',()=>openDialog($('#faqModal')));
$('#contactButton').addEventListener('click',()=>showToast('Próximamente: configura aquí el WhatsApp o correo oficial de ASIRI.'));
$('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();showToast('Este formulario es demostrativo. Falta integrar el registro de correos.');});
$('#menuTrigger').addEventListener('click',()=>{const nav=$('#navigation');const open=nav.classList.toggle('open');$('#menuTrigger').setAttribute('aria-expanded',String(open));$('#menuTrigger').setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
$$('#navigation a').forEach(a=>a.addEventListener('click',()=>{$('#navigation').classList.remove('open');$('#menuTrigger').setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDialog();if(e.key==='Tab'&&activeDialog){const nodes=$$('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),summary',activeDialog).filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('#year').textContent=new Date().getFullYear();
renderProducts();renderCart();
