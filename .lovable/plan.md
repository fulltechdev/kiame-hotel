

# Kiame — Sistema de Reservas de Hotel

## Visão Geral
Site completo de reservas de hotel em **português**, com design moderno e elegante usando uma paleta de **azul marinho, cinza ardósia e dourado**. Construído com React + Supabase, com autenticação, painel do utilizador e painel administrativo.

---

## 1. Design & Identidade Visual
- **Paleta**: Azul marinho escuro (#1a2332), cinza ardósia (#64748b), dourado (#c9a84c), branco off-white (#f8f9fa)
- **Tipografia**: Fonte sans-serif moderna (Inter ou similar)
- **Estilo**: Limpo, minimalista, sem gradientes, sombras muito subtis, bastante espaçamento

---

## 2. Páginas Públicas (sem login)

### Landing Page (/)
- **Hero** com carrossel de imagens em largura total e texto de boas-vindas
- Secção **"Sobre Nós"** — história e missão do Kiame
- Secção **"Porquê o Kiame"** — destaques/vantagens em cards elegantes
- **Carrossel de Quartos** — pré-visualização dos quartos com imagens
- Secção **"Contacto"** — formulário e informações de contacto
- **Navbar** com navegação e botões de login/registo

### Pesquisa de Quartos (/pesquisa)
- Filtros por **datas de check-in/check-out**, tipo de quarto, preço
- Listagem de quartos disponíveis em cards
- Botão "Reservar" visível mas que redireciona para login se não autenticado

---

## 3. Autenticação
- Páginas de **registo** e **login** com email/password
- Após login, redirecionamento para o painel do utilizador
- Proteção de rotas: reservas e dashboards só acessíveis com sessão ativa

---

## 4. Painel do Utilizador (/dashboard)
- Lista de **reservas do utilizador** em cards ou tabela
- Detalhes de cada reserva: quarto, datas, estado (confirmada/pendente/cancelada)
- Possibilidade de cancelar reservas pendentes

---

## 5. Painel Administrativo (/admin)
- Protegido por **role de admin** (tabela separada `user_roles`)
- **Gestão de Quartos**: criar, editar, remover quartos (nome, descrição, preço, imagem, capacidade)
- **Gestão de Disponibilidade**: definir datas disponíveis para cada quarto
- **Visualização de Reservas**: ver todas as reservas de todos os utilizadores

---

## 6. Base de Dados (Supabase)

### Tabelas:
- **profiles** — dados do utilizador (nome, telefone)
- **user_roles** — tabela separada para roles (admin/user)
- **rooms** — quartos (nome, descrição, preço por noite, capacidade, imagem URL, tipo)
- **room_availability** — disponibilidade por quarto e intervalo de datas
- **reservations** — reservas (user_id, room_id, check-in, check-out, estado)

### Segurança (RLS):
- Utilizadores só veem as suas próprias reservas
- Apenas admins podem criar/editar quartos e disponibilidade
- Função `has_role()` com SECURITY DEFINER para verificação de roles sem recursão

---

## 7. Armazenamento de Imagens
- Bucket no **Supabase Storage** para imagens dos quartos
- Admin faz upload da imagem ao criar/editar um quarto
- Apenas a URL é guardada na tabela `rooms`

