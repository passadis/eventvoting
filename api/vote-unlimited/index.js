const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
const tableName = 'EventPollVotes';

module.exports = async function (context, req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }

    try {
        const { eventId } = req.body;
        
        context.log(`Unlimited vote submission: ${eventId}`);
        
        if (!eventId) {
            context.res = {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: { message: 'Missing eventId' }
            };
            return;
        }

        const validEvents = ['az-foundry', 'az-coding', 'az-infra', 'az-voice'];
        if (!validEvents.includes(eventId)) {
            context.res = {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: { message: 'Invalid event ID' }
            };
            return;
        }

        // Create table client
        const voteTableClient = TableClient.fromConnectionString(connectionString, tableName);
        
        // Create table if it doesn't exist
        await voteTableClient.createTable().catch(() => {}); // Ignore if exists

        // Simple increment approach - handle entity creation/update carefully
        let currentCount = 1;
        
        try {
            // Try to get existing entity first
            const existingEntity = await voteTableClient.getEntity('votes', eventId);
            currentCount = (existingEntity.count || 0) + 1;
            
            // Update with minimal entity structure
            const updateEntity = {
                partitionKey: 'votes',
                rowKey: eventId,
                count: currentCount
            };
            
            await voteTableClient.updateEntity(updateEntity, 'Replace');
            context.log(`Updated ${eventId} count to ${currentCount}`);
            
        } catch (getError) {
            if (getError.statusCode === 404) {
                // Entity doesn't exist, create new one
                try {
                    const newEntity = {
                        partitionKey: 'votes',
                        rowKey: eventId,
                        count: 1
                    };
                    
                    await voteTableClient.createEntity(newEntity);
                    context.log(`Created new ${eventId} with count 1`);
                    currentCount = 1;
                    
                } catch (createError) {
                    if (createError.statusCode === 409) {
                        // Race condition - someone else created it, try to update
                        const entity = await voteTableClient.getEntity('votes', eventId);
                        currentCount = (entity.count || 0) + 1;
                        
                        const updateEntity = {
                            partitionKey: 'votes',
                            rowKey: eventId,
                            count: currentCount
                        };
                        
                        await voteTableClient.updateEntity(updateEntity, 'Replace');
                        context.log(`Updated ${eventId} count to ${currentCount} after race condition`);
                    } else {
                        throw createError;
                    }
                }
            } else {
                throw getError;
            }
        }

        // Get all current vote counts with clean structure
        const votes = {
            'az-foundry': 0,
            'az-coding': 0,
            'az-infra': 0,
            'az-voice': 0
        };

        // Fetch current counts for all events
        for (const id of Object.keys(votes)) {
            try {
                const entity = await voteTableClient.getEntity('votes', id);
                // Only extract the count, ignore metadata
                votes[id] = entity.count || 0;
            } catch (error) {
                // Entity doesn't exist, keep at 0
                votes[id] = 0;
            }
        }

        context.log('Vote recorded successfully:', votes);

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: { 
                votes, 
                message: 'Vote recorded! Thanks for your input.',
                totalVotes: Object.values(votes).reduce((sum, count) => sum + count, 0)
            }
        };

    } catch (error) {
        context.log('Vote submission error:', error);
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: { message: `Failed to record vote: ${error.message}` }
        };
    }
};
