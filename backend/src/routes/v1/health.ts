import { Router } from 'express';
import { Pool } from 'pg';
import { Client } from '@elastic/elasticsearch';
import { createClient } from 'redis';

const router = Router();

// Initialize service clients
const dbPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'cpr_may18',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
});

const elasticsearchClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

const redisClient = process.env.REDIS_ENABLED === 'true' ? createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
}) : null;

// Health check endpoint
router.get('/', async (req, res) => {
    console.log('🔍 [HEALTH] Basic health check requested', {
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method
    });

    try {
        // Check database connection
        const dbStatus = await checkDatabase();
        
        // Check Elasticsearch
        const elasticsearchStatus = await checkElasticsearch();
        
        // Check Redis if enabled
        const redisStatus = process.env.REDIS_ENABLED === 'true' ? await checkRedis() : { status: 'DISABLED' };

        // Determine overall status
        const criticalServices = [dbStatus, elasticsearchStatus];
        const allServices = [...criticalServices, redisStatus];
        
        const overallStatus = criticalServices.every(s => s.status === 'UP') ? 'UP' : 
                            criticalServices.some(s => s.status === 'DOWN') ? 'DOWN' : 'DEGRADED';

        const health = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            services: {
                database: {
                    ...dbStatus,
                    critical: true
                },
                elasticsearch: {
                    ...elasticsearchStatus,
                    critical: true
                },
                redis: {
                    ...redisStatus,
                    critical: false
                }
            },
            summary: {
                totalServices: allServices.length,
                upServices: allServices.filter(s => s.status === 'UP').length,
                downServices: allServices.filter(s => s.status === 'DOWN').length,
                degradedServices: allServices.filter(s => s.status === 'DEGRADED').length,
                disabledServices: allServices.filter(s => s.status === 'DISABLED').length
            }
        };

        console.log('✅ [HEALTH] Basic health check successful', { 
            health,
            responseStatus: 200,
            responseTime: new Date().toISOString()
        });

        res.status(200).json(health);
    } catch (error) {
        console.error('❌ [HEALTH] Basic health check failed', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            requestInfo: {
                path: req.path,
                baseUrl: req.baseUrl,
                originalUrl: req.originalUrl,
                method: req.method
            }
        });
        res.status(500).json({
            status: 'DOWN',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
    console.log('🔍 [HEALTH] Detailed health check requested', {
        path: req.path,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method
    });

    try {
        // Check database connection with details
        const dbStatus = await checkDatabase(true);
        
        // Check Elasticsearch with details
        const elasticsearchStatus = await checkElasticsearch(true);
        
        // Check Redis if enabled
        const redisStatus = process.env.REDIS_ENABLED === 'true' ? await checkRedis(true) : { status: 'DISABLED' };

        // Determine overall status
        const criticalServices = [dbStatus, elasticsearchStatus];
        const allServices = [...criticalServices, redisStatus];
        
        const overallStatus = criticalServices.every(s => s.status === 'UP') ? 'UP' : 
                            criticalServices.some(s => s.status === 'DOWN') ? 'DOWN' : 'DEGRADED';

        const detailedHealth = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                heapUsed: process.memoryUsage().heapUsed,
                heapTotal: process.memoryUsage().heapTotal,
                rss: process.memoryUsage().rss,
                external: process.memoryUsage().external
            },
            cpu: process.cpuUsage(),
            environment: process.env.NODE_ENV,
            nodeVersion: process.version,
            services: {
                database: {
                    ...dbStatus,
                    critical: true
                },
                elasticsearch: {
                    ...elasticsearchStatus,
                    critical: true
                },
                redis: {
                    ...redisStatus,
                    critical: false
                }
            },
            summary: {
                totalServices: allServices.length,
                upServices: allServices.filter(s => s.status === 'UP').length,
                downServices: allServices.filter(s => s.status === 'DOWN').length,
                degradedServices: allServices.filter(s => s.status === 'DEGRADED').length,
                disabledServices: allServices.filter(s => s.status === 'DISABLED').length
            }
        };

        console.log('✅ [HEALTH] Detailed health check successful', { 
            detailedHealth,
            responseStatus: 200,
            responseTime: new Date().toISOString()
        });

        res.status(200).json(detailedHealth);
    } catch (error) {
        console.error('❌ [HEALTH] Detailed health check failed', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            requestInfo: {
                path: req.path,
                baseUrl: req.baseUrl,
                originalUrl: req.originalUrl,
                method: req.method
            }
        });
        res.status(500).json({
            status: 'DOWN',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper functions to check service health
async function checkDatabase(detailed = false) {
    try {
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        
        if (detailed) {
            return {
                status: 'UP',
                lastChecked: new Date().toISOString(),
                details: {
                    version: result.rows[0].now,
                    connectionPool: {
                        totalCount: dbPool.totalCount,
                        idleCount: dbPool.idleCount,
                        waitingCount: dbPool.waitingCount
                    }
                }
            };
        }
        return { status: 'UP', lastChecked: new Date().toISOString() };
    } catch (error) {
        return {
            status: 'DOWN',
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function checkElasticsearch(detailed = false) {
    try {
        const health = await elasticsearchClient.cluster.health();
        
        if (detailed) {
            return {
                status: health.status === 'green' ? 'UP' : 'DEGRADED',
                lastChecked: new Date().toISOString(),
                details: {
                    clusterName: health.cluster_name,
                    numberOfNodes: health.number_of_nodes,
                    numberOfDataNodes: health.number_of_data_nodes,
                    activeShards: health.active_shards,
                    activePrimaryShards: health.active_primary_shards
                }
            };
        }
        return {
            status: health.status === 'green' ? 'UP' : 'DEGRADED',
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'DOWN',
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function checkRedis(detailed = false) {
    if (!redisClient) {
        return { status: 'DISABLED' };
    }

    try {
        await redisClient.ping();
        
        if (detailed) {
            const info = await redisClient.info();
            return {
                status: 'UP',
                lastChecked: new Date().toISOString(),
                details: {
                    version: info.split('\r\n').find(line => line.startsWith('redis_version:'))?.split(':')[1],
                    connectedClients: info.split('\r\n').find(line => line.startsWith('connected_clients:'))?.split(':')[1],
                    usedMemory: info.split('\r\n').find(line => line.startsWith('used_memory:'))?.split(':')[1]
                }
            };
        }
        return { status: 'UP', lastChecked: new Date().toISOString() };
    } catch (error) {
        return {
            status: 'DOWN',
            lastChecked: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

export default router; 