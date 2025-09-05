import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // 1. Criar roles básicas
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Acesso total ao sistema',
      isSystem: true,
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador' },
    update: {},
    create: {
      name: 'Administrador',
      description: 'Administrador do sistema',
      isSystem: true,
    },
  })

  const clientRole = await prisma.role.upsert({
    where: { name: 'Cliente' },
    update: {},
    create: {
      name: 'Cliente',
      description: 'Acesso de cliente',
      isSystem: true,
    },
  })

  // 2. Criar permissões básicas
  const permissions = [
    { name: 'dashboard.view', description: 'Ver dashboard', module: 'dashboard', action: 'view' },
    { name: 'dashboard.stats', description: 'Ver estatísticas', module: 'dashboard', action: 'stats' },
    { name: 'clients.view', description: 'Ver clientes', module: 'clients', action: 'view' },
    { name: 'clients.create', description: 'Criar clientes', module: 'clients', action: 'create' },
    { name: 'clients.edit', description: 'Editar clientes', module: 'clients', action: 'edit' },
    { name: 'clients.delete', description: 'Excluir clientes', module: 'clients', action: 'delete' },
    { name: 'clients.sync', description: 'Sincronizar clientes', module: 'clients', action: 'sync' },
    { name: 'clients.manage', description: 'Gerenciar clientes', module: 'clients', action: 'manage' },
    { name: 'ads.view', description: 'Ver anúncios', module: 'ads', action: 'view' },
    { name: 'ads.pause', description: 'Pausar anúncios', module: 'ads', action: 'pause' },
    { name: 'ads.metrics', description: 'Ver métricas', module: 'ads', action: 'metrics' },
    { name: 'selections.view', description: 'Ver seleções', module: 'selections', action: 'view' },
    { name: 'selections.create', description: 'Criar seleções', module: 'selections', action: 'create' },
    { name: 'selections.manage', description: 'Gerenciar seleções', module: 'selections', action: 'manage' },
    { name: 'selections.delete', description: 'Excluir seleções', module: 'selections', action: 'delete' },
    { name: 'users.view', description: 'Ver usuários', module: 'users', action: 'view' },
    { name: 'users.create', description: 'Criar usuários', module: 'users', action: 'create' },
    { name: 'users.edit', description: 'Editar usuários', module: 'users', action: 'edit' },
    { name: 'users.delete', description: 'Excluir usuários', module: 'users', action: 'delete' },
    { name: 'users.manage', description: 'Gerenciar usuários', module: 'users', action: 'manage' },
    { name: 'system.setup', description: 'Configuração do sistema', module: 'system', action: 'setup' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    })
  }

  // 3. Associar permissões aos roles
  const allPermissions = await prisma.permission.findMany()
  
  // Super Admin tem todas as permissões
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    })
  }

  // Admin tem permissões exceto system.setup
  const adminPermissions = allPermissions.filter(p => p.name !== 'system.setup')
  for (const permission of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    })
  }

  // Cliente tem permissões limitadas
  const clientPermissions = allPermissions.filter(p => 
    ['dashboard.view', 'ads.view', 'ads.pause', 'ads.metrics', 'selections.view', 'selections.create'].includes(p.name)
  )
  for (const permission of clientPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: clientRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: clientRole.id,
        permissionId: permission.id,
      },
    })
  }

  // 4. Criar usuário super admin
  const passwordHash = await bcrypt.hash('admin123', 12)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@meudads.com.br' },
    update: {},
    create: {
      email: 'admin@meudads.com.br',
      name: 'Super Admin',
      passwordHash,
      userType: 'admin',
    },
  })

  // Associar role de super admin
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
      assignedBy: superAdmin.id,
    },
  })

  // 5. Criar cliente de exemplo
  const clienteExemplo = await prisma.client.upsert({
    where: { slug: 'cliente-exemplo' },
    update: {},
    create: {
      name: 'Cliente Exemplo',
      slug: 'cliente-exemplo',
      email: 'cliente@exemplo.com.br',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop&crop=face',
    },
  })

  // 6. Criar conta de anúncios de exemplo
  await prisma.adAccount.upsert({
    where: {
      clientId_platform_accountId: {
        clientId: clienteExemplo.id,
        platform: 'meta',
        accountId: 'act_123456789',
      },
    },
    update: {},
    create: {
      clientId: clienteExemplo.id,
      platform: 'meta',
      accountName: 'Conta Meta Exemplo',
      accountId: 'act_123456789',
      syncStatus: 'pending',
    },
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log('👤 Super Admin criado: admin@meudads.com.br / admin123')
  console.log('🏢 Cliente exemplo criado: Cliente Exemplo')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
