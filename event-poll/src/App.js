import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Trophy, Box, Rocket, CheckCircle, Wifi, Database, RefreshCw } from 'lucide-react';

const UnlimitedVotingPoll = () => {
  const [votes, setVotes] = useState({
    'az-foundry': 0,
    'az-coding': 0,
    'az-infra': 0,
    'az-voice': 0
  });
  
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [voteCount, setVoteCount] = useState(0); // Track how many times user voted
  const [lastVoted, setLastVoted] = useState(null);

  // API Configuration - Update this URL after deploying your Azure Functions
  const API_BASE = process.env.REACT_APP_API_BASE_URL
  
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

const events = [
    {
      id: 'az-foundry',
      title: 'Navigating Azure AI Foundry ',
      description: 'All you need to know about Azure AI Foundry and the lastet updates',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'az-coding',
      title: 'GitHub Copilots  and VSCode',
      description: 'Learn how to code with the best assistants by your side',
      icon: Rocket,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'az-infra',
      title: 'Embeddings and Vector Databases',
      description: 'Learn all about embeddings and vector databases in Azure',
      icon: Box,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'az-voice',
      title: 'Azure Live Voice API and Avatar Creation',
      description: 'The latest in voice synthesis and avatar creation using Azure Live Voice API',
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  // Load votes from database
  const loadVotes = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      const response = await fetch(`${API_BASE}/votes`);
      if (response.ok) {
        const data = await response.json();
        setVotes(data.votes);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Failed to load votes:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  // Submit vote to database (unlimited voting)
  const handleVote = async (eventId) => {
    setIsVoting(true);
    setConnectionStatus('voting');
    
    try {
      // Use existing endpoint but with a new random fingerprint each time
      const response = await fetch(`${API_BASE}/vote-unlimited`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          eventId,
          userFingerprint: Date.now() + '_' + Math.random().toString(36).substr(2, 9) // Always unique
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVotes(data.votes);
        setLastVoted(eventId);
        setVoteCount(prev => prev + 1);
        setShowResults(true);
        setConnectionStatus('connected');
        
        // Auto-hide the success indicator after 2 seconds
        setTimeout(() => setLastVoted(null), 2000);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit vote');
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
      setConnectionStatus('error');
    } finally {
      setIsVoting(false);
    }
  };

  // Auto-refresh votes every 5 seconds for real-time updates
  useEffect(() => {
    loadVotes();
    const interval = setInterval(loadVotes, 5000);
    return () => clearInterval(interval);
  }, [loadVotes]);

  const getPercentage = (eventId) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes[eventId] / totalVotes) * 100);
  };

  const getWinner = () => {
    const maxVotes = Math.max(...Object.values(votes));
    return Object.keys(votes).find(key => votes[key] === maxVotes);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading poll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Choose Our Next Event
          </h1>
          <p className="text-gray-600 text-lg">Vote as many times as you want! Your preferences matter.</p>
          
          {/* Connection Status & Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <div className="inline-flex items-center px-3 py-1 bg-white rounded-full shadow-sm border">
              {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500 mr-2" />}
              {connectionStatus === 'connecting' && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>}
              {connectionStatus === 'voting' && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>}
              {connectionStatus === 'error' && <Database className="w-4 h-4 text-red-500 mr-2" />}
              <span className="text-sm font-medium text-gray-700">
                {connectionStatus === 'connected' && 'Live Results'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'voting' && 'Submitting Vote...'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
            </div>
            
            {!showResults && totalVotes > 0 && (
              <button
                onClick={() => setShowResults(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-sm hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Show Results
              </button>
            )}
            
            <button
              onClick={loadVotes}
              className="inline-flex items-center px-3 py-2 bg-white border rounded-full shadow-sm hover:shadow-lg transition-all duration-200 text-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            
            {voteCount > 0 && (
              <div className="inline-flex items-center px-3 py-1 bg-green-100 border border-green-200 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-700">
                  You voted {voteCount} {voteCount === 1 ? 'time' : 'times'}
                </span>
              </div>
            )}
            
            {totalVotes > 0 && (
              <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border">
                <Users className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Poll Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {events.map((event) => {
            const IconComponent = event.icon;
            const percentage = getPercentage(event.id);
            const isWinner = totalVotes > 0 && getWinner() === event.id;
            const justVoted = lastVoted === event.id;
            
            return (
              <div
                key={event.id}
                className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer
                  ${justVoted ? 'ring-4 ring-green-200 border-green-300' : event.borderColor}
                  ${isWinner && showResults ? 'ring-4 ring-yellow-200 border-yellow-300' : ''}
                  hover:shadow-lg
                `}
                onClick={() => handleVote(event.id)}
              >
                {/* Background gradient overlay for results */}
                {showResults && (
                  <div 
                    className={`absolute inset-0 bg-gradient-to-r ${event.color} opacity-10 transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <div className={`relative p-6 ${event.bgColor}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${event.color}`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    {isWinner && showResults && (
                      <div className="flex items-center px-2 py-1 bg-yellow-100 rounded-full">
                        <Trophy className="w-4 h-4 text-yellow-600 mr-1" />
                        <span className="text-xs font-semibold text-yellow-700">Leading</span>
                      </div>
                    )}
                    
                    {justVoted && (
                      <div className="flex items-center px-2 py-1 bg-green-100 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xs font-semibold text-green-700">Voted!</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-xl text-gray-800 mb-2">
                    {event.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {event.description}
                  </p>
                  
                  {/* Vote count and percentage */}
                  {showResults && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-gray-800">
                          {votes[event.id]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {votes[event.id] === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${event.color} text-white font-semibold`}>
                        {percentage}%
                      </div>
                    </div>
                  )}
                  
                  {/* Voting button */}
                  <div className="mt-4">
                    <div className={`w-full py-3 px-4 rounded-lg bg-gradient-to-r ${event.color} text-white font-semibold text-center transition-all hover:shadow-md`}>
                      {isVoting && lastVoted === event.id ? 'Voting...' : 'Vote for this event'}
                    </div>
                  </div>
                  
                  {/* Show hint when results are hidden */}
                  {!showResults && totalVotes > 0 && (
                    <div className="mt-2">
                      <div className="w-full py-1 px-3 rounded-lg bg-gray-100 text-gray-500 text-center text-xs">
                        Click "Show Results" to see vote counts
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Summary */}
        {showResults && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Live Poll Results
              </h3>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                title="Hide Results"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {events
                .sort((a, b) => votes[b.id] - votes[a.id])
                .map((event, index) => (
                  <div key={event.id} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-lg font-semibold text-gray-500 w-6">
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-800 truncate">
                        {event.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${event.color} transition-all duration-1000`}
                          style={{ width: `${getPercentage(event.id)}%` }}
                        />
                      </div>
                      <span className="font-semibold text-gray-700 w-12 text-right">
                        {votes[event.id]}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>🗳️ Vote as many times as you want • 🔄 Auto-refreshes every 5 seconds • 📊 See live results instantly</p>
          <p className="mt-1">Perfect for gathering continuous feedback over 2 weeks!</p>
        </div>
      </div>
    </div>
  );
};

export default UnlimitedVotingPoll;