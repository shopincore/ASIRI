/* ASIRI: catálogo, carrito y pedidos. Los productos vienen de la API (/api/products); esta lista es el respaldo si la API no responde. */
let PRODUCTS = [
  {id:'maca',name:'Maca Andina',category:'Superalimentos',size:'Bolsa de 250 g',price:39.90,image:'assets/maca.webp',badge:'Selección natural',description:'Maca en presentación de 250 g, una opción práctica para sumar a tus preparaciones diarias.'},
  {id:'miel',name:'Miel de abeja',category:'Aceites y mieles',size:'Frasco de 500 g',price:34.90,image:'assets/miel.webp',badge:'Favorito',description:'Miel de abeja en frasco de 500 g. Un toque dulce para bebidas, recetas y desayunos.'},
  {id:'infusion',name:'Infusión botánica',category:'Infusiones',size:'Caja de 20 filtrantes',price:19.90,image:'assets/infusion.webp',badge:'Momento pausa',description:'Infusión de ejemplo en presentación de 20 filtrantes, ideal para disfrutar una pausa en tu rutina.'},
  {id:'aceite',name:'Aceite de coco',category:'Aceites y mieles',size:'Frasco de 250 ml',price:28.90,image:'assets/aceite.webp',badge:'Versátil',description:'Aceite de coco en frasco de 250 ml para distintos usos, según las indicaciones del producto real.'},
  {id:'cacao',name:'Cacao natural',category:'Superalimentos',size:'Bolsa de 250 g',price:27.90,image:'assets/cacao.webp',badge:'De la tierra',description:'Cacao natural en polvo de muestra, para bebidas y recetas con sabor intenso.'},
  {id:'chia',name:'Semillas de chía',category:'Superalimentos',size:'Bolsa de 500 g',price:24.90,image:'assets/chia.webp',badge:'Básico natural',description:'Semillas de chía en bolsa de 500 g, para combinar con yogures, bebidas y preparaciones.'},
  {id:'calendula',name:'Crema de caléndula',category:'Cuidado personal',size:'Envase de 120 ml',price:36.90,image:'assets/calendula.webp',badge:'Cuidado diario',description:'Crema cosmética de muestra con caléndula. Consulta siempre la etiqueta e ingredientes reales.'},
  {id:'sacha',name:'Aceite de sacha inchi',category:'Aceites y mieles',size:'Botella de 250 ml',price:29.90,image:'assets/sacha.webp',badge:'Origen vegetal',description:'Aceite vegetal de muestra en presentación de 250 ml. Verifica características del producto real.'}
];
const $ = (q,root=document) => root.querySelector(q);
const $$ = (q,root=document) => [...root.querySelectorAll(q)];
const money = n => 'S/ ' + n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const STORAGE_KEY = 'asiri-demo-cart-v1';
// En GitHub Pages la API vive en Railway; en Railway es el mismo dominio.
const API_BASE = window.ASIRI_API ?? (location.hostname.endsWith('github.io') ? 'https://asiri-production.up.railway.app' : '');
let apiOnline = false;
async function api(path, body){const res=await fetch(API_BASE+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const data=await res.json().catch(()=>({}));if(!res.ok){const err=new Error(data.error?.message||'No pudimos conectar con la tienda. Intenta nuevamente.');err.details=data.error?.details;err.status=res.status;throw err;}return data;}
async function loadCatalog(){try{const {products}=await api('/api/products');if(!Array.isArray(products)||!products.length)return;PRODUCTS=products;apiOnline=true;cart=loadCart();renderProducts();renderCart();}catch{/* sin API: se usa el catálogo local */}}
function loadCart(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(!data || typeof data !== 'object' || Array.isArray(data)) return {}; return Object.fromEntries(Object.entries(data).filter(([id,n])=>PRODUCTS.some(p=>p.id===id)&&Number.isInteger(n)&&n>0&&n<=99));}catch{return {};}}
let cart=loadCart();
let currentFilter='Todos'; let currentSearch=''; let currentSort='featured'; let activeDialog=null; let toastTimer;

function setFilter(next){currentFilter=next;$$('.filter-chip').forEach(btn=>{const selected=btn.dataset.filter===next;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));});renderProducts();}
function renderProducts(){let items=PRODUCTS.filter(p=>(currentFilter==='Todos'||p.category===currentFilter) && (`${p.name} ${p.category} ${p.size}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(currentSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())));
  if(currentSort==='low')items.sort((a,b)=>a.price-b.price);else if(currentSort==='high')items.sort((a,b)=>b.price-a.price);else if(currentSort==='name')items.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  $('#productsGrid').innerHTML=items.length?items.map(p=>`<article class="product-card"><button class="product-photo" type="button" data-detail="${p.id}" aria-label="Ver detalles de ${p.name}"><img src="${p.image}" alt="Ilustración del producto ${p.name}" loading="lazy"><span class="product-badge">${p.inStock===false?'Agotado':p.badge}</span></button><div class="product-details"><span class="product-category">${p.category}</span><button type="button" class="product-title" data-detail="${p.id}">${p.name}</button><span class="product-size">${p.size}</span><div class="product-bottom"><span class="price">${money(p.price)}</span><button type="button" class="add-button" data-add="${p.id}" aria-label="Agregar ${p.name} al carrito"${p.inStock===false?' disabled':''}>+</button></div></div></article>`).join(''):'<div class="empty-results"><h3>No encontramos resultados</h3><p>Prueba otra búsqueda o selecciona una categoría distinta.</p></div>';
  $('#resultsCount').textContent=`Mostrando ${items.length} de ${PRODUCTS.length} productos`;
  $('#resetFilters').hidden=currentFilter==='Todos'&&!currentSearch;
}
function saveCart(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch{}updateCart();}
function addProduct(id){const p=PRODUCTS.find(p=>p.id===id);if(!p)return;if(p.inStock===false)return showToast(`${p.name} está agotado por ahora.`);cart[id]=Math.min(99,(cart[id]||0)+1);saveCart();showToast(`${p.name} agregado al carrito`);}
function changeQuantity(id,diff){cart[id]=Math.min(99,Math.max(0,(cart[id]||0)+diff));if(!cart[id])delete cart[id];saveCart();}
function renderCart(){let entries=PRODUCTS.filter(p=>cart[p.id]);let total=entries.reduce((sum,p)=>sum+p.price*cart[p.id],0);let qty=entries.reduce((sum,p)=>sum+cart[p.id],0);
  $('#cartCount').textContent=qty;$('#drawerCartCount').textContent=`(${qty})`;$('#cartTotal').textContent=money(total);$('#checkoutButton').disabled=qty===0;
  $('#cartItems').innerHTML=entries.length?entries.map(p=>`<div class="cart-line"><img src="${p.image}" alt="" loading="lazy"><div class="cart-line-info"><strong>${p.name}</strong><span>${p.size} · ${money(p.price)}</span><div class="line-controls"><div class="quantity-controls"><button type="button" data-qty="-1" data-id="${p.id}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${cart[p.id]}</span><button type="button" data-qty="1" data-id="${p.id}" aria-label="Agregar una unidad de ${p.name}">+</button></div><button type="button" class="line-remove" data-remove="${p.id}">Eliminar</button></div></div></div>`).join(''):'<div class="cart-empty"><span class="big-leaf">🌿</span><strong>Tu carrito está vacío</strong><p>Explora nuestros productos y guarda tus favoritos aquí.</p></div>';
}
function updateCart(){renderCart();}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function openDialog(dialog){if(activeDialog)closeDialog();activeDialog=dialog;$('#overlay').hidden=false;requestAnimationFrame(()=>{$('#overlay').classList.add('visible');dialog.classList.add('visible');});dialog.setAttribute('aria-hidden','false');document.body.classList.add('locked');setTimeout(()=>{const focusable=dialog.querySelector('button:not(:disabled),[href],input,select');focusable?.focus();},100);}
function closeDialog(){if(!activeDialog)return;const dialog=activeDialog;activeDialog=null;dialog.classList.remove('visible');dialog.setAttribute('aria-hidden','true');$('#overlay').classList.remove('visible');document.body.classList.remove('locked');setTimeout(()=>{if(!activeDialog)$('#overlay').hidden=true;},230);}
function openDetails(id){const p=PRODUCTS.find(p=>p.id===id);if(!p)return;$('#modalContent').innerHTML=`<img src="${p.image}" alt="Ilustración de ${p.name}"><div class="modal-info"><span class="section-kicker">${p.category}</span><h2 id="modalTitle">${p.name}</h2><span class="product-size">${p.size}</span><div class="modal-price">${money(p.price)}</div><p>${p.description}</p><button class="btn btn-primary" type="button" data-modal-add="${p.id}"${p.inStock===false?' disabled':''}>${p.inStock===false?'Agotado':'Agregar al carrito <span>+</span>'}</button></div>`;openDialog($('#productModal'));}
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
$('#closeContact').addEventListener('click',closeDialog);
$('#overlay').addEventListener('click',closeDialog);
$('#cartItems').addEventListener('click',e=>{const qty=e.target.closest('[data-qty]');if(qty)return changeQuantity(qty.dataset.id,Number(qty.dataset.qty));const remove=e.target.closest('[data-remove]');if(remove){delete cart[remove.dataset.remove];saveCart();}});
$('#modalContent').addEventListener('click',e=>{const b=e.target.closest('[data-modal-add]');if(b){addProduct(b.dataset.modalAdd);closeDialog();}});
$('#checkoutButton').addEventListener('click',()=>apiOnline?showCheckout('form'):copyOrder());
$('#faqButton').addEventListener('click',()=>openDialog($('#faqModal')));
$('#menuTrigger').addEventListener('click',()=>{const nav=$('#navigation');const open=nav.classList.toggle('open');$('#menuTrigger').setAttribute('aria-expanded',String(open));$('#menuTrigger').setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
$$('#navigation a').forEach(a=>a.addEventListener('click',()=>{$('#navigation').classList.remove('open');$('#menuTrigger').setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDialog();if(e.key==='Tab'&&activeDialog){const nodes=$$('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),summary',activeDialog).filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('#year').textContent=new Date().getFullYear();
renderProducts();renderCart();loadCatalog();

// Keep search available in the minimal landing header.
const searchToggle = document.querySelector('.search-toggle');
searchToggle?.addEventListener('click', () => {
  const form = document.querySelector('#headerSearch');
  const open = form.classList.toggle('expanded');
  searchToggle.setAttribute('aria-expanded', String(open));
  if (open) document.querySelector('#searchInput').focus();
});
document.querySelector('#headerSearch').addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.currentTarget.classList.remove('expanded');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.focus();
  }
});

// ---------- Pedido ----------
const checkoutForm = $('#checkoutForm');
function showCheckout(step){
  $('#cartItems').hidden = step!=='cart';
  $('.drawer-footer').hidden = step!=='cart';
  checkoutForm.hidden = step!=='form';
  $('#checkoutDone').hidden = step!=='done';
  if(step==='form'){
    const total = PRODUCTS.filter(p=>cart[p.id]).reduce((sum,p)=>sum+p.price*cart[p.id],0);
    $('#checkoutTotal').textContent = money(total);
    $('#checkoutError').hidden = true;
    checkoutForm.querySelector('input[name=name]').focus();
  }
}
function showFormError(form, box, err){
  form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  const field = err.details?.field?.split('.').pop();
  const input = field && form.elements[field];
  if(input?.setAttribute){input.setAttribute('aria-invalid','true');input.focus();}
  box.textContent = err.message; box.hidden = false;
}
const setBusy = (btn, busy) => {btn.disabled = busy; btn.setAttribute('aria-busy', String(busy));};
checkoutForm.addEventListener('change', e => {if(e.target.name==='method') $('#deliveryFields').hidden = e.target.value==='recojo';});
$('#checkoutBack').addEventListener('click', ()=>showCheckout('cart'));
$('#orderDoneClose').addEventListener('click', ()=>{showCheckout('cart');closeDialog();});
$('#closeCart').addEventListener('click', ()=>{ if(!$('#checkoutDone').hidden) showCheckout('cart'); });
checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();
  const f = checkoutForm.elements, btn = $('#placeOrder');
  const method = f.method.value;
  const body = {
    customer:{name:f.name.value, phone:f.phone.value, email:f.email.value},
    delivery:{method, district:method==='delivery'?f.district.value:'', address:method==='delivery'?f.address.value:''},
    notes:f.notes.value,
    items:Object.entries(cart).map(([productId,quantity])=>({productId,quantity})),
  };
  setBusy(btn, true);
  try{
    const {order, whatsappUrl} = await api('/api/orders', body);
    cart = {}; saveCart(); checkoutForm.reset(); $('#deliveryFields').hidden = false;
    $('#orderCode').textContent = order.code;
    $('#orderMessage').textContent = whatsappUrl
      ? `Total referencial ${money(order.subtotal)}. Envíanos tu pedido por WhatsApp para coordinar el pago y la entrega.`
      : `Total referencial ${money(order.subtotal)}. Te escribiremos al ${order.customer.phone} para coordinar el pago y la entrega.`;
    const wa = $('#orderWhatsapp'); wa.hidden = !whatsappUrl; if(whatsappUrl) wa.href = whatsappUrl;
    showCheckout('done');
  }catch(err){
    if(err.status===409) loadCatalog();
    showFormError(checkoutForm, $('#checkoutError'), err);
  }finally{setBusy(btn, false);}
});

// ---------- Newsletter y contacto ----------
$('#newsletterForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button'), input = $('#newsletterEmail');
  setBusy(btn, true);
  try{await api('/api/newsletter', {email:input.value}); input.value=''; showToast('¡Gracias! Te suscribiste a las novedades de ASIRI.');}
  catch(err){showToast(err.status ? err.message : 'No pudimos registrar tu correo. Intenta más tarde.');}
  finally{setBusy(btn, false);}
});
$('#contactButton').addEventListener('click', ()=>{ $('#contactError').hidden = true; openDialog($('#contactModal')); });
$('#contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget, f = form.elements, btn = form.querySelector('button[type=submit]');
  setBusy(btn, true);
  try{await api('/api/contact', {name:f.name.value, contact:f.contact.value, message:f.message.value}); form.reset(); closeDialog(); showToast('¡Mensaje enviado! Te responderemos pronto.');}
  catch(err){showFormError(form, $('#contactError'), err.status ? err : new Error('No pudimos enviar tu mensaje. Intenta más tarde.'));}
  finally{setBusy(btn, false);}
});
