// CONFIGURAÇÕES DE ACESSO DO SUPABASE
const SUPABASE_URL = "https://oqrcegtzcxmftyrjanhc.supabase.co";
const SUPABASE_CONEXAO_KEY = "sb_publishable_RZTGGBVkwTo-JQklJVVsjA_ps_VCR-J";

const conexaoSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_CONEXAO_KEY);

// Variáveis de memória de trabalho do sistema
let matrizClientes = [];
let matrizProdutos = [];
let matrizHistoricoVendas = [];
let carrinhoVendaAtual = [];
let ultimaVendaGerada = null;

// Seletores fixos do DOM
const seletorVendaCliente = document.getElementById('selecao-venda-cliente');
const seletorVendaProduto = document.getElementById('selecao-venda-produto');
const containerListaClientes = document.getElementById('lista-clientes');
const containerListaProdutos = document.getElementById('lista-produtos');
const tabelaCarrinhoCorpo = document.getElementById('corpo-tabela-carrinho');
const spanTotalNota = document.getElementById('total-nota');
const containerHistoricoVendas = document.getElementById('container-historico');

// --- INICIALIZAÇÃO AUTOMÁTICA ---
document.addEventListener("DOMContentLoaded", () => {
    iniciarSistema();
});

// --- SISTEMA DE NAVEGAÇÃO DE ABAS CORRIGIDO ---
function mudarAba(idAbaAlvo) {
    const todasAbas = document.querySelectorAll('.aba-conteudo');
    todasAbas.forEach(aba => aba.classList.add('hidden'));

    document.getElementById(idAbaAlvo).classList.remove('hidden');

    const todosBotoes = document.querySelectorAll('.aba-botao');
    todosBotoes.forEach(botao => {
        botao.classList.remove('bg-yellow-400', 'text-black', 'bg-zinc-800', 'text-gray-300', 'hover:bg-zinc-700');
        botao.classList.add('bg-zinc-800', 'text-gray-300', 'hover:bg-zinc-700');
    });

    let idBotaoAtivo = 'botao-' + idAbaAlvo;
    const botaoAtivo = document.getElementById(idBotaoAtivo);
    
    botaoAtivo.classList.remove('bg-zinc-800', 'text-gray-300', 'hover:bg-zinc-700');
    botaoAtivo.classList.add('bg-yellow-400', 'text-black');
}

// --- CARREGAMENTO INICIAL DE DADOS ---
async function iniciarSistema() {
    await buscarClientesBanco();
    await buscarProdutosBanco();
    await buscarHistoricoBanco();
}

async function buscarClientesBanco() {
    const { data, error } = await conexaoSupabase.from('clientes').select('*').order('nome', { ascending: true });
    if (error) return console.error('Falha ao sincronizar clientes:', error);
    
    matrizClientes = data;
    renderizarPainelClientes();
}

async function buscarProdutosBanco() {
    const { data, error } = await conexaoSupabase.from('produtos').select('*').order('nome', { ascending: true });
    if (error) return console.error('Falha ao sincronizar produtos:', error);
    
    matrizProdutos = data;
    renderizarPainelProdutos();
}

async function buscarHistoricoBanco() {
    const { data, error } = await conexaoSupabase.from('vendas').select('*').order('criado_em', { ascending: false });
    if (error) return console.error('Falha ao sincronizar vendas:', error);
    
    matrizHistoricoVendas = data;
    // ALTERAÇÃO AQUI: Passamos um array vazio [] para que a tela comece limpa
    renderizarPainelHistorico([]); 
}

// --- RENDERIZADORES DE TELAS ---
function renderizarPainelClientes() {
    containerListaClientes.innerHTML = '';
    seletorVendaCliente.innerHTML = '<option value="">-- Escolha um Cliente --</option>';
    
    matrizClientes.forEach(cliente => {
        const exibicaoCliente = cliente.cidade ? `${cliente.nome} (${cliente.cidade})` : cliente.nome;

        seletorVendaCliente.innerHTML += `<option value="${exibicaoCliente}">${exibicaoCliente}</option>`;
        containerListaClientes.innerHTML += `
            <li class="flex justify-between items-center py-2 text-sm text-gray-700">
                <span><strong>${cliente.nome}</strong> <span class="text-xs text-gray-500">-${cliente.cidade}</span></span>
                <button onclick="removerClienteDoBanco(${cliente.id})" class="text-red-500 hover:text-red-700 font-bold">Excluir</button>
            </li>`;
    });
}

function renderizarPainelProdutos() {
    containerListaProdutos.innerHTML = '';
    seletorVendaProduto.innerHTML = '<option value="">-- Escolha um Produto --</option>';

    matrizProdutos.forEach(produto => {
        seletorVendaProduto.innerHTML += `<option value="${produto.id}">${produto.nome} - R$ ${parseFloat(produto.preco).toFixed(2)}</option>`;
        containerListaProdutos.innerHTML += `
            <li class="flex justify-between items-center py-2 text-sm text-gray-700">
                <span><strong>${produto.nome}</strong> (R$ ${parseFloat(produto.preco).toFixed(2)})</span>
                <div class="flex gap-4">
                    <button onclick="prepararEdicaoProduto(${produto.id})" class="text-blue-600 hover:text-blue-800 font-bold">✏️ Editar</button>
                    <button onclick="removerProdutoDoBanco(${produto.id})" class="text-red-500 hover:text-red-700 font-bold">Excluir</button>
                </div>
            </li>`;
    });
}

function renderizarPainelHistorico(listaVendas) {
    containerHistoricoVendas.innerHTML = '';
    if (!listaVendas || listaVendas.length === 0) {
        containerHistoricoVendas.innerHTML = '<p class="text-gray-400 text-sm">Nenhum registro encontrado para este filtro.</p>';
        return;
    }

    listaVendas.forEach(venda => {
        const dataInclusao = new Date(venda.criado_em).toLocaleString('pt-BR');
        containerHistoricoVendas.innerHTML += `
            <div class="bloco-venda border p-4 rounded bg-gray-50 space-y-2">
                <div class="flex justify-between text-xs text-gray-500">
                    <span>${dataInclusao}</span>
                    <span class="font-bold text-gray-700 text-sm">Total: R$ ${parseFloat(venda.total).toFixed(2)}</span>
                </div>
                <div class="text-md font-bold text-gray-800">${venda.cliente_nome}</div>
                <div class="text-xs text-gray-600 bg-white p-2 rounded border max-h-20 overflow-y-auto">
                    ${venda.itens.map(item => `${item.quantidade}x ${item.nome} (R$ ${parseFloat(item.preco).toFixed(2)})`).join(' | ')}
                </div>
                <button onclick='refazerPedidoAntigo(${JSON.stringify(venda)})' class="w-full text-xs bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition shadow mb-1">
                    🔄 Refazer este Pedido (Nova Data)
                </button>
                <button onclick='gerarLayoutCupom(${JSON.stringify(venda)})' class="w-full text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded font-medium">
                    🖨️ Reimprimir Nota 
                </button>
            </div>`;
    });
}

function refazerPedidoAntigo(dadosVendaAntiga) {
    // 1. Pergunta para confirmar e não fazer por engano
    if (!confirm(`Deseja carregar os itens do pedido de "${dadosVendaAntiga.cliente_nome}" para uma nova venda?`)) {
        return;
    }

    // 2. Limpa qualquer coisa que já estivesse no carrinho atual antes
    resetarPainelParaNovaNota();

    // 3. Seleciona automaticamente o cliente no menu drop-down
    seletorVendaCliente.value = dadosVendaAntiga.cliente_nome;

    // 4. Copia os itens do histórico para o carrinho de trabalho atual
    // Usamos o 'map' para garantir que os dados sejam copiados sem vínculos com o passado
    carrinhoVendaAtual = dadosVendaAntiga.itens.map(item => ({
        id: item.id,
        nome: item.nome,
        preco: item.preco, // Mantém o preço que foi cobrado no dia (ótimo para os clientes antigos!)
        quantidade: item.quantidade
    }));

    // 5. Atualiza a tabela visual do carrinho para mostrar os itens na tela
    atualizarGradeCarrinho();

    // 6. Muda de aba automaticamente para o cliente já ver a nota montada
    mudarAba('aba-notas');
    
    alert("Itens carregados com sucesso! Revise os valores e clique em 'Finalizar Nota' para salvar com a data de hoje.");
}

function filtrarHistoricoPorCliente() {
    const termoBusca = document.getElementById('filtro-cliente').value.toLowerCase().trim();
    
    
    if (termoBusca === '') {
        renderizarPainelHistorico([]);
        return;
    }
    
    const filtrados = matrizHistoricoVendas.filter(venda => 
        venda.cliente_nome.toLowerCase().includes(termoBusca)
    );
    renderizarPainelHistorico(filtrados);
}

// --- EVENTOS DE CADASTROS / ATUALIZAÇÕES ---
document.getElementById('formulario-cliente').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nomeCliente = document.getElementById('cliente-nome').value.trim();
    const cidadeCliente = document.getElementById('cliente-cidade').value.trim();
    const telefoneCliente = document.getElementById('cliente-telefone').value.trim();

    const { error } = await conexaoSupabase.from('clientes').insert([
        { nome: nomeCliente, cidade: cidadeCliente, telefone: telefoneCliente }
    ]);
    if (error) return alert('Erro ao salvar cliente: ' + error.message);

    document.getElementById('formulario-cliente').reset();
    buscarClientesBanco();
});

// FORMULÁRIO DE PRODUTOS (Salva Novo OU Atualiza Existente)
document.getElementById('formulario-produto').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const idEdicao = document.getElementById('produto-id-edicao').value;
    const nomeProduto = document.getElementById('produto-nome').value.trim();
    const precoProduto = parseFloat(document.getElementById('produto-preco').value);

    if (idEdicao) {
        // Modo Edição (Update)
        const { error } = await conexaoSupabase
            .from('produtos')
            .update({ nome: nomeProduto, preco: precoProduto })
            .eq('id', idEdicao);

        if (error) return alert('Erro ao atualizar produto: ' + error.message);
        alert('Produto atualizado com sucesso!');
        cancelarEdicaoProduto();
    } else {
        // Modo Cadastro Novo (Insert)
        const { error } = await conexaoSupabase.from('produtos').insert([{ nome: nomeProduto, preco: precoProduto }]);
        if (error) return alert('Erro ao salvar produto: ' + error.message);
    }

    document.getElementById('formulario-produto').reset();
    buscarProdutosBanco();
});

// Prepara o formulário para fazer a alteração do produto
function prepararEdicaoProduto(idProduto) {
    const produto = matrizProdutos.find(p => p.id === idProduto);
    if (!produto) return;

    document.getElementById('produto-id-edicao').value = produto.id;
    document.getElementById('produto-nome').value = produto.nome;
    document.getElementById('produto-preco').value = produto.preco;

    // Altera a identidade visual para avisar que está editando
    document.getElementById('titulo-formulario-produto').innerText = "✏️ Alterar Dados do Produto";
    document.getElementById('botao-salvar-produto').innerText = "Atualizar Produto";
    document.getElementById('botao-salvar-produto').classList.replace('bg-blue-600', 'bg-amber-500');
    document.getElementById('botao-salvar-produto').classList.replace('hover:bg-blue-700', 'hover:bg-amber-600');
    document.getElementById('botao-cancelar-edicao').classList.remove('hidden');

    // Rola a página de volta para o formulário de forma suave
    document.getElementById('formulario-produto').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoProduto() {
    document.getElementById('produto-id-edicao').value = "";
    document.getElementById('formulario-produto').reset();

    document.getElementById('titulo-formulario-produto').innerText = "📦 Cadastrar Novo Produto";
    document.getElementById('botao-salvar-produto').innerText = "Salvar Produto";
    document.getElementById('botao-salvar-produto').classList.replace('bg-amber-500', 'bg-blue-600');
    document.getElementById('botao-salvar-produto').classList.replace('hover:bg-amber-600', 'hover:bg-blue-700');
    document.getElementById('botao-cancelar-edicao').classList.add('hidden');
}

// --- REMOÇÕES DE DADOS ---
async function removerClienteDoBanco(id) {
    if (confirm('A exclusão não apagará notas antigas, mas removerá o cliente da lista. Confirmar?')) {
        await conexaoSupabase.from('clientes').delete().eq('id', id);
        buscarClientesBanco();
    }
}

async function removerProdutoDoBanco(id) {
    if (confirm('Remover este produto de vendas futuras?')) {
        await conexaoSupabase.from('produtos').delete().eq('id', id);
        buscarProdutosBanco();
    }
}

// --- GERENCIAMENTO DA MONTAGEM DA NOTA ---
function adicionarProdutoAoCarrinho() {
    const idProdutoSelecionado = parseInt(seletorVendaProduto.value);
    const quantidadeDigitada = parseInt(document.getElementById('venda-quantidade').value);
    
    if (!idProdutoSelecionado || quantidadeDigitada < 1) return alert('Selecione um produto válido e a quantidade.');

    const correspondenteProduto = matrizProdutos.find(p => p.id === idProdutoSelecionado);
    const itemDuplicado = carrinhoVendaAtual.find(item => item.id === idProdutoSelecionado);

    if (itemDuplicado) {
        itemDuplicado.quantidade += quantidadeDigitada;
    } else {
        carrinhoVendaAtual.push({
            id: correspondenteProduto.id,
            nome: correspondenteProduto.nome,
            preco: correspondenteProduto.preco, // Preço padrão inicial
            quantidade: quantidadeDigitada
        });
    }
    atualizarGradeCarrinho();
}

// Função para o usuário mudar o preço dinamicamente na tabela
function alterarPrecoItemCarrinho(index, novoPreco) {
    const valorNum = parseFloat(novoPreco);
    if (isNaN(valorNum) || valorNum < 0) return;
    
    carrinhoVendaAtual[index].preco = valorNum;
    
    // Recalcula o subtotal e total sem redesenhar os inputs (evita perder o foco da digitação)
    let acumuladorTotal = 0;
    carrinhoVendaAtual.forEach((item, idx) => {
        const subtotalItem = item.preco * item.quantidade;
        acumuladorTotal += subtotalItem;
    });
    spanTotalNota.innerText = acumuladorTotal.toFixed(2);
}

function atualizarGradeCarrinho() {
    tabelaCarrinhoCorpo.innerHTML = '';
    let acumuladorTotal = 0;

    carrinhoVendaAtual.forEach((item, index) => {
        const subtotalItem = item.preco * item.quantidade;
        acumuladorTotal += subtotalItem;
        tabelaCarrinhoCorpo.innerHTML += `
            <tr class="border-b">
                <td class="py-2 font-medium">${item.nome}</td>
                <td>${item.quantidade}x</td>
                <td>
                    <input type="number" step="0.01" min="0" value="${item.preco.toFixed(2)}" 
                        oninput="alterarPrecoItemCarrinho(${index}, this.value)" 
                        class="w-20 p-1 border border-gray-300 rounded font-bold text-center bg-yellow-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none">
                </td>
                <td class="text-right">
                    <button onclick="removerProdutoDoCarrinho(${index})" class="text-red-500 hover:text-red-700 font-bold px-2">❌</button>
                </td>
            </tr>`;
    });
    spanTotalNota.innerText = acumuladorTotal.toFixed(2);
}

function removerProdutoDoCarrinho(indexDoItem) {
    carrinhoVendaAtual.splice(indexDoItem, 1);
    atualizarGradeCarrinho();
}

// --- FECHAMENTO DA COMPRA E IMPRESSÃO ---
async function finalizarESalvarNota() {
    const nomeDoClienteSelecionado = seletorVendaCliente.value;
    if (!nomeDoClienteSelecionado) return alert('Por favor, defina o cliente antes de prosseguir.');
    if (carrinhoVendaAtual.length === 0) return alert('É necessário ter ao menos um item adicionado na nota.');

    const botaoAcaoNota = document.getElementById('botao-finalizar-nota');
    botaoAcaoNota.disabled = true;
    botaoAcaoNota.innerText = "Registrando Informações...";

    const somatorioTotal = carrinhoVendaAtual.reduce((total, item) => total + (item.preco * item.quantidade), 0);

    try {
        const { data, error } = await conexaoSupabase.from('vendas').insert([
            { cliente_nome: nomeDoClienteSelecionado, itens: carrinhoVendaAtual, total: somatorioTotal }
        ]).select();

        if (error) throw error;

        ultimaVendaGerada = data[0];

        botaoAcaoNota.classList.add('hidden');
        document.getElementById('bloco-acoes-pos-venda').classList.remove('hidden');

        await buscarHistoricoBanco();

    } catch (erroGeral) {
        alert('Falha ao salvar no Banco: ' + (erroGeral.message || erroGeral));
        botaoAcaoNota.disabled = false;
        botaoAcaoNota.innerText = "💾 Finalizar Nota";
    }
}

function dispararImpressaoFisica() {
    if (!ultimaVendaGerada) return alert("Nenhuma nota gerada para imprimir.");
    gerarLayoutCupom(ultimaVendaGerada);
}

function enviarNotaWhatsApp() {
    if (!ultimaVendaGerada) return alert("Nenhuma nota gerada para enviar.");

    const nomeBruto = ultimaVendaGerada.cliente_nome.split(' (')[0];
    const clienteEncontrado = matrizClientes.find(c => c.nome === nomeBruto);
    const telefoneDestino = clienteEncontrado ? clienteEncontrado.telefone.replace(/\D/g, '') : '';
    
    let textoMensagem = `*FDTECH - RESUMO DO PEDIDO*\n`;
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*Cliente:* ${ultimaVendaGerada.cliente_nome}\n`;
    textoMensagem += `*Controle:* #${ultimaVendaGerada.id}\n`;
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*ITENS DO PEDIDO:*\n`;
    
    ultimaVendaGerada.itens.forEach(item => {
        const sub = item.preco * item.quantidade;
        textoMensagem += `▪️ ${item.quantidade}x ${item.nome} (un: R$ ${parseFloat(item.preco).toFixed(2)}) -> R$ ${sub.toFixed(2)}\n`;
    });
    
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*TOTAL GERAL: R$ ${parseFloat(ultimaVendaGerada.total).toFixed(2)}*\n\n`;
    textoMensagem += `_Obrigado pela preferência!_`;

    const linkWhatsApp = `https://api.whatsapp.com/send?phone=55${telefoneDestino}&text=${encodeURIComponent(textoMensagem)}`;
    window.open(linkWhatsApp, '_blank');
}

function resetarPainelParaNovaNota() {
    ultimaVendaGerada = null;
    carrinhoVendaAtual = [];
    seletorVendaCliente.value = '';
    atualizarGradeCarrinho();
    
    document.getElementById('botao-finalizar-nota').classList.remove('hidden');
    document.getElementById('botao-finalizar-nota').disabled = false;
    document.getElementById('botao-finalizar-nota').innerText = "💾 Finalizar Nota";
    document.getElementById('bloco-acoes-pos-venda').classList.add('hidden');
}

// --- LAYOUT DE IMPRESSÃO ---
function gerarLayoutCupom(dadosVenda) {
    const divAlvoImpressao = document.getElementById('espaco-cupom-impressao');
    const tipoImpressao = document.getElementById('seletor-impressao').value;
    
    let listaItensFormatada = '';
    const dataNota = new Date(dadosVenda.criado_em || new Date()).toLocaleString('pt-BR');

    dadosVenda.itens.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        if (tipoImpressao === 'modo-a4') {
            listaItensFormatada += `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ddd;">
                <span>${item.nome} (x${item.quantidade})</span>
                <span>R$ ${subtotal.toFixed(2)}</span>
            </div>`;
        } else {
            listaItensFormatada += `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; max-width: 220px;">
                <span style="max-width: 65%; word-break: break-word;">
                    ${item.quantidade}x ${item.nome}
                    <small style="display: block; color: #555; font-size: 9px;">(un: R$ ${parseFloat(item.preco).toFixed(2)})</small>
                </span>
                <span style="font-weight: bold; white-space: nowrap;">R$ ${subtotal.toFixed(2)}</span>
            </div>`;
        }
    });

    const divisor = tipoImpressao === 'modo-a4' ? '<hr style="border: 1px solid #000; margin: 15px 0;">' : '<div>--------------------------------</div>';

    if (tipoImpressao === 'modo-a4') {
        divAlvoImpressao.innerHTML = `
            <div style="padding: 20px; border: 2px solid #000; border-radius: 4px;">
                <div style="text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 2px; margin-bottom: 5px;">FDTECH</div>
                <div style="text-align: center; font-size: 14px; text-transform: uppercase; font-weight: bold; color: #555;">Documento Auxiliar de Venda</div>
                ${divisor}
                <div style="display: flex; justify-content: space-between;">
                    <div><b>Data de Emissão:</b> ${dataNota}</div>
                    <div><b>Controle:</b> #${dadosVenda.id}</div>
                </div>
                <div style="margin-top: 8px;"><b>Cliente:</b> ${dadosVenda.cliente_nome}</div>
                ${divisor}
                <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">RELAÇÃO DE PRODUTOS:</div>
                <div style="margin-bottom: 20px;">${listaItensFormatada}</div>
                <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
                    <span style="font-size: 18px; font-weight: bold;">VALOR TOTAL DO PEDIDO:</span>
                    <span style="font-size: 24px; font-weight: black; background: #000; color: #fff; padding: 5px 15px; border-radius: 4px;">R$ ${parseFloat(dadosVenda.total).toFixed(2)}</span>
                </div>
                <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #666;">Documento sem valor fiscal - Gerado por FDTECH Sistema de Faturamento.</div>
            </div>`;
    } else {
        divAlvoImpressao.innerHTML = `
            <div style="max-width: 220px;">
                <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">CUPOM DE VENDA</div>
                <div>--------------------------------</div>
                <div><b>Data:</b> ${dataNota}</div>
                <div><b>Cliente:</b> ${dadosVenda.cliente_nome}</div>
                <div>--------------------------------</div>
                <div style="font-weight: bold; margin-bottom: 4px;">ITENS:</div>
                ${listaItensFormatada}
                ${divisor}
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; max-width: 220px;">
                    <span>TOTAL:</span>
                    <span>R$ ${parseFloat(dadosVenda.total).toFixed(2)}</span>
                </div>
                <br>
                <div style="text-align: center; font-style: italic;">Obrigado pela Preferência!</div>
            </div>`;
    }
        
    window.print();
    divAlvoImpressao.innerHTML = ''; 
}