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
      return '<tr>' +
        '<td class="cell-strong">' + esc(p.nome) + '</td>' +
        '<td>' + esc(p.categoria || "-") + '</td>' +
        '<td>' + brl(p.preco) + '</td>' +
        '<td>' + brl(p.custo) + '</td>' +
        '<td>' + p.estoque + '</td>' +
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
      '<div class="field"><label>Categoria</label><input id="fCategoria" value="' + esc(p.categoria||"") + '"></div>' +
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
          estoque: parseInt(body.querySelector("#fEstoque").value, 10) || 0
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

  // ---------- Detalhes de vendas (por período) ----------
  function diaAnterior(iso){
    var partes = iso.split("-").map(Number);
    var d = new Date(partes[0], partes[1] - 1, partes[2]);
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function filtrarVendasPorPeriodo(filtro, dataCustom){
    var hoje = todayISO();
    if(filtro === "data") return state.vendas.filter(function(v){ return v.data === (dataCustom || hoje); });
    if(filtro === "ontem") return state.vendas.filter(function(v){ return v.data === diaAnterior(hoje); });
    if(filtro === "mes") return state.vendas.filter(function(v){ return v.data.slice(0,7) === hoje.slice(0,7); });
    if(filtro === "ano") return state.vendas.filter(function(v){ return v.data.slice(0,4) === hoje.slice(0,4); });
    return state.vendas.filter(function(v){ return v.data === hoje; });
  }

  function vendasDetalheHtml(filtro, dataCustom){
    function chip(valor, label){
      return '<button type="button" class="btn btn-sm ' + (filtro === valor ? "btn-primary" : "btn-ghost") + '" data-vd-filtro="' + valor + '">' + label + '</button>';
    }
    return (
      '<div class="vd-filtros">' +
        chip("hoje", "Hoje") + chip("ontem", "Ontem") + chip("mes", "Este mês") + chip("ano", "Este ano") +
      '</div>' +
      '<div class="field"><label>Ou escolha um dia</label><input type="date" id="vdData" value="' + (dataCustom || todayISO()) + '"></div>' +
      '<div class="vd-lista-wrap table-wrap">' +
        '<table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Total</th></tr></thead><tbody id="vdTbody"></tbody></table>' +
      '</div>' +
      '<div class="venda-total"><span>Total do período</span><span id="vdTotalValor">R$ 0,00</span></div>' +
      '<div class="vd-pagamentos" id="vdPagamentos"></div>'
    );
  }

  var METODOS_PAGAMENTO = ["Dinheiro", "Cartão de crédito", "Cartão de débito", "Pix"];

  function resumoPorPagamento(lista){
    return METODOS_PAGAMENTO.map(function(m){
      var total = lista.filter(function(v){ return v.pagamento === m; }).reduce(function(s,v){ return s + v.total; }, 0);
      return { metodo: m, total: total };
    });
  }

  function pagamentosChipsHtml(lista){
    return resumoPorPagamento(lista).map(function(r){
      return '<div class="pgto-chip"><div class="pgto-chip-label">' + esc(r.metodo) + '</div><div class="pgto-chip-value">' + brl(r.total) + '</div></div>';
    }).join("");
  }

  function horaDaVenda(v){
    if(!v.criadoEm) return "-";
    var d = new Date(v.criadoEm);
    if(isNaN(d.getTime())) return "-";
    return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  }

  function abrirDetalhesVendas(){
    var estadoFiltro = { filtro: "hoje", data: todayISO() };

    openModal("Vendas", vendasDetalheHtml(estadoFiltro.filtro, estadoFiltro.data), function(body){
      function renderLista(){
        var lista = filtrarVendasPorPeriodo(estadoFiltro.filtro, estadoFiltro.data).sort(function(a,b){
          return (b.criadoEm || b.data).localeCompare(a.criadoEm || a.data);
        });
        var tbody = body.querySelector("#vdTbody");
        tbody.innerHTML = lista.length === 0
          ? '<tr class="empty-row"><td colspan="4">Nenhuma venda neste período.</td></tr>'
          : lista.map(function(v){
              return '<tr class="vd-row" data-vd-venda="' + v.id + '">' +
                '<td>' + fmtDate(v.data) + '</td>' +
                '<td>' + horaDaVenda(v) + '</td>' +
                '<td class="cell-strong">' + esc(clienteNome(v.clienteId)) + '</td>' +
                '<td class="cell-strong">' + brl(v.total) + '</td>' +
              '</tr>';
            }).join("");
        body.querySelector("#vdTotalValor").textContent = brl(lista.reduce(function(s,v){ return s + v.total; }, 0));
        body.querySelector("#vdPagamentos").innerHTML = pagamentosChipsHtml(lista);
      }

      function marcarChipAtivo(){
        body.querySelectorAll("[data-vd-filtro]").forEach(function(btn){
          btn.classList.toggle("btn-primary", btn.dataset.vdFiltro === estadoFiltro.filtro);
          btn.classList.toggle("btn-ghost", btn.dataset.vdFiltro !== estadoFiltro.filtro);
        });
      }

      body.querySelectorAll("[data-vd-filtro]").forEach(function(btn){
        btn.addEventListener("click", function(){
          estadoFiltro.filtro = btn.dataset.vdFiltro;
          marcarChipAtivo();
          renderLista();
        });
      });

      body.querySelector("#vdData").addEventListener("change", function(e){
        estadoFiltro.filtro = "data";
        estadoFiltro.data = e.target.value || todayISO();
        marcarChipAtivo();
        renderLista();
      });

      body.querySelector("#vdTbody").addEventListener("click", function(e){
        var row = e.target.closest("[data-vd-venda]");
        if(row) abrirDetalheVenda(row.dataset.vdVenda);
      });

      renderLista();
    });
  }

  function abrirDetalheVenda(vendaId){
    var v = state.vendas.find(function(x){ return x.id === vendaId; });
    if(!v) return;
    var itensHtml = v.itens.map(function(i){
      return '<div>' + i.qtd + 'x ' + esc(i.nome) + ' — ' + brl(i.precoUnit) + '</div>';
    }).join("");
    openModal("Detalhes da venda", (
      '<div class="venda-detalhe-linha"><span>Data</span><span>' + fmtDate(v.data) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Horário</span><span>' + horaDaVenda(v) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Cliente</span><span>' + esc(clienteNome(v.clienteId)) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Pagamento</span><span>' + esc(v.pagamento) + '</span></div>' +
      '<div class="venda-detalhe-itens">' + itensHtml + '</div>' +
      '<div class="venda-total"><span>Total</span><span>' + brl(v.total) + '</span></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnVoltarLista">Voltar</button><button class="btn btn-primary" id="btnFecharDetalhe">Fechar</button></div>'
    ), function(body){
      body.querySelector("#btnFecharDetalhe").addEventListener("click", closeModal);
      body.querySelector("#btnVoltarLista").addEventListener("click", abrirDetalhesVendas);
    });
  }

  document.getElementById("kpiCardVendas").addEventListener("click", function(e){
    if(e.target.closest(".kpi-eye")) return;
    abrirDetalhesVendas();
  });

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
          '<option value="Dinheiro">Dinheiro</option>' +
          '<option value="Cartão de crédito">Cartão de crédito</option>' +
          '<option value="Cartão de débito">Cartão de débito</option>' +
          '<option value="Pix">Pix</option>' +
          '<option value="A prazo">A prazo</option>' +
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
        var dataEscolhida = body.querySelector("#fData").value || todayISO();
        var clienteId = body.querySelector("#fCliente").value || null;

        function finalizarVenda(){
          var venda = {
            id: uid(),
            data: dataEscolhida,
            criadoEm: new Date().toISOString(),
            clienteId: clienteId,
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
            status: pagamento === "A prazo" ? "pendente" : "pago",
            vendaId: venda.id
          });

          saveData();
          closeModal();
          renderAll();
          toast("Venda registrada");
        }

        if(dataEscolhida !== todayISO()){
          pedirSenhaAdmin(finalizarVenda);
        } else {
          finalizarVenda();
        }
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

    var hoje = todayISO();
    var pendentes = state.contas.filter(function(c){ return c.status === "pendente"; });
    var vencidas = sum(pendentes.filter(function(c){ return c.vencimento < hoje; }));
    var vencemHoje = sum(pendentes.filter(function(c){ return c.vencimento === hoje; }));
    var aVencer = sum(pendentes.filter(function(c){ return c.vencimento > hoje; }));
    document.getElementById("finVencidas").textContent = brl(vencidas);
    document.getElementById("finVencemHoje").textContent = brl(vencemHoje);
    document.getElementById("finAVencer").textContent = brl(aVencer);

    var vendasHoje = state.vendas.filter(function(v){ return v.data === hoje; });
    document.getElementById("finVendasHojeTotal").textContent = brl(vendasHoje.reduce(function(s,v){ return s + v.total; }, 0));
    document.getElementById("finVendasHojePagamentos").innerHTML = pagamentosChipsHtml(vendasHoje);
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
  // Estado só de sessão (não é salvo): a cada carregamento/atualização da
  // página os valores voltam a ficar ocultos por padrão. Os KPIs (Vendas,
  // Despesas, Total da loja) só precisam de um clique; os gráficos exigem
  // a senha de admin para revelar.
  var kpiVisiveis = false;
  var graficosVisiveis = false;
  var ADMIN_CODE = "1518";
  var EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-3.1 4.1M6.5 6.6C3.4 8.5 1.5 12 1.5 12S5 19 12 19a10.6 10.6 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function pedirSenhaAdmin(onSuccess){
    openModal("Área protegida", (
      '<div class="field"><label>Senha</label><input id="fSenhaAdmin" type="password" inputmode="numeric" placeholder="Digite a senha"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnConfirmarSenha">Confirmar</button></div>'
    ), function(body){
      var input = body.querySelector("#fSenhaAdmin");
      input.focus();
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      function tentar(){
        if(input.value === ADMIN_CODE){
          closeModal();
          onSuccess();
        } else {
          toast("Senha incorreta");
        }
      }
      body.querySelector("#btnConfirmarSenha").addEventListener("click", tentar);
      input.addEventListener("keydown", function(e){ if(e.key === "Enter") tentar(); });
    });
  }

  function toggleKpiVisiveis(){
    kpiVisiveis = !kpiVisiveis;
    renderDashboard();
  }
  document.getElementById("eyeVendas").addEventListener("click", toggleKpiVisiveis);
  document.getElementById("eyeDespesas").addEventListener("click", toggleKpiVisiveis);
  document.getElementById("eyeTotalLoja").addEventListener("click", toggleKpiVisiveis);

  function toggleGraficosVisiveis(){
    if(graficosVisiveis){
      graficosVisiveis = false;
      renderGraficos();
    } else {
      pedirSenhaAdmin(function(){
        graficosVisiveis = true;
        renderGraficos();
      });
    }
  }
  document.getElementById("eyeGraficoVD").addEventListener("click", toggleGraficosVisiveis);
  document.getElementById("eyeGraficoCresc").addEventListener("click", toggleGraficosVisiveis);

  // ---------- Gráficos mensais (SVG, sem dependências) ----------
  var MESES_ABREV = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

  function ultimosMeses(n){
    var out = [];
    var now = new Date();
    for(var i = n - 1; i >= 0; i--){
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        ym: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
        label: MESES_ABREV[d.getMonth()] + "/" + String(d.getFullYear()).slice(2)
      });
    }
    return out;
  }

  function totaisMensais(){
    return ultimosMeses(6).map(function(m){
      var vendasMes = sum(state.vendas.filter(function(v){ return v.data.slice(0,7) === m.ym; }).map(function(v){ return { valor: v.total }; }));
      var despesasMes = sum(state.contas.filter(function(c){ return c.tipo === "pagar" && c.vencimento.slice(0,7) === m.ym; }));
      return { label: m.label, vendas: vendasMes, despesas: despesasMes, cresc: vendasMes - despesasMes };
    });
  }

  function buildTrendChartSVG(labels, valores, opts){
    opts = opts || {};
    var w = 300, h = 150;
    var padL = 6, padR = 6, padTop = 10, padBottom = 20;
    var chartW = w - padL - padR;
    var chartH = h - padTop - padBottom;
    var n = labels.length;
    var slot = chartW / n;
    var barW = Math.min(28, slot * 0.5);
    var maxVal = Math.max.apply(null, valores.map(function(v){ return Math.abs(v); }).concat([1]));
    var bipolar = !!opts.bipolar;
    var baselineY = bipolar ? (padTop + chartH / 2) : (padTop + chartH);
    var half = bipolar ? chartH / 2 : chartH;

    var bars = "", points = [], labelsSvg = "";
    for(var i = 0; i < n; i++){
      var v = valores[i];
      var cx = padL + slot * i + slot / 2;
      var y = baselineY - (v / maxVal) * half;
      var barTop = Math.min(y, baselineY);
      var barH = Math.max(1, Math.abs(y - baselineY));
      var color = opts.colorFn ? opts.colorFn(v) : opts.color;
      bars += '<rect class="chart-bar" x="' + (cx - barW/2).toFixed(1) + '" y="' + barTop.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="2" fill="' + color + '"><title>' + esc(labels[i]) + ": " + brl(v) + '</title></rect>';
      points.push([cx, y]);
      labelsSvg += '<text class="chart-axis-label" x="' + cx.toFixed(1) + '" y="' + (h - 5) + '" text-anchor="middle">' + esc(labels[i]) + '</text>';
    }

    var linePath = points.map(function(p, idx){ return (idx === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var dots = points.map(function(p){ return '<circle class="chart-trend-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2"></circle>'; }).join("");
    var baseline = bipolar ? ('<line class="chart-baseline" x1="' + padL + '" y1="' + baselineY.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + baselineY.toFixed(1) + '"></line>') : "";

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' +
      baseline + bars +
      '<path class="chart-trend-line" d="' + linePath + '"></path>' +
      dots + labelsSvg +
      '</svg>';
  }

  function buildGroupedBarChartSVG(labels, seriesA, seriesB, colorA, colorB){
    var w = 300, h = 150;
    var padL = 6, padR = 6, padTop = 10, padBottom = 20;
    var chartW = w - padL - padR;
    var chartH = h - padTop - padBottom;
    var n = labels.length;
    var slot = chartW / n;
    var barW = Math.min(13, slot * 0.28);
    var gap = 2;
    var maxVal = Math.max.apply(null, seriesA.concat(seriesB).map(Math.abs).concat([1]));
    var baselineY = padTop + chartH;

    var bars = "", labelsSvg = "";
    for(var i = 0; i < n; i++){
      var cx = padL + slot * i + slot / 2;
      var hA = Math.max(1, (seriesA[i] / maxVal) * chartH);
      var hB = Math.max(1, (seriesB[i] / maxVal) * chartH);
      var xA = cx - gap/2 - barW;
      var xB = cx + gap/2;
      bars += '<rect class="chart-bar" x="' + xA.toFixed(1) + '" y="' + (baselineY - hA).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + hA.toFixed(1) + '" rx="2" fill="' + colorA + '"><title>' + esc(labels[i]) + " — Vendas: " + brl(seriesA[i]) + '</title></rect>';
      bars += '<rect class="chart-bar" x="' + xB.toFixed(1) + '" y="' + (baselineY - hB).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + hB.toFixed(1) + '" rx="2" fill="' + colorB + '"><title>' + esc(labels[i]) + " — Despesas: " + brl(seriesB[i]) + '</title></rect>';
      labelsSvg += '<text class="chart-axis-label" x="' + cx.toFixed(1) + '" y="' + (h - 5) + '" text-anchor="middle">' + esc(labels[i]) + '</text>';
    }

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + bars + labelsSvg + '</svg>';
  }

  function renderGraficos(){
    [document.getElementById("eyeGraficoVD"), document.getElementById("eyeGraficoCresc")].forEach(function(btn){
      btn.innerHTML = graficosVisiveis ? EYE_OPEN_SVG : EYE_OFF_SVG;
      btn.setAttribute("aria-pressed", graficosVisiveis ? "true" : "false");
      btn.setAttribute("aria-label", graficosVisiveis ? "Ocultar gráfico" : "Mostrar gráfico");
      btn.title = graficosVisiveis ? "Ocultar gráfico" : "Mostrar gráfico";
    });

    if(!graficosVisiveis){
      var lockedHtml = '<div class="chart-locked">' + LOCK_SVG + '<span>Protegido — clique no olho para ver</span></div>';
      document.getElementById("chartVendasDespesas").innerHTML = lockedHtml;
      document.getElementById("chartCrescimento").innerHTML = lockedHtml;
      return;
    }

    var dados = totaisMensais();
    var labels = dados.map(function(d){ return d.label; });

    document.getElementById("chartVendasDespesas").innerHTML = buildGroupedBarChartSVG(
      labels,
      dados.map(function(d){ return d.vendas; }),
      dados.map(function(d){ return d.despesas; }),
      "var(--ok)", "var(--danger)"
    );
    document.getElementById("chartCrescimento").innerHTML = buildTrendChartSVG(
      labels, dados.map(function(d){ return d.cresc; }),
      { bipolar: true, colorFn: function(v){ return v >= 0 ? "var(--ok)" : "var(--danger)"; } }
    );
  }

  function renderDashboard(){
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
    var vendasMes = state.vendas.filter(function(v){ return v.data.slice(0,7) === ym; });
    var totalVendas = sum(vendasMes.map(function(v){ return { valor: v.total }; }));
    document.getElementById("kpiVendasMes").textContent = kpiVisiveis ? brl(totalVendas) : "R$ ••••";
    document.getElementById("kpiVendasQtd").textContent = vendasMes.length + " vendas";

    var pagarPendente = state.contas.filter(function(c){ return c.tipo === "pagar" && c.status === "pendente"; });
    document.getElementById("kpiPagar").textContent = kpiVisiveis ? brl(sum(pagarPendente)) : "R$ ••••";
    document.getElementById("kpiPagarQtd").textContent = pagarPendente.length + " pendentes";

    var totalVendasGeral = sum(state.vendas.map(function(v){ return { valor: v.total }; }));
    var totalDespesasGeral = sum(state.contas.filter(function(c){ return c.tipo === "pagar"; }));
    var totalLoja = totalVendasGeral - totalDespesasGeral;
    var totalLojaEl = document.getElementById("kpiTotalLoja");
    totalLojaEl.textContent = kpiVisiveis ? brl(totalLoja) : "R$ ••••";
    totalLojaEl.classList.remove("kpi-value-green", "kpi-value-red");
    if(kpiVisiveis) totalLojaEl.classList.add(totalLoja >= 0 ? "kpi-value-green" : "kpi-value-red");

    [document.getElementById("eyeVendas"), document.getElementById("eyeDespesas"), document.getElementById("eyeTotalLoja")].forEach(function(btn){
      btn.innerHTML = kpiVisiveis ? EYE_OPEN_SVG : EYE_OFF_SVG;
      btn.setAttribute("aria-pressed", kpiVisiveis ? "true" : "false");
      btn.setAttribute("aria-label", kpiVisiveis ? "Ocultar valor" : "Mostrar valor");
      btn.title = kpiVisiveis ? "Ocultar valor" : "Mostrar valor";
    });

    var ultimasVendas = state.vendas.slice().sort(function(a,b){ return b.data.localeCompare(a.data); }).slice(0,6);
    var tblU = document.getElementById("tblUltimasVendas");
    tblU.innerHTML = ultimasVendas.length === 0
      ? '<tr class="empty-row"><td colspan="4">Nenhuma venda registrada.</td></tr>'
      : ultimasVendas.map(function(v){
          return '<tr><td>' + fmtDate(v.data) + '</td><td>' + esc(clienteNome(v.clienteId)) + '</td><td>' + v.itens.length + ' item(ns)</td><td class="cell-strong">' + brl(v.total) + '</td></tr>';
        }).join("");

    renderGraficos();
  }

  // ================= RENDER ALL =================
  function renderAll(){
    renderDashboard();
    renderClientes(document.getElementById("buscaClientes").value);
    renderProdutos(document.getElementById("buscaProdutos").value);
    renderVendas(document.getElementById("buscaVendas").value);
    renderFinanceiro();
  }

  // ================= EXPORTAR / IMPORTAR =================
  async function exportarDados(){
    var json = JSON.stringify(state, null, 2);
    var filename = "gestao-simples-dados-" + todayISO() + ".json";
    if(window.claude && typeof window.claude.use === "function"){
      try{
        var downloadsApi = await window.claude.use("downloads");
        if(downloadsApi){
          await downloadsApi.save({ filename: filename, data: json });
          toast("Dados exportados");
          return;
        }
      }catch(e){ /* cai no fallback abaixo */ }
    }
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Dados exportados");
  }

  function importarDados(file){
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var parsed = JSON.parse(reader.result);
        if(!parsed || typeof parsed !== "object") throw new Error("formato inválido");
        state = Object.assign(structuredClone(DEFAULT_DATA), parsed);
        saveData();
        renderAll();
        toast("Dados importados");
      }catch(e){
        toast("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  }

  document.getElementById("btnExportar").addEventListener("click", exportarDados);
  document.getElementById("btnImportar").addEventListener("click", function(){
    if(confirm("Importar vai substituir todos os dados atuais. Continuar?")){
      document.getElementById("importFileInput").click();
    }
  });
  document.getElementById("importFileInput").addEventListener("change", function(e){
    var file = e.target.files[0];
    if(file) importarDados(file);
    e.target.value = "";
  });

  renderAll();
})();
