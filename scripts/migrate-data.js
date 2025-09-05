const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const csv = require('csv-parser')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function migrateData() {
  console.log('🚀 Iniciando migração de dados do SQLite para PostgreSQL...')

  try {
    // 1. Migrar clientes
    console.log('📋 Migrando clientes...')
    const clients = await readCSV('./data/clients_export.csv')
    
    for (const client of clients) {
      await prisma.client.upsert({
        where: { id: client.id },
        update: {},
        create: {
          id: client.id,
          name: client.name,
          logoUrl: client.logo_url || null,
          adAccountId: client.ad_account_id || null,
          slug: client.slug,
          metaTokenEnc: client.meta_token_enc || null,
          isActive: client.is_active === '1' || client.is_active === 'true',
          email: client.email || null,
          temporaryPassword: client.temporary_password || null,
          passwordResetRequired: client.password_reset_required === '1' || client.password_reset_required === 'true',
          createdAt: new Date(client.created_at),
          updatedAt: new Date(client.updated_at),
        },
      })
    }
    console.log(`✅ ${clients.length} clientes migrados`)

    // 2. Migrar usuários
    console.log('👥 Migrando usuários...')
    const users = await readCSV('./data/users_export.csv')
    
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          passwordHash: user.password_hash,
          name: user.name,
          userType: user.user_type || 'user',
          isActive: user.is_active === '1' || user.is_active === 'true',
          lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
          passwordResetToken: user.password_reset_token || null,
          passwordResetExpires: user.password_reset_expires ? new Date(user.password_reset_expires) : null,
          passwordResetRequired: user.password_reset_required === '1' || user.password_reset_required === 'true',
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at),
        },
      })
    }
    console.log(`✅ ${users.length} usuários migrados`)

    // 3. Migrar roles
    console.log('🔐 Migrando roles...')
    const roles = await readCSV('./data/roles_export.csv')
    
    for (const role of roles) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: {},
        create: {
          id: role.id,
          name: role.name,
          description: role.description || null,
          isSystem: role.is_system === '1' || role.is_system === 'true',
          isActive: role.is_active === '1' || role.is_active === 'true',
          createdAt: new Date(role.created_at),
          updatedAt: new Date(role.updated_at),
        },
      })
    }
    console.log(`✅ ${roles.length} roles migrados`)

    // 4. Migrar permissões
    console.log('🛡️ Migrando permissões...')
    const permissions = await readCSV('./data/permissions_export.csv')
    
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { id: permission.id },
        update: {},
        create: {
          id: permission.id,
          name: permission.name,
          description: permission.description || null,
          module: permission.module,
          action: permission.action,
          isSystem: permission.is_system === '1' || permission.is_system === 'true',
          createdAt: new Date(permission.created_at),
          updatedAt: new Date(permission.updated_at),
        },
      })
    }
    console.log(`✅ ${permissions.length} permissões migradas`)

    // 5. Migrar relações role_permissions
    console.log('🔗 Migrando role permissions...')
    const rolePermissions = await readCSV('./data/role_permissions_export.csv')
    
    for (const rp of rolePermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rp.role_id,
            permissionId: rp.permission_id,
          },
        },
        update: {},
        create: {
          id: rp.id,
          roleId: rp.role_id,
          permissionId: rp.permission_id,
          createdAt: new Date(rp.created_at),
        },
      })
    }
    console.log(`✅ ${rolePermissions.length} role permissions migradas`)

    // 6. Migrar relações user_roles
    console.log('👤 Migrando user roles...')
    const userRoles = await readCSV('./data/user_roles_export.csv')
    
    for (const ur of userRoles) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: ur.user_id,
            roleId: ur.role_id,
          },
        },
        update: {},
        create: {
          id: ur.id,
          userId: ur.user_id,
          roleId: ur.role_id,
          assignedBy: ur.assigned_by || null,
          assignedAt: new Date(ur.assigned_at),
          expiresAt: ur.expires_at ? new Date(ur.expires_at) : null,
          isActive: ur.is_active === '1' || ur.is_active === 'true',
        },
      })
    }
    console.log(`✅ ${userRoles.length} user roles migrados`)

    // 7. Migrar contas de anúncios
    console.log('📱 Migrando contas de anúncios...')
    const adAccounts = await readCSV('./data/ad_accounts_export.csv')
    
    for (const account of adAccounts) {
      await prisma.adAccount.upsert({
        where: { id: account.id },
        update: {},
        create: {
          id: account.id,
          clientId: account.client_id,
          platform: account.platform,
          accountName: account.account_name,
          accountId: account.account_id,
          accessTokenEnc: account.access_token_enc || null,
          refreshTokenEnc: account.refresh_token_enc || null,
          tokenExpiresAt: account.token_expires_at ? new Date(account.token_expires_at) : null,
          isActive: account.is_active === '1' || account.is_active === 'true',
          lastSyncAt: account.last_sync_at ? new Date(account.last_sync_at) : null,
          syncStatus: account.sync_status || 'pending',
          syncError: account.sync_error || null,
          createdAt: new Date(account.created_at),
          updatedAt: new Date(account.updated_at),
        },
      })
    }
    console.log(`✅ ${adAccounts.length} contas de anúncios migradas`)

    // 8. Migrar campanhas
    console.log('📊 Migrando campanhas...')
    const campaigns = await readCSV('./data/campaigns_export.csv')
    
    for (const campaign of campaigns) {
      await prisma.campaign.upsert({
        where: { campaignId: campaign.campaign_id },
        update: {},
        create: {
          campaignId: campaign.campaign_id,
          name: campaign.name || null,
          objective: campaign.objective || null,
          adAccountId: campaign.ad_account_id || null,
          clientId: campaign.client_id,
          adAccountRefId: campaign.ad_account_ref_id || null,
          createdAt: new Date(campaign.created_at),
          updatedAt: new Date(campaign.updated_at),
        },
      })
    }
    console.log(`✅ ${campaigns.length} campanhas migradas`)

    // 9. Migrar anúncios ativos
    console.log('📺 Migrando anúncios ativos...')
    const adsActiveRaw = await readCSV('./data/ads_active_raw_export.csv')
    
    for (const ad of adsActiveRaw) {
      await prisma.adsActiveRaw.upsert({
        where: { adId: ad.ad_id },
        update: {},
        create: {
          adId: ad.ad_id,
          adName: ad.ad_name || null,
          effectiveStatus: ad.effective_status || null,
          creativeId: ad.creative_id || null,
          creativeThumb: ad.creative_thumb || null,
          objectStoryId: ad.object_story_id || null,
          campaignId: ad.campaign_id || null,
          adsetId: ad.adset_id || null,
          adsetOptimizationGoal: ad.adset_optimization_goal || null,
          objective: ad.objective || null,
          adAccountId: ad.ad_account_id || null,
          clientId: ad.client_id,
          adAccountRefId: ad.ad_account_ref_id || null,
          createdAt: new Date(ad.created_at),
          updatedAt: new Date(ad.updated_at),
        },
      })
    }
    console.log(`✅ ${adsActiveRaw.length} anúncios migrados`)

    // 10. Migrar seleções
    console.log('✅ Migrando seleções...')
    const selections = await readCSV('./data/selections_export.csv')
    
    for (const selection of selections) {
      await prisma.selection.upsert({
        where: { id: selection.id },
        update: {},
        create: {
          id: selection.id,
          clientId: selection.client_id,
          slug: selection.slug,
          adIds: selection.ad_ids,
          note: selection.note || null,
          userId: selection.user_id || null,
          userEmail: selection.user_email || null,
          userName: selection.user_name || null,
          selectionType: selection.selection_type || 'pause',
          description: selection.description || null,
          status: selection.status || 'pending',
          executedAt: selection.executed_at ? new Date(selection.executed_at) : null,
          executedByUserId: selection.executed_by_user_id || null,
          executedByUserName: selection.executed_by_user_name || null,
          executionNotes: selection.execution_notes || null,
          adsPausedCount: parseInt(selection.ads_paused_count || '0'),
          adsTotalCount: parseInt(selection.ads_total_count || '0'),
          createdAt: new Date(selection.created_at),
          updatedAt: new Date(selection.updated_at),
        },
      })
    }
    console.log(`✅ ${selections.length} seleções migradas`)

    // 11. Migrar user client access
    console.log('🔑 Migrando acessos de clientes...')
    const userClientAccess = await readCSV('./data/user_client_access_export.csv')
    
    for (const access of userClientAccess) {
      await prisma.userClientAccess.upsert({
        where: {
          userId_clientId: {
            userId: access.user_id,
            clientId: access.client_id,
          },
        },
        update: {},
        create: {
          id: access.id,
          userId: access.user_id,
          clientId: access.client_id,
          assignedBy: access.assigned_by || null,
          accessLevel: access.access_level || 'read',
          assignedAt: new Date(access.assigned_at),
          expiresAt: access.expires_at ? new Date(access.expires_at) : null,
          isActive: access.is_active === '1' || access.is_active === 'true',
        },
      })
    }
    console.log(`✅ ${userClientAccess.length} acessos migrados`)

    // 12. Migrar razões de seleção
    console.log('📝 Migrando razões de seleção...')
    const selectionAdReasons = await readCSV('./data/selection_ad_reasons_export.csv')
    
    for (const reason of selectionAdReasons) {
      await prisma.selectionAdReason.upsert({
        where: {
          selectionId_adId: {
            selectionId: reason.selection_id,
            adId: reason.ad_id,
          },
        },
        update: {},
        create: {
          id: reason.id,
          selectionId: reason.selection_id,
          adId: reason.ad_id,
          reason: reason.reason,
          createdAt: new Date(reason.created_at),
          updatedAt: new Date(reason.updated_at),
        },
      })
    }
    console.log(`✅ ${selectionAdReasons.length} razões migradas`)

    console.log('🎉 Migração concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Arquivo não encontrado: ${filePath} - pulando...`)
      resolve([])
      return
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

// Executar migração
migrateData()
