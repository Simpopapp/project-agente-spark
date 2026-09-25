---
name: ondas-agenticas
description: "Como planejar e executar \"ondas\" de trabalho quando o usuário pede múltiplas ondas massivas/exaustivas de melhorias, criação ou refatoração. Aplique sempre que o usuário usar as palavras \"onda\", \"ondas\", \"wave\", \"waves\", \"exaustivo/exaustiva\", ou pedir N rounds/etapas massivas de entrega — especialmente em pedidos de redesign, expansão de features, polish de UI ou criação de conteúdo em massa."
---
Ondas Agênticas  
Uma "onda" NÃO é um rótulo de organização de tarefas. É uma unidade operacional de esforço definida por um único critério:

Uma onda só é considerada uma onda de verdade se a capacidade agêntica de execução do agente se esgotar antes de concluir o escopo planejado daquela entrega. Se o agente termina o escopo com folga dentro de um turno, aquilo foi uma entrega comum, não uma onda — mesmo que ele tenha subdividido internamente em "onda 1, onda 2, onda 3".

Repetir esta definição para o usuário com outras palavras é obrigatório na primeira vez que ele pedir ondas, antes de começar a executar — para confirmar alinhamento.

Regras invioláveis
Uma entrega = no máximo uma onda. Se tudo coube num único turno/resposta do agente, foi uma onda só, independentemente de rótulos internos. Não é permitido dizer "entreguei 3 ondas" dentro de um único turno.

Onda ≠ etapa. Chamar passos sequenciais de uma mesma entrega de "onda 1, onda 2, onda 3" é proibido. Etapas internas de um turno são fases ou passos, nunca ondas.

Escopo por onda tem que exceder a capacidade. Cada onda deve ser planejada com escopo grande o suficiente para que o agente seja forçado a parar no meio — por saturação, limite de contexto, timeout, ou exaustão do turno. Se o agente conseguiu concluir tudo confortavelmente, o escopo estava pequeno demais e aquilo não foi uma onda.

A próxima onda começa exatamente onde a anterior parou. Quando o turno é cortado à força, o agente deve deixar um estado explícito (arquivos tocados, o que ficou pendente, próximo passo imediato) para que a onda seguinte retome sem replanejamento.

N ondas = N turnos separados. Se o usuário pede 3 ondas, isso significa 3 entregas distintas, cada uma indo até o teto. Nunca condensar em um turno.

Referência de piso. Quando o usuário disser "cada onda deve ser maior que as X anteriores juntas", o agente deve tratar a soma das entregas anteriores como o piso mínimo de escopo da próxima onda, não como o teto.

Como planejar uma onda de verdade
Antes de executar, o agente escreve um plano de escopo excessivo:

Liste bem mais tarefas do que caberiam num turno confortável — o objetivo é planejar de forma que a exaustão aconteça naturalmente.

Ordene por prioridade real (impacto no usuário), não por facilidade.

Não fatie o plano em "onda 1a, onda 1b" — é tudo uma onda só; a fatia acontece quando o sistema corta, não quando o agente escolhe.

Não anuncie ondas futuras como se fossem partes da atual ("na onda 2 farei X"). A onda atual é auto-contida em ambição.

Como executar uma onda
Vá até o limite. Não pare por sensação de "acho que já deu" — só pare quando o turno for cortado ou quando fisicamente não houver mais nada relevante para produzir dentro do escopo planejado.

Use chamadas de ferramentas em paralelo agressivamente para maximizar throughput por turno.

Não gaste turno em explicação/resumo longo — texto natural custa capacidade que poderia virar código/design.

Se o turno for cortado no meio, ao retomar (próxima onda), não recomece do zero: continue exatamente do ponto onde parou, usando o estado deixado.

Como reportar ao final de uma onda
Ao fim de cada onda (turno), o agente reporta:

O que foi entregue de fato (arquivos criados/editados, features vivas).

O que ficou pendente dentro do escopo planejado (prova de que houve exaustão real — se nada ficou pendente, admita que o escopo foi subdimensionado).

Ponto de retomada para a próxima onda.

Nunca declarar "3 ondas concluídas" em um único turno. Declarar sempre "onda X de N concluída, restam Y itens do escopo original para a onda X+1".

Sinais de que o agente está errando o conceito
Corrija-se imediatamente se perceber qualquer um destes padrões:

Subdividir uma entrega única em "onda 1, onda 2, onda 3" mentalmente e reportar como três ondas.

Concluir o escopo planejado de uma onda com folga dentro do turno.

Anunciar o que fará "na próxima onda" antes de esgotar a atual.

Planejar cada onda como uma etapa pequena e sequencial (Onda 1 = fundação, Onda 2 = features, Onda 3 = polish) em vez de cada uma ser um bloco massivo por si só.

Perguntar "por onde começar" quando o usuário já disse para ir até a exaustão — a resposta é: comece pelo mais impactante e vá até o corte.

Frase-teste antes de executar
Antes de começar cada onda, o agente deve conseguir responder honestamente sim para:

"Se meu turno acabar agora sem cortes, ainda haverá tarefas relevantes do escopo desta onda que ficaram por fazer?"

Se a resposta é "não, dá pra terminar tudo com folga", o escopo está subdimensionado — replaneje maior antes de começar.