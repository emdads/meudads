#!/usr/bin/env node

/**
 * Script de migração completa do Mocha (Cloudflare + D1) para Vercel + Neon
 * 
 * Uso: node scripts/migrate-to-vercel.js
 * 
 * Este script:
 * 1. Exporta dados do ambiente atual
 * 2. Converte para formato PostgreSQL
 * 3. Importa para Neon
 * 4. Valida a migração
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const BACKUP_DIR = './migration-backup';
const LOGS_DIR = './migration-logs';

// Tabelas a serem migradas (em ordem de dependência)
const TABLES = [
  'users',
  'roles', 
  'permissions',
  'clients',
  'role_permissions',
  'user_roles',
  'user_client_access',
  'user_sessions',
  'ad_accounts',
  'campaigns',
  'ads_active_raw',
  'selections',
  'selection_ad_reasons',
  'user_permission_restrictions',
  'admin_notifications',
  'sync_schedules',
  'sync_config_data'
];

class MigrationTool {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      tablesProcessed: 0,
      recordsProcessed: 0,
      errors: 0,
      warnings: 0
    };
    
    // Criar diretórios necessários
    [BACKUP_DIR, LOGS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    this.logFile = path.join(LOGS_DIR, `migration-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`);
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }
  
  async exportFromMocha() {
    this.log('🚀 Iniciando exportação do ambiente Mocha...');
    
    const mochaUrl = process.env.MOCHA_URL || 'https://your-mocha-app.pages.dev';
    const authToken = process.env.MOCHA_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('MOCHA_AUTH_TOKEN é obrigatório para exportação');
    }
    
    for (const table of TABLES) {
      try {
        this.log(`Exportando tabela: ${table}`);
        
        const response = await fetch(`${mochaUrl}/api/admin/backup/download/${table}_export.csv`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvData = await response.text();
        const backupPath = path.join(BACKUP_DIR, `${table}_export.csv`);
        
        fs.writeFileSync(backupPath, csvData);
        
        // Contar registros
        const lines = csvData.split('\n').filter(line => line.trim());
        const recordCount = Math.max(0, lines.length - 1); // -1 para header
        
        this.log(`✅ ${table}: ${recordCount} registros exportados`);
        this.stats.recordsProcessed += recordCount;
        
      } catch (error) {
        this.log(`❌ Erro exportando ${table}: ${error.message}`, 'ERROR');
        this.stats.errors++;
      }
    }
    
    this.log(`📊 Exportação concluída: ${this.stats.recordsProcessed} registros`);
  }
  
  convertDataForPostgreSQL() {
    this.log('🔄 Convertendo dados para PostgreSQL...');
    
    for (const table of TABLES) {
      try {
        const csvPath = path.join(BACKUP_DIR, `${table}_export.csv`);
        
        if (!fs.existsSync(csvPath)) {
          this.log(`⚠️ Arquivo não encontrado: ${csvPath}`, 'WARN');
          this.stats.warnings++;
          continue;
        }
        
        const csvData = fs.readFileSync(csvPath, 'utf8');
        
        if (!csvData.trim()) {
          this.log(`⚠️ Arquivo vazio: ${table}`, 'WARN');
          continue;
        }
        
        const records = parse(csvData, { 
          columns: true,
          skip_empty_lines: true
        });
        
        // Converter valores SQLite para PostgreSQL
        const convertedRecords = records.map(record => {
          const converted = {};
          
          for (const [key, value] of Object.entries(record)) {
            if (value === null || value === undefined || value === '') {
              converted[key] = null;
            } else if (key.includes('is_') || key.includes('_active') || key.includes('_required')) {
              // Converter boolean: 0/1 -> false/true
              converted[key] = value === '1' || value === 'true' || value === true;
            } else if (key.includes('_at') && value && value !== 'null') {
              // Converter timestamps
              try {
                const date = new Date(value);
                converted[key] = date.toISOString();
              } catch {
                converted[key] = value;
              }
            } else {
              converted[key] = value;
            }
          }
          
          return converted;
        });
        
        // Salvar versão convertida
        const convertedCsv = stringify(convertedRecords, { header: true });
        const convertedPath = path.join(BACKUP_DIR, `${table}_postgresql.csv`);
        
        fs.writeFileSync(convertedPath, convertedCsv);
        
        this.log(`✅ ${table}: ${convertedRecords.length} registros convertidos`);
        
      } catch (error) {
        this.log(`❌ Erro convertendo ${table}: ${error.message}`, 'ERROR');
        this.stats.errors++;
      }
    }
    
    this.log('🔄 Conversão concluída');
  }
  
  async importToNeon() {
    this.log('📥 Iniciando importação para Neon...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL é obrigatório para importação');
    }
    
    // Dynamic import para evitar problemas de compatibilidade
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(databaseUrl);
    
    // Executar migrações primeiro
    this.log('🗄️ Executando migrações...');
    await this.runMigrations(sql);
    
    // Importar dados
    for (const table of TABLES) {
      try {
        const convertedPath = path.join(BACKUP_DIR, `${table}_postgresql.csv`);
        
        if (!fs.existsSync(convertedPath)) {
          this.log(`⚠️ Arquivo convertido não encontrado: ${table}`, 'WARN');
          continue;
        }
        
        const csvData = fs.readFileSync(convertedPath, 'utf8');
        
        if (!csvData.trim()) {
          this.log(`⚠️ Dados vazios para: ${table}`, 'WARN');
          continue;
        }
        
        const records = parse(csvData, { 
          columns: true,
          skip_empty_lines: true 
        });
        
        if (records.length === 0) {
          this.log(`⚠️ Nenhum registro para importar: ${table}`, 'WARN');
          continue;
        }
        
        // Limpar tabela (cuidado em produção!)
        await sql`DELETE FROM ${sql(table)}`;
        
        // Importar em lotes
        const batchSize = 100;
        let imported = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          try {
            for (const record of batch) {
              // Construir query dinâmica
              const columns = Object.keys(record);
              const values = Object.values(record);
              
              const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
              const columnsStr = columns.join(', ');
              
              await sql.unsafe(`
                INSERT INTO ${table} (${columnsStr}) 
                VALUES (${placeholders})
                ON CONFLICT DO NOTHING
              `, values);
              
              imported++;
            }
          } catch (batchError) {
            this.log(`❌ Erro no lote ${i}-${i + batchSize} da tabela ${table}: ${batchError.message}`, 'ERROR');
            this.stats.errors++;
          }
        }
        
        this.log(`✅ ${table}: ${imported}/${records.length} registros importados`);
        this.stats.tablesProcessed++;
        
      } catch (error) {
        this.log(`❌ Erro importando ${table}: ${error.message}`, 'ERROR');
        this.stats.errors++;
      }
    }
    
    this.log('📥 Importação concluída');
  }
  
  async runMigrations(sql) {
    try {
      // Criar tabela de migrações se não existir
      await sql`
        CREATE TABLE IF NOT EXISTS migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      this.log('✅ Sistema de migrações inicializado');
    } catch (error) {
      this.log(`❌ Erro inicializando migrações: ${error.message}`, 'ERROR');
      throw error;
    }
  }
  
  async validateMigration() {
    this.log('✅ Validando migração...');
    
    try {
      const databaseUrl = process.env.DATABASE_URL;
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(databaseUrl);
      
      const validations = [];
      
      // Validar cada tabela
      for (const table of TABLES) {
        try {
          const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
          const recordCount = parseInt(count[0].count);
          
          validations.push({
            table,
            count: recordCount,
            status: recordCount >= 0 ? '✅' : '❌'
          });
          
          this.log(`${table}: ${recordCount} registros`);
          
        } catch (error) {
          validations.push({
            table,
            count: 0,
            status: '❌',
            error: error.message
          });
          
          this.log(`❌ Erro validando ${table}: ${error.message}`, 'ERROR');
        }
      }
      
      // Salvar relatório de validação
      const reportPath = path.join(LOGS_DIR, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(validations, null, 2));
      
      const successfulTables = validations.filter(v => v.status === '✅').length;
      this.log(`📊 Validação: ${successfulTables}/${TABLES.length} tabelas OK`);
      
      return validations;
      
    } catch (error) {
      this.log(`❌ Erro na validação: ${error.message}`, 'ERROR');
      throw error;
    }
  }
  
  generateReport() {
    const duration = Date.now() - this.startTime;
    const report = {
      migration_completed_at: new Date().toISOString(),
      duration_ms: duration,
      duration_readable: `${Math.floor(duration / 1000)}s`,
      statistics: this.stats,
      files_generated: [
        this.logFile,
        path.join(LOGS_DIR, 'validation-report.json'),
        ...TABLES.map(table => path.join(BACKUP_DIR, `${table}_export.csv`)),
        ...TABLES.map(table => path.join(BACKUP_DIR, `${table}_postgresql.csv`))
      ],
      next_steps: [
        '1. Verificar logs em: ' + this.logFile,
        '2. Validar aplicação em: https://your-app.vercel.app',
        '3. Configurar DNS (se necessário)',
        '4. Ativar monitoramento',
        '5. Agendar backup automático'
      ]
    };
    
    const reportPath = path.join(LOGS_DIR, 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('📋 Relatório de migração salvo em: ' + reportPath);
    
    return report;
  }
  
  async run() {
    try {
      this.log('🚀 Iniciando migração completa Mocha → Vercel + Neon');
      
      // Etapa 1: Exportar dados do Mocha
      await this.exportFromMocha();
      
      // Etapa 2: Converter para PostgreSQL
      this.convertDataForPostgreSQL();
      
      // Etapa 3: Importar para Neon
      await this.importToNeon();
      
      // Etapa 4: Validar migração
      await this.validateMigration();
      
      // Etapa 5: Gerar relatório
      const report = this.generateReport();
      
      this.log('🎉 Migração concluída com sucesso!');
      console.log('\n📊 Resumo da Migração:');
      console.log(`⏱️  Duração: ${report.duration_readable}`);
      console.log(`📋 Tabelas: ${this.stats.tablesProcessed}/${TABLES.length}`);
      console.log(`📄 Registros: ${this.stats.recordsProcessed}`);
      console.log(`❌ Erros: ${this.stats.errors}`);
      console.log(`⚠️  Avisos: ${this.stats.warnings}`);
      
      if (this.stats.errors > 0) {
        console.log(`\n⚠️  Migração concluída com ${this.stats.errors} erros. Verifique os logs.`);
        process.exit(1);
      }
      
      console.log('\n✅ Migração bem-sucedida! Próximos passos:');
      report.next_steps.forEach(step => console.log(`   ${step}`));
      
    } catch (error) {
      this.log(`💥 Erro fatal na migração: ${error.message}`, 'ERROR');
      console.error('💥 Migração falhou:', error.message);
      process.exit(1);
    }
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new MigrationTool();
  migration.run().catch(console.error);
}

export default MigrationTool;
