# Guia de Migração para Vercel + Neon PostgreSQL

## 📋 Visão Geral

Este guia te ajudará a migrar sua aplicação do Mocha para Vercel + Neon PostgreSQL mantendo toda a funcionalidade.

## 🗂️ O QUE COPIAR (IMPORTANTE!)

**NÃO É SÓ OS ARQUIVOS `vercel*`!** Você precisa de:

### ✅ TODO O SISTEMA ATUAL
```
src/                    ← TUDO (todo seu código React/hooks/components)
lib/                    ← TUDO (auth.ts, prisma.ts, etc.)
pages/                  ← TUDO (todas as páginas e APIs)
public/                 ← TUDO (imagens, logos, assets)
prisma/                 ← TUDO (schema, seeds, migrations)
middleware.ts           ← Arquivo de middleware
```

### ✅ PLUS: Arquivos Específicos do Vercel
```
package.vercel.json     → renomear para package.json
next.config.vercel.js   → renomear para next.config.js  
vercel.json             → manter nome
env.vercel.example      → usar como base para .env.local
```

### ✅ Scripts de Migração
```
scripts/migrate-to-vercel.js   ← Para migrar os dados
scripts/migrate-data.js        ← Helper de migração
```

**RESUMO**: É o sistema COMPLETO + configurações Vercel!

## 🚀 Passo 1: Preparação do Ambiente

### 1.1 Criar conta no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Conecte seu repositório

### 1.2 Criar banco Neon PostgreSQL
1. Acesse [neon.tech](https://neon.tech)
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Copie a connection string

## 🔧 Passo 2: Estrutura do Projeto

```
projeto-vercel/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── pages/
│   └── api/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── public/
├── package.json
├── next.config.js
├── vercel.json
└── .env.local
```

## 📦 Passo 3: Configuração das Dependências

## 📋 Passo 4: Instruções Detalhadas de Migração

### 4.1 Exportar Dados do Mocha (D1 Database)
```bash
# 1. No console do Cloudflare D1, execute:
wrangler d1 execute [DATABASE_NAME] --file=export-data.sql

# 2. Isso criará arquivos CSV com todos os dados:
# - clients_export.csv
# - users_export.csv
# - roles_export.csv
# - permissions_export.csv
# - campaigns_export.csv
# - ads_active_raw_export.csv
# - selections_export.csv
# - ad_accounts_export.csv
# - user_roles_export.csv
# - role_permissions_export.csv
# - user_client_access_export.csv
# - selection_ad_reasons_export.csv
```

### 4.2 Configurar Banco Neon PostgreSQL
1. Acesse [neon.tech](https://neon.tech)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Copie a connection string (DATABASE_URL)
5. Anote as credenciais para uso posterior

### 4.3 Configurar Projeto Vercel
```bash
# 1. Clone ou crie um novo repositório
git clone https://github.com/seu-usuario/meudads-vercel.git
cd meudads-vercel

# 2. Copie TODOS os arquivos do sistema atual
cp package.vercel.json package.json
cp next.config.vercel.js next.config.js
cp vercel.json .
cp -r src/ .
cp -r lib/ .  
cp -r pages/ .
cp -r public/ .
cp -r prisma/ .
cp -r scripts/ .
cp middleware.ts .

# 3. Configure as variáveis de ambiente
cp env-template.txt .env.local
# Edite .env.local com suas credenciais reais

# 4. Instale dependências
npm install
```

### 4.4 Configurar Banco de Dados
```bash
# 1. Gerar cliente Prisma
npx prisma generate

# 2. Executar migrações
npx prisma db push

# 3. Executar seed inicial
npm run db:seed
```

### 4.5 Migrar Dados
```bash
# 1. Criar pasta data/ e colocar os CSVs exportados
mkdir data
# Copie todos os arquivos *_export.csv para data/

# 2. Instalar dependência para CSV
npm install csv-parser

# 3. Executar script de migração
node scripts/migrate-data.js
```

### 4.6 Deploy na Vercel
```bash
# 1. Conecte seu repositório ao Vercel
npx vercel

# 2. Configure as variáveis de ambiente na Vercel:
# - DATABASE_URL (Neon PostgreSQL)
# - JWT_SECRET (gere um novo)
# - NEXTAUTH_SECRET (gere um novo)
# - RESEND_API_KEY (se usar email)
# - FROM_EMAIL
# - GRAPH_API_VER=v21.0
# - CRYPTO_KEY (gere um novo)
# - CRYPTO_IV (gere um novo)

# 3. Deploy
vercel --prod
```

## 🔧 Configurações Necessárias

### Variáveis de Ambiente
```env
# Database
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"

# Auth
JWT_SECRET="seu_jwt_secret_super_seguro_64_chars"
NEXTAUTH_SECRET="seu_nextauth_secret"
NEXTAUTH_URL="https://seudominio.vercel.app"

# Email (opcional)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@seudominio.com"

# Meta API
GRAPH_API_VER="v21.0"

# Crypto (para tokens das contas de anúncios)
CRYPTO_KEY="nova_chave_32_chars"
CRYPTO_IV="novo_iv_12_chars"
```

### Comandos Úteis
```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Visualizar banco de dados
npm run db:studio

# Executar migrações
npm run db:migrate

# Reset do banco (cuidado!)
npx prisma db push --force-reset
```

## 🚀 Principais Diferenças

### De Cloudflare Workers para Next.js
- **Runtime**: Node.js em vez de Edge Runtime
- **Database**: PostgreSQL em vez de SQLite
- **ORM**: Prisma em vez de queries diretas
- **Middleware**: Next.js middleware em vez de Hono middleware
- **API Routes**: `/pages/api/` em vez de Hono routes

### Vantagens da Nova Stack
✅ **Escalabilidade**: PostgreSQL suporta mais dados e conexões
✅ **Ferramentas**: Prisma Studio, melhor debugging
✅ **Flexibilidade**: Mais opções de deployment e configuração
✅ **Comunidade**: Next.js tem ecossistema maior
✅ **Performance**: Vercel Edge Network global

## 🔐 Segurança

### Atualize todas as chaves:
1. **JWT_SECRET**: Gere uma nova chave de 64 caracteres
2. **CRYPTO_KEY**: Nova chave para criptografia de tokens
3. **CRYPTO_IV**: Novo IV para criptografia
4. **Database**: Novas credenciais do Neon
5. **API Keys**: Mantenha as mesmas (Resend, Meta, etc.)

### Script para gerar chaves:
```javascript
// Gerar chaves seguras
const crypto = require('crypto')
console.log('JWT_SECRET:', crypto.randomBytes(32).toString('hex'))
console.log('CRYPTO_KEY:', crypto.randomBytes(32).toString('hex'))
console.log('CRYPTO_IV:', crypto.randomBytes(12).toString('hex'))
```

## ✅ Checklist de Migração

- [ ] 1. Banco Neon PostgreSQL criado
- [ ] 2. Dados exportados do D1
- [ ] 3. Projeto Next.js configurado
- [ ] 4. Variáveis de ambiente definidas
- [ ] 5. Schema Prisma criado
- [ ] 6. Dados migrados
- [ ] 7. Aplicação testada localmente
- [ ] 8. Deploy na Vercel realizado
- [ ] 9. DNS atualizado (se necessário)
- [ ] 10. Monitoramento configurado

## 🆘 Solução de Problemas

### ⚠️ ERRO COMUM: Invalid tag name no primeiro deploy
```bash
# Se aparecer: npm error Invalid tag name "^^1.12.0"
# SOLUÇÃO: Corrigir package.json

# Abra o package.json e mude:
"@cloudflare/vite-plugin": "^^1.12.0"
# Para:
"@cloudflare/vite-plugin": "^1.12.0"

# Commit e push novamente:
git add package.json
git commit -m "fix: corrige versão do vite plugin"
git push
```

### ⚠️ ERRO COMUM: Conflito de versões Vite (ERESOLVE)
```bash
# Se aparecer: ERESOLVE unable to resolve dependency tree
# peer vite@"^6.2.0" from @getmocha/vite-plugins
# Found: vite@7.1.4

# SOLUÇÃO: Ajustar versões no package.json

# Mude no package.json:
"vite": "^7.1.3"              → "vite": "^6.2.0"
"@vitejs/plugin-react": "4.4.1"     → "@vitejs/plugin-react": "^4.3.1"  
"@cloudflare/vite-plugin": "^1.12.0" → "@cloudflare/vite-plugin": "^1.0.0"

# Commit e push novamente:
git add package.json
git commit -m "fix: compatibilidade de versões vite"
git push
```

### Erro na migração de dados:
```bash
# Verificar se os CSVs estão corretos
ls -la data/
head -5 data/clients_export.csv

# Limpar banco e tentar novamente
npx prisma db push --force-reset
npm run db:seed
node scripts/migrate-data.js
```

### Erro de conexão com banco:
- Verifique se a DATABASE_URL está correta
- Teste a conexão: `npx prisma db push`
- Verifique se o Neon está ativo

### Problemas de autenticação:
- Gere novas chaves JWT_SECRET
- Limpe cookies do browser
- Verifique middleware.ts

## 📞 Suporte

Se encontrar problemas durante a migração:
1. Verifique os logs do Vercel
2. Teste localmente primeiro
3. Compare com a implementação original
4. Documente erros específicos para análise

---

**🎉 Parabéns! Sua aplicação agora roda em uma infraestrutura moderna e escalável!**
