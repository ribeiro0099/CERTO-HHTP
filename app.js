// Inicializa o Supabase usando as credenciais do config.js
const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let questoesAtuais = [];
let jaConferiu = false;
let materiaAtual = '';

// 1. CARREGA AS MATÉRIAS AO SELECIONAR UM EXAME
document.getElementById('select-categoria').addEventListener('change', async (e) => {
    const selectMateria = document.getElementById('select-materia');
    selectMateria.innerHTML = '<option value="">Carregando matérias...</option>';
    selectMateria.disabled = true;

    // CORREÇÃO: Busca as matérias na tabela 'questoes_simulado' para aparecer Inglês e Espanhol
    const { data, error } = await _supabase.from('questoes_simulado').select('materia');

    if (error) {
        console.error("Erro ao carregar matérias:", error);
        selectMateria.innerHTML = `<option value="">❌ Erro ao buscar</option>`;
        selectMateria.disabled = false;
        return;
    }

    if (data && data.length > 0) {
        // Remove duplicatas e organiza em ordem alfabética
        const materiasUnicas = [...new Set(data.map(q => q.materia))].sort();
        selectMateria.innerHTML = '<option value="">Selecione a Matéria</option>' +
            materiasUnicas.map(m => `<option value="${m}">${m}</option>`).join('');
    } else {
        selectMateria.innerHTML = '<option value="">⚠️ Nenhuma matéria encontrada</option>';
    }
    selectMateria.disabled = false;
});

// 2. BUSCA AS QUESTÕES POR MATÉRIA (COM ALEATORIEDADE)
async function iniciarSimulado() {
    const materia = document.getElementById('select-materia').value;
    const container = document.getElementById('questoes-container');
    const placar = document.getElementById('placar');

    if (!materia) {
        alert('Selecione uma matéria para começar!');
        return;
    }

    materiaAtual = materia;
    jaConferiu = false;
    
    // Reseta visual
    placar.classList.add('hidden');
    document.getElementById('btn-conferir').classList.add('hidden');
    document.getElementById('btn-reiniciar').classList.add('hidden');
    container.innerHTML = '<div class="placeholder loading">⏳ Carregando questões variadas...</div>';

    // 1. Busca TODAS as questões daquela matéria na tabela correta
    const { data, error } = await _supabase
        .from('questoes_simulado') 
        .select('*')
        .eq('materia', materia); 

    if (error || !data || data.length === 0) {
        container.innerHTML = '<div class="placeholder">⚠️ Nenhuma questão encontrada.</div>';
        return;
    }

    // 2. Embaralha TUDO que veio do banco e corta para 20 (Garante rotatividade)[cite: 2]
    questoesAtuais = data.sort(() => Math.random() - 0.5).slice(0, 20);
    
    // Chama a função que desenha as questões na tela[cite: 2]
    renderizar();
    
    // Mostra o botão de conferir[cite: 2]
    document.getElementById('btn-conferir').classList.remove('hidden');
}

// 3. MONTA AS QUESTÕES NA TELA
function renderizar() {
    const container = document.getElementById('questoes-container');
    container.innerHTML = questoesAtuais.map((q, i) => {
        const alternativas = ['a', 'b', 'c', 'd', 'e'].map(l => `
            <label class="alternativa-label" id="label-${q.id}-${l.toUpperCase()}">
                <input type="radio" name="q-${q.id}" value="${l.toUpperCase()}">
                <span class="letra-circle">${l.toUpperCase()}</span>
                <span class="alternativa-texto">${q['opcao_' + l] || q['alternativa_' + l]}</span>
            </label>
        `).join('');

        return `
            <div class="questao-card" id="q-container-${q.id}">
                <div class="questao-numero">Questão ${i + 1} de ${questoesAtuais.length}</div>
                <p class="questao-enunciado">${q.enunciado}</p>
                <div class="alternativas">${alternativas}</div>
            </div>
        `;
    }).join('');
}

// 4. LÓGICA DE CORREÇÃO E PONTUAÇÃO
async function conferir() {
    if (jaConferiu) return;

    const respondidas = document.querySelectorAll('input[type="radio"]:checked');
    if (respondidas.length < questoesAtuais.length) {
        alert(`Por favor, responda todas as questões antes de conferir!`);
        return;
    }

    jaConferiu = true;
    let acertos = 0;
    let pontuacaoTotal = 0;

    questoesAtuais.forEach(q => {
        const selecionadaInput = document.querySelector(`input[name="q-${q.id}"]:checked`);
        const selecionada = selecionadaInput.value;
        const correta = q.resposta_correta.toUpperCase();

        document.getElementById(`label-${q.id}-${correta}`)?.classList.add('correta');

        if (selecionada === correta) {
            acertos++;
            // Peso diferenciado conforme a matéria[cite: 2]
            const peso = (materiaAtual === 'Língua Portuguesa') ? 1.0 : 1.5;
            pontuacaoTotal += peso;
        } else {
            document.getElementById(`label-${q.id}-${selecionada}`)?.classList.add('errada');
        }
    });

    const percentual = Math.round((acertos / questoesAtuais.length) * 100);
    
    document.getElementById('placar-texto').innerHTML = `✅ <strong>${acertos} acertos</strong> | 🏆 <strong>${pontuacaoTotal.toFixed(1)} pontos</strong> | 📊 <strong>${percentual}%</strong>`;
    
    const barra = document.getElementById('progresso-fill');
    if (barra) barra.style.width = Math.min((pontuacaoTotal * 5), 100) + "%";
    
    const pontosTexto = document.getElementById('pontos');
    if (pontosTexto) pontosTexto.innerText = pontuacaoTotal.toFixed(1);

    document.getElementById('placar').classList.remove('hidden');
    document.getElementById('btn-conferir').classList.add('hidden');
    document.getElementById('btn-reiniciar').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. VINCULAÇÃO DE EVENTOS[cite: 2]
document.getElementById('btn-iniciar').addEventListener('click', iniciarSimulado);
document.getElementById('btn-conferir').addEventListener('click', conferir);
document.getElementById('btn-reiniciar').addEventListener('click', () => iniciarSimulado());