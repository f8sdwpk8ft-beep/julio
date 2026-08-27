(function(){
  "use strict";

  var STORAGE_KEY = "gestao-simples-data-v1";

  var DEFAULT_DATA = { clientes: [], produtos: [], vendas: [], contas: [], assistencias: [], naturezas: ["Aluguel", "Fornecedores", "Salários", "Outros"], categorias: ["Produtos", "Assistência Técnica"], vendedores: [], comissaoPercentual: 2, nomeLoja: "" };

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
  function openModal(title, bodyHtml, onMount, opts){
    opts = opts || {};
    modalRoot.innerHTML =
      '<div class="modal-backdrop" id="modalBackdrop">' +
        '<div class="modal' + (opts.large ? " modal-lg" : "") + '">' +
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

  // ---------- Campos numéricos: some o "0" ao focar, pra digitar direto ----------
  document.addEventListener("focusin", function(e){
    if(e.target.tagName === "INPUT" && e.target.type === "number" && e.target.value === "0"){
      e.target.value = "";
    }
  });

  // ---------- Navigation ----------
  var views = ["dashboard","vendas","assistencia","produtos","clientes","financeiro","admin"];
  var titles = { dashboard:"Dashboard", vendas:"Vendas", assistencia:"Assistência Técnica", produtos:"Produtos", clientes:"Clientes", financeiro:"Financeiro", admin:"Admin" };
  var adminDesbloqueado = false;

  function mostrarView(name){
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

  function showView(name){
    if(name === "admin" && !adminDesbloqueado){
      pedirSenhaAdmin(function(){
        adminDesbloqueado = true;
        mostrarView("admin");
      });
      return;
    }
    mostrarView(name);
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
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum cliente cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(c){
      return '<tr>' +
        '<td class="cell-strong">' + esc(c.nome) + '</td>' +
        '<td>' + esc(c.cpf || c.cnpj || "-") + '</td>' +
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
        '<div class="field"><label>CPF</label><input id="fCpf" value="' + esc(cliente.cpf||"") + '" placeholder="000.000.000-00"></div>' +
        '<div class="field"><label>CNPJ</label><input id="fCnpj" value="' + esc(cliente.cnpj||"") + '" placeholder="00.000.000/0000-00"></div>' +
      '</div>' +
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
          cpf: body.querySelector("#fCpf").value.trim(),
          cnpj: body.querySelector("#fCnpj").value.trim(),
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
        '<td>' + (custoVisivel ? brl(p.custo) : '<span class="valor-oculto">R$ &bull;&bull;&bull;&bull;</span>') + '</td>' +
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
      '<div class="field"><label>Categoria</label><div style="display:flex;gap:0.4rem;">' +
        '<select id="fCategoria" style="flex:1;">' + categoriaOptionsHtml(p.categoria) + '</select>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnNovaCategoria" title="Adicionar categoria">+</button>' +
      '</div></div>' +
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
      body.querySelector("#btnNovaCategoria").addEventListener("click", function(){
        var nome = prompt("Nome da nova categoria:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        if(state.categorias.indexOf(nome) === -1){
          state.categorias.push(nome);
          saveData();
        }
        body.querySelector("#fCategoria").innerHTML = categoriaOptionsHtml(nome);
      });
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
  var vendasRangeInicio = null;
  var vendasRangeFim = null;

  function renderVendas(filter){
    var tbody = document.getElementById("tblVendas");
    var filterLower = (filter || "").toLowerCase();
    var list = state.vendas.slice().sort(function(a,b){ return b.data.localeCompare(a.data); }).filter(function(v){
      if(vendasRangeInicio && v.data < vendasRangeInicio) return false;
      if(vendasRangeFim && v.data > vendasRangeFim) return false;
      if(!filterLower) return true;
      var nome = clienteNome(v.clienteId).toLowerCase();
      if(nome.indexOf(filterLower) !== -1) return true;
      return v.itens.some(function(i){ return i.nome.toLowerCase().indexOf(filterLower) !== -1; });
    });
    if(list.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma venda encontrada.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(v){
      var itensResumo = v.itens.map(function(i){ return i.qtd + "x " + i.nome; }).join(", ");
      return '<tr' + (v.devolvida ? ' class="linha-devolvida"' : '') + '>' +
        '<td>' + fmtDate(v.data) + '</td>' +
        '<td class="cell-strong">' + esc(clienteNome(v.clienteId)) + selosVenda(v) + '</td>' +
        '<td>' + esc(itensResumo) + '</td>' +
        '<td>' + esc(pagamentoResumoLabel(v)) + '</td>' +
        '<td class="cell-strong">' + brl(v.total) + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-ghost btn-sm btn-icon" data-print-venda="' + v.id + '" title="Imprimir recibo">' + PRINT_SVG + '</button>' +
          '<button class="btn btn-ghost btn-sm" data-edit-venda="' + v.id + '">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-del-venda="' + v.id + '">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  function clienteNome(id){
    if(!id) return "Consumidor";
    var c = state.clientes.find(function(c){ return c.id === id; });
    return c ? c.nome : "Consumidor";
  }

  // ---------- Detalhes de vendas (por período) ----------
  function diaAnterior(iso){
    var partes = iso.split("-").map(Number);
    var d = new Date(partes[0], partes[1] - 1, partes[2]);
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  function filtrarVendasPorPeriodo(filtro, dataCustom, rangeInicio, rangeFim){
    var hoje = todayISO();
    var base = vendasAtivas();
    if(filtro === "data") return base.filter(function(v){ return v.data === (dataCustom || hoje); });
    if(filtro === "ontem") return base.filter(function(v){ return v.data === diaAnterior(hoje); });
    if(filtro === "mes") return base.filter(function(v){ return v.data.slice(0,7) === hoje.slice(0,7); });
    if(filtro === "ano") return base.filter(function(v){ return v.data.slice(0,4) === hoje.slice(0,4); });
    if(filtro === "custom") return base.filter(function(v){ return v.data >= rangeInicio && v.data <= rangeFim; });
    if(filtro === "tudo") return base.slice();
    return base.filter(function(v){ return v.data === hoje; });
  }

  function filtrarDespesasPorPeriodo(filtro, rangeInicio, rangeFim){
    var todasPagar = state.contas.filter(function(c){ return c.tipo === "pagar"; });
    var hoje = todayISO();
    if(filtro === "hoje" || filtro === "data") return todasPagar.filter(function(c){ return c.vencimento === hoje; });
    if(filtro === "mes") return todasPagar.filter(function(c){ return c.vencimento.slice(0,7) === hoje.slice(0,7); });
    if(filtro === "ano") return todasPagar.filter(function(c){ return c.vencimento.slice(0,4) === hoje.slice(0,4); });
    if(filtro === "custom") return todasPagar.filter(function(c){ return c.vencimento >= rangeInicio && c.vencimento <= rangeFim; });
    return todasPagar;
  }

  function vendasDetalheHtml(filtro, dataCustom){
    function chip(valor, label){
      return '<button type="button" class="btn btn-sm ' + (filtro === valor ? "btn-primary" : "btn-ghost") + '" data-vd-filtro="' + valor + '">' + label + '</button>';
    }
    return (
      '<div class="vd-filtros">' +
        chip("hoje", "Hoje") + chip("ontem", "Ontem") + chip("mes", "Este mês") + chip("ano", "Este ano") + chip("tudo", "Todo o histórico") +
      '</div>' +
      '<div class="field"><label>Ou escolha um dia</label><input type="date" id="vdData" value="' + (dataCustom || todayISO()) + '"></div>' +
      '<div class="vd-lista-wrap table-wrap">' +
        '<table><thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Total</th></tr></thead><tbody id="vdTbody"></tbody></table>' +
      '</div>' +
      '<div class="vd-total-destaque">' +
        '<div class="kpi-label">Total do período</div>' +
        '<div class="kpi-value kpi-value-lg kpi-value-green" id="vdTotalValor">R$ 0,00</div>' +
      '</div>' +
      '<div class="vd-pagamentos" id="vdPagamentos"></div>'
    );
  }

  var METODOS_PAGAMENTO = ["Dinheiro", "Cartão de crédito", "Cartão de débito", "Pix"];
  var FORMAS_PAGAMENTO_VENDA = METODOS_PAGAMENTO.concat(["Pagamento futuro"]);

  function normalizarFormaPagamento(forma){
    return forma === "A prazo" ? "Pagamento futuro" : forma;
  }

  // Normaliza qualquer venda (antiga ou nova) para uma lista de linhas {forma, valor},
  // permitindo pagamento dividido entre várias formas sem quebrar vendas já salvas.
  function linhasPagamento(v){
    if(v.pagamentos && v.pagamentos.length){
      return v.pagamentos.map(function(l){ return { forma: normalizarFormaPagamento(l.forma), valor: l.valor }; });
    }
    return [{ forma: normalizarFormaPagamento(v.pagamento || "Dinheiro"), valor: v.total }];
  }

  function pagamentoResumoLabel(v){
    var linhas = linhasPagamento(v);
    if(linhas.length <= 1) return linhas[0] ? linhas[0].forma : "-";
    return "Dividido (" + linhas.length + " formas)";
  }

  function selosVenda(v){
    return (v.assistencia ? ' <span class="badge badge-muted">Assistência</span>' : "") +
           (v.devolvida ? ' <span class="badge badge-danger">Devolvida</span>' : "");
  }

  // Vendas devolvidas continuam no histórico, mas saem de todo cálculo
  // (caixa, fechamentos, comissões e gráficos).
  function vendasAtivas(){
    return state.vendas.filter(function(v){ return !v.devolvida; });
  }

  function resumoPorPagamento(lista){
    return METODOS_PAGAMENTO.concat(["Pagamento futuro"]).map(function(m){
      var total = 0;
      lista.forEach(function(v){
        linhasPagamento(v).forEach(function(l){ if(l.forma === m) total += l.valor; });
      });
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

  function abrirDetalhesVendas(filtroInicial){
    // Também é usada como callback de clique, então só aceita filtro em texto.
    var filtro = typeof filtroInicial === "string" ? filtroInicial : "hoje";
    var estadoFiltro = { filtro: filtro, data: todayISO() };

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
    }, { large: true });
  }

  function abrirDetalheVenda(vendaId){
    var v = state.vendas.find(function(x){ return x.id === vendaId; });
    if(!v) return;
    var itensHtml = v.itens.map(function(i){
      return '<div>' + i.qtd + 'x ' + esc(i.nome) + ' — ' + brl(i.precoUnit) + '</div>';
    }).join("");
    var linhas = linhasPagamento(v);
    var pagamentoHtml = linhas.length === 1
      ? esc(linhas[0].forma)
      : linhas.map(function(l){ return esc(l.forma) + ": " + brl(l.valor); }).join(" · ");
    var vendedorLinha = v.vendedor ? '<div class="venda-detalhe-linha"><span>Vendedor</span><span>' + esc(v.vendedor) + '</span></div>' : "";
    var descontoLinha = v.desconto ? '<div class="venda-detalhe-linha"><span>Desconto</span><span>- ' + brl(v.desconto) + '</span></div>' : "";
    var assistLinha = v.assistencia ? '<div class="venda-detalhe-linha"><span>Origem</span><span><span class="badge badge-muted">Assistência Técnica</span></span></div>' : "";
    openModal("Detalhes da venda", (
      '<div class="venda-detalhe-linha"><span>Data</span><span>' + fmtDate(v.data) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Horário</span><span>' + horaDaVenda(v) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Cliente</span><span>' + esc(clienteNome(v.clienteId)) + '</span></div>' +
      assistLinha +
      vendedorLinha +
      '<div class="venda-detalhe-linha"><span>Pagamento</span><span>' + pagamentoHtml + '</span></div>' +
      '<div class="venda-detalhe-itens">' + itensHtml + '</div>' +
      descontoLinha +
      '<div class="venda-total"><span>Total</span><span>' + brl(v.total) + '</span></div>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="btnImprimirRecibo">' + PRINT_SVG + ' Imprimir recibo</button>' +
        '<button class="btn btn-ghost" id="btnVoltarLista">Voltar</button>' +
        '<button class="btn btn-primary" id="btnFecharDetalhe">Fechar</button>' +
      '</div>'
    ), function(body){
      body.querySelector("#btnFecharDetalhe").addEventListener("click", closeModal);
      body.querySelector("#btnVoltarLista").addEventListener("click", abrirDetalhesVendas);
      body.querySelector("#btnImprimirRecibo").addEventListener("click", function(){ imprimirRecibo(v.id); });
    });
  }

  function imprimirRecibo(vendaId){
    var v = state.vendas.find(function(x){ return x.id === vendaId; });
    if(!v) return;
    var linhas = linhasPagamento(v);
    var subtotal = v.itens.reduce(function(s,i){ return s + i.qtd * i.precoUnit; }, 0);

    var itensHtml = v.itens.map(function(i){
      return '<div class="recibo-item">' +
        '<span>' + i.qtd + 'x ' + esc(i.nome) + '</span>' +
        '<span>' + brl(i.qtd * i.precoUnit) + '</span>' +
      '</div>';
    }).join("");

    var pagamentosHtml = linhas.map(function(l){
      return '<div class="recibo-linha"><span>' + esc(l.forma) + '</span><span>' + brl(l.valor) + '</span></div>';
    }).join("");

    var html =
      '<div class="recibo-loja">' + esc(state.nomeLoja || "Minha Loja") + '</div>' +
      '<div class="recibo-sub">Recibo de venda</div>' +
      '<div class="recibo-divisor"></div>' +
      '<div class="recibo-linha"><span>Data</span><span>' + fmtDate(v.data) + ' ' + horaDaVenda(v) + '</span></div>' +
      '<div class="recibo-linha"><span>Cliente</span><span>' + esc(clienteNome(v.clienteId)) + '</span></div>' +
      (v.vendedor ? '<div class="recibo-linha"><span>Vendedor</span><span>' + esc(v.vendedor) + '</span></div>' : "") +
      '<div class="recibo-divisor"></div>' +
      itensHtml +
      '<div class="recibo-divisor"></div>' +
      '<div class="recibo-linha"><span>Subtotal</span><span>' + brl(subtotal) + '</span></div>' +
      (v.desconto ? '<div class="recibo-linha"><span>Desconto</span><span>- ' + brl(v.desconto) + '</span></div>' : "") +
      '<div class="recibo-linha recibo-total"><span>Total</span><span>' + brl(v.total) + '</span></div>' +
      '<div class="recibo-divisor"></div>' +
      '<div class="recibo-pagamentos-titulo">Forma de pagamento</div>' +
      pagamentosHtml +
      '<div class="recibo-rodape">Obrigado pela preferência!</div>';

    document.getElementById("reciboImprimir").innerHTML = html;
    window.print();
  }

  document.getElementById("kpiCardVendas").addEventListener("click", function(e){
    if(e.target.closest(".kpi-eye")) return;
    abrirDetalhesVendas();
  });

  function abrirTotalVendas(){
    var estadoFiltro = { filtro: "mes", data: todayISO() };

    openModal("Total de vendas", vendasDetalheHtml(estadoFiltro.filtro, estadoFiltro.data), function(body){
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
    }, { large: true });
  }

  document.getElementById("kpiCardTotal").addEventListener("click", function(e){
    if(e.target.closest(".kpi-eye")) return;
    abrirTotalVendas();
  });

  // ---------- Detalhes de despesas (por período) ----------
  function filtrarDespesasPorPeriodo(filtro, dataCustom){
    var despesas = state.contas.filter(function(c){ return c.tipo === "pagar"; });
    var hoje = todayISO();
    if(filtro === "data") return despesas.filter(function(c){ return c.vencimento === (dataCustom || hoje); });
    if(filtro === "ontem") return despesas.filter(function(c){ return c.vencimento === diaAnterior(hoje); });
    if(filtro === "mes") return despesas.filter(function(c){ return c.vencimento.slice(0,7) === hoje.slice(0,7); });
    if(filtro === "ano") return despesas.filter(function(c){ return c.vencimento.slice(0,4) === hoje.slice(0,4); });
    return despesas.filter(function(c){ return c.vencimento === hoje; });
  }

  function resumoPorNatureza(lista){
    var mapa = {};
    lista.forEach(function(c){
      var nat = c.natureza || "Sem natureza";
      mapa[nat] = (mapa[nat] || 0) + Number(c.valor || 0);
    });
    return Object.keys(mapa).map(function(k){ return { natureza: k, total: mapa[k] }; });
  }

  function naturezaChipsHtml(lista){
    var resumo = resumoPorNatureza(lista);
    if(resumo.length === 0) return "";
    return resumo.map(function(r){
      return '<div class="pgto-chip"><div class="pgto-chip-label">' + esc(r.natureza) + '</div><div class="pgto-chip-value">' + brl(r.total) + '</div></div>';
    }).join("");
  }

  function despesasDetalheHtml(filtro, dataCustom){
    function chip(valor, label){
      return '<button type="button" class="btn btn-sm ' + (filtro === valor ? "btn-primary" : "btn-ghost") + '" data-dd-filtro="' + valor + '">' + label + '</button>';
    }
    return (
      '<div class="vd-filtros">' +
        chip("hoje", "Hoje") + chip("ontem", "Ontem") + chip("mes", "Este mês") + chip("ano", "Este ano") +
      '</div>' +
      '<div class="field"><label>Ou escolha um dia</label><input type="date" id="ddData" value="' + (dataCustom || todayISO()) + '"></div>' +
      '<div class="vd-lista-wrap table-wrap">' +
        '<table><thead><tr><th>Vencimento</th><th>Descrição</th><th>Natureza</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody id="ddTbody"></tbody></table>' +
      '</div>' +
      '<div class="vd-total-destaque">' +
        '<div class="kpi-label">Total do período</div>' +
        '<div class="kpi-value kpi-value-lg kpi-value-red" id="ddTotalValor">R$ 0,00</div>' +
      '</div>' +
      '<div class="vd-pagamentos" id="ddNaturezas"></div>'
    );
  }

  function abrirDetalhesDespesas(){
    var estadoFiltro = { filtro: "mes", data: todayISO() };

    openModal("Despesas", despesasDetalheHtml(estadoFiltro.filtro, estadoFiltro.data), function(body){
      function renderLista(){
        var lista = filtrarDespesasPorPeriodo(estadoFiltro.filtro, estadoFiltro.data).sort(function(a,b){
          return b.vencimento.localeCompare(a.vencimento);
        });
        var tbody = body.querySelector("#ddTbody");
        tbody.innerHTML = lista.length === 0
          ? '<tr class="empty-row"><td colspan="5">Nenhuma despesa neste período.</td></tr>'
          : lista.map(function(c){
              return '<tr class="vd-row" data-dd-conta="' + c.id + '">' +
                '<td>' + fmtDate(c.vencimento) + '</td>' +
                '<td class="cell-strong">' + esc(c.descricao) + '</td>' +
                '<td>' + esc(c.natureza || "-") + '</td>' +
                '<td>' + esc(c.formaPagamento || "-") + '</td>' +
                '<td class="cell-strong">' + brl(c.valor) + '</td>' +
              '</tr>';
            }).join("");
        body.querySelector("#ddTotalValor").textContent = brl(lista.reduce(function(s,c){ return s + Number(c.valor||0); }, 0));
        body.querySelector("#ddNaturezas").innerHTML = naturezaChipsHtml(lista);
      }

      function marcarChipAtivo(){
        body.querySelectorAll("[data-dd-filtro]").forEach(function(btn){
          btn.classList.toggle("btn-primary", btn.dataset.ddFiltro === estadoFiltro.filtro);
          btn.classList.toggle("btn-ghost", btn.dataset.ddFiltro !== estadoFiltro.filtro);
        });
      }

      body.querySelectorAll("[data-dd-filtro]").forEach(function(btn){
        btn.addEventListener("click", function(){
          estadoFiltro.filtro = btn.dataset.ddFiltro;
          marcarChipAtivo();
          renderLista();
        });
      });

      body.querySelector("#ddData").addEventListener("change", function(e){
        estadoFiltro.filtro = "data";
        estadoFiltro.data = e.target.value || todayISO();
        marcarChipAtivo();
        renderLista();
      });

      body.querySelector("#ddTbody").addEventListener("click", function(e){
        var row = e.target.closest("[data-dd-conta]");
        if(row) abrirDetalheDespesa(row.dataset.ddConta);
      });

      renderLista();
    }, { large: true });
  }

  function abrirDetalheDespesa(contaId){
    var c = state.contas.find(function(x){ return x.id === contaId; });
    if(!c) return;
    var badge = c.status === "pago" ? '<span class="badge badge-ok">pago</span>' : '<span class="badge badge-warn">pendente</span>';
    openModal("Detalhes da despesa", (
      '<div class="venda-detalhe-linha"><span>Descrição</span><span>' + esc(c.descricao) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Vencimento</span><span>' + fmtDate(c.vencimento) + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Natureza</span><span>' + esc(c.natureza || "-") + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Forma de pagamento</span><span>' + esc(c.formaPagamento || "-") + '</span></div>' +
      '<div class="venda-detalhe-linha"><span>Status</span><span>' + badge + '</span></div>' +
      '<div class="venda-total"><span>Valor</span><span>' + brl(c.valor) + '</span></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnVoltarLista">Voltar</button><button class="btn btn-primary" id="btnFecharDetalhe">Fechar</button></div>'
    ), function(body){
      body.querySelector("#btnFecharDetalhe").addEventListener("click", closeModal);
      body.querySelector("#btnVoltarLista").addEventListener("click", abrirDetalhesDespesas);
    });
  }

  document.getElementById("kpiCardDespesas").addEventListener("click", function(e){
    if(e.target.closest(".kpi-eye")) return;
    abrirDetalhesDespesas();
  });

  document.getElementById("kpiCardDespesasTotal").addEventListener("click", function(e){
    if(e.target.closest(".kpi-eye")) return;
    abrirDetalhesDespesas();
  });

  function abrirVendasHoje(){
    var hoje = todayISO();
    var vendasHoje = vendasAtivas().filter(function(v){ return v.data === hoje; });

    openModal("Vendas de hoje", vendasDetalheHtml("data", hoje), function(body){
      function renderLista(){
        var lista = vendasHoje.sort(function(a,b){
          return (b.criadoEm || b.data).localeCompare(a.criadoEm || a.data);
        });
        var tbody = body.querySelector("#vdTbody");
        tbody.innerHTML = lista.length === 0
          ? '<tr class="empty-row"><td colspan="4">Nenhuma venda hoje.</td></tr>'
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

      body.querySelector("#vdTbody").addEventListener("click", function(e){
        var row = e.target.closest("[data-vd-venda]");
        if(row) abrirDetalheVenda(row.dataset.vdVenda);
      });

      renderLista();
    }, { large: true });
  }

  document.getElementById("finVendasHojeRow").addEventListener("click", abrirVendasHoje);

  function vendaFormRow(item, idx){
    var produtoAtual = item ? state.produtos.find(function(p){ return p.id === item.produtoId; }) : null;
    return (
      '<div class="venda-item-row" data-row="' + idx + '">' +
        comboProdutoHtml(item ? item.produtoId : "", produtoAtual ? produtoAtual.nome : "") +
        '<input class="v-qtd" type="number" min="1" value="' + (item ? item.qtd : 1) + '">' +
        '<input class="v-preco" type="number" min="0" step="0.01" value="' + (item ? item.precoUnit : 0) + '">' +
        '<button type="button" class="btn btn-icon btn-danger v-remove" title="Remover">&times;</button>' +
      '</div>'
    );
  }

  function vendaPagamentoOptionsHtml(selecionada){
    return FORMAS_PAGAMENTO_VENDA.map(function(m){
      return '<option value="' + esc(m) + '"' + (m === selecionada ? " selected" : "") + '>' + esc(m) + '</option>';
    }).join("");
  }

  function vendedorOptionsHtml(selecionado){
    // Se a venda foi feita por alguém que já saiu da lista de vendedores, mantém
    // o nome aparecendo (marcado) para não perder a atribuição ao reabrir/editar.
    var removidoHtml = (selecionado && state.vendedores.indexOf(selecionado) === -1)
      ? '<option value="' + esc(selecionado) + '" selected>' + esc(selecionado) + ' (removido)</option>'
      : "";
    return '<option value="">Selecione...</option>' + removidoHtml + state.vendedores.map(function(nome){
      return '<option value="' + esc(nome) + '"' + (nome === selecionado ? " selected" : "") + '>' + esc(nome) + '</option>';
    }).join("");
  }

  function pagamentoSplitRowHtml(linha, idx){
    linha = linha || { forma: "Dinheiro", valor: 0 };
    return (
      '<div class="pgto-split-row" data-split-row="' + idx + '">' +
        '<select class="ps-forma">' + vendaPagamentoOptionsHtml(linha.forma) + '</select>' +
        '<input class="ps-valor" type="number" min="0" step="0.01" value="' + (linha.valor || 0) + '">' +
        '<button type="button" class="btn btn-icon btn-danger ps-remove" title="Remover">&times;</button>' +
      '</div>'
    );
  }

  // ---------- Combobox de produto (busca ao digitar), reutilizável em qualquer formulário ----------
  function comboProdutoHtml(produtoIdAtual, produtoNomeAtual, permitirLivre){
    var ph = permitirLivre ? "Buscar no estoque ou escrever a peça..." : "Digite para buscar produto...";
    return (
      '<div class="combo-wrap">' +
        '<input type="hidden" class="v-produto-id" value="' + (produtoIdAtual || "") + '">' +
        '<input type="text" class="v-produto-busca" placeholder="' + ph + '" autocomplete="off" value="' + esc(produtoNomeAtual || "") + '">' +
        '<div class="combo-dropdown hidden"></div>' +
      '</div>'
    );
  }

  function bindComboProduto(container, onSelect, permitirLivre){
    var buscaInput = container.querySelector(".v-produto-busca");
    var idInput = container.querySelector(".v-produto-id");
    var dd = container.querySelector(".combo-dropdown");

    function abrirDropdown(termo){
      var termoLower = (termo || "").toLowerCase();
      var matches = state.produtos.filter(function(p){
        return !termoLower || p.nome.toLowerCase().indexOf(termoLower) !== -1;
      }).slice(0, 30);
      dd.innerHTML = matches.length === 0
        ? '<div class="combo-empty">' + (permitirLivre
            ? 'Sem esse item no estoque — pode escrever o nome e informar o valor à mão.'
            : 'Nenhum produto encontrado') + '</div>'
        : matches.map(function(p){
            return '<div class="combo-item" data-produto-id="' + p.id + '">' + esc(p.nome) +
              ' <span class="combo-item-sub">(' + p.estoque + ' em estoque · ' + brl(p.preco) + ')</span></div>';
          }).join("");
      dd.classList.remove("hidden");
    }
    function fecharDropdown(){ dd.classList.add("hidden"); dd.innerHTML = ""; }

    buscaInput.addEventListener("focus", function(){ abrirDropdown(buscaInput.value); });
    buscaInput.addEventListener("input", function(){
      idInput.value = "";
      abrirDropdown(buscaInput.value);
    });
    buscaInput.addEventListener("blur", function(){
      setTimeout(fecharDropdown, 150);
    });
    dd.addEventListener("mousedown", function(e){
      var item = e.target.closest(".combo-item[data-produto-id]");
      if(!item) return;
      var prod = state.produtos.find(function(p){ return p.id === item.dataset.produtoId; });
      if(!prod) return;
      idInput.value = prod.id;
      buscaInput.value = prod.nome;
      fecharDropdown();
      if(onSelect) onSelect(prod);
    });
  }

  function vendaForm(venda){
    var clienteOptions = '<option value="">Consumidor</option>' + state.clientes.map(function(c){
      var sel = venda && venda.clienteId === c.id ? "selected" : "";
      return '<option value="' + c.id + '" ' + sel + '>' + esc(c.nome) + '</option>';
    }).join("");
    var vendaDataStr = venda ? venda.data : todayISO();
    var linhasExistentes = venda ? linhasPagamento(venda) : [{ forma: "Dinheiro", valor: 0 }];
    var dividirPagamento = venda ? linhasExistentes.length > 1 : false;
    var vendaPagamentoUnico = venda ? normalizarFormaPagamento(venda.pagamento || "Dinheiro") : "Dinheiro";
    var vendaRows = venda
      ? venda.itens.map(function(i, idx){
          return vendaFormRow({ produtoId: i.produtoId, nome: i.nome, qtd: i.qtd, precoUnit: i.precoUnit }, idx);
        }).join("")
      : vendaFormRow(null, 0);
    var splitRows = (dividirPagamento ? linhasExistentes : [null]).map(function(l, idx){
      return pagamentoSplitRowHtml(l, idx);
    }).join("");
    var btnSaveText = venda ? "Atualizar venda" : "Registrar venda";
    var desconto = venda ? (venda.desconto || 0) : 0;

    return (
      '<div class="field-row">' +
        '<div class="field"><label>Cliente</label><select id="fCliente">' + clienteOptions + '</select></div>' +
        '<div class="field"><label>Vendedor</label><div style="display:flex;gap:0.4rem;">' +
          '<select id="fVendedor" style="flex:1;">' + vendedorOptionsHtml(venda ? venda.vendedor : null) + '</select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnNovoVendedorInline" title="Adicionar vendedor">+</button>' +
        '</div></div>' +
      '</div>' +
      '<div class="field"><label>Data</label><input id="fData" type="date" value="' + vendaDataStr + '"></div>' +
      '<div class="venda-items" id="vendaItems">' +
        '<div id="vendaRows">' + vendaRows + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnAddItem" style="margin-top:0.4rem;">+ Adicionar item</button>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field">' +
          '<label>Desconto (R$)</label>' +
          '<div style="display:flex;gap:0.4rem;">' +
            '<input id="fDesconto" type="number" min="0" step="0.01" value="' + desconto + '" disabled style="flex:1;">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="btnLiberarDesconto" title="Somente o vendedor pode liberar">Liberar</button>' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label class="checkbox-inline"><input type="checkbox" id="fDividirPagamento" ' + (dividirPagamento ? "checked" : "") + '> Dividir entre formas de pagamento</label>' +
          '<select id="fPagamento" class="' + (dividirPagamento ? "hidden" : "") + '">' + vendaPagamentoOptionsHtml(vendaPagamentoUnico) + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="pgto-split ' + (dividirPagamento ? "" : "hidden") + '" id="pgtoSplit">' +
        '<div id="pgtoSplitRows">' + splitRows + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnAddSplit" style="margin-top:0.4rem;">+ Adicionar forma</button>' +
        '<div class="pgto-split-status" id="pgtoSplitStatus"></div>' +
      '</div>' +
      '<div class="venda-total-box">' +
        '<div class="venda-total-linha"><span>Subtotal</span><span id="vendaSubtotalValor">R$ 0,00</span></div>' +
        '<div class="venda-total-linha ' + (desconto > 0 ? "" : "hidden") + '" id="vendaDescontoLinha"><span>Desconto</span><span id="vendaDescontoValor">- R$ 0,00</span></div>' +
        '<div class="venda-total-linha venda-total-final"><span>Total</span><span id="vendaTotalValor">R$ 0,00</span></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">' + btnSaveText + '</button></div>'
    );
  }

  function openVendaModal(venda){
    if(!venda && state.produtos.length === 0){
      toast("Cadastre um produto antes de registrar uma venda");
      return;
    }
    var isEdit = !!venda;
    var title = isEdit ? "Editar venda" : "Nova venda";
    openModal(title, vendaForm(venda), function(body){
      var rowsEl = body.querySelector("#vendaRows");
      var rowCount = rowsEl.querySelectorAll(".venda-item-row").length;
      var splitRowsEl = body.querySelector("#pgtoSplitRows");
      var splitRowCount = splitRowsEl.querySelectorAll(".pgto-split-row").length;

      function subtotalAtual(){
        var total = 0;
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var qtd = parseFloat(row.querySelector(".v-qtd").value) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          total += qtd * preco;
        });
        return total;
      }

      function totalAtual(){
        var subtotal = subtotalAtual();
        var desconto = Math.min(parseFloat(body.querySelector("#fDesconto").value) || 0, subtotal);
        return Math.max(0, subtotal - desconto);
      }

      function recalcSplitStatus(){
        if(!body.querySelector("#fDividirPagamento").checked) return;
        var total = totalAtual();
        var alocado = 0;
        splitRowsEl.querySelectorAll(".pgto-split-row").forEach(function(row){
          alocado += parseFloat(row.querySelector(".ps-valor").value) || 0;
        });
        var diff = Math.round((total - alocado) * 100) / 100;
        var statusEl = body.querySelector("#pgtoSplitStatus");
        if(Math.abs(diff) < 0.01){
          statusEl.innerHTML = '<span class="pgto-split-ok">✓ Pagamento totalmente alocado</span>';
        } else if(diff > 0){
          statusEl.innerHTML = '<span class="pgto-split-falta">Falta alocar ' + brl(diff) + '</span>';
        } else {
          statusEl.innerHTML = '<span class="pgto-split-falta">' + brl(-diff) + ' a mais que o total</span>';
        }
      }

      function recalcTotal(){
        var subtotal = subtotalAtual();
        var descontoInput = parseFloat(body.querySelector("#fDesconto").value) || 0;
        var desconto = Math.min(descontoInput, subtotal);
        var total = Math.max(0, subtotal - desconto);
        body.querySelector("#vendaSubtotalValor").textContent = brl(subtotal);
        body.querySelector("#vendaDescontoValor").textContent = "- " + brl(desconto);
        body.querySelector("#vendaDescontoLinha").classList.toggle("hidden", desconto <= 0);
        body.querySelector("#vendaTotalValor").textContent = brl(total);
        recalcSplitStatus();
      }

      function bindRow(row){
        bindComboProduto(row, function(prod){
          row.querySelector(".v-preco").value = prod.preco;
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
      rowsEl.querySelectorAll(".venda-item-row").forEach(bindRow);

      body.querySelector("#btnAddItem").addEventListener("click", function(){
        var div = document.createElement("div");
        div.innerHTML = vendaFormRow(null, rowCount++);
        var row = div.firstElementChild;
        rowsEl.appendChild(row);
        bindRow(row);
      });

      body.querySelector("#btnNovoVendedorInline").addEventListener("click", function(){
        var nome = prompt("Nome do novo vendedor:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        if(state.vendedores.indexOf(nome) === -1){
          state.vendedores.push(nome);
          saveData();
        }
        body.querySelector("#fVendedor").innerHTML = vendedorOptionsHtml(nome);
      });

      body.querySelector("#btnLiberarDesconto").addEventListener("click", function(){
        var senha = prompt("Senha do vendedor para liberar o desconto:");
        if(senha === null) return;
        if(senha === SELLER_DISCOUNT_CODE){
          var input = body.querySelector("#fDesconto");
          input.disabled = false;
          input.focus();
          toast("Desconto liberado");
        } else {
          toast("Senha incorreta");
        }
      });
      body.querySelector("#fDesconto").addEventListener("input", recalcTotal);

      function bindSplitRow(row){
        row.querySelector(".ps-valor").addEventListener("input", recalcSplitStatus);
        row.querySelector(".ps-forma").addEventListener("change", recalcSplitStatus);
        row.querySelector(".ps-remove").addEventListener("click", function(){
          if(splitRowsEl.querySelectorAll(".pgto-split-row").length > 1){
            row.remove();
            recalcSplitStatus();
          }
        });
      }
      splitRowsEl.querySelectorAll(".pgto-split-row").forEach(bindSplitRow);

      body.querySelector("#btnAddSplit").addEventListener("click", function(){
        var div = document.createElement("div");
        div.innerHTML = pagamentoSplitRowHtml(null, splitRowCount++);
        var row = div.firstElementChild;
        splitRowsEl.appendChild(row);
        bindSplitRow(row);
        recalcSplitStatus();
      });

      body.querySelector("#fDividirPagamento").addEventListener("change", function(e){
        var dividir = e.target.checked;
        body.querySelector("#pgtoSplit").classList.toggle("hidden", !dividir);
        body.querySelector("#fPagamento").classList.toggle("hidden", dividir);
        recalcSplitStatus();
      });

      recalcTotal();

      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var itens = [];
        var valid = true;
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var produtoId = row.querySelector(".v-produto-id").value;
          var qtd = parseInt(row.querySelector(".v-qtd").value, 10) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          if(!produtoId || qtd <= 0){ valid = false; return; }
          var prod = state.produtos.find(function(p){ return p.id === produtoId; });
          if(!prod){ valid = false; return; }
          if(qtd > prod.estoque){ valid = false; toast("Estoque insuficiente para " + prod.nome); return; }
          itens.push({ produtoId: produtoId, nome: prod.nome, qtd: qtd, precoUnit: preco });
        });
        if(!valid || itens.length === 0){ toast("Verifique os itens da venda (selecione o produto pela busca)"); return; }

        var subtotal = itens.reduce(function(sum, i){ return sum + i.qtd * i.precoUnit; }, 0);
        var desconto = Math.min(parseFloat(body.querySelector("#fDesconto").value) || 0, subtotal);
        var total = Math.max(0, subtotal - desconto);
        var dataEscolhida = body.querySelector("#fData").value || todayISO();
        var clienteId = body.querySelector("#fCliente").value || null;
        var vendedor = body.querySelector("#fVendedor").value || null;

        var pagamentos;
        if(body.querySelector("#fDividirPagamento").checked){
          pagamentos = [];
          var somaAlocada = 0;
          splitRowsEl.querySelectorAll(".pgto-split-row").forEach(function(row){
            var forma = row.querySelector(".ps-forma").value;
            var valorLinha = parseFloat(row.querySelector(".ps-valor").value) || 0;
            if(valorLinha > 0){
              pagamentos.push({ forma: forma, valor: valorLinha });
              somaAlocada += valorLinha;
            }
          });
          if(pagamentos.length === 0 || Math.abs(somaAlocada - total) >= 0.01){
            toast("A soma das formas de pagamento precisa ser igual ao total (" + brl(total) + ")");
            return;
          }
        } else {
          pagamentos = [{ forma: body.querySelector("#fPagamento").value, valor: total }];
        }
        var pagamentoLabel = pagamentos.length === 1 ? pagamentos[0].forma : "Dividido";
        var valorFuturo = pagamentos.filter(function(p){ return p.forma === "Pagamento futuro"; }).reduce(function(s,p){ return s + p.valor; }, 0);

        function sincronizarReceberDaVenda(vendaRef){
          var conta = state.contas.find(function(c){ return c.vendaId === vendaRef.id; });
          if(valorFuturo > 0){
            if(conta){
              conta.descricao = "Venda - " + clienteNome(vendaRef.clienteId);
              conta.valor = valorFuturo;
              conta.vencimento = vendaRef.data;
              if(conta.status !== "pago") conta.status = "pendente";
            } else {
              state.contas.push({
                id: uid(),
                descricao: "Venda - " + clienteNome(vendaRef.clienteId),
                tipo: "receber",
                vencimento: vendaRef.data,
                valor: valorFuturo,
                status: "pendente",
                vendaId: vendaRef.id
              });
            }
          } else if(conta){
            state.contas = state.contas.filter(function(c){ return c.id !== conta.id; });
          }
        }

        function finalizarVenda(){
          if(isEdit){
            venda.clienteId = clienteId;
            venda.vendedor = vendedor;
            venda.desconto = desconto;
            venda.pagamento = pagamentoLabel;
            venda.pagamentos = pagamentos;
            venda.data = dataEscolhida;

            venda.itens.forEach(function(i){
              var prod = state.produtos.find(function(p){ return p.id === i.produtoId; });
              if(prod) prod.estoque = Math.max(0, prod.estoque + i.qtd);
            });

            venda.itens = itens;
            venda.total = total;

            itens.forEach(function(i){
              var prod = state.produtos.find(function(p){ return p.id === i.produtoId; });
              if(prod) prod.estoque = Math.max(0, prod.estoque - i.qtd);
            });

            sincronizarReceberDaVenda(venda);
            toast("Venda atualizada");
          } else {
            var novaVenda = {
              id: uid(),
              data: dataEscolhida,
              criadoEm: new Date().toISOString(),
              clienteId: clienteId,
              vendedor: vendedor,
              itens: itens,
              total: total,
              desconto: desconto,
              pagamento: pagamentoLabel,
              pagamentos: pagamentos
            };

            itens.forEach(function(i){
              var prod = state.produtos.find(function(p){ return p.id === i.produtoId; });
              prod.estoque = Math.max(0, prod.estoque - i.qtd);
            });

            state.vendas.push(novaVenda);
            sincronizarReceberDaVenda(novaVenda);

            toast("Venda registrada");
          }

          saveData();
          closeModal();
          renderAll();
        }

        if(dataEscolhida !== todayISO()){
          pedirSenhaAdmin(finalizarVenda);
        } else {
          finalizarVenda();
        }
      });
    });
  }

  document.getElementById("btnNovaVenda").addEventListener("click", function(){ openVendaModal(); });
  document.getElementById("buscaVendas").addEventListener("input", function(e){ renderVendas(e.target.value); });

  // ---------- Devoluções ----------
  function abrirDevolucoes(){
    var elegiveis = state.vendas.filter(function(v){ return !v.devolvida; })
      .slice().sort(function(a,b){ return (b.criadoEm || b.data).localeCompare(a.criadoEm || a.data); });

    var linhas = elegiveis.length === 0
      ? '<tr class="empty-row"><td colspan="5">Nenhuma venda disponível para devolução.</td></tr>'
      : elegiveis.map(function(v){
          return '<tr>' +
            '<td>' + fmtDate(v.data) + '</td>' +
            '<td class="cell-strong">' + esc(clienteNome(v.clienteId)) + selosVenda(v) + '</td>' +
            '<td>' + esc(v.itens.map(function(i){ return i.qtd + "x " + i.nome; }).join(", ")) + '</td>' +
            '<td class="cell-strong">' + brl(v.total) + '</td>' +
            '<td class="cell-actions"><button class="btn btn-danger btn-sm" data-devolver="' + v.id + '">Devolver</button></td>' +
          '</tr>';
        }).join("");

    openModal("Devoluções", (
      '<p style="margin:0 0 1rem;color:var(--ink-dim);">Escolha a venda que o cliente devolveu. A venda inteira sai do caixa, dos fechamentos e das comissões.</p>' +
      '<div class="vd-lista-wrap table-wrap">' +
        '<table><thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th></th></tr></thead>' +
        '<tbody id="devTbody">' + linhas + '</tbody></table>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Fechar</button></div>'
    ), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#devTbody").addEventListener("click", function(e){
        var btn = e.target.closest("[data-devolver]");
        if(btn) confirmarDevolucao(btn.dataset.devolver);
      });
    }, { large: true });
  }

  function confirmarDevolucao(vendaId){
    var v = state.vendas.find(function(x){ return x.id === vendaId; });
    if(!v) return;
    var temItemDeEstoque = v.itens.some(function(i){ return i.produtoId; });
    var pct = Number(state.comissaoPercentual) || 0;
    var comissaoPerdida = v.vendedor ? v.total * (pct / 100) : 0;

    openModal("Confirmar devolução", (
      '<div class="fechamento-detalhes" style="margin-bottom:1rem;">' +
        '<div class="fechamento-detalhes-row"><span>Cliente</span><span>' + esc(clienteNome(v.clienteId)) + '</span></div>' +
        '<div class="fechamento-detalhes-row"><span>Data da venda</span><span>' + fmtDate(v.data) + '</span></div>' +
        (v.vendedor ? '<div class="fechamento-detalhes-row"><span>Vendedor</span><span>' + esc(v.vendedor) + '</span></div>' : "") +
        v.itens.map(function(i){
          return '<div class="fechamento-detalhes-row"><span>' + i.qtd + 'x ' + esc(i.nome) + '</span><span>' + brl(i.qtd * i.precoUnit) + '</span></div>';
        }).join("") +
        '<div class="fechamento-detalhes-row" style="font-weight:700;color:var(--danger);"><span>Valor a devolver</span><span>' + brl(v.total) + '</span></div>' +
        (comissaoPerdida > 0 ? '<div class="fechamento-detalhes-row"><span>Comissão que será estornada</span><span>- ' + brl(comissaoPerdida) + '</span></div>' : "") +
      '</div>' +
      (temItemDeEstoque
        ? '<div class="field"><label class="checkbox-inline"><input type="checkbox" id="fDevolverEstoque" checked> Devolver as mercadorias ao estoque</label>' +
          '<div class="cell-sub" style="margin-top:0.3rem;">Desmarque se a mercadoria voltou com defeito e não pode ser revendida.</div></div>'
        : '') +
      '<div class="modal-actions">' +
        '<button class="btn btn-ghost" id="btnCancel">Cancelar</button>' +
        '<button class="btn btn-danger" id="btnConfirmarDevolucao">Confirmar devolução</button>' +
      '</div>'
    ), function(body){
      body.querySelector("#btnCancel").addEventListener("click", abrirDevolucoes);
      body.querySelector("#btnConfirmarDevolucao").addEventListener("click", function(){
        var voltarEstoque = temItemDeEstoque && body.querySelector("#fDevolverEstoque").checked;
        if(voltarEstoque) restaurarEstoqueItens(v.itens);

        v.devolvida = true;
        v.devolvidoEm = new Date().toISOString();
        v.estoqueRestaurado = voltarEstoque;

        // Se a venda tinha "Pagamento futuro", a cobrança pendente deixa de existir.
        state.contas = state.contas.filter(function(c){ return c.vendaId !== v.id; });
        // Uma assistência devolvida volta a ficar pendente para não sumir do controle.
        if(v.origemAssistenciaId){
          var a = state.assistencias.find(function(x){ return x.id === v.origemAssistenciaId; });
          if(a){ a.status = "pendente"; a.vendaId = null; }
        }

        saveData();
        closeModal();
        renderAll();
        toast("Devolução registrada — a venda saiu do caixa e das comissões");
      });
    });
  }

  document.getElementById("btnDevolucao").addEventListener("click", abrirDevolucoes);

  // Dashboard: "Últimas vendas" leva ao histórico completo e cada linha abre a venda
  document.getElementById("btnHistoricoVendas").addEventListener("click", function(){
    abrirDetalhesVendas("tudo");
  });
  document.getElementById("tblUltimasVendas").addEventListener("click", function(e){
    var row = e.target.closest("[data-uv-venda]");
    if(row) abrirDetalheVenda(row.dataset.uvVenda);
  });

  // ---------- Filtro de período (calendário: clique no dia inicial, depois no final) ----------
  // Reutilizável: cada chamada cria seu próprio calendário independente, ligado
  // a um botão/popover específicos, avisando o chamador via onAplicar/onLimpar.
  function criarSeletorPeriodo(botaoId, popoverId, labelId, onAplicar, onLimpar){
    var popover = document.getElementById(popoverId);
    var btn = document.getElementById(botaoId);
    var label = labelId ? document.getElementById(labelId) : null;
    var mesExibido = new Date();
    var selInicio = null;
    var selFim = null;

    function fmtCurto(iso){
      var p = iso.split("-");
      return p[2] + "/" + p[1];
    }

    function isoDe(ano, mes, dia){
      return ano + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
    }

    function renderCalendario(){
      var ano = mesExibido.getFullYear();
      var mes = mesExibido.getMonth();
      var primeiroDiaSemana = new Date(ano, mes, 1).getDay();
      var totalDias = new Date(ano, mes + 1, 0).getDate();
      var nomesMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

      var dias = "";
      for(var i = 0; i < primeiroDiaSemana; i++){
        dias += '<div class="cal-day cal-day-empty"></div>';
      }
      for(var d = 1; d <= totalDias; d++){
        var iso = isoDe(ano, mes, d);
        var classes = "cal-day";
        if(selInicio && iso === selInicio) classes += " cal-day-start";
        if(selFim && iso === selFim) classes += " cal-day-end";
        if(selInicio && selFim && iso > selInicio && iso < selFim) classes += " cal-day-range";
        if(iso === todayISO()) classes += " cal-day-today";
        dias += '<div class="' + classes + '" data-cal-dia="' + iso + '">' + d + '</div>';
      }

      popover.innerHTML =
        '<div class="cal-header">' +
          '<button type="button" class="cal-nav" id="calPrev">&lsaquo;</button>' +
          '<span>' + nomesMes[mes] + " " + ano + '</span>' +
          '<button type="button" class="cal-nav" id="calNext">&rsaquo;</button>' +
        '</div>' +
        '<div class="cal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>' +
        '<div class="cal-grid">' + dias + '</div>' +
        '<div class="cal-footer">' +
          '<div class="cal-selecao">' +
            (selInicio ? ("De <strong>" + fmtDate(selInicio) + "</strong>") : "Selecione o dia inicial") +
            (selFim ? (" até <strong>" + fmtDate(selFim) + "</strong>") : "") +
          '</div>' +
          '<div class="cal-acoes">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="calLimpar">Limpar</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="calAplicar">Aplicar</button>' +
          '</div>' +
        '</div>';

      popover.querySelector("#calPrev").addEventListener("click", function(){
        mesExibido.setMonth(mesExibido.getMonth() - 1);
        renderCalendario();
      });
      popover.querySelector("#calNext").addEventListener("click", function(){
        mesExibido.setMonth(mesExibido.getMonth() + 1);
        renderCalendario();
      });
      popover.querySelectorAll("[data-cal-dia]").forEach(function(el){
        el.addEventListener("click", function(){
          var iso = el.dataset.calDia;
          if(!selInicio || (selInicio && selFim)){
            selInicio = iso;
            selFim = null;
          } else if(iso < selInicio){
            selFim = selInicio;
            selInicio = iso;
          } else {
            selFim = iso;
          }
          renderCalendario();
        });
      });
      popover.querySelector("#calLimpar").addEventListener("click", function(){
        selInicio = null;
        selFim = null;
        if(label) label.textContent = "Período";
        onLimpar();
        popover.classList.add("hidden");
      });
      popover.querySelector("#calAplicar").addEventListener("click", function(){
        var fim = selFim || selInicio;
        if(!selInicio) return;
        if(label) label.textContent = fmtCurto(selInicio) + " – " + fmtCurto(fim);
        onAplicar(selInicio, fim);
        popover.classList.add("hidden");
      });
    }

    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var abrindo = popover.classList.contains("hidden");
      popover.classList.toggle("hidden");
      if(abrindo){
        renderCalendario();
      }
    });

    // Qualquer clique dentro do popover não deve "vazar" para o listener de
    // fechamento por clique-fora (o innerHTML é substituído a cada render do
    // calendário, o que desconecta o elemento original da árvore do documento).
    popover.addEventListener("click", function(e){ e.stopPropagation(); });

    document.addEventListener("click", function(e){
      if(!popover.classList.contains("hidden") && !popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
        popover.classList.add("hidden");
      }
    });
  }

  criarSeletorPeriodo("btnPeriodoVendas", "periodoPopover", "btnPeriodoVendasLabel", function(inicio, fim){
    vendasRangeInicio = inicio;
    vendasRangeFim = fim;
    renderVendas(document.getElementById("buscaVendas").value);
  }, function(){
    vendasRangeInicio = null;
    vendasRangeFim = null;
    renderVendas(document.getElementById("buscaVendas").value);
  });

  document.getElementById("tblVendas").addEventListener("click", function(e){
    var editId = e.target.dataset.editVenda;
    var delId = e.target.dataset.delVenda;
    var printBtn = e.target.closest("[data-print-venda]");
    if(printBtn) imprimirRecibo(printBtn.dataset.printVenda);
    if(editId){
      var vendaEscolhida = state.vendas.find(function(v){ return v.id === editId; });
      if(vendaEscolhida) openVendaModal(vendaEscolhida);
    }
    if(delId){
      if(confirm("Excluir esta venda? O estoque não será restaurado automaticamente.")){
        state.vendas = state.vendas.filter(function(v){ return v.id !== delId; });
        state.contas = state.contas.filter(function(c){ return c.vendaId !== delId; });
        saveData(); renderAll(); toast("Venda excluída");
      }
    }
  });

  // ================= ASSISTÊNCIA TÉCNICA =================
  function assistenciaItensTotal(a){
    return (a.itens || []).reduce(function(s,i){ return s + i.qtd * i.precoUnit; }, 0);
  }

  function assistenciaTotal(a){
    // maoDeObra só existe em registros antigos; hoje o serviço entra como item.
    var bruto = (a.maoDeObra || 0) + assistenciaItensTotal(a);
    return Math.max(0, bruto - (a.desconto || 0));
  }

  function assistenciaDescricao(a){
    if(a.aparelho || a.servico){
      return [a.aparelho, a.servico].filter(Boolean).join(" — ");
    }
    return a.descricao || "-";
  }

  function restaurarEstoqueItens(itens){
    (itens || []).forEach(function(i){
      var p = state.produtos.find(function(p){ return p.id === i.produtoId; });
      if(p) p.estoque = Math.max(0, p.estoque + i.qtd);
    });
  }

  function baixarEstoqueItens(itens){
    itens.forEach(function(i){
      var p = state.produtos.find(function(p){ return p.id === i.produtoId; });
      if(p) p.estoque = Math.max(0, p.estoque - i.qtd);
    });
  }

  // Linha de peça/produto da assistência: aceita item do estoque ou escrito à mão.
  function assistFormRow(item, idx){
    var produtoAtual = item && item.produtoId ? state.produtos.find(function(p){ return p.id === item.produtoId; }) : null;
    var nomeAtual = produtoAtual ? produtoAtual.nome : (item ? item.nome : "");
    return (
      '<div class="venda-item-row" data-row="' + idx + '">' +
        comboProdutoHtml(item ? item.produtoId : "", nomeAtual, true) +
        '<input class="v-qtd" type="number" min="1" value="' + (item ? item.qtd : 1) + '">' +
        '<input class="v-preco" type="number" min="0" step="0.01" value="' + (item ? item.precoUnit : 0) + '">' +
        '<button type="button" class="btn btn-icon btn-danger v-remove" title="Remover">&times;</button>' +
      '</div>'
    );
  }

  function assistenciaForm(a){
    a = a || {};
    var btnSaveText = a.id ? "Atualizar" : "Salvar";
    var itensRows = (a.itens && a.itens.length ? a.itens : [null]).map(function(item, idx){
      return assistFormRow(item, idx);
    }).join("");
    var desconto = a.desconto || 0;
    return (
      '<div class="field-row">' +
        '<div class="field"><label>Cliente</label><div style="display:flex;gap:0.4rem;">' +
          '<select id="fAssistCliente" style="flex:1;">' + clienteOptionsHtml(a.clienteId, "Consumidor") + '</select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnNovoClienteAssistInline" title="Cadastrar cliente">+</button>' +
        '</div></div>' +
        '<div class="field"><label>Vendedor</label><div style="display:flex;gap:0.4rem;">' +
          '<select id="fAssistVendedor" style="flex:1;">' + vendedorOptionsHtml(a.vendedor) + '</select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnNovoVendedorAssistInline" title="Adicionar vendedor">+</button>' +
        '</div></div>' +
      '</div>' +
      '<div class="field"><label>Aparelho</label><input id="fAssistAparelho" value="' + esc(a.aparelho || a.descricao || "") + '" placeholder="Ex: iPhone 11"></div>' +
      '<div class="field"><label>Serviço</label><input id="fAssistServico" value="' + esc(a.servico || "") + '" placeholder="Ex: Troca de tela"></div>' +
      '<div class="field"><label>Peças / produtos utilizados</label></div>' +
      '<div class="venda-items" id="assistItems">' +
        '<div id="assistRows">' + itensRows + '</div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnAddAssistItem" style="margin-top:0.4rem;">+ Adicionar peça/produto</button>' +
      '</div>' +
      '<div class="field-row">' +
        '<div class="field">' +
          '<label>Desconto (R$)</label>' +
          '<div style="display:flex;gap:0.4rem;">' +
            '<input id="fAssistDesconto" type="number" min="0" step="0.01" value="' + desconto + '" disabled style="flex:1;">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="btnLiberarDescontoAssist" title="Somente o vendedor pode liberar">Liberar</button>' +
          '</div>' +
        '</div>' +
        '<div class="field"><label>Data de entrada</label><input id="fAssistData" type="date" value="' + (a.dataEntrada || todayISO()) + '"></div>' +
      '</div>' +
      '<div class="venda-total-box">' +
        '<div class="venda-total-linha"><span>Peças / produtos</span><span id="assistSubtotalValor">R$ 0,00</span></div>' +
        '<div class="venda-total-linha ' + (desconto > 0 ? "" : "hidden") + '" id="assistDescontoLinha"><span>Desconto</span><span id="assistDescontoValor">- R$ 0,00</span></div>' +
        '<div class="venda-total-linha venda-total-final"><span>Total previsto</span><span id="assistTotalValor">R$ 0,00</span></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">' + btnSaveText + '</button></div>'
    );
  }

  function openAssistenciaModal(a){
    var isEdit = !!a;
    openModal(isEdit ? "Editar assistência" : "Nova assistência", assistenciaForm(a), function(body){
      var rowsEl = body.querySelector("#assistRows");
      var rowCount = rowsEl.querySelectorAll(".venda-item-row").length;

      function subtotalAtual(){
        var total = 0;
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var qtd = parseFloat(row.querySelector(".v-qtd").value) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          total += qtd * preco;
        });
        return total;
      }

      function recalcTotal(){
        var subtotal = subtotalAtual();
        var desconto = Math.min(parseFloat(body.querySelector("#fAssistDesconto").value) || 0, subtotal);
        body.querySelector("#assistSubtotalValor").textContent = brl(subtotal);
        body.querySelector("#assistDescontoValor").textContent = "- " + brl(desconto);
        body.querySelector("#assistDescontoLinha").classList.toggle("hidden", desconto <= 0);
        body.querySelector("#assistTotalValor").textContent = brl(Math.max(0, subtotal - desconto));
      }

      function bindRow(row){
        bindComboProduto(row, function(prod){
          row.querySelector(".v-preco").value = prod.preco;
          recalcTotal();
        }, true);
        row.querySelector(".v-qtd").addEventListener("input", recalcTotal);
        row.querySelector(".v-preco").addEventListener("input", recalcTotal);
        row.querySelector(".v-remove").addEventListener("click", function(){
          if(rowsEl.querySelectorAll(".venda-item-row").length > 1){
            row.remove();
            recalcTotal();
          }
        });
      }
      rowsEl.querySelectorAll(".venda-item-row").forEach(bindRow);

      body.querySelector("#btnAddAssistItem").addEventListener("click", function(){
        var div = document.createElement("div");
        div.innerHTML = assistFormRow(null, rowCount++);
        var row = div.firstElementChild;
        rowsEl.appendChild(row);
        bindRow(row);
      });

      body.querySelector("#btnLiberarDescontoAssist").addEventListener("click", function(){
        var senha = prompt("Senha do vendedor para liberar o desconto:");
        if(senha === null) return;
        if(senha === SELLER_DISCOUNT_CODE){
          var input = body.querySelector("#fAssistDesconto");
          input.disabled = false;
          input.focus();
          toast("Desconto liberado");
        } else {
          toast("Senha incorreta");
        }
      });
      body.querySelector("#fAssistDesconto").addEventListener("input", recalcTotal);
      recalcTotal();

      body.querySelector("#btnCancel").addEventListener("click", closeModal);

      body.querySelector("#btnNovoClienteAssistInline").addEventListener("click", function(){
        var nome = prompt("Nome do novo cliente:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        var novoCliente = { id: uid(), nome: nome, cpf: "", cnpj: "", telefone: "", email: "", obs: "" };
        state.clientes.push(novoCliente);
        saveData();
        body.querySelector("#fAssistCliente").innerHTML = clienteOptionsHtml(novoCliente.id, "Consumidor");
        toast("Cliente cadastrado");
      });

      body.querySelector("#btnNovoVendedorAssistInline").addEventListener("click", function(){
        var nome = prompt("Nome do novo vendedor:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        if(state.vendedores.indexOf(nome) === -1){
          state.vendedores.push(nome);
          saveData();
        }
        body.querySelector("#fAssistVendedor").innerHTML = vendedorOptionsHtml(nome);
      });

      body.querySelector("#btnSave").addEventListener("click", function(){
        var clienteId = body.querySelector("#fAssistCliente").value || null;
        var vendedor = body.querySelector("#fAssistVendedor").value || null;
        var aparelho = body.querySelector("#fAssistAparelho").value.trim();
        var servico = body.querySelector("#fAssistServico").value.trim();
        var dataEntrada = body.querySelector("#fAssistData").value || todayISO();

        if(!aparelho){ toast("Informe o aparelho"); return; }

        var itensNovos = [];
        rowsEl.querySelectorAll(".venda-item-row").forEach(function(row){
          var produtoId = row.querySelector(".v-produto-id").value;
          var nomeLivre = row.querySelector(".v-produto-busca").value.trim();
          var qtd = parseInt(row.querySelector(".v-qtd").value, 10) || 0;
          var preco = parseFloat(row.querySelector(".v-preco").value) || 0;
          if(qtd <= 0) return;
          if(produtoId){
            var prod = state.produtos.find(function(p){ return p.id === produtoId; });
            if(!prod) return;
            itensNovos.push({ produtoId: produtoId, nome: prod.nome, qtd: qtd, precoUnit: preco });
          } else if(nomeLivre && preco > 0){
            // peça que não existe no estoque: entra só no valor, sem baixa
            itensNovos.push({ produtoId: null, nome: nomeLivre, qtd: qtd, precoUnit: preco });
          }
        });

        var subtotal = itensNovos.reduce(function(s,i){ return s + i.qtd * i.precoUnit; }, 0);
        var desconto = Math.min(parseFloat(body.querySelector("#fAssistDesconto").value) || 0, subtotal);

        if(itensNovos.length === 0){ toast("Adicione ao menos uma peça, produto ou serviço com valor"); return; }

        if(isEdit) restaurarEstoqueItens(a.itens);
        var faltouEstoque = itensNovos.find(function(i){
          if(!i.produtoId) return false;
          var p = state.produtos.find(function(p){ return p.id === i.produtoId; });
          return p && i.qtd > p.estoque;
        });
        if(faltouEstoque){
          if(isEdit) baixarEstoqueItens(a.itens);
          var prodFaltante = state.produtos.find(function(p){ return p.id === faltouEstoque.produtoId; });
          toast("Estoque insuficiente para " + (prodFaltante ? prodFaltante.nome : "a peça selecionada"));
          return;
        }
        baixarEstoqueItens(itensNovos);

        if(isEdit){
          a.clienteId = clienteId;
          a.vendedor = vendedor;
          a.aparelho = aparelho;
          a.servico = servico;
          a.itens = itensNovos;
          a.desconto = desconto;
          a.dataEntrada = dataEntrada;
          delete a.descricao;
          delete a.maoDeObra;
          toast("Assistência atualizada");
        } else {
          state.assistencias.push({
            id: uid(),
            clienteId: clienteId,
            vendedor: vendedor,
            aparelho: aparelho,
            servico: servico,
            itens: itensNovos,
            desconto: desconto,
            dataEntrada: dataEntrada,
            status: "pendente",
            vendaId: null
          });
          toast("Assistência registrada");
        }
        saveData();
        closeModal();
        renderAll();
      });
    });
  }

  document.getElementById("btnNovaAssistencia").addEventListener("click", function(){ openAssistenciaModal(null); });

  function abrirConfirmarRetiradaAssistencia(assistId){
    var a = state.assistencias.find(function(x){ return x.id === assistId; });
    if(!a) return;
    var subtotal = (a.maoDeObra || 0) + assistenciaItensTotal(a);
    var descontoAtual = a.desconto || 0;
    var itensHtml = (a.itens || []).length
      ? '<div class="fechamento-detalhes" style="margin-bottom:1rem;">' +
          a.itens.map(function(i){
            return '<div class="fechamento-detalhes-row"><span>' + i.qtd + 'x ' + esc(i.nome) + '</span><span>' + brl(i.qtd * i.precoUnit) + '</span></div>';
          }).join("") +
        '</div>'
      : "";
    var formas = ["Dinheiro", "Cartão de crédito", "Cartão de débito", "Pix"];
    openModal("Confirmar retirada", (
      '<p style="margin:0 0 1rem;color:var(--ink-dim);">' + esc(clienteNome(a.clienteId)) + ' retirou: ' + esc(assistenciaDescricao(a)) + '</p>' +
      itensHtml +
      '<div class="field">' +
        '<label>Desconto (R$)</label>' +
        '<div style="display:flex;gap:0.4rem;">' +
          '<input id="fAssistDescontoFinal" type="number" min="0" step="0.01" value="' + descontoAtual + '" disabled style="flex:1;">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnLiberarDescontoRetirada">Liberar</button>' +
        '</div>' +
      '</div>' +
      '<div class="venda-total-box">' +
        '<div class="venda-total-linha"><span>Peças / produtos</span><span>' + brl(subtotal) + '</span></div>' +
        '<div class="venda-total-linha venda-total-final"><span>Total a cobrar</span><span id="assistRetiradaTotal">' + brl(Math.max(0, subtotal - descontoAtual)) + '</span></div>' +
      '</div>' +
      '<div class="field" style="margin-top:1rem;"><label>Forma de pagamento</label></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:1rem;">' +
        formas.map(function(f){ return '<button type="button" class="btn btn-ghost" data-forma-pagto="' + esc(f) + '">' + esc(f) + '</button>'; }).join("") +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button></div>'
    ), function(body){
      function descontoFinal(){
        return Math.min(parseFloat(body.querySelector("#fAssistDescontoFinal").value) || 0, subtotal);
      }
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnLiberarDescontoRetirada").addEventListener("click", function(){
        var senha = prompt("Senha do vendedor para liberar o desconto:");
        if(senha === null) return;
        if(senha === SELLER_DISCOUNT_CODE){
          var input = body.querySelector("#fAssistDescontoFinal");
          input.disabled = false;
          input.focus();
          toast("Desconto liberado");
        } else {
          toast("Senha incorreta");
        }
      });
      body.querySelector("#fAssistDescontoFinal").addEventListener("input", function(){
        body.querySelector("#assistRetiradaTotal").textContent = brl(Math.max(0, subtotal - descontoFinal()));
      });
      body.querySelectorAll("[data-forma-pagto]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var forma = btn.dataset.formaPagto;
          var desconto = descontoFinal();
          var totalFinal = Math.max(0, subtotal - desconto);
          if(totalFinal <= 0){ toast("Informe um valor válido"); return; }

          var itensVenda = (a.itens || []).map(function(i){
            return { produtoId: i.produtoId, nome: i.nome, qtd: i.qtd, precoUnit: i.precoUnit };
          });
          if(a.maoDeObra > 0){
            itensVenda.push({ produtoId: null, nome: "Mão de obra: " + assistenciaDescricao(a), qtd: 1, precoUnit: a.maoDeObra });
          }

          var novaVenda = {
            id: uid(),
            data: todayISO(),
            criadoEm: new Date().toISOString(),
            clienteId: a.clienteId,
            vendedor: a.vendedor,
            itens: itensVenda,
            total: totalFinal,
            desconto: desconto,
            pagamento: forma,
            pagamentos: [{ forma: forma, valor: totalFinal }],
            origemAssistenciaId: a.id,
            assistencia: true
          };
          state.vendas.push(novaVenda);
          a.status = "concluido";
          a.desconto = desconto;
          a.vendaId = novaVenda.id;
          saveData();
          closeModal();
          renderAll();
          toast("Retirada confirmada e lançada no caixa");
        });
      });
    });
  }

  function renderAssistencias(){
    var tbody = document.getElementById("tblAssistencias");
    var lista = state.assistencias.slice().sort(function(a,b){
      if(a.status !== b.status) return a.status === "pendente" ? -1 : 1;
      return b.dataEntrada.localeCompare(a.dataEntrada);
    });
    if(lista.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhuma assistência registrada.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(function(a){
      var badge = a.status === "concluido" ? '<span class="badge badge-ok">Concluído</span>' : '<span class="badge badge-warn">Pendente</span>';
      var qtdPecas = (a.itens || []).length;
      var descricaoCompleta = esc(assistenciaDescricao(a)) +
        (qtdPecas ? ' <span class="cell-sub">(' + qtdPecas + (qtdPecas > 1 ? " itens" : " item") + ')</span>' : "");
      return '<tr>' +
        '<td class="cell-strong">' + esc(clienteNome(a.clienteId)) + '</td>' +
        '<td>' + esc(a.vendedor || "-") + '</td>' +
        '<td>' + descricaoCompleta + '</td>' +
        '<td>' + brl(assistenciaTotal(a)) + '</td>' +
        '<td>' + fmtDate(a.dataEntrada) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td class="cell-actions">' +
          (a.status === "pendente"
            ? '<button class="btn btn-ghost btn-sm" data-edit-assist="' + a.id + '">Editar</button>' +
              '<button class="btn btn-secondary btn-sm" data-retirada-assist="' + a.id + '">Confirmar retirada</button>'
            : '') +
          '<button class="btn btn-danger btn-sm" data-del-assist="' + a.id + '">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  document.getElementById("tblAssistencias").addEventListener("click", function(e){
    var editId = e.target.dataset.editAssist;
    var retiradaId = e.target.dataset.retiradaAssist;
    var delId = e.target.dataset.delAssist;
    if(editId){
      var a = state.assistencias.find(function(x){ return x.id === editId; });
      if(a) openAssistenciaModal(a);
    }
    if(retiradaId) abrirConfirmarRetiradaAssistencia(retiradaId);
    if(delId){
      if(confirm("Excluir esta assistência? O estoque das peças já usadas não será restaurado automaticamente.")){
        state.assistencias = state.assistencias.filter(function(a){ return a.id !== delId; });
        saveData(); renderAll(); toast("Assistência excluída");
      }
    }
  });

  // ================= FINANCEIRO =================
  function renderFinanceiro(){
    var hoje = todayISO();
    var despesas = state.contas.filter(function(c){ return c.tipo === "pagar"; }).slice().sort(function(a,b){ return a.vencimento.localeCompare(b.vencimento); });

    var tbody = document.getElementById("tblContas");
    if(despesas.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma despesa lançada.</td></tr>';
    } else {
      tbody.innerHTML = despesas.map(function(c){
        var badge = c.status === "pago" ? '<span class="badge badge-ok">pago</span>' : '<span class="badge badge-warn">pendente</span>';
        return '<tr>' +
          '<td class="cell-strong">' + esc(c.descricao) + '</td>' +
          '<td>' + esc(c.natureza || "-") + '</td>' +
          '<td>' + esc(c.formaPagamento || "-") + '</td>' +
          '<td>' + fmtDate(c.vencimento) + '</td>' +
          '<td>' + brl(c.valor) + '</td>' +
          '<td>' + badge + '</td>' +
          '<td class="cell-actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit-conta="' + c.id + '">Editar</button>' +
            (c.status === "pendente" ? '<button class="btn btn-ghost btn-sm" data-pay-conta="' + c.id + '">Pago</button>' : '') +
            '<button class="btn btn-danger btn-sm" data-del-conta="' + c.id + '">Excluir</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    }

    var devedores = state.contas.filter(function(c){ return c.tipo === "receber" && c.status === "pendente"; }).slice().sort(function(a,b){ return a.vencimento.localeCompare(b.vencimento); });
    var tbodyDev = document.getElementById("tblDevedores");
    if(devedores.length === 0){
      tbodyDev.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum devedor registrado.</td></tr>';
    } else {
      tbodyDev.innerHTML = devedores.map(function(c){
        return '<tr>' +
          '<td class="cell-strong">' + esc(c.descricao) + '</td>' +
          '<td>' + esc(c.produtoNome || c.natureza || "-") + '</td>' +
          '<td>' + fmtDate(c.vencimento) + '</td>' +
          '<td>' + brl(c.valor) + '</td>' +
          '<td><span class="badge badge-warn">pendente</span></td>' +
          '<td class="cell-actions">' +
            '<button class="btn btn-ghost btn-sm" data-edit-devedor="' + c.id + '">Editar</button>' +
            '<button class="btn btn-secondary btn-sm" data-recebido-conta="' + c.id + '">Marcar como pago</button>' +
            '<button class="btn btn-danger btn-sm" data-del-devedor="' + c.id + '">Remover</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    }

    var despesasMes = state.contas.filter(function(c){ return c.tipo === "pagar" && c.vencimento.slice(0,7) === hoje.slice(0,7); });
    var despesasTotalMes = sum(despesasMes);
    var vendedMes = vendasAtivas().filter(function(v){ return v.data.slice(0,7) === hoje.slice(0,7); });
    var totalMes = vendedMes.reduce(function(s,v){ return s + v.total; }, 0);

    document.getElementById("kpiTotal").textContent = kpiVisiveis ? brl(totalMes) : "R$ ••••";
    document.getElementById("kpiDespesasTotal").textContent = kpiVisiveis ? brl(despesasTotalMes) : "R$ ••••";

    [document.getElementById("eyeTotal"), document.getElementById("eyeDespesasTotal")].forEach(function(eyeBtn){
      if(eyeBtn){
        eyeBtn.innerHTML = kpiVisiveis ? EYE_OPEN_SVG : EYE_OFF_SVG;
        eyeBtn.setAttribute("aria-pressed", kpiVisiveis ? "true" : "false");
        eyeBtn.setAttribute("aria-label", kpiVisiveis ? "Ocultar valor" : "Mostrar valor");
        eyeBtn.title = kpiVisiveis ? "Ocultar valor" : "Mostrar valor";
      }
    });

    var vendasHoje = vendasAtivas().filter(function(v){ return v.data === hoje; });
    document.getElementById("finVendasHojeTotal").textContent = brl(vendasHoje.reduce(function(s,v){ return s + v.total; }, 0));
    document.getElementById("finVendasHojePagamentos").innerHTML = pagamentosChipsHtml(vendasHoje);

    renderFechamentos();
    renderComissoes();
  }

  var FORMAS_FECHAMENTO = ["Dinheiro", "Cartão de crédito", "Cartão de débito", "Pix", "Pagamento futuro"];

  function somarPorForma(vendas){
    var totais = {};
    FORMAS_FECHAMENTO.forEach(function(m){ totais[m] = 0; });
    vendas.forEach(function(v){
      linhasPagamento(v).forEach(function(l){
        if(totais.hasOwnProperty(l.forma)) totais[l.forma] += l.valor;
      });
    });
    return totais;
  }

  function fechamentoDetalhesHtml(pagamentos, extra){
    return (
      '<div class="fechamento-detalhes-row"><span>Dinheiro</span><span>' + brl(pagamentos["Dinheiro"] || 0) + '</span></div>' +
      '<div class="fechamento-detalhes-row"><span>Cartão de Crédito</span><span>' + brl(pagamentos["Cartão de crédito"] || 0) + '</span></div>' +
      '<div class="fechamento-detalhes-row"><span>Cartão de Débito</span><span>' + brl(pagamentos["Cartão de débito"] || 0) + '</span></div>' +
      '<div class="fechamento-detalhes-row"><span>Pix</span><span>' + brl(pagamentos["Pix"] || 0) + '</span></div>' +
      '<div class="fechamento-detalhes-row"><span>Pagamento Futuro</span><span>' + brl(pagamentos["Pagamento futuro"] || 0) + '</span></div>' +
      (extra || "")
    );
  }

  function renderFechamentos(){
    var hoje = todayISO();
    var ym = hoje.slice(0,7);

    var vendasHoje = vendasAtivas().filter(function(v){ return v.data === hoje; });
    var despesasHoje = state.contas.filter(function(c){ return c.tipo === "pagar" && c.vencimento === hoje; });

    var pagamentosHoje = somarPorForma(vendasHoje);
    var totalVendasHoje = vendasHoje.reduce(function(s,v){ return s + v.total; }, 0);
    var totalDespesasHoje = despesasHoje.reduce(function(s,c){ return s + Number(c.valor || 0); }, 0);
    var despesasHojeDinheiro = despesasHoje.filter(function(c){ return c.formaPagamento === "Dinheiro"; }).reduce(function(s,c){ return s + Number(c.valor || 0); }, 0);
    var caixaEsperadoDinheiro = (pagamentosHoje["Dinheiro"] || 0) - despesasHojeDinheiro;

    var fechamentoDiaHtml =
      '<div class="fechamento-grid">' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Total de Vendas</div>' +
          '<div class="fechamento-valor">' + brl(totalVendasHoje) + '</div>' +
        '</div>' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Despesas do Dia</div>' +
          '<div class="fechamento-valor" style="color:var(--danger);">' + brl(totalDespesasHoje) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fechamento-detalhes">' +
        fechamentoDetalhesHtml(pagamentosHoje,
          '<div style="margin-top:0.8rem;padding-top:0.8rem;border-top:2px solid var(--line);">' +
            '<div class="fechamento-detalhes-row" style="font-weight:700;color:var(--ok);">' +
              '<span>Caixa Esperado em Dinheiro</span><span>' + brl(caixaEsperadoDinheiro) + '</span>' +
            '</div>' +
          '</div>'
        ) +
      '</div>';

    document.getElementById("fechamentoDiaConteudo").innerHTML = fechamentoDiaHtml;

    var fechamentoMesEl = document.getElementById("fechamentoMesConteudo");
    if(!fechamentoMesVisivel){
      fechamentoMesEl.innerHTML =
        '<div class="chart-locked">' +
          LOCK_SVG +
          '<span>Área protegida — clique no cadeado para ver o fechamento do mês</span>' +
          '<button type="button" class="btn btn-primary btn-sm" id="btnDesbloquearFechamentoMes">Desbloquear</button>' +
        '</div>';
      return;
    }

    var vendasMes = vendasAtivas().filter(function(v){ return v.data.slice(0,7) === ym; });
    var despesasMes = state.contas.filter(function(c){ return c.tipo === "pagar" && c.vencimento.slice(0,7) === ym; });

    var pagamentosMes = somarPorForma(vendasMes);
    var totalVendasMes = vendasMes.reduce(function(s,v){ return s + v.total; }, 0);
    var totalDespesasMes = despesasMes.reduce(function(s,c){ return s + Number(c.valor || 0); }, 0);
    var lucroMes = totalVendasMes - totalDespesasMes;

    var fechamentoMesHtml =
      '<div class="fechamento-grid">' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Total de Vendas</div>' +
          '<div class="fechamento-valor">' + brl(totalVendasMes) + '</div>' +
        '</div>' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Despesas do Mês</div>' +
          '<div class="fechamento-valor" style="color:var(--danger);">' + brl(totalDespesasMes) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fechamento-detalhes">' +
        '<div class="fechamento-label" style="margin-bottom:0.6rem;">Vendas por forma de pagamento</div>' +
        fechamentoDetalhesHtml(pagamentosMes,
          '<div style="margin-top:0.8rem;padding-top:0.8rem;border-top:2px solid var(--line);">' +
            '<div class="fechamento-detalhes-row" style="font-weight:700;color:var(--ok);">' +
              '<span>Lucro do Mês</span><span>' + brl(lucroMes) + '</span>' +
            '</div>' +
          '</div>'
        ) +
      '</div>';

    fechamentoMesEl.innerHTML = fechamentoMesHtml;
  }

  var fechamentoMesVisivel = false;
  document.getElementById("fechamentoMesConteudo").addEventListener("click", function(e){
    if(e.target.closest("#btnDesbloquearFechamentoMes")){
      pedirSenhaAdmin(function(){
        fechamentoMesVisivel = true;
        renderFechamentos();
      });
    }
  });

  // ================= COMISSÕES =================
  var comissoesFiltro = "mes";

  function renderComissoes(){
    var vendasPeriodo = filtrarVendasPorPeriodo(comissoesFiltro, todayISO());
    var porVendedor = {};
    vendasPeriodo.forEach(function(v){
      if(!v.vendedor) return;
      porVendedor[v.vendedor] = (porVendedor[v.vendedor] || 0) + v.total;
    });
    var pct = Number(state.comissaoPercentual) || 0;
    var nomes = Object.keys(porVendedor).sort();

    function chip(valor, label){
      return '<button type="button" class="btn btn-sm ' + (comissoesFiltro === valor ? "btn-primary" : "btn-ghost") + '" data-cm-filtro="' + valor + '">' + label + '</button>';
    }

    var linhasHtml = nomes.length === 0
      ? '<tr class="empty-row"><td colspan="3">Nenhuma venda com vendedor identificado neste período.</td></tr>'
      : nomes.map(function(nome){
          var totalVendido = porVendedor[nome];
          var comissao = totalVendido * (pct / 100);
          return '<tr>' +
            '<td class="cell-strong">' + esc(nome) + '</td>' +
            '<td>' + brl(totalVendido) + '</td>' +
            '<td class="cell-strong" style="color:var(--ok);">' + brl(comissao) + '</td>' +
          '</tr>';
        }).join("");

    document.getElementById("comissoesConteudo").innerHTML =
      '<div class="vd-filtros" style="margin-bottom:0.9rem;">' +
        chip("hoje", "Hoje") + chip("mes", "Este mês") + chip("ano", "Este ano") +
      '</div>' +
      '<div class="field" style="max-width:220px;margin-bottom:1.2rem;">' +
        '<label>% de comissão sobre vendas</label>' +
        '<input type="number" min="0" step="0.1" id="fComissaoPct" value="' + pct + '">' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table><thead><tr><th>Vendedor</th><th>Vendas no período</th><th>Comissão</th></tr></thead>' +
        '<tbody>' + linhasHtml + '</tbody></table>' +
      '</div>';

    document.getElementById("comissoesConteudo").querySelectorAll("[data-cm-filtro]").forEach(function(btn){
      btn.addEventListener("click", function(){
        comissoesFiltro = btn.dataset.cmFiltro;
        renderComissoes();
      });
    });
    document.getElementById("fComissaoPct").addEventListener("change", function(e){
      state.comissaoPercentual = Math.max(0, parseFloat(e.target.value) || 0);
      saveData();
      renderComissoes();
    });
  }

  function sum(arr){ return arr.reduce(function(s,c){ return s + Number(c.valor || 0); }, 0); }

  function categoriaOptionsHtml(selecionada){
    var lista = state.categorias.slice();
    // categoria antiga digitada à mão continua aparecendo para não sumir do cadastro
    if(selecionada && lista.indexOf(selecionada) === -1) lista.unshift(selecionada);
    return lista.map(function(c){
      return '<option value="' + esc(c) + '"' + (c === selecionada ? " selected" : "") + '>' + esc(c) + '</option>';
    }).join("");
  }

  function naturezaOptionsHtml(selecionada){
    return state.naturezas.map(function(n){
      return '<option value="' + esc(n) + '"' + (n === selecionada ? " selected" : "") + '>' + esc(n) + '</option>';
    }).join("");
  }

  function formaPagamentoOptionsHtml(selecionada){
    return METODOS_PAGAMENTO.map(function(m){
      return '<option value="' + esc(m) + '"' + (m === selecionada ? " selected" : "") + '>' + esc(m) + '</option>';
    }).join("");
  }

  function contaForm(conta){
    conta = conta || {};
    var btnSaveText = conta.id ? "Atualizar" : "Salvar";
    return (
      '<div class="field"><label>Descrição</label><input id="fDescricao" value="' + esc(conta.descricao||"") + '" placeholder="Ex: Aluguel, fornecedor..."></div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Valor</label><input id="fValor" type="number" min="0" step="0.01" value="' + (conta.valor||"") + '"></div>' +
        '<div class="field"><label>Forma de pagamento</label><select id="fFormaPagamento">' + formaPagamentoOptionsHtml(conta.formaPagamento) + '</select></div>' +
      '</div>' +
      '<div class="field"><label>Natureza</label><div style="display:flex;gap:0.4rem;">' +
        '<select id="fNatureza" style="flex:1;">' + naturezaOptionsHtml(conta.natureza) + '</select>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="btnNovaNatureza" title="Adicionar nova natureza">+</button>' +
      '</div></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">' + btnSaveText + '</button></div>'
    );
  }

  function openContaModal(conta){
    var isEdit = !!conta;
    var title = isEdit ? "Editar despesa" : "Adicionar despesa";
    openModal(title, contaForm(conta), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);

      body.querySelector("#btnNovaNatureza").addEventListener("click", function(){
        var nome = prompt("Nome da nova natureza de despesa:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        if(state.naturezas.indexOf(nome) === -1){
          state.naturezas.push(nome);
          saveData();
        }
        var select = body.querySelector("#fNatureza");
        select.innerHTML = naturezaOptionsHtml(nome);
      });

      body.querySelector("#btnSave").addEventListener("click", function(){
        var descricao = body.querySelector("#fDescricao").value.trim();
        var valor = parseFloat(body.querySelector("#fValor").value) || 0;
        if(!descricao || valor <= 0){ toast("Preencha descrição e valor"); return; }
        if(isEdit){
          conta.descricao = descricao;
          conta.natureza = body.querySelector("#fNatureza").value || null;
          conta.formaPagamento = body.querySelector("#fFormaPagamento").value || null;
          conta.valor = valor;
          toast("Despesa atualizada");
        } else {
          // Despesa = saída de caixa imediata: já sai lançada como paga, sem vencimento futuro.
          state.contas.push({
            id: uid(),
            descricao: descricao,
            tipo: "pagar",
            natureza: body.querySelector("#fNatureza").value || null,
            formaPagamento: body.querySelector("#fFormaPagamento").value || null,
            valor: valor,
            vencimento: todayISO(),
            status: "pago"
          });
          toast("Despesa lançada");
        }
        saveData();
        closeModal();
        renderAll();
      });
    });
  }

  document.getElementById("btnNovaConta").addEventListener("click", function(){
    openContaModal(null);
  });

  function clienteOptionsHtml(selecionado, rotuloVazio){
    return '<option value="">' + (rotuloVazio || "Selecione...") + '</option>' + state.clientes.map(function(c){
      return '<option value="' + c.id + '"' + (c.id === selecionado ? " selected" : "") + '>' + esc(c.nome) + '</option>';
    }).join("");
  }

  function devedorForm(conta){
    conta = conta || {};
    var produtoAtual = conta.produtoId ? state.produtos.find(function(p){ return p.id === conta.produtoId; }) : null;
    var btnSaveText = conta.id ? "Atualizar" : "Salvar";
    return (
      '<div class="field-row">' +
        '<div class="field"><label>Cliente</label><div style="display:flex;gap:0.4rem;">' +
          '<select id="fDevedorCliente" style="flex:1;">' + clienteOptionsHtml(conta.clienteId) + '</select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnNovoClienteDevedorInline" title="Cadastrar cliente">+</button>' +
        '</div></div>' +
        '<div class="field"><label>Vendedor</label><div style="display:flex;gap:0.4rem;">' +
          '<select id="fDevedorVendedor" style="flex:1;">' + vendedorOptionsHtml(conta.vendedor) + '</select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="btnNovoVendedorDevedorInline" title="Adicionar vendedor">+</button>' +
        '</div></div>' +
      '</div>' +
      '<div class="field"><label>Mercadoria</label>' + comboProdutoHtml(conta.produtoId, produtoAtual ? produtoAtual.nome : (conta.produtoNome || "")) + '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Valor</label><input id="fDevedorValor" type="number" min="0" step="0.01" value="' + (conta.valor || "") + '"></div>' +
        '<div class="field"><label>Data prevista para pagamento</label><input id="fDevedorVencimento" type="date" value="' + (conta.vencimento || todayISO()) + '"></div>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">' + btnSaveText + '</button></div>'
    );
  }

  function openDevedorModal(conta){
    var isEdit = !!conta;
    openModal(isEdit ? "Editar devedor" : "Novo devedor", devedorForm(conta), function(body){
      bindComboProduto(body.querySelector(".combo-wrap"), function(prod){
        body.querySelector("#fDevedorValor").value = prod.preco;
      });

      body.querySelector("#btnCancel").addEventListener("click", closeModal);

      body.querySelector("#btnNovoClienteDevedorInline").addEventListener("click", function(){
        var nome = prompt("Nome do novo cliente:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        var novoCliente = { id: uid(), nome: nome, cpf: "", telefone: "", email: "", obs: "" };
        state.clientes.push(novoCliente);
        saveData();
        body.querySelector("#fDevedorCliente").innerHTML = clienteOptionsHtml(novoCliente.id);
        toast("Cliente cadastrado");
      });

      body.querySelector("#btnNovoVendedorDevedorInline").addEventListener("click", function(){
        var nome = prompt("Nome do novo vendedor:");
        if(!nome) return;
        nome = nome.trim();
        if(!nome) return;
        if(state.vendedores.indexOf(nome) === -1){
          state.vendedores.push(nome);
          saveData();
        }
        body.querySelector("#fDevedorVendedor").innerHTML = vendedorOptionsHtml(nome);
      });

      body.querySelector("#btnSave").addEventListener("click", function(){
        var clienteId = body.querySelector("#fDevedorCliente").value;
        var vendedor = body.querySelector("#fDevedorVendedor").value || null;
        var produtoId = body.querySelector(".v-produto-id").value;
        var valor = parseFloat(body.querySelector("#fDevedorValor").value) || 0;
        var vencimento = body.querySelector("#fDevedorVencimento").value || todayISO();

        if(!clienteId){ toast("Selecione o cliente"); return; }
        if(!produtoId){ toast("Selecione a mercadoria (use a busca)"); return; }
        if(valor <= 0){ toast("Informe um valor válido"); return; }

        var prod = state.produtos.find(function(p){ return p.id === produtoId; });
        if(!prod){ toast("Mercadoria inválida"); return; }

        if(isEdit){
          if(conta.produtoId !== produtoId){
            if(prod.estoque <= 0){ toast("Estoque insuficiente para " + prod.nome); return; }
            var prodAntigo = state.produtos.find(function(p){ return p.id === conta.produtoId; });
            if(prodAntigo) prodAntigo.estoque = Math.max(0, prodAntigo.estoque + 1);
            prod.estoque = Math.max(0, prod.estoque - 1);
          }
          conta.clienteId = clienteId;
          conta.descricao = clienteNome(clienteId);
          conta.vendedor = vendedor;
          conta.produtoId = produtoId;
          conta.produtoNome = prod.nome;
          conta.valor = valor;
          conta.vencimento = vencimento;
          toast("Devedor atualizado");
        } else {
          if(prod.estoque <= 0){ toast("Estoque insuficiente para " + prod.nome); return; }
          prod.estoque = Math.max(0, prod.estoque - 1);
          state.contas.push({
            id: uid(),
            clienteId: clienteId,
            descricao: clienteNome(clienteId),
            tipo: "receber",
            vendedor: vendedor,
            produtoId: produtoId,
            produtoNome: prod.nome,
            valor: valor,
            vencimento: vencimento,
            status: "pendente"
          });
          toast("Devedor adicionado");
        }
        saveData();
        closeModal();
        renderAll();
      });
    });
  }

  document.getElementById("btnNovoDevedor").addEventListener("click", function(){ openDevedorModal(null); });

  // Marcar devedor como pago: pede a forma de pagamento e lança a venda direto no caixa.
  function abrirMarcarDevedorPago(contaId){
    var c = state.contas.find(function(x){ return x.id === contaId; });
    if(!c) return;
    var formas = ["Dinheiro", "Cartão de crédito", "Cartão de débito", "Pix"];
    openModal("Marcar como pago", (
      '<p style="margin:0 0 1rem;color:var(--ink-dim);">' + esc(clienteNome(c.clienteId)) + ' pagou ' + brl(c.valor) + '. Qual foi a forma de pagamento?</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:1rem;">' +
        formas.map(function(f){ return '<button type="button" class="btn btn-ghost" data-forma-pagto="' + esc(f) + '">' + esc(f) + '</button>'; }).join("") +
      '</div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button></div>'
    ), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelectorAll("[data-forma-pagto]").forEach(function(btn){
        btn.addEventListener("click", function(){
          var forma = btn.dataset.formaPagto;
          state.vendas.push({
            id: uid(),
            data: todayISO(),
            criadoEm: new Date().toISOString(),
            clienteId: c.clienteId || null,
            vendedor: c.vendedor || null,
            itens: [{ produtoId: c.produtoId, nome: c.produtoNome || c.descricao, qtd: 1, precoUnit: c.valor }],
            total: c.valor,
            desconto: 0,
            pagamento: forma,
            pagamentos: [{ forma: forma, valor: c.valor }],
            origemDevedorId: c.id
          });
          c.status = "pago";
          saveData();
          closeModal();
          renderAll();
          toast("Pagamento lançado no caixa");
        });
      });
    });
  }

  document.getElementById("tblContas").addEventListener("click", function(e){
    var editId = e.target.dataset.editConta;
    var payId = e.target.dataset.payConta;
    var delId = e.target.dataset.delConta;
    if(editId){
      var c = state.contas.find(function(c){ return c.id === editId; });
      if(c) openContaModal(c);
    }
    if(payId){
      var c = state.contas.find(function(c){ return c.id === payId; });
      if(c){ c.status = "pago"; saveData(); renderAll(); toast("Conta marcada como paga"); }
    }
    if(delId){
      if(confirm("Excluir esta despesa?")){
        state.contas = state.contas.filter(function(c){ return c.id !== delId; });
        saveData(); renderAll(); toast("Despesa excluída");
      }
    }
  });

  document.getElementById("tblDevedores").addEventListener("click", function(e){
    var editId = e.target.dataset.editDevedor;
    var recebidoId = e.target.dataset.recebidoConta;
    var delId = e.target.dataset.delDevedor;
    if(editId){
      var c = state.contas.find(function(c){ return c.id === editId; });
      if(c) openDevedorModal(c);
    }
    if(recebidoId) abrirMarcarDevedorPago(recebidoId);
    if(delId){
      if(confirm("Remover este devedor? O estoque da mercadoria não será restaurado automaticamente.")){
        state.contas = state.contas.filter(function(c){ return c.id !== delId; });
        saveData(); renderAll(); toast("Devedor removido");
      }
    }
  });

  // ================= DASHBOARD =================
  // Estado só de sessão (não é salvo): a cada carregamento/atualização da
  // página os valores voltam a ficar ocultos por padrão. Os KPIs (Vendas,
  // Despesas) só precisam de um clique; os gráficos exigem
  // a senha de admin para revelar.
  var kpiVisiveis = false;
  var graficosVisiveis = false;
  var ADMIN_CODE = "1518";
  var SELLER_DISCOUNT_CODE = "3268";
  var EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-3.1 4.1M6.5 6.6C3.4 8.5 1.5 12 1.5 12S5 19 12 19a10.6 10.6 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var PRINT_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/></svg>';

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
    renderFinanceiro();
  }
  function bindEyeToggle(id){
    document.getElementById(id).addEventListener("click", function(e){
      e.stopPropagation();
      toggleKpiVisiveis();
    });
  }
  bindEyeToggle("eyeVendas");
  bindEyeToggle("eyeDespesas");
  bindEyeToggle("eyeTotal");
  bindEyeToggle("eyeDespesasTotal");

  // Custo da mercadoria é informação de administrador: só aparece com a senha.
  var custoVisivel = false;
  document.getElementById("eyeCusto").addEventListener("click", function(e){
    e.stopPropagation();
    if(custoVisivel){
      custoVisivel = false;
      renderProdutos(document.getElementById("buscaProdutos").value);
      atualizarOlhoCusto();
    } else {
      pedirSenhaAdmin(function(){
        custoVisivel = true;
        renderProdutos(document.getElementById("buscaProdutos").value);
        atualizarOlhoCusto();
      });
    }
  });

  function atualizarOlhoCusto(){
    var btn = document.getElementById("eyeCusto");
    btn.innerHTML = custoVisivel ? EYE_OPEN_SVG : EYE_OFF_SVG;
    btn.setAttribute("aria-pressed", custoVisivel ? "true" : "false");
    btn.setAttribute("aria-label", custoVisivel ? "Ocultar custo" : "Mostrar custo");
    btn.title = custoVisivel ? "Ocultar custo" : "Mostrar custo (admin)";
  }

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
      var vendasMes = sum(vendasAtivas().filter(function(v){ return v.data.slice(0,7) === m.ym; }).map(function(v){ return { valor: v.total }; }));
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
      var tip = opts.tipFn ? opts.tipFn(i) : (labels[i] + ": " + brl(v));
      // Faixa invisível de altura total: garante que passar o mouse/dedo em qualquer
      // ponto da coluna do mês mostre o valor, mesmo quando a barra visível é bem fina.
      bars += '<rect class="chart-hit" data-tip="' + esc(tip) + '" x="' + (padL + slot*i).toFixed(1) + '" y="' + padTop + '" width="' + slot.toFixed(1) + '" height="' + chartH + '" fill="transparent"></rect>';
      bars += '<rect class="chart-bar" data-tip="' + esc(tip) + '" x="' + (cx - barW/2).toFixed(1) + '" y="' + barTop.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + barH.toFixed(1) + '" rx="2" fill="' + color + '"></rect>';
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
      var tip = labels[i] + " — Vendas: " + brl(seriesA[i]) + " · Despesas: " + brl(seriesB[i]);
      bars += '<rect class="chart-hit" data-tip="' + esc(tip) + '" x="' + (padL + slot*i).toFixed(1) + '" y="' + padTop + '" width="' + slot.toFixed(1) + '" height="' + chartH + '" fill="transparent"></rect>';
      bars += '<rect class="chart-bar" data-tip="' + esc(tip) + '" x="' + xA.toFixed(1) + '" y="' + (baselineY - hA).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + hA.toFixed(1) + '" rx="2" fill="' + colorA + '"></rect>';
      bars += '<rect class="chart-bar" data-tip="' + esc(tip) + '" x="' + xB.toFixed(1) + '" y="' + (baselineY - hB).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + hB.toFixed(1) + '" rx="2" fill="' + colorB + '"></rect>';
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
      {
        bipolar: true,
        colorFn: function(v){ return v >= 0 ? "var(--ok)" : "var(--danger)"; },
        tipFn: function(i){
          return dados[i].label + " — Vendas: " + brl(dados[i].vendas) + " · Despesas: " + brl(dados[i].despesas) + " · Crescimento: " + brl(dados[i].cresc);
        }
      }
    );
  }

  // ---------- Tooltip interativo dos gráficos (mouse e toque) ----------
  function bindChartTooltip(containerId){
    var container = document.getElementById(containerId);
    var tooltip = document.getElementById("chartTooltip");
    function mostrar(e, barEl){
      var texto = barEl.getAttribute("data-tip");
      if(!texto) return;
      tooltip.textContent = texto;
      tooltip.classList.remove("hidden");
      var x = e.clientX, y = e.clientY;
      tooltip.style.left = Math.min(x + 12, window.innerWidth - tooltip.offsetWidth - 8) + "px";
      tooltip.style.top = Math.max(y - 36, 8) + "px";
    }
    container.addEventListener("pointermove", function(e){
      var alvo = e.target.closest("[data-tip]");
      if(alvo){ mostrar(e, alvo); } else { tooltip.classList.add("hidden"); }
    });
    container.addEventListener("pointerdown", function(e){
      var alvo = e.target.closest("[data-tip]");
      if(alvo) mostrar(e, alvo);
    });
    // No toque, o dedo "levanta" e o pointerleave dispara na hora (o toque não
    // tem estado de hover); só escondemos aqui para mouse — no toque, o tooltip
    // fica visível até o usuário tocar em outro lugar (ver listener abaixo).
    container.addEventListener("pointerleave", function(e){
      if(e.pointerType !== "touch") tooltip.classList.add("hidden");
    });
  }
  bindChartTooltip("chartVendasDespesas");
  bindChartTooltip("chartCrescimento");
  document.addEventListener("touchstart", function(e){
    if(!e.target.closest("[data-tip]")) document.getElementById("chartTooltip").classList.add("hidden");
  }, { passive: true });

  function renderDashboard(){
    var now = new Date();
    var ym = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
    var vendasMes = vendasAtivas().filter(function(v){ return v.data.slice(0,7) === ym; });
    var totalVendas = sum(vendasMes.map(function(v){ return { valor: v.total }; }));
    document.getElementById("kpiVendasMes").textContent = kpiVisiveis ? brl(totalVendas) : "R$ ••••";
    document.getElementById("kpiVendasQtd").textContent = vendasMes.length + (vendasMes.length === 1 ? " venda" : " vendas");

    var pagarPendente = state.contas.filter(function(c){ return c.tipo === "pagar" && c.status === "pendente"; });
    document.getElementById("kpiPagar").textContent = kpiVisiveis ? brl(sum(pagarPendente)) : "R$ ••••";
    document.getElementById("kpiPagarQtd").textContent = pagarPendente.length + (pagarPendente.length === 1 ? " pendente" : " pendentes");

    [document.getElementById("eyeVendas"), document.getElementById("eyeDespesas")].forEach(function(btn){
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
          return '<tr class="vd-row" data-uv-venda="' + v.id + '" title="Ver detalhes desta venda">' +
            '<td>' + fmtDate(v.data) + '</td>' +
            '<td>' + esc(clienteNome(v.clienteId)) + selosVenda(v) + '</td>' +
            '<td>' + v.itens.length + ' item(ns)</td>' +
            '<td class="cell-strong">' + brl(v.total) + '</td>' +
          '</tr>';
        }).join("");

    renderGraficos();
    renderAlertas();
  }

  function renderAlertas(){
    var hoje = todayISO();
    var vencidas = state.contas.filter(function(c){
      return c.tipo === "pagar" && c.status === "pendente" && c.vencimento < hoje;
    });
    var container = document.getElementById("alertasContainer");
    if(vencidas.length === 0){
      container.innerHTML = "";
      return;
    }
    container.innerHTML = vencidas.map(function(c){
      return '<div class="alerta-item" data-conta-id="' + esc(c.id) + '" title="Clique para ver detalhes">' +
        '<div class="alerta-conteudo">' +
          '<div class="alerta-descricao">' + esc(c.descricao) + '</div>' +
          '<div class="alerta-detalhes">' + esc(c.natureza || "-") + ' • Venceu em ' + fmtDate(c.vencimento) + '</div>' +
        '</div>' +
        '<div class="alerta-valor">' + brl(c.valor) + '</div>' +
      '</div>';
    }).join("");
    container.addEventListener("click", function(e){
      var alerta = e.target.closest(".alerta-item");
      if(alerta){
        var contaId = alerta.dataset.contaId;
        abrirDetalhesDespesas("data", contaId);
      }
    });
  }

  // ================= ADMIN =================
  function vendedorForm(nomeAtual){
    return (
      '<div class="field"><label>Nome</label><input id="fNomeVendedor" value="' + esc(nomeAtual || "") + '" placeholder="Nome do vendedor"></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="btnCancel">Cancelar</button><button class="btn btn-primary" id="btnSave">Salvar</button></div>'
    );
  }

  function openVendedorModal(nomeAtual){
    var isEdit = !!nomeAtual;
    openModal(isEdit ? "Editar vendedor" : "Novo vendedor", vendedorForm(nomeAtual), function(body){
      body.querySelector("#btnCancel").addEventListener("click", closeModal);
      body.querySelector("#btnSave").addEventListener("click", function(){
        var novoNome = body.querySelector("#fNomeVendedor").value.trim();
        if(!novoNome){ toast("Informe o nome do vendedor"); return; }
        if(isEdit){
          if(novoNome !== nomeAtual && state.vendedores.indexOf(novoNome) !== -1){
            toast("Já existe um vendedor com esse nome");
            return;
          }
          var idx = state.vendedores.indexOf(nomeAtual);
          if(idx !== -1) state.vendedores[idx] = novoNome;
          // Mantém o histórico de vendas e comissões ligado ao vendedor renomeado.
          state.vendas.forEach(function(v){ if(v.vendedor === nomeAtual) v.vendedor = novoNome; });
          toast("Vendedor atualizado");
        } else {
          if(state.vendedores.indexOf(novoNome) !== -1){ toast("Já existe um vendedor com esse nome"); return; }
          state.vendedores.push(novoNome);
          toast("Vendedor cadastrado");
        }
        saveData();
        closeModal();
        renderAll();
      });
    });
  }

  function renderVendedores(){
    var tbody = document.getElementById("tblVendedores");
    if(state.vendedores.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="2">Nenhum vendedor cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = state.vendedores.slice().sort().map(function(nome){
      return '<tr>' +
        '<td class="cell-strong">' + esc(nome) + '</td>' +
        '<td class="cell-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-vendedor="' + esc(nome) + '">Editar</button>' +
          '<button class="btn btn-danger btn-sm" data-del-vendedor="' + esc(nome) + '">Excluir</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  document.getElementById("btnNovoVendedor").addEventListener("click", function(){ openVendedorModal(null); });
  document.getElementById("tblVendedores").addEventListener("click", function(e){
    var editNome = e.target.dataset.editVendedor;
    var delNome = e.target.dataset.delVendedor;
    if(editNome) openVendedorModal(editNome);
    if(delNome){
      if(confirm('Remover "' + delNome + '" da lista de vendedores? As vendas já lançadas continuam com o nome dele.')){
        state.vendedores = state.vendedores.filter(function(n){ return n !== delNome; });
        saveData();
        renderAll();
        toast("Vendedor removido");
      }
    }
  });

  document.getElementById("fNomeLoja").addEventListener("change", function(e){
    state.nomeLoja = e.target.value.trim();
    saveData();
  });

  var fechamentoGeralFiltro = { tipo: "mes", inicio: null, fim: null };

  function renderFechamentoGeral(){
    var f = fechamentoGeralFiltro;
    var vendasPeriodo = f.tipo === "custom"
      ? filtrarVendasPorPeriodo("custom", null, f.inicio, f.fim)
      : filtrarVendasPorPeriodo(f.tipo);
    var despesasPeriodo = f.tipo === "custom"
      ? filtrarDespesasPorPeriodo("custom", f.inicio, f.fim)
      : filtrarDespesasPorPeriodo(f.tipo);

    var pagamentos = somarPorForma(vendasPeriodo);
    var totalVendas = vendasPeriodo.reduce(function(s,v){ return s + v.total; }, 0);
    var totalDespesas = despesasPeriodo.reduce(function(s,c){ return s + Number(c.valor || 0); }, 0);
    var totalDesconto = vendasPeriodo.reduce(function(s,v){ return s + (v.desconto || 0); }, 0);
    var pct = Number(state.comissaoPercentual) || 0;
    var totalComissoes = vendasPeriodo.reduce(function(s,v){ return s + (v.vendedor ? v.total * (pct / 100) : 0); }, 0);
    var lucroLiquido = totalVendas - totalDespesas - totalComissoes;

    document.getElementById("fechamentoGeralConteudo").innerHTML =
      '<div class="fechamento-grid">' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Total de Vendas</div>' +
          '<div class="fechamento-valor">' + brl(totalVendas) + '</div>' +
        '</div>' +
        '<div class="fechamento-box">' +
          '<div class="fechamento-label">Despesas</div>' +
          '<div class="fechamento-valor" style="color:var(--danger);">' + brl(totalDespesas) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="fechamento-detalhes">' +
        '<div class="fechamento-label" style="margin-bottom:0.6rem;">Vendas por forma de pagamento</div>' +
        fechamentoDetalhesHtml(pagamentos,
          '<div style="margin-top:0.8rem;padding-top:0.8rem;border-top:2px solid var(--line);">' +
            '<div class="fechamento-detalhes-row"><span>Descontos concedidos</span><span>- ' + brl(totalDesconto) + '</span></div>' +
            '<div class="fechamento-detalhes-row"><span>Comissões (' + pct + '%)</span><span>- ' + brl(totalComissoes) + '</span></div>' +
            '<div class="fechamento-detalhes-row" style="font-weight:700;color:' + (lucroLiquido >= 0 ? "var(--ok)" : "var(--danger)") + ';">' +
              '<span>Lucro líquido</span><span>' + brl(lucroLiquido) + '</span>' +
            '</div>' +
          '</div>'
        ) +
      '</div>';
  }

  document.getElementById("fechamentoGeralFiltros").addEventListener("click", function(e){
    var btn = e.target.closest("[data-fg-filtro]");
    if(!btn) return;
    fechamentoGeralFiltro = { tipo: btn.dataset.fgFiltro, inicio: null, fim: null };
    document.querySelectorAll("#fechamentoGeralFiltros [data-fg-filtro]").forEach(function(b){
      b.classList.toggle("btn-primary", b === btn);
      b.classList.toggle("btn-ghost", b !== btn);
    });
    document.getElementById("fechamentoGeralPeriodoLabel").textContent = "";
    renderFechamentoGeral();
  });

  criarSeletorPeriodo("btnPeriodoGeral", "periodoGeralPopover", null, function(inicio, fim){
    fechamentoGeralFiltro = { tipo: "custom", inicio: inicio, fim: fim };
    document.querySelectorAll("#fechamentoGeralFiltros [data-fg-filtro]").forEach(function(b){
      b.classList.remove("btn-primary");
      b.classList.add("btn-ghost");
    });
    document.getElementById("fechamentoGeralPeriodoLabel").textContent = fmtDate(inicio) + " a " + fmtDate(fim);
    renderFechamentoGeral();
  }, function(){
    fechamentoGeralFiltro = { tipo: "mes", inicio: null, fim: null };
    document.querySelectorAll("#fechamentoGeralFiltros [data-fg-filtro]").forEach(function(b){
      b.classList.toggle("btn-primary", b.dataset.fgFiltro === "mes");
      b.classList.toggle("btn-ghost", b.dataset.fgFiltro !== "mes");
    });
    document.getElementById("fechamentoGeralPeriodoLabel").textContent = "";
    renderFechamentoGeral();
  });

  function renderAdmin(){
    document.getElementById("fNomeLoja").value = state.nomeLoja || "";
    renderVendedores();
    renderFechamentoGeral();
  }

  // ================= RENDER ALL =================
  function renderAll(){
    renderDashboard();
    renderClientes(document.getElementById("buscaClientes").value);
    renderProdutos(document.getElementById("buscaProdutos").value);
    renderVendas(document.getElementById("buscaVendas").value);
    renderAssistencias();
    renderFinanceiro();
    renderAdmin();
    atualizarOlhoCusto();
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
