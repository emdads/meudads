# 🚀 Guia Simples: Mocha → Vercel + Neon

## TL;DR - Passos Rápidos

1. **Baixa os arquivos** preparados para Vercel
2. **Sube no GitHub** (novo repositório)  
3. **Conecta GitHub ao Vercel**
4. **Cria banco no Neon** (PostgreSQL)
5. **Configura variáveis no Vercel**
6. **Deploy automático** ✅

---

## 📦 Passo 1: Baixar Arquivos

### Arquivos já prontos para download:
```
✅ package.vercel.json → package.json
✅ next.config.vercel.js → next.config.js  
✅ vercel.json
✅ env.vercel.example → .env.local
✅ Todo código React já convertido
✅ Todas as APIs já convertidas
✅ Migrations do Prisma prontas
```

**Simplesmente copie todos os arquivos** que começam com `vercel` ou `next` para seu novo projeto.

---

## 🐙 Passo 2: GitHub

```bash
# 1. Crie repositório novo no GitHub
# 2. Clone localmente
git clone https://github.com/SEU_USUARIO/meudads-vercel.git
cd meudads-vercel

# 3. Copie os arquivos preparados
cp package.vercel.json package.json
cp next.config.vercel.js next.config.js
cp vercel.json .
cp env.vercel.example .env.local
cp -r pages/ .
cp -r lib/ .
cp -r prisma/ .
# ... (copie todos os arquivos necessários)

# 4. Commit e push
git add .
git commit -m "Setup inicial para Vercel"
git push
```

---

## 🐘 Passo 3: Criar Banco Neon

1. Vai em [neon.tech](https://neon.tech)
2. **Sign up** (gratuito)
3. **Create Project**
4. **Copia a connection string** (guarda ela!)

Exemplo: `postgresql://user:pass@ep-xxx.neon.tech/meudads?sslmode=require`

---

## ⚡ Passo 4: Deploy no Vercel

1. Vai em [vercel.com](https://vercel.com)
2. **Login com GitHub**
3. **Import Project** → escolhe seu repo
4. **Add Environment Variables**:

```env
DATABASE_URL=sua_connection_string_do_neon
JWT_SECRET=qualquer_string_de_64_chars
NEXTAUTH_SECRET=qualquer_string_de_32_chars
NEXTAUTH_URL=https://seuapp.vercel.app
```

5. **Deploy** 🚀

---

## 📊 Passo 5: Migrar Dados (Opcional)

Se você tem dados no Mocha:

### Jeito Fácil:
1. **Exporta** os dados do Mocha (CSV)
2. **Roda** o script `migrate-data.js`
3. **Pronto!**

### Jeito Manual:
- Recadastrar usuários
- Reconfigurar contas de anúncios
- Começar do zero (às vezes é mais fácil)

---

## 🔑 Variáveis de Ambiente

```env
# OBRIGATÓRIAS
DATABASE_URL="postgresql://..."     # Do Neon
JWT_SECRET="abc123..."              # Qualquer string longa
NEXTAUTH_SECRET="def456..."         # Qualquer string longa
NEXTAUTH_URL="https://seuapp.vercel.app"

# OPCIONAIS
RESEND_API_KEY="re_..."            # Se usar email
FROM_EMAIL="noreply@seudominio.com"
GRAPH_API_VER="v21.0"             # Meta API
```

**Como gerar strings aleatórias:**
```bash
# No terminal
openssl rand -hex 32
```

---

## ✅ Checklist Rápido

- [ ] ✅ Baixei os arquivos preparados
- [ ] ✅ Criei repo no GitHub e subi
- [ ] ✅ Criei banco no Neon  
- [ ] ✅ Conectei GitHub ao Vercel
- [ ] ✅ Configurei variáveis de ambiente
- [ ] ✅ Deploy funcionou
- [ ] ✅ App está no ar!

---

## 🆘 Problemas Comuns

**❌ Build falhou?**
→ Confere se todas as variáveis estão setadas

**❌ Erro de banco?**  
→ Testa a connection string no Neon

**❌ Login não funciona?**
→ Gera novas chaves JWT_SECRET

**❌ Página em branco?**
→ Olha os logs do Vercel

---

## 🎯 Resultado Final

- ✅ **URL**: `https://seuapp.vercel.app`
- ✅ **Banco**: PostgreSQL no Neon (gratuito)
- ✅ **Deploy**: Automático a cada push
- ✅ **SSL**: Automático
- ✅ **CDN**: Global do Vercel

**Agora é só usar!** 🎉

---

### 💡 Dica Pro

Depois que funcionar, você pode:
- Configurar domínio próprio
- Adicionar mais features  
- Escalar conforme crescer
- Migrar dados antigos quando precisar

**A migração não precisa ser perfeita de primeira** - o importante é ter o novo sistema funcionando!
