const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;
const tableName = 'EventPollVotes';
const userVotesTable = 'EventPollUserVotes';

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
        const { eventId, userFingerprint } = req.body;
        
        context.log(`Vote submission: ${eventId} from ${userFingerprint}`);
        
        if (!eventId || !userFingerprint) {
            context.res = {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: { message: 'Missing eventId or userFingerprint' }
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

        // Create table clients with connection string
        const voteTableClient = TableClient.fromConnectionString(connectionString, tableName);
        const userTableClient = TableClient.fromConnectionString(connectionString, userVotesTable);
        
        // Create tables if they don't exist
        await voteTableClient.createTable().catch(() => {}); // Ignore if exists
        await userTableClient.createTable().catch(() => {}); // Ignore if exists

        // Check if user already voted (within 24 hours)
        try {
            const existingVote = await userTableClient.getEntity('users', userFingerprint);
            const voteTime = new Date(existingVote.timestamp);
            const now = new Date();
            const twentyFourHours = 24 * 60 * 60 * 1000;
            
            // Check if vote is still valid (within 24 hours)
            if ((now.getTime() - voteTime.getTime()) < twentyFourHours) {
                const hoursLeft = Math.ceil((twentyFourHours - (now.getTime() - voteTime.getTime())) / (60 * 60 * 1000));
                context.log(`User ${userFingerprint} already voted for ${existingVote.eventId}, ${hoursLeft} hours left`);
                context.res = {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: { 
                        message: `You can vote again in ${hoursLeft} hours`,
                        hoursLeft: hoursLeft
                    }
                };
                return;
            } else {
                // Vote expired, delete old record
                await userTableClient.deleteEntity('users', userFingerprint);
                context.log(`Deleted expired vote for user ${userFingerprint}`);
            }
        } catch (error) {
            // User hasn't voted yet, continue
            context.log('New user vote detected');
        }

        // Record user vote
        await userTableClient.createEntity({
            partitionKey: 'users',
            rowKey: userFingerprint,
            eventId: eventId,
            timestamp: new Date().toISOString(),
            ipAddress: req.headers['x-forwarded-for'] || 'unknown'
        });

        // Update vote count
        try {
            const entity = await voteTableClient.getEntity('votes', eventId);
            entity.count = (entity.count || 0) + 1;
            await voteTableClient.updateEntity(entity);
            context.log(`Updated ${eventId} count to ${entity.count}`);
        } catch (error) {
            // Entity doesn't exist, create it
            await voteTableClient.createEntity({
                partitionKey: 'votes',
                rowKey: eventId,
                count: 1
            });
            context.log(`Created new ${eventId} with count 1`);
        }

        // Retrieve updated vote counts
        const votes = {
            'az-foundry': 0,
            'az-coding': 0,
            'az-infra': 0,
            'az-voice': 0
        };

        for (const id of Object.keys(votes)) {
            try {
                const entity = await voteTableClient.getEntity('votes', id);
                votes[id] = entity.count || 0;
            } catch (error) {
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
            body: { votes, message: 'Vote recorded successfully!' }
        };

    } catch (error) {
        context.log('Vote submission error:', error);
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: { message: 'Failed to record vote' }
        };
    }
};
