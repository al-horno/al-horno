// Photo and catalog changes share one source of truth.
window.AlHornoPhotos={refresh:()=>window.AlHornoCatalog.refresh(),original:id=>products.find(p=>p.id===id)?.baseImg};
