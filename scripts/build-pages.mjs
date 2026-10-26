import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'source/index.html'),'utf8');
const ctx={}; vm.createContext(ctx); vm.runInContext(source.slice(source.indexOf('const photo='),source.indexOf('const cats='))+';globalThis.catalog=products',ctx);
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.mkdirSync(path.join(root,'docs/assets'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/products.json'),JSON.stringify(ctx.catalog));
let page=fs.readFileSync(path.join(root,'pages/index.html'),'utf8');
page=page.replace('</head>','<link rel="icon" type="image/png" href="./assets/al-horno-icon-large.png"><link rel="stylesheet" href="./storefront.css"><link rel="stylesheet" href="./clarity.css"><link rel="stylesheet" href="./commerce.css"><script src="./remote-config.js"></script><script src="./pricing.js"></script></head>').replace('</body>','<script src="./catalog.js"></script><script src="./storefront.js"></script><script src="./admin-products.js"></script><script src="./accounts.js"></script><script src="./product-photos.js"></script></body>');
for(const name of ['storefront.css','clarity.css','commerce.css','catalog.js','pricing.js','storefront.js','remote-config.js','admin-products.js','accounts.js','product-photos.js','assets/al-horno-logo.png','assets/al-horno-icon-large.png']){
 const file=fs.readFileSync(path.join(root,'pages',name));fs.writeFileSync(path.join(root,'docs',name),file);
 page=page.replaceAll('./'+name,'./'+name+'?v='+createHash('sha256').update(file).digest('hex').slice(0,10));
}
page=page.replaceAll('href="#carrito"','href="./carrito.html"');
const catalog=page.replace(/<section id="carrito"[\s\S]*?<\/section>/,'');
if(catalog.includes('id="carrito"')||catalog.includes('id="checkout"'))throw Error('Cart must not exist in catalog');
const cartPage=page.replaceAll('href="#catalogo"','href="./index.html#catalogo"').replace('<section id="hero" class="hero">','<section id="hero" class="hero" hidden>').replace('<section id="catalogo">','<section id="catalogo" hidden>');
fs.writeFileSync(path.join(root,'docs/index.html'),catalog);
fs.writeFileSync(path.join(root,'docs/carrito.html'),cartPage);
fs.writeFileSync(path.join(root,'docs/.nojekyll'),'');
console.log('GitHub Pages catalog built: '+ctx.catalog.length+' products');
