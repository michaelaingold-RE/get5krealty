(function(){
  document.querySelectorAll('form.lead-form').forEach(function(form){
    var src=form.querySelector('input[name="source_page"]'); if(src) src.value=location.pathname;
    form.addEventListener('submit',function(e){
      if(!window.fetch||!window.FormData) return;
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]'); var lbl=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Sending...';}
      fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}})
        .then(function(r){ if(r.ok){ location.href='/thank-you'; } else { throw new Error('bad'); } })
        .catch(function(){
          var er=form.querySelector('.err'); if(er) er.style.display='block';
          if(btn){btn.disabled=false;btn.textContent=lbl;}
        });
    });
  });
  var go=document.getElementById('emailMeThis');
  if(go){
    go.addEventListener('click',function(){
      var f=document.getElementById('seller-form'); if(!f) return;
      var a=document.getElementById('address'), p=document.getElementById('salePrice');
      var fa=f.querySelector('input[name="property_address"]');
      if(a && fa && a.value.trim()) fa.value=a.value.trim();
      var price=p?parseFloat(p.value)||0:0;
      var hp=f.querySelector('input[name="calculator_price"]'), hf=f.querySelector('input[name="calculator_fee"]');
      if(hp) hp.value=price>0?String(price):'';
      if(hf) hf.value=price>0?String(Math.round(Math.max(5000,price*0.01))):'';
      f.scrollIntoView({behavior:'smooth',block:'start'});
      var n=f.querySelector('input[name="name"]'); if(n) setTimeout(function(){n.focus();},400);
    });
  }
})();
