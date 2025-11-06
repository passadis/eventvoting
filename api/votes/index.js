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
        context.log('Getting votes from Cosmos DB');
        
        // Create table client with Cosmos DB connection string
        const tableClient = TableClient.fromConnectionString(connectionString, tableName);
        
        // Initialize votes structure
        const votes = {
            'az-foundry': 0,
            'az-coding': 0,
            'az-infra': 0,
            'az-voice': 0
        };

        try {
            // Ensure table exists
            await tableClient.createTable().catch(() => {}); // Ignore if exists
            
            // Get vote counts for each event
            for (const eventId of Object.keys(votes)) {
                try {
                    const entity = await tableClient.getEntity('votes', eventId);
                    votes[eventId] = entity.count || 0;
                    context.log(`Event ${eventId}: ${votes[eventId]} votes`);
                } catch (error) {
                    // Entity doesn't exist yet, keep count at 0
                    context.log(`Entity ${eventId} not found, initializing to 0`);
                }
            }
        } catch (error) {
            context.log('Table operation error:', error.message);
            // Return zeros if table operations fail
        }

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: { votes }
        };

    } catch (error) {
        context.log('Database error:', error);
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: { message: 'Internal server error' }
        };
    }
};
