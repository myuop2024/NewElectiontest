import { db } from '../db';
import { jamaicaMonitoringConfig } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  JAMAICA_POLITICAL_PARTIES, 
  JAMAICA_POLITICAL_LEADERS, 
  JAMAICA_POLITICAL_COMMENTATORS, 
  JAMAICA_CONSTITUENCIES, 
  JAMAICA_ELECTION_KEYWORDS, 
  JAMAICA_SOCIAL_ISSUES,
  generateMonitoringKeywords,
  DEFAULT_MONITORING_CONFIG
} from './jamaica-political-data';

export class JamaicaMonitoringSettings {
  async initializeDefaultSettings(): Promise<void> {
    try {
      // Check if settings already exist
      const existingConfigs = await db.select().from(jamaicaMonitoringConfig);
      
      if (existingConfigs.length === 0) {
        // Insert default configurations
        const defaultConfigs = [
          {
            configName: 'Jamaica Political Parties',
            category: 'parties',
            keywords: JAMAICA_POLITICAL_PARTIES,
            isEnabled: true,
            description: 'Major and minor political parties in Jamaica',
            createdBy: 'system',
            priority: 1
          },
          {
            configName: 'Jamaica Political Leaders',
            category: 'politicians',
            keywords: JAMAICA_POLITICAL_LEADERS,
            isEnabled: true,
            description: 'Current and former political leaders, ministers, MPs, mayors',
            createdBy: 'system',
            priority: 1
          },
          {
            configName: 'Jamaica Political Commentators',
            category: 'commentators',
            keywords: JAMAICA_POLITICAL_COMMENTATORS,
            isEnabled: true,
            description: 'Media analysts, journalists, and political commentators',
            createdBy: 'system',
            priority: 2
          },
          {
            configName: 'Jamaica Constituencies',
            category: 'constituencies',
            keywords: JAMAICA_CONSTITUENCIES,
            isEnabled: true,
            description: 'All 63 parliamentary constituencies in Jamaica',
            createdBy: 'system',
            priority: 1
          },
          {
            configName: 'Election Keywords',
            category: 'electionKeywords',
            keywords: JAMAICA_ELECTION_KEYWORDS,
            isEnabled: true,
            description: 'Core election and political process terms',
            createdBy: 'system',
            priority: 1
          },
          {
            configName: 'Social Issues',
            category: 'socialIssues',
            keywords: JAMAICA_SOCIAL_ISSUES,
            isEnabled: true,
            description: 'Economic, social, infrastructure, and governance issues',
            createdBy: 'system',
            priority: 2
          }
        ];

        await db.insert(jamaicaMonitoringConfig).values(defaultConfigs);
        console.log('Jamaica monitoring settings initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing Jamaica monitoring settings:', error);
    }
  }

  async getAllConfigurations(): Promise<any[]> {
    try {
      return await db.select().from(jamaicaMonitoringConfig);
    } catch (error) {
      console.error('Error fetching monitoring configurations:', error);
      return [];
    }
  }

  async getConfigurationsByCategory(category: string): Promise<any[]> {
    try {
      return await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.category, category));
    } catch (error) {
      console.error('Error fetching configurations by category:', error);
      return [];
    }
  }

  async updateConfiguration(id: number, updates: Partial<any>): Promise<boolean> {
    try {
      await db.update(jamaicaMonitoringConfig)
        .set({
          ...updates,
          lastUpdated: new Date()
        })
        .where(eq(jamaicaMonitoringConfig.id, id));
      return true;
    } catch (error) {
      console.error('Error updating monitoring configuration:', error);
      return false;
    }
  }

  async addCustomKeywords(category: string, keywords: string[]): Promise<boolean> {
    try {
      // Check if custom configuration exists for this category
      const existingConfig = await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.category, category))
        .limit(1);

      if (existingConfig.length > 0) {
        // Update existing configuration
        const currentKeywords = existingConfig[0].keywords || [];
        const updatedKeywords = [...new Set([...currentKeywords, ...keywords])];
        
        await db.update(jamaicaMonitoringConfig)
          .set({
            keywords: updatedKeywords,
            lastUpdated: new Date()
          })
          .where(eq(jamaicaMonitoringConfig.id, existingConfig[0].id));
      } else {
        // Create new configuration
        await db.insert(jamaicaMonitoringConfig).values({
          configName: `Custom ${category}`,
          category,
          keywords,
          isEnabled: true,
          description: `Custom keywords for ${category}`,
          createdBy: 'admin',
          priority: 3
        });
      }
      return true;
    } catch (error) {
      console.error('Error adding custom keywords:', error);
      return false;
    }
  }

  async removeKeywords(id: number, keywordsToRemove: string[]): Promise<boolean> {
    try {
      const config = await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.id, id))
        .limit(1);

      if (config.length > 0) {
        const currentKeywords = config[0].keywords || [];
        const updatedKeywords = currentKeywords.filter(
          (keyword: string) => !keywordsToRemove.includes(keyword)
        );

        await db.update(jamaicaMonitoringConfig)
          .set({
            keywords: updatedKeywords,
            lastUpdated: new Date()
          })
          .where(eq(jamaicaMonitoringConfig.id, id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing keywords:', error);
      return false;
    }
  }

  async toggleConfiguration(id: number): Promise<boolean> {
    try {
      const config = await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.id, id))
        .limit(1);

      if (config.length > 0) {
        await db.update(jamaicaMonitoringConfig)
          .set({
            isEnabled: !config[0].isEnabled,
            lastUpdated: new Date()
          })
          .where(eq(jamaicaMonitoringConfig.id, id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling configuration:', error);
      return false;
    }
  }

  async generateActiveKeywords(): Promise<string[]> {
    try {
      const activeConfigs = await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.isEnabled, true));

      const allKeywords: string[] = [];
      activeConfigs.forEach(config => {
        allKeywords.push(...config.keywords);
      });

      // Remove duplicates and return
      return [...new Set(allKeywords)];
    } catch (error) {
      console.error('Error generating active keywords:', error);
      return generateMonitoringKeywords(); // Fallback to default
    }
  }

  async getKeywordsByPriority(): Promise<{ high: string[], medium: string[], low: string[] }> {
    try {
      const configs = await db.select()
        .from(jamaicaMonitoringConfig)
        .where(eq(jamaicaMonitoringConfig.isEnabled, true));

      const keywordsByPriority = {
        high: [] as string[],
        medium: [] as string[],
        low: [] as string[]
      };

      configs.forEach(config => {
        const keywords = config.keywords || [];
        switch (config.priority) {
          case 1:
            keywordsByPriority.high.push(...keywords);
            break;
          case 2:
            keywordsByPriority.medium.push(...keywords);
            break;
          case 3:
            keywordsByPriority.low.push(...keywords);
            break;
        }
      });

      // Remove duplicates
      keywordsByPriority.high = [...new Set(keywordsByPriority.high)];
      keywordsByPriority.medium = [...new Set(keywordsByPriority.medium)];
      keywordsByPriority.low = [...new Set(keywordsByPriority.low)];

      return keywordsByPriority;
    } catch (error) {
      console.error('Error getting keywords by priority:', error);
      return { high: [], medium: [], low: [] };
    }
  }

  async getConfigurationStats(): Promise<any> {
    try {
      const configs = await db.select().from(jamaicaMonitoringConfig);
      
      const stats = {
        totalConfigurations: configs.length,
        activeConfigurations: configs.filter(c => c.isEnabled).length,
        totalKeywords: 0,
        activeKeywords: 0,
        categoryCounts: {} as Record<string, number>,
        lastUpdate: new Date()
      };

      configs.forEach(config => {
        const keywordCount = config.keywords?.length || 0;
        stats.totalKeywords += keywordCount;
        
        if (config.isEnabled) {
          stats.activeKeywords += keywordCount;
        }
        
        stats.categoryCounts[config.category] = (stats.categoryCounts[config.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting configuration stats:', error);
      return {
        totalConfigurations: 0,
        activeConfigurations: 0,
        totalKeywords: 0,
        activeKeywords: 0,
        categoryCounts: {},
        lastUpdate: new Date()
      };
    }
  }
}

export const jamaicaMonitoringSettings = new JamaicaMonitoringSettings();