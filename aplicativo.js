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

// --- SISTEMA DE NAVEGAÇÃO DE ABAS ---
// --- SISTEMA DE NAVEGAÇÃO DE ABAS CORRIGIDO ---
function mudarAba(idAbaAlvo) {
    const todasAbas = document.querySelectorAll('.aba-conteudo');
    todasAbas.forEach(aba => aba.classList.add('hidden'));

    document.getElementById(idAbaAlvo).classList.remove('hidden');

    const todosBotoes = document.querySelectorAll('.aba-botao');
    todosBotoes.forEach(botao => {
        // Reseta o botão para o padrão Escuro (Inativo)
        botao.classList.remove('bg-yellow-400', 'text-black', 'bg-zinc-800', 'text-gray-300', 'hover:bg-zinc-700');
        botao.classList.add('bg-zinc-800', 'text-gray-300', 'hover:bg-zinc-700');
    });

    let idBotaoAtivo = 'botao-' + idAbaAlvo;
    const botaoAtivo = document.getElementById(idBotaoAtivo);
    
    // Aplica o estilo Destacado (Ativo) no botão clicado
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
    renderizarPainelHistorico([]); 
}

// --- RENDERIZADORES DE TELAS ---
function renderizarPainelClientes() {
    containerListaClientes.innerHTML = '';
    seletorVendaCliente.innerHTML = '<option value="">-- Escolha um Cliente --</option>';
    
    matrizClientes.forEach(cliente => {
        // Formata o nome para incluir a cidade se ela existir
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
                <span>${produto.nome} (R$ ${parseFloat(produto.preco).toFixed(2)})</span>
                <button onclick="removerProdutoDoBanco(${produto.id})" class="text-red-500 hover:text-red-700 font-bold">Excluir</button>
            </li>`;
    });
}

function renderizarPainelHistorico(listaVendas) {
    containerHistoricoVendas.innerHTML = '';
    if (listaVendas.length === 0) {
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
                    ${venda.itens.map(item => `${item.quantidade}x ${item.nome}`).join(' | ')}
                </div>
                <button onclick="gerarLayoutCupom(${JSON.stringify(venda).replace(/"/g, '&quot;')})" class="w-full text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded font-medium">
                    🖨️ Reimprimir Nota Fiscal
                </button>
            </div>`;
    });
}

// --- EVENTOS DE CADASTROS (INSERÇÃO) ---
document.getElementById('formulario-cliente').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nomeCliente = document.getElementById('cliente-nome').value.trim();
    const cidadeCliente = document.getElementById('cliente-cidade').value.trim();
    const telefoneCliente = document.getElementById('cliente-telefone').value.trim(); // Captura o telefone

    const { error } = await conexaoSupabase.from('clientes').insert([
        { nome: nomeCliente, cidade: cidadeCliente, telefone: telefoneCliente }
    ]);
    if (error) return alert('Erro ao salvar cliente: ' + error.message);

    document.getElementById('formulario-cliente').reset();
    buscarClientesBanco();
});

document.getElementById('formulario-produto').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nomeProduto = document.getElementById('produto-nome').value.trim();
    const precoProduto = parseFloat(document.getElementById('produto-preco').value);

    const { error } = await conexaoSupabase.from('produtos').insert([{ nome: nomeProduto, preco: precoProduto }]);
    if (error) return alert('Erro ao salvar produto: ' + error.message);

    document.getElementById('formulario-produto').reset();
    buscarProdutosBanco();
});

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
            preco: correspondenteProduto.preco,
            quantidade: quantidadeDigitada
        });
    }
    atualizarGradeCarrinho();
}

function atualizarGradeCarrinho() {
    tabelaCarrinhoCorpo.innerHTML = '';
    let acumuladorTotal = 0;

    carrinhoVendaAtual.forEach((item, index) => {
        const subtotalItem = item.preco * item.quantidade;
        acumuladorTotal += subtotalItem;
        tabelaCarrinhoCorpo.innerHTML += `
            <tr class="border-b">
                <td class="py-2">${item.nome}</td>
                <td>${item.quantidade}x</td>
                <td>R$ ${subtotalItem.toFixed(2)}</td>
                <td class="text-right">
                    <button onclick="removerProdutoDoCarrinho(${index})" class="text-red-500 hover:text-red-700 font-bold px-2">❌</button>
                </td>
            </tr>`;
    });
    spanTotalNota.innerText = acumuladorTotal.toFixed(2);
}

function removerProdutoDoCarrinho(indexDoItem) {
    // Remove o item da matriz usando a posição dele
    carrinhoVendaAtual.splice(indexDoItem, 1);
    
    // Atualiza a tela e recalcula o total automaticamente
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

        // Guarda a venda salva na memória global para os botões de ação usarem
        ultimaVendaGerada = data[0];

        // Altera os botões na tela: esconde o finalizar e mostra os novos botões
        botaoAcaoNota.classList.add('hidden');
        document.getElementById('bloco-acoes-pos-venda').classList.remove('hidden');

        // Atualiza a lista do histórico em background
        await buscarHistoricoBanco();

    } catch (erroGeral) {
        alert('Falha ao salvar no Banco: ' + (erroGeral.message || erroGeral));
        botaoAcaoNota.disabled = false;
        botaoAcaoNota.innerText = "💾 Finalizar Nota";
    }
}

// --- IMPRESSÃO ACIONADA PELO NOVO BOTÃO ---
function dispararImpressaoFisica() {
    if (!ultimaVendaGerada) return alert("Nenhuma nota gerada para imprimir.");
    gerarLayoutCupom(ultimaVendaGerada);
}

// --- ENVIO DA NOTA TEXTUAL FORMATADA VIA WHATSAPP ---
function enviarNotaWhatsApp() {
    if (!ultimaVendaGerada) return alert("Nenhuma nota gerada para enviar.");

    // Tenta encontrar o telefone correspondente na nossa lista de clientes
    const nomeBruto = ultimaVendaGerada.cliente_nome.split(' (')[0];
    const clienteEncontrado = matrizClientes.find(c => c.nome === nomeBruto);
    
    const telefoneDestino = clienteEncontrado ? clienteEncontrado.telefone.replace(/\D/g, '') : '';
    
    // Monta a mensagem de texto com uma formatação limpa e organizada
    let textoMensagem = `*FDTECH - RESUMO DO PEDIDO*\n`;
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*Cliente:* ${ultimaVendaGerada.cliente_nome}\n`;
    textoMensagem += `*Controle:* #${ultimaVendaGerada.id}\n`;
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*ITENS DO PEDIDO:*\n`;
    
    ultimaVendaGerada.itens.forEach(item => {
        const sub = item.preco * item.quantidade;
        textoMensagem += `▪️ ${item.quantidade}x ${item.nome} -> R$ ${sub.toFixed(2)}\n`;
    });
    
    textoMensagem += `-----------------------------------\n`;
    textoMensagem += `*TOTAL GERAL: R$ ${parseFloat(ultimaVendaGerada.total).toFixed(2)}*\n\n`;
    textoMensagem += `_Obrigado pela preferência!_`;
    textoMensagem += `\n\n*GERADO POR: FDTECH*`;

    // Codifica o texto para formato de URL
    const linkWhatsApp = `https://api.whatsapp.com/send?phone=55${telefoneDestino}&text=${encodeURIComponent(textoMensagem)}`;
    
    // Abre em uma nova aba do navegador
    window.open(linkWhatsApp, '_blank');
}

// --- VOLTA O PAINEL PARA O ESTADO INICIAL PARA A PRÓXIMA VENDA ---
function resetarPainelParaNovaNota() {
    ultimaVendaGerada = null;
    carrinhoVendaAtual = [];
    seletorVendaCliente.value = '';
    atualizarGradeCarrinho();
    
    // Restaura a visibilidade dos botões
    document.getElementById('botao-finalizar-nota').classList.remove('hidden');
    document.getElementById('botao-finalizar-nota').disabled = false;
    document.getElementById('botao-finalizar-nota').innerText = "💾 Finalizar Nota";
    document.getElementById('bloco-acoes-pos-venda').classList.add('hidden');
}

// --- FUNÇÃO GERAR LAYOUT CUPOM (Sem a limpeza automática imediata da memória) ---
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
            </div>
        `;
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
                <div style="margin-top: 20px; text-align: center;">.</div>
            </div>
        `;
    }
        
    window.print();
    divAlvoImpressao.innerHTML = ''; 
}

// Altere de "generar..." para "gerar..."
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
            </div>
        `;
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
                <div style="margin-top: 20px; text-align: center;">.</div>
            </div>
        `;
    }
        
    window.print();
    divAlvoImpressao.innerHTML = ''; 
}
// --- FUNÇÃO DE FILTRO/BUSCA POR CLIENTE ---
function filtrarHistoricoPorCliente() {
    const termoBusca = document.getElementById('filtro-cliente').value.toLowerCase().trim();
    
    // Se não digitou nada, deixa a tela do histórico em branco
    if (termoBusca === '') {
        renderizarPainelHistorico([]);
    } else {
        // Se digitou, filtra as notas que batem com o nome do cliente
        const registrosFiltrados = matrizHistoricoVendas.filter(venda => 
            venda.cliente_nome.toLowerCase().includes(termoBusca)
        );
        renderizarPainelHistorico(registrosFiltrados);
    }
}

function atualizarTipoImpressao() {
    const tipoSelecionado = document.getElementById('seletor-impressao').value;
    const divAlvoImpressao = document.getElementById('espaco-cupom-impressao');
    
    // Remove as classes antigas e aplica a nova escolha
    divAlvoImpressao.className = '';
    divAlvoImpressao.classList.add(tipoSelecionado);
}

// Inicialização imediata ao abrir a aplicação
iniciarSistema();