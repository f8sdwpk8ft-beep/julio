(function(){
  "use strict";

  var STORAGE_KEY = "gestao-simples-data-v1";

  var DEFAULT_DATA = { clientes: [], produtos: [], vendas: [], contas: [] };

  function loadData(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return structuredClone(DEFAULT_DATA);
      var parsed = JSON.parse(raw);
      return Object.assign(structuredClone(DEFAULT_DATA), parsed);
    }catch(e){
      console.error("Falha ao carregar dados", e);
      return structuredClone(DEFAULT_DATA);
    }
  }

  function saveData(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  var state = loadData();

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  function brl(v){
    v = Number(v) || 0;
    return v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  }

  function fmtDate(iso){
    if(!iso) return "-";
    var parts = iso.split("-");
    if(parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function todayISO(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  // ---------- Toast ----------
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 2400);
  }

  // ---------- Modal ----------
  var modalRoot = document.getElementById("modalRoot");
  function openModal(title, bodyHtml, onMount){
    modalRoot.innerHTML =
      '<div class="modal-backdrop" id="modalBackdrop">' +
        '<div class="modal">' +
          '<div class="modal-head"><h3>' + esc(title) + '</h3>' +
            '<button class="modal-close" id="modalClose">&times;</button></div>' +
          '<div id="modalBody">' + bodyHtml + '</div>' +
        '</div>' +
      '</div>';
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalBackdrop").addEventListener("click", function(e){
      if(e.target.id === "modalBackdrop") closeModal();
    });
    if(onMount) onMount(document.getElementById("modalBody"));
  }
  function closeModal(){ modalRoot.innerHTML = ""; }

  // ---------- Navigation ----------
  var views = ["dashboard","vendas","produtos","clientes","financeiro"];
  var titles = { dashboard:"Dashboard", vendas:"Vendas", produtos:"Produtos", clientes:"Clientes", financeiro:"Financeiro" };

  function showView(name){
    views.forEach(function(v){
      document.getElementById("view-" + v).classList.toggle("hidden", v !== name);
    });
    document.querySelectorAll(".nav a").forEach(function(a){
      a.classList.toggle("active", a.dataset.view === name);
    });
    document.getElementById("pageTitle").textContent = titles[name];
    document.getElementById("sidebar").classList.remove("open");
    renderAll();
  }

  document.getElementById("nav").addEventListener("click", function(e){
    var a = e.target.closest("a[data-view]");
    if(!a) return;
    e.preventDefault();
    showView(a.dataset.view);
  });

  document.getElementById("menuToggle").addEventListener("click", function(){
    document.getElementById("sidebar").classList.toggle("open");
  });

  // ================= CLIENTES =================
  function renderClientes(filter){
    var tbody = document.getElementById("tblClientes");
    var list = state.clientes.filter(function(c){
      if(!filter) return true;
      return c.nome.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    });
    if(list.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhum cliente cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(c){
      return '<tr>' +
        '<td class="cell-strong">' + esc(c.nome) + '</td>' +
        '<td>' + esc(c.telefone || "-") + '</td>' +
        '<td>' + esc(c.email || "-") + '</td>' +
        '<td>' + esc(c.obs || "-") + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-cliente="' + c.id + '">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-del-cliente="' + c.id + '">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function clienteForm(cliente){
    cliente = cliente || {};
    return (
      '<div class="field"><label>Nome</label><input id="fNome" value="' + esc(cliente.nome||"") + '" placeholder="Nome do cliente"></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Telefone</label><input id="fTelefone" value="' + esc(cliente.telefone||"") + '" placeholder="(00) 00000-0000"></div>' +
        '<div class="field"><label>E-mail</label><input id="fEmail" value="' + esc(cliente.email||"") + '" placeholder="email@exemplo.com"></div>' +
      '</div>' +
      '<div class="field"><label>Observações</label><textarea id="fObs" rows="3">' + esc(cliente.obs||"") + '</textarea></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">Salvar</button></div>'
    );
  }

  function openClienteModal(id){
    var cliente = id ? state.clientes.find(function(c){ return c.id === id; }) : null;
    openModal(cliente ? "Editar cliente" : "Novo cliente", clienteForm(cliente), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var nome = body.querySelector("#fNome").value.trim();
        if(!nome){ toast("Informe o nome do cliente"); return; }
        var data = {
          nome: nome,
          telefone: body.querySelector("#fTelefone").value.trim(),
          email: body.querySelector("#fEmail").value.trim(),
          obs: body.querySelector("#fObs").value.trim()
        };
        if(cliente){
          Object.assign(cliente, data);
        } else {
          data.id = uid();
          state.clientes.push(data);
        }
        saveData();
        closeModal();
        renderAll();
        toast("Cliente salvo");
      });
    });
  }

  document.getElementById("btnNovoCliente").addEventListener("click", function(){ openClienteModal(null); });
  document.getElementById("buscaClientes").addEventListener("input", function(e){ renderClientes(e.target.value); });
  document.getElementById("tblClientes").addEventListener("click", function(e){
    var editId = e.target.dataset.editCliente;
    var delId = e.target.dataset.delCliente;
    if(editId) openClienteModal(editId);
    if(delId){
      if(confirm("Excluir este cliente?")){
        state.clientes = state.clientes.filter(function(c){ return c.id !== delId; });
        saveData(); renderAll(); toast("Cliente excluído");
      }
    }
  });

  // ================= PRODUTOS =================
  function renderProdutos(filter){
    var tbody = document.getElementById("tblProdutos");
    var list = state.produtos.filter(function(p){
      if(!filter) return true;
      return p.nome.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    });
    if(list.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum produto cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(p){
      var baixo = Number(p.estoque) <= Number(p.estoqueMinimo || 0);
      return '<tr>' +
        '<td class="cell-strong">' + esc(p.nome) + '</td>' +
        '<td>' + esc(p.categoria || "-") + '</td>' +
        '<td>' + brl(p.preco) + '</td>' +
        '<td>' + brl(p.custo) + '</td>' +
        '<td>' + p.estoque + ' ' + (baixo ? '<span class="badge badge-danger">baixo</span>' : '') + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-produto="' + p.id + '">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-del-produto="' + p.id + '">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function produtoForm(p){
    p = p || {};
    return (
      '<div class="field"><label>Nome</label><input id="fNome" value="' + esc(p.nome||"") + '" placeholder="Nome do produto"></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Categoria</label><input id="fCategoria" value="' + esc(p.categoria||"") + '"></div>' +
        '<div class="field"><label>Estoque mínimo</label><input id="fMin" type="number" min="0" value="' + (p.estoqueMinimo != null ? p.estoqueMinimo : 0) + '"></div>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Preço de venda</label><input id="fPreco" type="number" min="0" step="0.01" value="' + (p.preco != null ? p.preco : "") + '"></div>' +
        '<div class="field"><label>Custo</label><input id="fCusto" type="number" min="0" step="0.01" value="' + (p.custo != null ? p.custo : "") + '"></div>' +
      '</div>' +
      '<div class="field"><label>Estoque atual</label><input id="fEstoque" type="number" min="0" value="' + (p.estoque != null ? p.estoque : 0) + '"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">Salvar</button></div>'
    );
  }

  function openProdutoModal(id){
    var p = id ? state.produtos.find(function(x){ return x.id === id; }) : null;
    openModal(p ? "Editar produto" : "Novo produto", produtoForm(p), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var nome = body.querySelector("#fNome").value.trim();
        if(!nome){ toast("Informe o nome do produto"); return; }
        var data = {
          nome: nome,
          categoria: body.querySelector("#fCategoria").value.trim(),
          preco: parseFloat(body.querySelector("#fPreco").value) || 0,
          custo: parseFloat(body.querySelector("#fCusto").value) || 0,
          estoque: parseInt(body.querySelector("#fEstoque").value, 10) || 0,
          estoqueMinimo: parseInt(body.querySelector("#fMin").value, 10) || 0
        };
        if(p){
          Object.assign(p, data);
        } else {
          data.id = uid();
          state.produtos.push(data);
        }
        saveData();
        closeModal();
        renderAll();
        toast("Produto salvo");
      });
    });
  }

  document.getElementById("btnNovoProduto").addEventListener("click", function(){ openProdutoModal(null); });
  document.getElementById("buscaProdutos").addEventListener("input", function(e){ renderProdutos(e.target.value); });
  document.getElementById("tblProdutos").addEventListener("click", function(e){
    var editId = e.target.dataset.editProduto;
    var delId = e.target.dataset.delProduto;
    if(editId) openProdutoModal(editId);
    if(delId){
      if(confirm("Excluir este produto?")){
        state.produtos = state.produtos.filter(function(p){ return p.id !== delId; });
        saveData(); renderAll(); toast("Produto excluído");
      }
    }
  });

  // ================= VENDAS =================
  function renderVendas(filter){
    var tbody = document.getElementById("tblVendas");
    var list = state.vendas.slice().sort(function(a,b){ return b.data.localeCompare(a.data); }).filter(function(v){
      if(!filter) return true;
      var nome = clienteNome(v.clienteId).toLowerCase();
      return nome.indexOf(filter.toLowerCase()) !== -1;
    });
    if(list.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma venda registrada.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(v){
      var itensResumo = v.itens.map(function(i){ return i.qtd + "x " + i.nome; }).join(", ");
      return '<tr>' +
        '<td>' + fmtDate(v.data) + '</td>' +
        '<td class="cell-strong">' + esc(clienteNome(v.clienteId)) + '</td>' +
        '<td>' + esc(itensResumo) + '</td>' +
        '<td>' + esc(v.pagamento) + '</td>' +
        '<td class="cell-strong">' + brl(v.total) + '</td>' +
        '<td class="cell-actions"><button class="btn btn-danger btn-sm" data-del-venda="' + v.id + '">Excluir</button></td>' +
      '</tr>';
    }).join("");
  }

  function clienteNome(id){
    if(!id) return "Consumidor final";
    var c = state.clientes.find(function(c){ return c.id === id; });
    return c ? c.nome : "Consumidor final";
  }

  function vendaFormRow(item, idx){
    var options = state.produtos.map(function(p){
      var sel = item && item.produtoId === p.id ? "selected" : "";
      return '<option value="' + p.id + '" ' + sel + '>' + esc(p.nome) + ' (' + p.estoque + ' em estoque)</option>';
    }).join("");
    return (
      '<div class="venda-item-row" data-row="' + idx + '">' +
        '<select class="v-produto">' + '<option value="">Selecione...</option>' + options + '</select>' +
        '<input class="v-qtd" type="number" min="1" value="' + (item ? item.qtd : 1) + '">' +
        '<input class="v-preco" type="number" min="0" step="0.01" value="' + (item ? item.precoUnit : 0) + '">' +
        '<button type="button" class="btn btn-icon btn-danger v-remove" title="Remover">&times;</button>' +
      '</div>'
    );
  }

  function vendaForm(){
    var clienteOptions = '<option value="">Consumidor final</option>' + state.clientes.map(function(c){
      return '<option value="' + c.id + '">' + esc(c.nome) + '</option>';
    }).join("");
    return (
      '<div class="field-row">' +
        '<div class="field"><label>Cliente</label><select id="fCliente">' + clienteOptions + '</select></div>' +
        '<div class="field"><label>Forma de pagamento</label><select id="fPagamento">' +
          '<option value="À vista">À vista</option><option value="A prazo">A prazo</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="field"><label>Data</label><input id="fData" type="date" value="' + todayISO() + '"></div>' +
      '<div class="venda-items" id="vendaItems">' +
        '<div id="vendaRows">' + vendaFormRow(null, 0) + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnAddItem" style="margin-top:0.4rem;">+ Adicionar item</button>' +
        '<div class="venda-total"><span>Total</span><span id="vendaTotalValor">R$ 0,00</span></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">Registrar venda</button></div>'
    );
  }

  function openVendaModal(){
    if(state.produtos.length === 0){
      toast("Cadastre um produto antes de registrar uma venda");
      return;
    }
    openModal("Nova venda", vendaForm(), function(body){
      var rowsEl = body.querySelector("#vendaRows");
      var rowCount = 1;

      function recalcTotal(){
        var total = 0;
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var qtd = parseFloat(row.querySelector(".v-qtd").value) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          total += qtd * preco;
        });
        body.querySelector("#vendaTotalValor").textContent = brl(total);
      }

      function bindRow(row){
        row.querySelector(".v-produto").addEventListener("change", function(){
          var prod = state.produtos.find(function(p){ return p.id === row.querySelector(".v-produto").value; });
          if(prod) row.querySelector(".v-preco").value = prod.preco;
          recalcTotal();
        });
        row.querySelector(".v-qtd").addEventListener("input", recalcTotal);
        row.querySelector(".v-preco").addEventListener("input", recalcTotal);
        row.querySelector(".v-remove").addEventListener("click", function(){
          if(rowsEl.querySelectorAll(".venda-item-row").length > 1){
            row.remove();
            recalcTotal();
          }
        });
      }
      bindRow(rowsEl.querySelector(".venda-item-row"));

      body.querySelector("#btnAddItem").addEventListener("click", function(){
        var div = document.createElement("div");
        div.innerHTML = vendaFormRow(null, rowCount++);
        var row = div.firstElementChild;
        rowsEl.appendChild(row);
        bindRow(row);
      });

      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var itens = [];
        var valid = true;
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var produtoId = row.querySelector(".v-produto").value;
          var qtd = parseInt(row.querySelector(".v-qtd").value, 10) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          if(!produtoId || qtd <= 0){ valid = false; return; }
          var prod = state.produtos.find(function(p){ return p.id === produtoId; });
          if(!prod){ valid = false; return; }
          if(qtd > prod.estoque){ valid = false; toast("Estoque insuficiente para " + prod.nome); return; }
          itens.push({ produtoId: produtoId, nome: prod.nome, qtd: qtd, precoUnit: preco });
        });
        if(!valid || itens.length === 0){ toast("Verifique os itens da venda"); return; }

        var total = itens.reduce(function(sum, i){ return sum + i.qtd * i.precoUnit; }, 0);
        var pagamento = body.querySelector("#fPagamento").value;
        var venda = {
          id: uid(),
          data: body.querySelector("#fData").value || todayISO(),
          clienteId: body.querySelector("#fCliente").value || null,
          itens: itens,
          total: total,
          pagamento: pagamento
        };

        itens.forEach(function(i){
          var prod = state.produtos.find(function(p){ return p.id === i.produtoId; });
          prod.estoque = Math.max(0, prod.estoque - i.qtd);
        });

        state.vendas.push(venda);

        state.contas.push({
          id: uid(),
          descricao: "Venda - " + clienteNome(venda.clienteId),
          tipo: "receber",
          vencimento: venda.data,
          valor: total,
          status: pagamento === "À vista" ? "pago" : "pendente",
          vendaId: venda.id
        });

        saveData();
        closeModal();
        renderAll();
        toast("Venda registrada");
      });
    });
  }

  document.getElementById("btnNovaVenda").addEventListener("click", openVendaModal);
  document.getElementById("buscaVendas").addEventListener("input", function(e){ renderVendas(e.target.value); });
  document.getElementById("tblVendas").addEventListener("click", function(e){
    var delId = e.target.dataset.delVenda;
    if(delId){
      if(confirm("Excluir esta venda? O estoque não será restaurado automaticamente.")){
        state.vendas = state.vendas.filter(function(v){ return v.id !== delId; });
        state.contas = state.contas.filter(function(c){ return c.vendaId !== delId; });
        saveData(); renderAll(); toast("Venda excluída");
      }
    }
  });

  // ================= FINANCEIRO =================
  function renderFinanceiro(){
    var tbody = document.getElementById("tblContas");
    var list = state.contas.slice().sort(function(a,b){ return a.vencimento.localeCompare(b.vencimento); });
    if(list.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma conta lançada.</td></tr>';
    } else {
      tbody.innerHTML = list.map(function(c){
        var badge = c.status === "pago" ? '<span class="badge badge-ok">pago</span>' : '<span class="badge badge-warn">pendente</span>';
        return '<tr>' +
          '<td class="cell-strong">' + esc(c.descricao) + '</td>' +
          '<td>' + (c.tipo === "receber" ? "A receber" : "A pagar") + '</td>' +
          '<td>' + fmtDate(c.vencimento) + '</td>' +
          '<td>' + brl(c.valor) + '</td>' +
          '<td>' + badge + '</td>' +
          '<td class="cell-actions">' +
            (c.status === "pendente" ? '<button class="btn btn-ghost btn-sm" data-pay-conta="' + c.id + '">Marcar como pago</button>' : '') +
            '<button class="btn btn-danger btn-sm" data-del-conta="' + c.id + '">Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    }

    var receberPendente = sum(state.contas.filter(function(c){ return c.tipo === "receber" && c.status === "pendente"; }));
    var pagarPendente = sum(state.contas.filter(function(c){ return c.tipo === "pagar" && c.status === "pendente"; }));
    var pagoReceber = sum(state.contas.filter(function(c){ return c.tipo === "receber" && c.status === "pago"; }));
    var pagoPagar = sum(state.contas.filter(function(c){ return c.tipo === "pagar" && c.status === "pago"; }));

    document.getElementById("finReceberPendente").textContent = brl(receberPendente);
    document.getElementById("finPagarPendente").textContent = brl(pagarPendente);
    document.getElementById("kpiSaldoPrevisto").textContent = brl((pagoReceber - pagoPagar) + (receberPendente - pagarPendente));
  }

  function sum(arr){ return arr.reduce(function(s,c){ return s + Number(c.valor || 0); }, 0); }

  function contaForm(){
    return (
      '<div class="field"><label>Descrição</label><input id="fDescricao" placeholder="Ex: Aluguel, fornecedor..."></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Tipo</label><select id="fTipo"><option value="pagar">A pagar</option><option value="receber">A receber</option></select></div>' +
        '<div class="field"><label>Valor</label><input id="fValor" type="number" min="0" step="0.01"></div>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Vencimento</label><input id="fVencimento" type="date" value="' + todayISO() + '"></div>' +
        '<div class="field"><label>Status</label><select id="fStatus"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">Salvar</button></div>'
    );
  }

  document.getElementById("btnNovaConta").addEventListener("click", function(){
    openModal("Nova conta", contaForm(), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var descricao = body.querySelector("#fDescricao").value.trim();
        var valor = parseFloat(body.querySelector("#fValor").value) || 0;
        if(!descricao || valor <= 0){ toast("Preencha descrição e valor"); return; }
        state.contas.push({
          id: uid(),
          descricao: descricao,
          tipo: body.querySelector("#fTipo").value,
          valor: valor,
          vencimento: body.querySelector("#fVencimento").value || todayISO(),
          status: body.querySelector("#fStatus").value
        });
        saveData();
        closeModal();
        renderAll();
        toast("Conta lançada");
      });
    });
  });

  document.getElementById("tblContas").addEventListener("click", function(e){
    var payId = e.target.dataset.payConta;
    var delId = e.target.dataset.delConta;
    if(payId){
      var c = state.contas.find(function(c){ return c.id === payId; });
      if(c){ c.status = "pago"; saveData(); renderAll(); toast("Conta marcada como paga"); }
    }
    if(delId){
      if(confirm("Excluir esta conta?")){
        state.contas = state.contas.filter(function(c){ return c.id !== delId; });
        saveData(); renderAll(); toast("Conta excluída");
      }
    }
  });

  // ================= DASHBOARD =================
  function renderDashboard(){
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
    var vendasMes = state.vendas.filter(function(v){ return v.data.slice(0,7) === ym; });
    document.getElementById("kpiVendasMes").textContent = brl(sum(vendasMes.map(function(v){ return { valor: v.total }; })));
    document.getElementById("kpiVendasQtd").textContent = vendasMes.length + " vendas";

    var receberPendente = state.contas.filter(function(c){ return c.tipo === "receber" && c.status === "pendente"; });
    var pagarPendente = state.contas.filter(function(c){ return c.tipo === "pagar" && c.status === "pendente"; });
    document.getElementById("kpiReceber").textContent = brl(sum(receberPendente));
    document.getElementById("kpiReceberQtd").textContent = receberPendente.length + " pendentes";
    document.getElementById("kpiPagar").textContent = brl(sum(pagarPendente));
    document.getElementById("kpiPagarQtd").textContent = pagarPendente.length + " pendentes";

    var estoqueBaixo = state.produtos.filter(function(p){ return Number(p.estoque) <= Number(p.estoqueMinimo || 0); });
    document.getElementById("kpiEstoqueBaixo").textContent = estoqueBaixo.length;
    document.getElementById("kpiEstoqueTotal").textContent = "de " + state.produtos.length + " produtos";

    var ultimasVendas = state.vendas.slice().sort(function(a,b){ return b.data.localeCompare(a.data); }).slice(0,6);
    var tblU = document.getElementById("tblUltimasVendas");
    tblU.innerHTML = ultimasVendas.length === 0
      ? '<tr class="empty-row"><td colspan="4">Nenhuma venda registrada.</td></tr>'
      : ultimasVendas.map(function(v){
          return '<tr><td>' + fmtDate(v.data) + '</td><td>' + esc(clienteNome(v.clienteId)) + '</td><td>' + v.itens.length + ' item(ns)</td><td class="cell-strong">' + brl(v.total) + '</td></tr>';
        }).join("");

    var tblE = document.getElementById("tblEstoqueBaixo");
    tblE.innerHTML = estoqueBaixo.length === 0
      ? '<tr class="empty-row"><td colspan="3">Nenhum produto com estoque baixo.</td></tr>'
      : estoqueBaixo.map(function(p){
          return '<tr><td class="cell-strong">' + esc(p.nome) + '</td><td>' + p.estoque + '</td><td>' + (p.estoqueMinimo||0) + '</td></tr>';
        }).join("");
  }

  // ================= RENDER ALL =================
  function renderAll(){
    renderDashboard();
    renderClientes(document.getElementById("buscaClientes").value);
    renderProdutos(document.getElementById("buscaProdutos").value);
    renderVendas(document.getElementById("buscaVendas").value);
    renderFinanceiro();
  }

  renderAll();
})();
